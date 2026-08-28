// POST /api/admin/intakes/:id/reject  { reason?: string }
// The internal reason is stored for the admin's own records but is
// never disclosed to the client, per the brief.
import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { logAudit } from "../../../_lib/audit.js";
import { clientIp } from "../../../_lib/ratelimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  const { reason } = req.body || {};
  const ip = clientIp(req);

  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("reject config error", err);
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  try {
    const [intake] = await sql`select id, status from intake_requests where id = ${id}`;
    if (!intake) return res.status(404).json({ error: "not_found", message: "Intake not found." });
    if (intake.status === "APPROVED") return res.status(409).json({ error: "invalid_status", message: "This intake has already been approved." });

    await sql`
      update intake_requests
      set status = 'REJECTED', rejection_reason = ${reason?.trim() || null}, reviewed_at = now(), reviewed_by = 'admin', updated_at = now()
      where id = ${id}
    `;
    await logAudit({ actor: "admin", action: "intake_rejected", entityType: "intake_request", entityId: id, detail: { reason: reason?.trim() || null }, ip });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("reject failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong. Please try again." });
  }
}
