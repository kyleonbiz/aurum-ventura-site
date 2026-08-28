// POST /api/upload/file  (multipart/form-data: fields `uploadId`, `file`)
//
// One file per call, on purpose — Vercel's Node serverless functions cap
// request bodies at a few MB, so a single "send everything at once"
// endpoint would silently fail on real multi-file submissions. Splitting
// into one request per file keeps each request small, gives real
// per-file progress in the UI, and means one bad file can't take the
// whole submission down (see MAX_FILE_SIZE_BYTES in validate.js).
import { readFile, unlink } from "node:fs/promises";
import formidable from "formidable";
import { db } from "../_lib/db.js";
import { isSameOriginRequest } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { validateFile, sanitizeOriginalFilename, generatedStoredFilename, MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE_BYTES } from "../_lib/validate.js";
import { uploadFileToStorage, isStorageConfigured } from "../_lib/dropbox.js";
import { scanFile } from "../_lib/scan.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const ip = clientIp(req);
  let sql;
  try {
    sql = db();
    // Generous ceiling: a real session sends up to MAX_FILES_PER_UPLOAD
    // requests here, one per file.
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
  } catch (err) {
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

    // Abstraction call — see scan.js. Not gating on the result: no scanner
    // is configured for this project yet, so `clean` is always null; this
    // call exists so wiring in a real scanner later is a one-file change.
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
    console.error("upload/file failed", err);
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

function configErrorResponse(res, err) {
  console.error("upload/file config error", err);
  return res.status(503).json({
    error: "not_configured",
    message: "Document upload isn't fully set up yet. Please contact Aurum Ventura directly for now.",
  });
}
