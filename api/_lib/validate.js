// Server-side-only validation. Pure constants/checks that the frontend
// also needs live in shared/uploadShared.js instead, so the two can't
// drift apart — every check here still runs server-side regardless of
// what the frontend already checked, per "do not bypass server-side
// validation."
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD, fileExtension } from "../../shared/uploadShared.js";

export { CATEGORIES, MIN_DESCRIPTION_LENGTH, MIN_REQUESTED_ACTION_LENGTH, isValidEmail, isMeaningfulText, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD } from "../../shared/uploadShared.js";

// Extension -> allowed MIME types. Both extension AND declared MIME are
// checked; neither is fully trustworthy alone (extensions can be
// spoofed, MIME is client-declared), but together they catch honest
// mistakes and casual renames. This mapping is server-only — the
// frontend only needs the extension allowlist for its instant feedback.
const MIME_BY_EXTENSION = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  txt: ["text/plain"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

// Belt-and-suspenders explicit block, even though the allowlist above
// already excludes these by construction (default-deny is what actually
// keeps executables out — this is defense in depth, not the real gate).
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "msp", "scr", "vbs", "vbe", "js", "jse",
  "wsf", "wsh", "ps1", "psm1", "sh", "bash", "app", "dmg", "pkg", "apk",
  "jar", "deb", "rpm", "dll", "so", "dylib", "cpl", "gadget", "lnk",
]);

export function validateFile({ filename, mimeType, size }) {
  const ext = fileExtension(filename);
  if (!ext) return { ok: false, reason: "File has no extension." };
  if (BLOCKED_EXTENSIONS.has(ext)) return { ok: false, reason: "Executable and script files are not allowed." };
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `".${ext}" files are not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(", ").toUpperCase()}.` };
  }
  const allowedMimes = MIME_BY_EXTENSION[ext];
  // Some browsers/OSes send an empty or generic mimeType (esp. for .csv on
  // some systems) — only reject when a mimeType was actually declared and
  // it doesn't match, rather than requiring one.
  if (mimeType && !allowedMimes.includes(mimeType) && mimeType !== "application/octet-stream") {
    return { ok: false, reason: `"${filename}" doesn't look like a valid .${ext} file.` };
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: `"${filename}" is larger than the ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB limit.` };
  }
  return { ok: true };
}

// The ORIGINAL filename is kept only for display (in upload_files.original_filename).
// The actual storage key is always server-generated — never derived from
// untrusted client input — per the "sanitized filenames / unique
// server-generated filenames" requirement.
export function sanitizeOriginalFilename(filename) {
  return String(filename || "file")
    .replace(/[\/\\]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, 200)
    .trim() || "file";
}

export function generatedStoredFilename(originalFilename) {
  const ext = fileExtension(originalFilename);
  const rand = cryptoRandomHex(16);
  return ext ? `${rand}.${ext}` : rand;
}

function cryptoRandomHex(bytes) {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
