// Handles all three upload steps in one function — merged from what were
// previously api/upload/init.js, file.js, and complete.js.
//
// Why: Vercel's Hobby plan caps a deployment at 12 serverless functions
// total, shared across every feature in this project. Each file under
// api/ becomes its own function regardless of size, so consolidating
// related endpoints into fewer files (dispatched by an internal `step`)
// is how everything fits under that cap without losing any behavior.
// vercel.json rewrites the original URLs (/api/upload/init, /file,
// /complete) to /api/upload?step=..., so nothing external changed —
// the frontend still calls the same three paths it always did.
//
// bodyParser is off for the whole file (the `file` step needs the raw
// stream for formidable); the `init`/`complete` steps parse JSON
// manually via readJsonBody() below instead of relying on Vercel's
// automatic parsing.
import { readFile, unlink } from "node:fs/promises";
import formidable from "formidable";
import { db } from "../_lib/db.js";
import { isValidUploadCode, lookupClientByEmail, isSameOriginRequest } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { CATEGORIES, MIN_DESCRIPTION_LENGTH, MIN_REQUESTED_ACTION_LENGTH, isValidEmail, isMeaningfulText, validateFile, sanitizeOriginalFilename, generatedStoredFilename, MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE_BYTES } from "../_lib/validate.js";
import { withUniqueReferenceNumber } from "../_lib/refnum.js";
import { folderPathFor, uploadFileToStorage, isStorageConfigured } from "../_lib/dropbox.js";
import { scanFile } from "../_lib/scan.js";
import { sendClientConfirmationEmail, sendInternalNotificationEmail, isEmailConfigured } from "../_lib/email.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const step = req.query.step;
  if (step === "init") return handleInit(req, res);
  if (step === "file") return handleFile(req, res);
  if (step === "complete") return handleComplete(req, res);
  return res.status(404).json({ error: "not_found" });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}

function configErrorResponse(res, err) {
  console.error("upload config error", err);
  return res.status(503).json({
    error: "not_configured",
    message: "Document upload isn't fully set up yet. Please contact Aurum Ventura directly for now.",
  });
}

// ---------------------------------------------------------------------
// step=init
// ---------------------------------------------------------------------
async function handleInit(req, res) {
  const ip = clientIp(req);
  try {
    const allowed = await checkRateLimit("upload_init", ip);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    return configErrorResponse(res, err);
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "invalid_body", message: "Could not read request body." });
  }
  const { uploadCode, email, category, documentDescription, requestedAction, additionalNotes, idempotencyKey } = body;

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
    console.error("upload init failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again shortly." });
  }
}

// ---------------------------------------------------------------------
// step=file
// ---------------------------------------------------------------------
async function handleFile(req, res) {
  const ip = clientIp(req);
  let sql;
  try {
    sql = db();
    const allowed = await checkRateLimit("upload_file", ip, MAX_FILES_PER_UPLOAD * 3);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    return configErrorResponse(res, err);
  }

  if (!isStorageConfigured()) {
    return configErrorResponse(res, new Error("Dropbox not configured"));
  }

  let fields, files;
  try {
    const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES + 1024, maxFiles: 1 });
    [fields, files] = await form.parse(req);
  } catch {
    return res.status(400).json({ error: "upload_failed", message: "That file could not be read — it may be too large or corrupted." });
  }

  const uploadId = Array.isArray(fields.uploadId) ? fields.uploadId[0] : fields.uploadId;
  const fileEntry = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!uploadId || !fileEntry) {
    return res.status(400).json({ error: "missing_fields", message: "Missing upload session or file." });
  }

  try {
    const [upload] = await sql`select id, client_id, client_legal_name, status from uploads where id = ${uploadId}`;
    if (!upload) return res.status(404).json({ error: "not_found", message: "Upload session not found — please start over." });
    if (upload.status !== "PENDING_FILES") {
      return res.status(409).json({ error: "already_submitted", message: "This upload has already been submitted." });
    }

    const [{ count: existingCount }] = await sql`select count(*)::int as count from upload_files where upload_id = ${uploadId}`;
    if (existingCount >= MAX_FILES_PER_UPLOAD) {
      return res.status(400).json({ error: "too_many_files", message: `You can attach up to ${MAX_FILES_PER_UPLOAD} files per submission.` });
    }

    const originalFilename = sanitizeOriginalFilename(fileEntry.originalFilename);
    const validation = validateFile({ filename: originalFilename, mimeType: fileEntry.mimetype, size: fileEntry.size });
    if (!validation.ok) {
      await cleanupTempFile(fileEntry);
      return res.status(400).json({ error: "invalid_file", message: validation.reason });
    }

    const buffer = await readFile(fileEntry.filepath);
    await cleanupTempFile(fileEntry);

    await scanFile(buffer, originalFilename);

    const storedFilename = generatedStoredFilename(originalFilename);
    let storagePath;
    try {
      storagePath = await uploadFileToStorage({
        clientLegalName: upload.client_legal_name,
        storedFilename,
        buffer,
      });
    } catch (err) {
      console.error("dropbox upload failed", err);
      await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${uploadId}, 'storage_failed', ${sql.json({ originalFilename, error: String(err.message || err) })}, ${ip})`;
      return res.status(502).json({ error: "storage_failed", message: "We couldn't store that file just now. Please try again." });
    }

    const [fileRow] = await sql`
      insert into upload_files (
        upload_id, client_id, original_filename, stored_filename,
        mime_type, file_size, storage_path
      ) values (
        ${uploadId}, ${upload.client_id}, ${originalFilename}, ${storedFilename},
        ${fileEntry.mimetype || null}, ${fileEntry.size || buffer.length}, ${storagePath}
      )
      returning id
    `;
    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${uploadId}, 'file_uploaded', ${sql.json({ originalFilename, size: buffer.length })}, ${ip})`;

    return res.status(200).json({ fileId: fileRow.id, originalFilename, size: buffer.length });
  } catch (err) {
    console.error("upload file step failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  }
}

async function cleanupTempFile(fileEntry) {
  try {
    if (fileEntry?.filepath) await unlink(fileEntry.filepath);
  } catch {
    // best-effort — Vercel's /tmp is wiped between invocations regardless
  }
}

// ---------------------------------------------------------------------
// step=complete
// ---------------------------------------------------------------------
async function handleComplete(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "invalid_body", message: "Could not read request body." });
  }
  const { uploadId } = body;
  if (!uploadId) return res.status(400).json({ error: "missing_fields", message: "Missing upload session." });

  const ip = clientIp(req);
  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err);
  }

  try {
    const [upload] = await sql`select * from uploads where id = ${uploadId}`;
    if (!upload) return res.status(404).json({ error: "not_found", message: "Upload session not found — please start over." });

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

    await sendUploadEmails(sql, upload, fileCount, ip);

    return res.status(200).json({
      referenceNumber: upload.reference_number,
      fileCount,
      category: upload.category,
      requestedAction: upload.requested_action,
    });
  } catch (err) {
    console.error("upload complete step failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  }
}

async function sendUploadEmails(sql, upload, fileCount, ip) {
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
      adminRecordUrl: null,
    });
  } catch (err) {
    console.error("internal notification email failed", err);
    await sql`insert into upload_audit_log (upload_id, event, detail, ip) values (${upload.id}, 'internal_notification_failed', ${sql.json({ error: String(err.message || err), clientEmailAlsoFailed: !clientEmailOk })}, ${ip})`;
  }
}
