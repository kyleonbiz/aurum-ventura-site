// Pure, runtime-agnostic constants + validators shared between the
// frontend form (src/App.jsx — instant UX feedback) and the serverless
// API (api/_lib/validate.js — the actual enforcement). Keeping this in
// one file means the two can never quietly drift apart.
export const CATEGORIES = [
  "Document Management",
  "Invoice Administration",
  "Vendor Administration",
  "License / Renewal",
  "CRM / Data",
  "Project Administration",
  "Form / Paperwork",
  "General Administrative",
  "Other",
];

export const MIN_DESCRIPTION_LENGTH = 15;
export const MIN_REQUESTED_ACTION_LENGTH = 15;
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB — see UPLOAD_SETUP.md re: Vercel's request-body limit
export const MAX_FILES_PER_UPLOAD = 20;

export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "jpg", "jpeg", "png", "zip",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email.trim());
}

export function isMeaningfulText(s, minLength) {
  if (typeof s !== "string") return false;
  const trimmed = s.trim();
  if (trimmed.length < minLength) return false;
  const meaningfulChars = new Set(trimmed.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return meaningfulChars.size >= 4;
}

export function fileExtension(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}

export function isAllowedExtension(filename) {
  return ALLOWED_EXTENSIONS.includes(fileExtension(filename));
}
