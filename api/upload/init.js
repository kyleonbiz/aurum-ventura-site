// POST /api/upload/init
// Body (JSON): { uploadCode, email, category, documentDescription, requestedAction, additionalNotes, idempotencyKey }
// Validates the upload code + client email, creates the upload record in
// PENDING_FILES status, and hands back an uploadId the browser then
// attaches each file to via /api/upload/file.
import { db } from "../_lib/db.js";
import { isValidUploadCode, lookupClientByEmail, isSameOriginRequest } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { CATEGORIES, MIN_DESCRIPTION_LENGTH, MIN_REQUESTED_ACTION_LENGTH, isValidEmail, isMeaningfulText } from "../_lib/validate.js";
import { withUniqueReferenceNumber } from "../_lib/refnum.js";
import { folderPathFor } from "../_lib/dropbox.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const ip = clientIp(req);
  try {
    const allowed = await checkRateLimit("upload_init", ip);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    return configErrorResponse(res, err);
  }

  const { uploadCode, email, category, documentDescription, requestedAction, additionalNotes, idempotencyKey } = req.body || {};

  let codeOk;
  try {
    codeOk = isValidUploadCode(uploadCode);
  } catch (err) {
    return configErrorResponse(res, err);
  }
  if (!codeOk) {
    return res.status(400).json({ error: "invalid_code", message: "The upload code you entered is not valid." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid_email", message: "Enter a valid email address." });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "invalid_category", message: "Choose a document category." });
  }
  if (!isMeaningfulText(documentDescription, MIN_DESCRIPTION_LENGTH)) {
    return res.status(400).json({ error: "invalid_description", message: `Describe what this document is (at least ${MIN_DESCRIPTION_LENGTH} characters).` });
  }
  if (!isMeaningfulText(requestedAction, MIN_REQUESTED_ACTION_LENGTH)) {
    return res.status(400).json({ error: "invalid_action", message: `Tell us what you need done with it (at least ${MIN_REQUESTED_ACTION_LENGTH} characters).` });
  }
  const notes = typeof additionalNotes === "string" ? additionalNotes.slice(0, 2000) : "";

  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err);
  }

  try {
    // Idempotent replay: if the browser already got an uploadId for this
    // key (e.g. it retried after a flaky network response), hand back the
    // same one instead of creating a second record.
    if (idempotencyKey) {
      const [existing] = await sql`select id, reference_number from uploads where idempotency_key = ${idempotencyKey}`;
      if (existing) return res.status(200).json({ uploadId: existing.id, referenceNumber: existing.reference_number });
    }

    const client = await lookupClientByEmail(email);
    if (!client) {
      await sql`insert into upload_audit_log (event, detail, ip) values ('unverified_email_attempt', ${sql.json({ email })}, ${ip})`;
      return res.status(403).json({
        error: "unverified",
        message: "We could not verify this upload request. Please confirm your information or contact Aurum Ventura for assistance.",
      });
    }

    const folderPath = folderPathFor(client.clientLegalName);

    const upload = await withUniqueReferenceNumber((referenceNumber) =>
      sql`
        insert into uploads (
          reference_number, idempotency_key, client_id, client_legal_name,
          submitted_by_contact_id, submitted_email, category,
          document_description, requested_action, additional_notes,
          storage_folder_path, status
        ) values (
          ${referenceNumber}, ${idempotencyKey || null}, ${client.clientId}, ${client.clientLegalName},
          ${client.contactId}, ${email.trim().toLowerCase()}, ${category},
          ${documentDescription.trim()}, ${requestedAction.trim()}, ${notes || null},
          ${folderPath}, 'PENDING_FILES'
        )
        returning id, reference_number
      `.then((rows) => rows[0])
    );

    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${upload.id}, 'upload_init', ${sql.json({ category })}, ${ip})`;

    return res.status(200).json({ uploadId: upload.id, referenceNumber: upload.reference_number });
  } catch (err) {
    console.error("upload/init failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again shortly." });
  }
}

function configErrorResponse(res, err) {
  console.error("upload/init config error", err);
  return res.status(503).json({
    error: "not_configured",
    message: "Document upload isn't fully set up yet. Please contact Aurum Ventura directly for now.",
  });
}
