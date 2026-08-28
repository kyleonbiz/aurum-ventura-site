// POST /api/admin/intakes/:id/request-info  { message }
import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { logAudit } from "../../../_lib/audit.js";
import { clientIp } from "../../../_lib/ratelimit.js";
import { sendIntakeMoreInfoRequestedEmail, isEmailConfigured } from "../../../_lib/email.js";
import { isMeaningfulText } from "../../../../shared/uploadShared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  const { message } = req.body || {};
  const ip = clientIp(req);

  if (!isMeaningfulText(message, 10)) {
    return res.status(400).json({ error: "invalid_message", message: "Describe what additional information is needed." });
  }

  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("request-info config error", err);
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  try {
    const [intake] = await sql`select * from intake_requests where id = ${id}`;
    if (!intake) return res.status(404).json({ error: "not_found", message: "Intake not found." });
    if (intake.status === "APPROVED") return res.status(409).json({ error: "invalid_status", message: "This intake has already been approved." });

    await sql`
      update intake_requests
      set status = 'MORE INFORMATION REQUIRED', admin_message = ${message.trim()}, reviewed_at = now(), reviewed_by = 'admin', updated_at = now()
      where id = ${id}
    `;
    await logAudit({ actor: "admin", action: "intake_more_info_requested", entityType: "intake_request", entityId: id, detail: { message: message.trim() }, ip });

    if (isEmailConfigured()) {
      try {
        await sendIntakeMoreInfoRequestedEmail({
          to: intake.primary_contact_email,
          contactName: intake.primary_contact_name,
          companyName: intake.legal_name,
          referenceNumber: intake.reference_number,
          adminMessage: message.trim(),
        });
      } catch (err) {
        console.error("more-info email failed", err);
        await logAudit({ actor: "system", action: "intake_more_info_email_failed", entityType: "intake_request", entityId: id, detail: { error: String(err.message || err) }, ip });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("request-info failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong. Please try again." });
  }
}
