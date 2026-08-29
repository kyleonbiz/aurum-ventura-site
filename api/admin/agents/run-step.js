// POST /api/admin/agents/run-step — advances whichever agent has real
// work pending, by exactly one unit, then returns. Called either by
// Vercel Cron (Authorization: Bearer <CRON_SECRET>) or an admin's
// "Run Next Step" click (session cookie).
//
// One call = one step: a Lead Finder job in progress gets one candidate
// processed (or, if QUEUED, its one discovery batch fetched); a
// Research & Qualification job gets one prospect researched+scored.
// When a Discovery job finishes, it auto-queues a Research job for the
// prospects it created — that's the only place jobs chain automatically;
// nothing here loops or fans out beyond that single handoff.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";
import { logEvent, logError, logUsage, nextJobCode } from "../../_lib/agents.js";
import { discoverBusinesses, dedupeKeyFor } from "../../_lib/leadFinder.js";
import { fetchWebsiteText, researchAndQualify, estimateCostUsd } from "../../_lib/research.js";

const RESEARCH_MAX_ATTEMPTS = 3;

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || "";
  return !!(secret && header === `Bearer ${secret}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isAuthorized(req) && !requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

  try {
    const [running] = await sql`select * from agent_jobs where status = 'RUNNING' order by started_at asc limit 1`;
    if (running) return res.status(200).json(await advanceJob(sql, running));

    const [queued] = await sql`select * from agent_jobs where status = 'QUEUED' order by created_at asc limit 1`;
    if (queued) return res.status(200).json(await advanceJob(sql, queued));

    return res.status(200).json({ ranStep: false, message: "No queued or running agent jobs." });
  } catch (err) {
    console.error("admin/agents/run-step failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}

function advanceJob(sql, job) {
  if (job.job_type === "DISCOVERY") {
    return job.status === "QUEUED" ? startDiscoveryJob(sql, job) : processOneCandidate(sql, job);
  }
  if (job.job_type === "RESEARCH") {
    return processOneResearchCandidate(sql, job);
  }
  return { ranStep: false, message: `Unknown job_type ${job.job_type}` };
}

/* ===================== Lead Finder (Discovery) ===================== */

async function startDiscoveryJob(sql, job) {
  const startedAt = new Date();
  try {
    const { candidates, geo } = await discoverBusinesses({ industry: job.industry, location: job.location });
    await sql`
      update agent_jobs set status = 'RUNNING', started_at = ${startedAt}, businesses_found = ${candidates.length},
        cursor = ${sql.json({ candidates, index: 0 })}, attempts = attempts + 1, updated_at = now()
      where id = ${job.id}
    `;
    await sql`
      update agents set status = 'RUNNING', current_job_id = ${job.id}, last_started_at = ${startedAt}, updated_at = now()
      where agent_id = 'lead_finder'
    `;
    await logEvent(sql, {
      agentId: "lead_finder", jobId: job.id, eventType: "JOB_STARTED", status: "INFO",
      message: `Lead Finder started ${job.job_code}: found ${candidates.length} candidates near "${geo.displayName}".`,
      startedAt, completedAt: new Date(),
    });
    return { ranStep: true, action: "job_started", jobId: job.id, candidatesFound: candidates.length };
  } catch (err) {
    return await handleDiscoveryFailure(sql, job, err, "SEARCH_API_FAILED");
  }
}

async function processOneCandidate(sql, job) {
  const cursor = job.cursor || { candidates: [], index: 0 };
  const { candidates, index } = cursor;

  const doneByCount = job.new_prospects_created >= job.requested_count;
  const doneByExhaustion = index >= candidates.length;
  if (doneByCount || doneByExhaustion) {
    return await completeDiscoveryJob(sql, job, doneByCount ? "COMPLETED" : "PARTIALLY_COMPLETED");
  }

  const candidate = candidates[index];
  const dedupeKey = dedupeKeyFor(candidate.businessName, job.location);
  const startedAt = new Date();

  const [task] = await sql`
    insert into agent_tasks (job_id, agent_id, task_type, status, started_at)
    values (${job.id}, 'lead_finder', 'PROCESS_CANDIDATE', 'RUNNING', ${startedAt})
    returning id
  `;

  const [existing] = await sql`select id from prospects where dedupe_key = ${dedupeKey}`;
  let eventType, message, prospectId = null;

  if (existing) {
    await sql`update agent_jobs set duplicates_removed = duplicates_removed + 1, cursor = ${sql.json({ candidates, index: index + 1 })}, updated_at = now() where id = ${job.id}`;
    eventType = "DUPLICATE_REMOVED";
    message = `Duplicate prospect skipped: ${candidate.businessName}`;
    prospectId = existing.id;
  } else {
    const [prospect] = await sql`
      insert into prospects (source_job_id, business_name, industry, location, address, phone, website, source, source_ref, dedupe_key)
      values (${job.id}, ${candidate.businessName}, ${job.industry}, ${job.location}, ${candidate.address}, ${candidate.phone}, ${candidate.website}, 'osm', ${candidate.sourceRef}, ${dedupeKey})
      returning id
    `;
    prospectId = prospect.id;
    await sql`update agent_jobs set new_prospects_created = new_prospects_created + 1, cursor = ${sql.json({ candidates, index: index + 1 })}, updated_at = now() where id = ${job.id}`;
    await sql`update agents set records_processed = records_processed + 1, updated_at = now() where agent_id = 'lead_finder'`;
    eventType = "PROSPECT_CREATED";
    message = `Lead Finder discovered ${candidate.businessName}.`;
  }

  const completedAt = new Date();
  await sql`update agent_tasks set status = 'COMPLETED', completed_at = ${completedAt}, prospect_id = ${prospectId} where id = ${task.id}`;
  await logEvent(sql, { agentId: "lead_finder", jobId: job.id, prospectId, eventType, message, status: "SUCCESS", startedAt, completedAt });

  const [refreshed] = await sql`select * from agent_jobs where id = ${job.id}`;
  return {
    ranStep: true,
    action: existing ? "duplicate_skipped" : "prospect_created",
    jobId: job.id,
    progress: { processed: index + 1, total: candidates.length, newProspects: refreshed.new_prospects_created, duplicates: refreshed.duplicates_removed },
  };
}

async function completeDiscoveryJob(sql, job, status) {
  const completedAt = new Date();
  await sql`update agent_jobs set status = ${status}, completed_at = ${completedAt}, updated_at = now() where id = ${job.id}`;
  await sql`
    update agents set status = 'IDLE', current_job_id = null, last_completed_at = ${completedAt}, last_success_at = ${completedAt},
      jobs_completed = jobs_completed + 1, updated_at = now()
    where agent_id = 'lead_finder'
  `;
  await logEvent(sql, {
    agentId: "lead_finder", jobId: job.id, eventType: "JOB_COMPLETED", status: "SUCCESS",
    message: `Job ${job.job_code} ${status.toLowerCase().replace("_", " ")}: ${job.new_prospects_created} new prospects created, ${job.duplicates_removed} duplicates removed.`,
    startedAt: job.started_at, completedAt,
  });

  // Hand off straight to Research & Qualification for whatever this job
  // actually created — the only automatic chaining between agents.
  const newProspects = await sql`select id from prospects where source_job_id = ${job.id} and pipeline_stage = 'DISCOVERED'`;
  if (newProspects.length) {
    const prospectIds = newProspects.map((p) => p.id);
    const jobCode = await nextJobCode(sql);
    const [researchJob] = await sql`
      insert into agent_jobs (job_code, agent_id, job_type, industry, location, requested_count, status, cursor, created_by)
      values (${jobCode}, 'research_qualification', 'RESEARCH', ${job.industry}, ${job.location}, ${prospectIds.length}, 'QUEUED', ${sql.json({ prospectIds, index: 0 })}, 'system')
      returning id
    `;
    await sql`update prospects set pipeline_stage = 'RESEARCH_QUEUED', updated_at = now() where id in ${sql(prospectIds)}`;
    await logEvent(sql, {
      agentId: "research_qualification", jobId: researchJob.id, eventType: "JOB_QUEUED", status: "INFO",
      message: `Research job ${jobCode} auto-queued for ${prospectIds.length} prospect(s) from ${job.job_code}.`,
    });
  }

  return { ranStep: true, action: "job_completed", jobId: job.id, status };
}

async function handleDiscoveryFailure(sql, job, err, errorType) {
  const attempts = job.attempts + 1;
  const willRetry = attempts < job.max_attempts;
  const status = willRetry ? "QUEUED" : "NEEDS_ADMIN_ATTENTION";
  await sql`update agent_jobs set attempts = ${attempts}, status = ${status}, updated_at = now() where id = ${job.id}`;
  if (!willRetry) {
    await sql`update agents set status = 'NEEDS_ADMIN_ATTENTION', last_failure_at = now(), jobs_failed = jobs_failed + 1, updated_at = now() where agent_id = 'lead_finder'`;
  }
  await logError(sql, { agentId: "lead_finder", jobId: job.id, errorType, description: err.message, attemptCount: attempts, retryAvailable: willRetry, adminActionRequired: !willRetry });
  await logEvent(sql, {
    agentId: "lead_finder", jobId: job.id, eventType: "JOB_STEP_FAILED", status: "ERROR",
    message: `Job ${job.job_code} attempt ${attempts}/${job.max_attempts} failed: ${err.message}`, errorDetails: err.stack,
  });
  return { ranStep: true, action: "job_failed", jobId: job.id, attempts, willRetry };
}

/* =============== Business Research & Qualification =============== */

async function processOneResearchCandidate(sql, job) {
  if (job.status === "QUEUED") {
    const startedAt = new Date();
    await sql`update agent_jobs set status = 'RUNNING', started_at = ${startedAt}, updated_at = now() where id = ${job.id}`;
    await sql`update agents set status = 'RUNNING', current_job_id = ${job.id}, last_started_at = ${startedAt}, updated_at = now() where agent_id = 'research_qualification'`;
    await logEvent(sql, { agentId: "research_qualification", jobId: job.id, eventType: "JOB_STARTED", status: "INFO", message: `Research job ${job.job_code} started for ${job.requested_count} prospect(s).` });
    job = { ...job, status: "RUNNING", started_at: startedAt };
  }

  const cursor = job.cursor || { prospectIds: [], index: 0 };
  const { prospectIds, index } = cursor;
  if (index >= prospectIds.length) {
    return await completeResearchJob(sql, job);
  }

  const prospectId = prospectIds[index];
  const [prospect] = await sql`select * from prospects where id = ${prospectId}`;
  if (!prospect) {
    await sql`update agent_jobs set cursor = ${sql.json({ prospectIds, index: index + 1 })}, updated_at = now() where id = ${job.id}`;
    return { ranStep: true, action: "prospect_missing_skipped", jobId: job.id };
  }

  let [research] = await sql`select * from prospect_research where prospect_id = ${prospectId}`;
  if (!research) {
    [research] = await sql`insert into prospect_research (prospect_id, job_id, status) values (${prospectId}, ${job.id}, 'RUNNING') returning *`;
  } else {
    await sql`update prospect_research set status = 'RUNNING', started_at = coalesce(started_at, now()), updated_at = now() where id = ${research.id}`;
  }
  await sql`update prospects set pipeline_stage = 'RESEARCH_STARTED', updated_at = now() where id = ${prospectId}`;

  const startedAt = new Date();
  const site = await fetchWebsiteText(prospect.website);

  try {
    const { result, usage } = await researchAndQualify({
      businessName: prospect.business_name, industry: prospect.industry, location: prospect.location,
      address: prospect.address, phone: prospect.phone, website: prospect.website,
      websiteText: site.text, websiteFetchStatus: site.status,
    });
    const cost = estimateCostUsd(usage.model, usage.inputTokens, usage.outputTokens);
    await logUsage(sql, {
      agentId: "research_qualification", jobId: job.id, prospectId, usageType: "AI_CALL", provider: "anthropic",
      model: usage.model, purpose: "RESEARCH_AND_QUALIFY", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      estimatedCostUsd: cost, durationMs: usage.durationMs, success: true,
    });

    const completedAt = new Date();
    await sql`
      update prospect_research set status = 'COMPLETED', website_fetch_status = ${site.status}, summary = ${result.summary},
        signals = ${sql.json(result.signals || {})}, sources = ${sql.json(prospect.website ? [prospect.website] : [])}, completed_at = ${completedAt}, updated_at = now()
      where id = ${research.id}
    `;
    const lowConfidence = site.status !== "FETCHED";
    await sql`
      insert into prospect_qualification (prospect_id, score, level, rationale, signals, low_confidence)
      values (${prospectId}, ${result.score}, ${result.level}, ${result.rationale}, ${sql.json(result.signals || {})}, ${lowConfidence})
      on conflict (prospect_id) do update set score = excluded.score, level = excluded.level, rationale = excluded.rationale,
        signals = excluded.signals, low_confidence = excluded.low_confidence, admin_overridden = false, updated_at = now()
    `;
    await sql`update prospects set pipeline_stage = 'QUALIFICATION_SCORED', updated_at = now() where id = ${prospectId}`;
    await sql`update agents set records_processed = records_processed + 1, updated_at = now() where agent_id = 'research_qualification'`;
    await logEvent(sql, {
      agentId: "research_qualification", jobId: job.id, prospectId, eventType: "QUALIFICATION_SCORED", status: "SUCCESS",
      message: `Research complete for ${prospect.business_name}. Score ${result.score} — ${result.level.replace(/_/g, " ")}.`,
      startedAt, completedAt,
    });

    await sql`update agent_jobs set cursor = ${sql.json({ prospectIds, index: index + 1 })}, updated_at = now() where id = ${job.id}`;
    return { ranStep: true, action: "research_completed", jobId: job.id, prospectId, level: result.level, score: result.score };
  } catch (err) {
    const usage = err.usage || {};
    await logUsage(sql, {
      agentId: "research_qualification", jobId: job.id, prospectId, usageType: "AI_CALL", provider: "anthropic",
      model: usage.model, purpose: "RESEARCH_AND_QUALIFY", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      estimatedCostUsd: null, durationMs: usage.durationMs, success: false, error: err.message,
    });

    // Not configured at all — no point burning through the rest of the
    // queue hitting the same error. Stop the whole job for admin action.
    if (err.code === "AI_NOT_CONFIGURED") {
      await sql`update agent_jobs set status = 'NEEDS_ADMIN_ATTENTION', updated_at = now() where id = ${job.id}`;
      await sql`update agents set status = 'NEEDS_ADMIN_ATTENTION', last_failure_at = now(), updated_at = now() where agent_id = 'research_qualification'`;
      await logError(sql, { agentId: "research_qualification", jobId: job.id, prospectId, errorType: "AI_PROVIDER_NOT_CONFIGURED", description: "ANTHROPIC_API_KEY is not set — the Research & Qualification Agent cannot run.", retryAvailable: true, adminActionRequired: true });
      await logEvent(sql, { agentId: "research_qualification", jobId: job.id, prospectId, eventType: "JOB_STEP_FAILED", status: "ERROR", message: "Research job paused: AI provider not configured." });
      return { ranStep: true, action: "job_needs_attention", jobId: job.id, reason: "AI_NOT_CONFIGURED" };
    }

    const newAttempts = research.attempts + 1;
    const willRetry = newAttempts < RESEARCH_MAX_ATTEMPTS;
    const errorType = err.code || (site.status === "UNREACHABLE" ? "WEBSITE_UNREACHABLE" : "RESEARCH_FAILED");
    await sql`update prospect_research set status = ${willRetry ? "QUEUED" : "FAILED"}, attempts = ${newAttempts}, error = ${err.message}, website_fetch_status = ${site.status}, updated_at = now() where id = ${research.id}`;
    await logError(sql, { agentId: "research_qualification", jobId: job.id, prospectId, errorType, description: err.message, attemptCount: newAttempts, retryAvailable: willRetry, adminActionRequired: !willRetry });
    await logEvent(sql, {
      agentId: "research_qualification", jobId: job.id, prospectId, eventType: "RESEARCH_FAILED", status: willRetry ? "WARNING" : "ERROR",
      message: `Research ${willRetry ? "attempt " + newAttempts + " " : ""}failed for ${prospect.business_name}: ${err.message}`,
    });

    // Only advance past this prospect once it's truly exhausted its
    // retries — otherwise leave the cursor put so the next step retries it.
    if (!willRetry) {
      await sql`update agent_jobs set cursor = ${sql.json({ prospectIds, index: index + 1 })}, updated_at = now() where id = ${job.id}`;
    }
    return { ranStep: true, action: willRetry ? "research_retry_scheduled" : "research_failed", jobId: job.id, prospectId, attempts: newAttempts };
  }
}

async function completeResearchJob(sql, job) {
  const completedAt = new Date();
  const [{ completed }] = await sql`select count(*)::int as completed from prospect_research where job_id = ${job.id} and status = 'COMPLETED'`;
  const [{ failed }] = await sql`select count(*)::int as failed from prospect_research where job_id = ${job.id} and status = 'FAILED'`;
  const status = failed > 0 ? "PARTIALLY_COMPLETED" : "COMPLETED";

  await sql`update agent_jobs set status = ${status}, completed_at = ${completedAt}, updated_at = now() where id = ${job.id}`;
  await sql`
    update agents set status = 'IDLE', current_job_id = null, last_completed_at = ${completedAt},
      last_success_at = ${completed > 0 ? completedAt : sql`last_success_at`}, jobs_completed = jobs_completed + 1, updated_at = now()
    where agent_id = 'research_qualification'
  `;
  await logEvent(sql, {
    agentId: "research_qualification", jobId: job.id, eventType: "JOB_COMPLETED", status: "SUCCESS",
    message: `Research job ${job.job_code} ${status.toLowerCase().replace("_", " ")}: ${completed} researched, ${failed} failed.`,
    startedAt: job.started_at, completedAt,
  });
  return { ranStep: true, action: "job_completed", jobId: job.id, status };
}
