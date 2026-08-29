// GET /api/admin/agents/errors — Error Center feed (unresolved first).
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

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
    console.error("admin/agents/errors failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}
