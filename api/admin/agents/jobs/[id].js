// GET /api/admin/agents/jobs/:id — single job's operational detail page:
// discovery counters, tasks, and its slice of the activity feed.
import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

  try {
    const [job] = await sql`
      select j.*, a.agent_name from agent_jobs j join agents a on a.agent_id = j.agent_id where j.id = ${id}
    `;
    if (!job) return res.status(404).json({ error: "not_found" });

    const tasks = await sql`select * from agent_tasks where job_id = ${id} order by created_at asc`;
    const events = await sql`select * from agent_events where job_id = ${id} order by created_at desc limit 200`;
    const errors = await sql`select * from agent_errors where job_id = ${id} order by created_at desc`;
    const prospects = await sql`select id, business_name, pipeline_stage, address, phone, website, created_at from prospects where source_job_id = ${id} order by created_at desc`;

    return res.status(200).json({
      job: {
        id: job.id,
        jobCode: job.job_code,
        agentId: job.agent_id,
        agentName: job.agent_name,
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
    console.error("admin/agents/jobs/[id] failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}
