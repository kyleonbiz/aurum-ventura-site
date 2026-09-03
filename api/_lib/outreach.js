// Personalized Outreach Agent
// Generates cold-email drafts using Claude API + prospect research data,
// and sends approved drafts via Resend.

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

const OUTREACH_SYSTEM_PROMPT = `You are writing a personalized cold email to a business owner or decision-maker,
inviting them to discuss outsourced administrative support.

Context about the prospect:
- Business name and location
- Industry
- Business size signals (if available)
- Research notes (quality of web presence, contactability signals)

Your email should:
1. Be short (3-4 sentences max) — cold emails that feel like a pitch get deleted.
2. Mention one specific signal you noticed (e.g. "I noticed you've been managing a lot of vendor relationships...")
3. Reference Aurum Ventura briefly: "We handle routine admin work (documents, invoicing, licensing, vendor tracking, data entry) on a fixed monthly scope."
4. End with a soft call-to-action: "Open to a quick conversation?" or similar.
5. Be signed "Kyle at Aurum Ventura".

DO NOT:
- Use superlatives or hype language.
- Mention the prospect score or qualification level.
- Make promises about ROI or efficiency gains — just describe what Aurum does.
- Include any links or scheduling tools (the admin will handle follow-up).

Output ONLY the email body text, nothing else.`;

const MODEL_PRICING_PER_MILLION = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-opus-5": { input: 15.0, output: 75.0 },
};

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY is not configured"), { code: "AI_PROVIDER_NOT_CONFIGURED" });
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw Object.assign(new Error("RESEND_API_KEY is not configured"), { code: "EMAIL_NOT_CONFIGURED" });
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail() {
  if (!process.env.AURUM_FROM_EMAIL) {
    throw Object.assign(new Error("AURUM_FROM_EMAIL is not configured"), { code: "EMAIL_NOT_CONFIGURED" });
  }
  return process.env.AURUM_FROM_EMAIL;
}

export async function generateOutreachDraft({ prospect, researchSummary, db, logger }) {
  // prospect: { business_name, location, industry, website, estimated_size }
  // researchSummary: string from prospect_research.summary
  // Returns: { draftText, inputTokens, outputTokens }

  const anthropic = getClient();
  const model = process.env.CLAUDE_RESEARCH_MODEL || "claude-haiku-4-5-20251001";

  const userPrompt = `
Generate a personalized cold email for this prospect:

Business: ${prospect.business_name}
Location: ${prospect.location}
Industry: ${prospect.industry}
Website: ${prospect.website || "(no website found)"}
Estimated Size: ${prospect.estimated_size || "unknown"}

Research Notes:
${researchSummary || "(no research summary available)"}

Write the email now:`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: OUTREACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const draftText = message.content[0]?.type === "text" ? message.content[0].text : "";
    if (!draftText) throw new Error("Claude returned empty response");

    logger?.log("outreach", `Generated draft for ${prospect.business_name}`, {
      prospectId: prospect.id,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return {
      draftText,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  } catch (err) {
    if (err.code === "AI_PROVIDER_NOT_CONFIGURED") throw err;
    throw Object.assign(new Error(`Draft generation failed: ${err.message}`), { code: "DRAFT_GENERATION_FAILED", original: err });
  }
}

export async function sendOutreachEmail({ prospect, draftId, draftText, db, logger }) {
  // prospect: { business_name, contact_email }
  // Sends the approved draft and records in outreach_history.
  // Returns: { messageId, sent_to_email }

  if (!prospect.contact_email) {
    throw Object.assign(new Error("Prospect has no contact email"), { code: "NO_CONTACT_EMAIL" });
  }

  const resend = getResendClient();
  const fromEmail = getFromEmail();

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: prospect.contact_email,
      subject: `Quick question about admin support at ${prospect.business_name}`,
      text: draftText,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend returned an error");
    }

    logger?.log("outreach", `Sent email to ${prospect.business_name}`, {
      prospectId: prospect.id,
      draftId,
      toEmail: prospect.contact_email,
      messageId: result.data.id,
    });

    // Record in outreach_history
    await db.query(
      `insert into outreach_history (prospect_id, draft_id, sent_to_email)
       values ($1, $2, $3)`,
      [prospect.id, draftId, prospect.contact_email]
    );

    return {
      messageId: result.data.id,
      sent_to_email: prospect.contact_email,
    };
  } catch (err) {
    if (err.code === "EMAIL_NOT_CONFIGURED") throw err;
    throw Object.assign(new Error(`Email send failed: ${err.message}`), { code: "EMAIL_SEND_FAILED", original: err });
  }
}

export function estimateOutreachCost(inputTokens, outputTokens, model = "claude-haiku-4-5-20251001") {
  const pricing = MODEL_PRICING_PER_MILLION[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
