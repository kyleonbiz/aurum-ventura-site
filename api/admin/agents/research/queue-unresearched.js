// POST /api/admin/agents/research/queue-unresearched — creates a
// Research job for any prospect that's sitting at DISCOVERED with no
// research job yet. Discovery jobs auto-queue research for what they
// create (see run-step.js), so this only matters for prospects that
// existed before this feature shipped, or a research job that never
// got created for some other reason.
import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { logEvent, nextJobCode } from "../../../_lib/agents.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

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
    console.error("admin/agents/research/queue-unresearched failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}
