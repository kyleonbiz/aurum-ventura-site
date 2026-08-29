// POST /api/admin/agents/run-step — advances the Lead Finder Agent by
// exactly one unit of work, then returns. Designed to be called either:
//   - by Vercel Cron (Authorization: Bearer <CRON_SECRET>), or
//   - by an admin clicking "Run Next Step" in the dashboard (session
//     cookie) — useful on Vercel plans where Cron only fires daily.
//
// One call = one step, by design (see "DO NOT automatically rerun
// failed actions forever" / no unbounded background loop): a QUEUED job
// gets geocoded + one discovery batch fetched (this is the expensive,
// rate-limited part — done once per job, not per step); a RUNNING job
// with pending candidates gets exactly one candidate processed
// (dedup-checked, inserted or skipped). Call it repeatedly to drain a
// job; nothing here loops internally.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";
import { logEvent, logError } from "../../_lib/agents.js";
import { discoverBusinesses, dedupeKeyFor } from "../../_lib/leadFinder.js";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || "";
  if (secret && header === `Bearer ${secret}`) return true;
  return false;
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
    // 1. A RUNNING job with unprocessed candidates takes priority —
    // finish work already in flight before starting something new.
    const [running] = await sql`
      select * from agent_jobs where agent_id = 'lead_finder' and status = 'RUNNING' order by started_at asc limit 1
    `;
    if (running) return res.status(200).json(await processOneCandidate(sql, running));

    // 2. Otherwise pick up the oldest QUEUED job and fetch its
    // discovery batch (the one network-heavy step per job).
    const [queued] = await sql`
      select * from agent_jobs where agent_id = 'lead_finder' and status = 'QUEUED' order by created_at asc limit 1
    `;
    if (queued) return res.status(200).json(await startJob(sql, queued));

    return res.status(200).json({ ranStep: false, message: "No queued or running Lead Finder jobs." });
  } catch (err) {
    console.error("admin/agents/run-step failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}

async function startJob(sql, job) {
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
    return await handleJobFailure(sql, job, err, "SEARCH_API_FAILED");
  }
}

async function processOneCandidate(sql, job) {
  const cursor = job.cursor || { candidates: [], index: 0 };
  const { candidates, index } = cursor;

  const doneByCount = job.new_prospects_created >= job.requested_count;
  const doneByExhaustion = index >= candidates.length;
  if (doneByCount || doneByExhaustion) {
    return await completeJob(sql, job, doneByCount ? "COMPLETED" : (job.new_prospects_created > 0 ? "PARTIALLY_COMPLETED" : "PARTIALLY_COMPLETED"));
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

async function completeJob(sql, job, status) {
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
  return { ranStep: true, action: "job_completed", jobId: job.id, status };
}

async function handleJobFailure(sql, job, err, errorType) {
  const attempts = job.attempts + 1;
  const willRetry = attempts < job.max_attempts;
  const status = willRetry ? "QUEUED" : "NEEDS_ADMIN_ATTENTION";
  await sql`update agent_jobs set attempts = ${attempts}, status = ${status}, updated_at = now() where id = ${job.id}`;
  if (!willRetry) {
    await sql`update agents set status = 'NEEDS_ADMIN_ATTENTION', last_failure_at = now(), jobs_failed = jobs_failed + 1, updated_at = now() where agent_id = 'lead_finder'`;
  }
  await logError(sql, {
    agentId: "lead_finder", jobId: job.id, errorType, description: err.message,
    attemptCount: attempts, retryAvailable: willRetry, adminActionRequired: !willRetry,
  });
  await logEvent(sql, {
    agentId: "lead_finder", jobId: job.id, eventType: "JOB_STEP_FAILED", status: "ERROR",
    message: `Job ${job.job_code} attempt ${attempts}/${job.max_attempts} failed: ${err.message}`,
    errorDetails: err.stack,
  });
  return { ranStep: true, action: "job_failed", jobId: job.id, attempts, willRetry };
}
