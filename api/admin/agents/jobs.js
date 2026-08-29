// GET  /api/admin/agents/jobs — list jobs (Job History), newest first.
// POST /api/admin/agents/jobs  { industry, location, requestedCount } —
//      starts a new Lead Finder discovery job (status QUEUED). The job
//      doesn't actually discover anything until run-step.js advances
//      it (via cron or the dashboard's "Run Next Step" control) — this
//      endpoint only ever creates the QUEUED row + activity event.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";
import { logEvent, nextJobCode } from "../../_lib/agents.js";

const MAX_REQUESTED_COUNT = 100; // budget guard: max businesses per job

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  if (req.method === "GET") {
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
      console.error("admin/agents/jobs list failed", err);
      return res.status(500).json({ error: "server_error" });
    }
  }

  if (req.method === "POST") {
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
      console.error("admin/agents/jobs create failed", err);
      return res.status(500).json({ error: "server_error", message: "Could not create job." });
    }
  }

  return res.status(405).json({ error: "method_not_allowed" });
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
