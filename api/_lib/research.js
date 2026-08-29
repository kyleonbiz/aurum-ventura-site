// Business Research & Qualification Agent — logic.
//
// 1. Fetch the prospect's own public website (if it has one) and reduce
//    it to plain text. No login, no credentials — just the page a
//    visitor would see.
// 2. Ask Claude to summarize the business and score it as a fit for
//    Aurum Ventura's back-office admin services, from public signals
//    only. The exact rubric is spelled out in RESEARCH_PROMPT below so
//    it's reviewable/tunable in one place, not buried in code.
//
// Model choice: Haiku 4.5 by default — this agent runs once per
// prospect at potentially high volume, and Haiku is fast/cheap while
// still capable of this kind of structured extraction+scoring task.
// Override with CLAUDE_RESEARCH_MODEL if you want a stronger model.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const USER_AGENT = "AurumVenturaAgentOps/1.0 (internal business research; contact: kylej312@gmail.com)";

// $ per million tokens. Keep in sync with Anthropic's published pricing
// manually — if a model isn't listed here, cost is reported as
// unavailable rather than guessed. https://www.anthropic.com/pricing
const MODEL_PRICING_PER_MILLION = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-opus-5": { input: 15.0, output: 75.0 },
};

export function estimateCostUsd(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING_PER_MILLION[model];
  if (!pricing || inputTokens == null || outputTokens == null) return null;
  return (inputTokens / 1e6) * pricing.input + (outputTokens / 1e6) * pricing.output;
}

// Very small HTML→text reducer — strips scripts/styles/tags, collapses
// whitespace. Good enough for feeding a business's homepage to an LLM;
// not a full readability parser, and doesn't need to be one here.
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000); // keep the prompt small/cheap; a homepage rarely needs more
}

// Fetches the prospect's website. Returns { status, text } where status
// is 'FETCHED' | 'UNREACHABLE'. Never throws for a normal fetch failure
// (timeout, 404, DNS) — that's an expected, loggable outcome, not a bug.
export async function fetchWebsiteText(url) {
  if (!url) return { status: "NO_WEBSITE", text: null };
  let target = url;
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(target, { headers: { "User-Agent": USER_AGENT }, redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { status: "UNREACHABLE", text: null, reason: `HTTP ${res.status}` };
    const html = await res.text();
    return { status: "FETCHED", text: htmlToText(html) };
  } catch (err) {
    return { status: "UNREACHABLE", text: null, reason: err.message };
  }
}

const RESEARCH_SYSTEM_PROMPT = `You are a research analyst for Aurum Ventura, a company that sells outsourced back-office administrative services (document management, invoicing, vendor/license tracking, CRM data entry) to small and mid-sized businesses.

Given public information about one business, assess how good a prospect it is for Aurum Ventura's services, using ONLY these signals:
- Website existence and quality: no website, or a dated/thin/template-only website, suggests a business that is likely under-resourced on back-office/admin work — a GOOD fit signal, not a bad one.
- Business size signals visible in the text (number of locations, staff mentioned, service area) — very small (e.g. solo operator) or very large (enterprise with its own admin department) are both weaker fits than an established small/mid-size business.
- Industry fit: property management, construction, contracting, real estate, professional services (law/accounting/insurance), and similar admin-heavy industries are strong fits.
- Contactability: does the business have a findable phone number or contact method at all.

Respond with ONLY a single JSON object, no other text, matching exactly this shape:
{
  "summary": "2-4 sentence factual summary of the business based on what you were given",
  "signals": {
    "has_website": boolean,
    "website_quality": "none" | "thin" | "adequate" | "polished",
    "size_signal": "solo" | "small" | "mid" | "large" | "unknown",
    "industry_fit": "strong" | "moderate" | "weak",
    "contactable": boolean
  },
  "score": <integer 0-100, higher = better prospect>,
  "level": "HIGH_PRIORITY" | "GOOD_PROSPECT" | "POSSIBLE_FIT" | "LOW_PRIORITY",
  "rationale": "1-2 sentences explaining the score"
}
Level bands: score >= 80 HIGH_PRIORITY, 60-79 GOOD_PROSPECT, 40-59 POSSIBLE_FIT, < 40 LOW_PRIORITY. Be honest and conservative — if information is too thin to judge, say so in the rationale and score low-to-moderate rather than guessing high.`;

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Calls Claude to research+qualify one prospect. Returns
// { result, usage: { model, inputTokens, outputTokens, durationMs } }.
// Throws on a genuine failure (network, non-2xx, unparseable JSON) — the
// caller logs that as an agent_errors row and retries per the job's
// attempt limit, same pattern as the Lead Finder Agent.
export async function researchAndQualify({ businessName, industry, location, address, phone, website, websiteText, websiteFetchStatus }) {
  if (!isConfigured()) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY is not configured"), { code: "AI_NOT_CONFIGURED" });
  }
  const model = process.env.CLAUDE_RESEARCH_MODEL || DEFAULT_MODEL;

  const userContent = [
    `Business name: ${businessName}`,
    `Industry (as searched): ${industry || "unknown"}`,
    `Location: ${location || "unknown"}`,
    address ? `Address: ${address}` : null,
    phone ? `Phone on file: ${phone}` : `Phone on file: none found`,
    website ? `Website: ${website}` : `Website: none found`,
    websiteFetchStatus === "UNREACHABLE" ? `(Website could not be fetched for review — score conservatively and note this.)` : null,
    websiteText ? `Website homepage text (truncated):\n${websiteText}` : null,
  ].filter(Boolean).join("\n");

  const startedAt = Date.now();
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Anthropic API responded ${res.status}: ${body.slice(0, 300)}`);
    err.code = res.status === 429 ? "RATE_LIMIT_REACHED" : "AI_PROVIDER_FAILED";
    err.usage = { model, inputTokens: null, outputTokens: null, durationMs };
    throw err;
  }

  const data = await res.json();
  const usage = {
    model,
    inputTokens: data.usage?.input_tokens ?? null,
    outputTokens: data.usage?.output_tokens ?? null,
    durationMs,
  };

  const text = data.content?.[0]?.text || "";
  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (err) {
    const parseErr = new Error(`Claude returned a non-JSON response: ${text.slice(0, 200)}`);
    parseErr.code = "MALFORMED_AI_RESPONSE";
    parseErr.usage = usage;
    throw parseErr;
  }

  if (!parsed.level || typeof parsed.score !== "number") {
    const shapeErr = new Error(`Claude's JSON response was missing required fields: ${text.slice(0, 200)}`);
    shapeErr.code = "MALFORMED_AI_RESPONSE";
    shapeErr.usage = usage;
    throw shapeErr;
  }

  return { result: parsed, usage };
}
