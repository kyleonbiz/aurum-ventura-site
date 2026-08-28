import { db } from "./db.js";

// General admin/system audit trail — separate from upload_audit_log
// (which is hard-scoped to the document-upload feature via a FK to
// `uploads`). Used for admin logins, intake review actions, and
// approvals, per the brief's "critical administrative actions should
// log: admin, action, intake, timestamp, result."
export async function logAudit({ actor, action, entityType, entityId, detail, ip }) {
  try {
    const sql = db();
    await sql`
      insert into audit_log (actor, action, entity_type, entity_id, detail, ip)
      values (${actor}, ${action}, ${entityType || null}, ${entityId || null}, ${detail ? sql.json(detail) : null}, ${ip || null})
    `;
  } catch (err) {
    // Audit logging is best-effort — a logging failure must never block
    // the actual operation it's describing.
    console.error("audit log write failed", err);
  }
}
