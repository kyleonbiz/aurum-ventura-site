// GET /api/admin/agents/activity — dashboard-wide chronological feed.
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
    console.error("admin/agents/activity failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}
