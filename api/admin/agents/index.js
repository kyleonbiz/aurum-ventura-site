// Handles the AI Agent Operations dashboard's read views (overview,
// activity, errors, jobs list/detail) and write actions (create job,
// retry job, queue unresearched) in one function — merged from what
// were previously overview.js, activity.js, errors.js, jobs.js,
// jobs/[id].js, jobs/[id]/retry.js, and research/queue-unresearched.js.
// See api/upload/index.js for why (Vercel's 12-function Hobby cap).
// run-step.js is deliberately NOT merged here — Vercel Cron's `path`
// config points at it directly, and that's the one piece not worth any
// risk of disruption.
//
// vercel.json rewrites the original URLs to /api/admin/agents with a
// `view` (and sometimes `id`/`action`) query param; callers, including
// any future dashboard frontend, are unaffected.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";
import { logEvent, nextJobCode } from "../../_lib/agents.js";

const MAX_REQUESTED_COUNT = 100; // budget guard: max businesses per job

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const { view, id, action } = req.query;

  if (view === "overview") return req.method === "GET" ? handleOverview(req, res) : methodNotAllowed(res);
  if (view === "activity") return req.method === "GET" ? handleActivity(req, res) : methodNotAllowed(res);
  if (view === "errors") return req.method === "GET" ? handleErrors(req, res) : methodNotAllowed(res);
  if (view === "research-queue") return req.method === "POST" ? handleQueueUnresearched(req, res) : methodNotAllowed(res);
  if (view === "jobs") {
    if (req.method === "GET") return id ? handleJobDetail(req, res, id) : handleJobsList(req, res);
    if (req.method === "POST") {
      if (id && action === "retry") return handleJobRetry(req, res, id);
      if (!id) return handleJobCreate(req, res);
    }
    return methodNotAllowed(res);
  }
  return res.status(404).json({ error: "not_found" });
}

function methodNotAllowed(res) { return res.status(405).json({ error: "method_not_allowed" }); }
function notConfigured(res) { return res.status(503).json({ error: "not_configured", message: "Database is not configured." }); }

// ---------------------------------------------------------------------
// view=overview
// ---------------------------------------------------------------------
async function handleOverview(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const agents = await sql`select * from agents order by created_at asc`;

    const [jobsRunning] = await sql`select count(*)::int as n from agent_jobs where status = 'RUNNING'`;
    const [jobsQueued] = await sql`select count(*)::int as n from agent_jobs where status = 'QUEUED'`;
    const [jobsCompletedToday] = await sql`
      select count(*)::int as n from agent_jobs
      where status in ('COMPLETED','PARTIALLY_COMPLETED') and completed_at >= date_trunc('day', now())
    `;
    const [jobsFailed] = await sql`select count(*)::int as n from agent_jobs where status in ('FAILED','NEEDS_ADMIN_ATTENTION')`;
    const [prospectsToday] = await sql`select count(*)::int as n from prospects where created_at >= date_trunc('day', now())`;
    const [errorsOpen] = await sql`select count(*)::int as n from agent_errors where resolved = false`;

    const [researched] = await sql`select count(*)::int as n from prospect_research where status = 'COMPLETED'`;
    const [highPriority] = await sql`select count(*)::int as n from prospect_qualification where level = 'HIGH_PRIORITY'`;
    const prospectsResearched = researched.n;
    const highPriorityProspects = highPriority.n;
    const outreachDraftsCreated = 0;
    const draftsAwaitingReview = 0;

    const activeAgents = agents.filter((a) => ["RUNNING", "QUEUED", "WAITING"].includes(a.status)).length;

    const today = await sql`
      select
        count(*) filter (where usage_type = 'AI_CALL')::int as ai_requests,
        count(*) filter (where usage_type = 'SEARCH_API_CALL')::int as search_requests,
        sum(estimated_cost_usd) filter (where usage_type = 'AI_CALL') as ai_cost,
        count(*) filter (where usage_type = 'AI_CALL' and estimated_cost_usd is null)::int as ai_cost_unpriced
      from agent_usage where created_at >= date_trunc('day', now())
    `;
    const monthCost = await sql`
      select sum(estimated_cost_usd) as ai_cost, count(*) filter (where estimated_cost_usd is null)::int as unpriced
      from agent_usage where usage_type = 'AI_CALL' and created_at >= date_trunc('month', now())
    `;
    const t = today[0];
    const aiCostToday = t.ai_cost_unpriced > 0 ? "NOT AVAILABLE" : (t.ai_cost !== null ? `$${Number(t.ai_cost).toFixed(4)}` : (t.ai_requests > 0 ? "$0.0000" : "NOT AVAILABLE"));
    const aiCostMonth = monthCost[0].unpriced > 0 ? "NOT AVAILABLE" : (monthCost[0].ai_cost !== null ? `$${Number(monthCost[0].ai_cost).toFixed(4)}` : "NOT AVAILABLE");

    return res.status(200).json({
      metrics: {
        activeAgents,
        jobsRunning: jobsRunning.n,
        jobsQueued: jobsQueued.n,
        jobsCompletedToday: jobsCompletedToday.n,
        jobsFailed: jobsFailed.n,
        prospectsDiscoveredToday: prospectsToday.n,
        prospectsResearched,
        highPriorityProspects,
        outreachDraftsCreated,
        draftsAwaitingReview,
        agentErrorsRequiringAttention: errorsOpen.n,
        aiRequestsToday: t.ai_requests,
        searchApiRequestsToday: t.search_requests,
        estimatedAiCostToday: aiCostToday,
        estimatedAiCostThisMonth: aiCostMonth,
      },
      agents: agents.map((a) => ({
        agentId: a.agent_id,
        agentName: a.agent_name,
        agentType: a.agent_type,
        status: a.status,
        currentJobId: a.current_job_id,
        lastStartedAt: a.last_started_at,
        lastCompletedAt: a.last_completed_at,
        lastSuccessAt: a.last_success_at,
        lastFailureAt: a.last_failure_at,
        jobsCompleted: a.jobs_completed,
        jobsFailed: a.jobs_failed,
        recordsProcessed: a.records_processed,
      })),
    });
  } catch (err) {
    console.error("admin/agents overview failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading the agent dashboard." });
  }
}

// ---------------------------------------------------------------------
// view=activity
// ---------------------------------------------------------------------
async function handleActivity(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const limit = Math.min(parseInt(req.query?.limit, 10) || 50, 200);
    const rows = await sql`
      select e.*, j.job_code from agent_events e
      left join agent_jobs j on j.id = e.job_id
      order by e.created_at desc limit ${limit}
    `;
    return res.status(200).json({
      events: rows.map((e) => ({
        id: e.id,
        agentId: e.agent_id,
        jobId: e.job_id,
        jobCode: e.job_code,
        prospectId: e.prospect_id,
        eventType: e.event_type,
        message: e.message,
        status: e.status,
        durationMs: e.duration_ms,
        errorDetails: e.error_details,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error("admin/agents activity failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=errors
// ---------------------------------------------------------------------
async function handleErrors(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const rows = await sql`
      select e.*, j.job_code, j.industry, j.location, a.agent_name from agent_errors e
      left join agent_jobs j on j.id = e.job_id
      left join agents a on a.agent_id = e.agent_id
      order by e.resolved asc, e.created_at desc
      limit 200
    `;
    return res.status(200).json({
      errors: rows.map((e) => ({
        id: e.id,
        agentId: e.agent_id,
        agentName: e.agent_name,
        jobId: e.job_id,
        jobCode: e.job_code,
        industry: e.industry,
        location: e.location,
        prospectId: e.prospect_id,
        errorType: e.error_type,
        description: e.description,
        attemptCount: e.attempt_count,
        lastAttemptAt: e.last_attempt_at,
        retryAvailable: e.retry_available,
        adminActionRequired: e.admin_action_required,
        resolved: e.resolved,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error("admin/agents errors failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=jobs (list / create)
// ---------------------------------------------------------------------
async function handleJobsList(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const { status, agentId, limit } = req.query || {};
    const rows = await sql`
      select j.*, a.agent_name
      from agent_jobs j
      join agents a on a.agent_id = j.agent_id
      where (${status || null}::text is null or j.status = ${status || null})
        and (${agentId || null}::text is null or j.agent_id = ${agentId || null})
      order by j.created_at desc
      limit ${Math.min(parseInt(limit, 10) || 100, 200)}
    `;
    return res.status(200).json({ jobs: rows.map(serializeJob) });
  } catch (err) {
    console.error("admin/agents jobs list failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

async function handleJobCreate(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  const { industry, location, requestedCount } = req.body || {};
  if (!industry || typeof industry !== "string" || !industry.trim()) {
    return res.status(400).json({ error: "invalid_input", message: "industry is required." });
  }
  if (!location || typeof location !== "string" || !location.trim()) {
    return res.status(400).json({ error: "invalid_input", message: "location is required." });
  }
  const count = Math.max(1, Math.min(parseInt(requestedCount, 10) || 25, MAX_REQUESTED_COUNT));

  try {
    const jobCode = await nextJobCode(sql);
    const [job] = await sql`
      insert into agent_jobs (job_code, agent_id, job_type, industry, location, requested_count, status, created_by)
      values (${jobCode}, 'lead_finder', 'DISCOVERY', ${industry.trim()}, ${location.trim()}, ${count}, 'QUEUED', 'admin')
      returning *
    `;
    await logEvent(sql, {
      agentId: "lead_finder",
      jobId: job.id,
      eventType: "JOB_QUEUED",
      message: `Job ${jobCode} queued: ${industry.trim()} — ${location.trim()} (requested ${count})`,
      status: "INFO",
    });
    return res.status(201).json({ job: serializeJob({ ...job, agent_name: "Lead Finder Agent" }) });
  } catch (err) {
    console.error("admin/agents job create failed", err);
    return res.status(500).json({ error: "server_error", message: "Could not create job." });
  }
}

function serializeJob(j) {
  return {
    id: j.id,
    jobCode: j.job_code,
    agentId: j.agent_id,
    agentName: j.agent_name,
    jobType: j.job_type,
    industry: j.industry,
    location: j.location,
    requestedCount: j.requested_count,
    status: j.status,
    businessesFound: j.businesses_found,
    duplicatesRemoved: j.duplicates_removed,
    existingClientsExcluded: j.existing_clients_excluded,
    suppressedExcluded: j.suppressed_excluded,
    newProspectsCreated: j.new_prospects_created,
    attempts: j.attempts,
    maxAttempts: j.max_attempts,
    startedAt: j.started_at,
    completedAt: j.completed_at,
    createdAt: j.created_at,
    runtimeMs: j.started_at ? new Date(j.completed_at || Date.now()) - new Date(j.started_at) : null,
  };
}

// ---------------------------------------------------------------------
// view=jobs&id=X (detail)
// ---------------------------------------------------------------------
async function handleJobDetail(req, res, id) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const [job] = await sql`
      select j.*, a.agent_name from agent_jobs j join agents a on a.agent_id = j.agent_id where j.id = ${id}
    `;
    if (!job) return res.status(404).json({ error: "not_found" });

    const tasks = await sql`select * from agent_tasks where job_id = ${id} order by created_at asc`;
    const events = await sql`select * from agent_events where job_id = ${id} order by created_at desc limit 200`;
    const errors = await sql`select * from agent_errors where job_id = ${id} order by created_at desc`;

    const isResearch = job.job_type === "RESEARCH";
    const prospects = isResearch
      ? await sql`
          select p.id, p.business_name, p.pipeline_stage, p.address, p.phone, p.website, p.created_at,
            r.status as research_status, r.summary as research_summary,
            q.score as qualification_score, q.level as qualification_level, q.low_confidence
          from prospect_research r
          join prospects p on p.id = r.prospect_id
          left join prospect_qualification q on q.prospect_id = p.id
          where r.job_id = ${id}
          order by p.created_at desc
        `
      : await sql`select id, business_name, pipeline_stage, address, phone, website, created_at from prospects where source_job_id = ${id} order by created_at desc`;

    return res.status(200).json({
      job: {
        id: job.id,
        jobCode: job.job_code,
        agentId: job.agent_id,
        agentName: job.agent_name,
        jobType: job.job_type,
        industry: job.industry,
        location: job.location,
        requestedCount: job.requested_count,
        status: job.status,
        businessesFound: job.businesses_found,
        duplicatesRemoved: job.duplicates_removed,
        existingClientsExcluded: job.existing_clients_excluded,
        suppressedExcluded: job.suppressed_excluded,
        newProspectsCreated: job.new_prospects_created,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
      },
      tasks: tasks.map((t) => ({ id: t.id, taskType: t.task_type, status: t.status, attempts: t.attempts, error: t.error, startedAt: t.started_at, completedAt: t.completed_at })),
      events: events.map((e) => ({ id: e.id, eventType: e.event_type, message: e.message, status: e.status, createdAt: e.created_at, durationMs: e.duration_ms })),
      errors: errors.map((e) => ({ id: e.id, errorType: e.error_type, description: e.description, attemptCount: e.attempt_count, retryAvailable: e.retry_available, adminActionRequired: e.admin_action_required, resolved: e.resolved, createdAt: e.created_at })),
      prospects,
    });
  } catch (err) {
    console.error("admin/agents job detail failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=jobs&id=X&action=retry
// ---------------------------------------------------------------------
async function handleJobRetry(req, res, id) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const [job] = await sql`select * from agent_jobs where id = ${id}`;
    if (!job) return res.status(404).json({ error: "not_found" });
    if (!["FAILED", "NEEDS_ADMIN_ATTENTION"].includes(job.status)) {
      return res.status(400).json({ error: "invalid_state", message: `Job is ${job.status}, not retryable.` });
    }
    if (job.attempts >= job.max_attempts) {
      return res.status(400).json({ error: "retry_limit_reached", message: `Job already used all ${job.max_attempts} attempts. Increase max_attempts to retry again.` });
    }

    await sql`update agent_jobs set status = 'QUEUED', updated_at = now() where id = ${id}`;
    await sql`update agents set status = 'QUEUED', updated_at = now() where agent_id = ${job.agent_id} and status = 'NEEDS_ADMIN_ATTENTION'`;
    await logEvent(sql, {
      agentId: job.agent_id, jobId: job.id, eventType: "JOB_RETRIED", status: "INFO",
      message: `Admin retried job ${job.job_code} (attempt ${job.attempts + 1}/${job.max_attempts}).`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("admin/agents job retry failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=research-queue
// ---------------------------------------------------------------------
async function handleQueueUnresearched(req, res) {
  let sql;
  try { sql = db(); } catch { return notConfigured(res); }

  try {
    const rows = await sql`select id from prospects where pipeline_stage = 'DISCOVERED' order by created_at asc limit 200`;
    if (!rows.length) return res.status(200).json({ ok: true, queued: 0, message: "No unresearched prospects found." });

    const prospectIds = rows.map((r) => r.id);
    const jobCode = await nextJobCode(sql);
    const [job] = await sql`
      insert into agent_jobs (job_code, agent_id, job_type, requested_count, status, cursor, created_by)
      values (${jobCode}, 'research_qualification', 'RESEARCH', ${prospectIds.length}, 'QUEUED', ${sql.json({ prospectIds, index: 0 })}, 'admin')
      returning id
    `;
    await sql`update prospects set pipeline_stage = 'RESEARCH_QUEUED', updated_at = now() where id in ${sql(prospectIds)}`;
    await logEvent(sql, {
      agentId: "research_qualification", jobId: job.id, eventType: "JOB_QUEUED", status: "INFO",
      message: `Admin manually queued research job ${jobCode} for ${prospectIds.length} previously-unresearched prospect(s).`,
    });
    return res.status(201).json({ ok: true, queued: prospectIds.length, jobId: job.id, jobCode });
  } catch (err) {
    console.error("admin/agents queue-unresearched failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}
