// POST /api/admin/agents/jobs/:id/retry — Admin-triggered retry for a
// job stuck in NEEDS_ADMIN_ATTENTION or FAILED. Resets it to QUEUED so
// the next run-step pass tries again, WITHOUT resetting the attempts
// counter (so the configurable max_attempts limit still applies across
// the retry — this does not grant unlimited retries).
import { db } from "../../../../_lib/db.js";
import { requireAdmin } from "../../../../_lib/adminAuth.js";
import { logEvent } from "../../../../_lib/agents.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

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
    console.error("admin/agents/jobs/[id]/retry failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}
