// POST /api/upload/complete
// Body (JSON): { uploadId }
// Finalizes the upload: requires at least one file already attached,
// flips status to "NEW — NEEDS REVIEW", creates the linked administrative
// request, and (best-effort) sends the client + internal emails.
import { db } from "../_lib/db.js";
import { isSameOriginRequest } from "../_lib/auth.js";
import { clientIp } from "../_lib/ratelimit.js";
import { sendClientConfirmationEmail, sendInternalNotificationEmail, isEmailConfigured } from "../_lib/email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const { uploadId } = req.body || {};
  if (!uploadId) return res.status(400).json({ error: "missing_fields", message: "Missing upload session." });

  const ip = clientIp(req);
  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("upload/complete config error", err);
    return res.status(503).json({ error: "not_configured", message: "Document upload isn't fully set up yet. Please contact Aurum Ventura directly for now." });
  }

  try {
    const [upload] = await sql`select * from uploads where id = ${uploadId}`;
    if (!upload) return res.status(404).json({ error: "not_found", message: "Upload session not found — please start over." });

    // Idempotent replay: a duplicate submit (double-click, refresh, retried
    // request) lands here after the first call already finished — just
    // hand back the same confirmation instead of erroring or double-firing
    // emails/requests.
    if (upload.status !== "PENDING_FILES") {
      return res.status(200).json({
        referenceNumber: upload.reference_number,
        fileCount: upload.file_count,
        category: upload.category,
        requestedAction: upload.requested_action,
      });
    }

    const [{ count: fileCount }] = await sql`select count(*)::int as count from upload_files where upload_id = ${uploadId}`;
    if (fileCount < 1) {
      return res.status(400).json({ error: "no_files", message: "Add at least one file before submitting." });
    }

    await sql`
      update uploads
      set status = 'NEW — NEEDS REVIEW', file_count = ${fileCount}, received_at = now(), updated_at = now()
      where id = ${uploadId}
    `;

    await sql`
      insert into administrative_requests (client_id, upload_reference, category, description, requested_action, status, priority, received_at)
      values (${upload.client_id}, ${upload.reference_number}, ${upload.category}, ${upload.document_description}, ${upload.requested_action}, 'NEW', 'NORMAL', now())
    `;

    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${uploadId}, 'upload_completed', ${sql.json({ fileCount })}, ${ip})`;

    // Emails are best-effort and never roll back the upload — the files
    // and database record are already safely stored by this point.
    await sendEmails(sql, upload, fileCount, ip);

    return res.status(200).json({
      referenceNumber: upload.reference_number,
      fileCount,
      category: upload.category,
      requestedAction: upload.requested_action,
    });
  } catch (err) {
    console.error("upload/complete failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  }
}

async function sendEmails(sql, upload, fileCount, ip) {
  if (!isEmailConfigured()) {
    await sql`update uploads set confirmation_email_status = 'NOT_APPLICABLE' where id = ${upload.id}`;
    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${upload.id}, 'email_not_configured', null, ${ip})`;
    return;
  }

  let clientEmailOk = true;
  try {
    await sendClientConfirmationEmail({
      to: upload.submitted_email,
      contactName: null,
      referenceNumber: upload.reference_number,
      fileCount,
      category: upload.category,
      documentDescription: upload.document_description,
      requestedAction: upload.requested_action,
    });
    await sql`update uploads set confirmation_email_status = 'SENT' where id = ${upload.id}`;
  } catch (err) {
    clientEmailOk = false;
    console.error("client confirmation email failed", err);
    await sql`update uploads set confirmation_email_status = 'FAILED' where id = ${upload.id}`;
    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${upload.id}, 'confirmation_email_failed', ${sql.json({ error: String(err.message || err) })}, ${ip})`;
  }

  try {
    await sendInternalNotificationEmail({
      clientLegalName: upload.client_legal_name,
      submittedByName: null,
      submittedEmail: upload.submitted_email,
      category: upload.category,
      documentDescription: upload.document_description,
      requestedAction: upload.requested_action,
      fileCount,
      referenceNumber: upload.reference_number,
      adminRecordUrl: null, // no Admin OS API to link to yet — see UPLOAD_SETUP.md
    });
  } catch (err) {
    console.error("internal notification email failed", err);
    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${upload.id}, 'internal_notification_failed', ${sql.json({ error: String(err.message || err), clientEmailAlsoFailed: !clientEmailOk })}, ${ip})`;
  }
}
