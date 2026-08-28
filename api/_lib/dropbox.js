// Storage abstraction. The rest of the codebase only calls
// `uploadFileToStorage(...)` below — swapping Dropbox for S3, Google
// Drive, etc. later means rewriting this one file, nothing else.
//
// Auth: Dropbox access tokens now expire after a few hours, so the
// supported server-side model is the refresh-token flow (DROPBOX_APP_KEY
// + DROPBOX_APP_SECRET + DROPBOX_REFRESH_TOKEN), which the SDK uses to
// silently mint short-lived access tokens as needed. A plain
// DROPBOX_ACCESS_TOKEN is also supported as a fallback for quick local
// testing, but it WILL expire — see UPLOAD_SETUP.md for how to generate
// a refresh token.
import { Dropbox } from "dropbox";

function getClient() {
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, DROPBOX_ACCESS_TOKEN } = process.env;

  if (DROPBOX_APP_KEY && DROPBOX_APP_SECRET && DROPBOX_REFRESH_TOKEN) {
    return new Dropbox({
      clientId: DROPBOX_APP_KEY,
      clientSecret: DROPBOX_APP_SECRET,
      refreshToken: DROPBOX_REFRESH_TOKEN,
      fetch,
    });
  }
  if (DROPBOX_ACCESS_TOKEN) {
    return new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN, fetch });
  }
  throw Object.assign(new Error("Dropbox is not configured"), { code: "STORAGE_NOT_CONFIGURED" });
}

// Builds /Clients/[Legal Name]/03 Client Uploads/[YEAR]/[MONTH]/ — Dropbox
// creates any missing parent folders automatically on file upload, so no
// separate "create folder" call is needed.
export function folderPathFor(clientLegalName, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const safeName = String(clientLegalName).replace(/[\/\\]/g, "-").trim();
  return `/Clients/${safeName}/03 Client Uploads/${year}/${month}`;
}

// buffer: Buffer/Uint8Array of file bytes. storedFilename: server-generated
// name (see validate.js) — never the raw client-supplied filename.
// Returns the full Dropbox path the file was stored at.
export async function uploadFileToStorage({ clientLegalName, storedFilename, buffer }) {
  const dbx = getClient();
  const folder = folderPathFor(clientLegalName);
  const path = `${folder}/${storedFilename}`;
  await dbx.filesUpload({
    path,
    contents: buffer,
    mode: { ".tag": "add" },
    autorename: true, // extremely unlikely given random filenames, but safe if it ever collides
    mute: true,
  });
  return path;
}

export function isStorageConfigured() {
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, DROPBOX_ACCESS_TOKEN } = process.env;
  return !!((DROPBOX_APP_KEY && DROPBOX_APP_SECRET && DROPBOX_REFRESH_TOKEN) || DROPBOX_ACCESS_TOKEN);
}

const CLIENT_SUBFOLDERS = [
  "01 Signed Agreements",
  "02 Onboarding",
  "03 Client Uploads",
  "04 Completed Documents",
  "05 Licenses & Renewals",
  "06 Vendors",
  "07 Invoices",
  "08 CRM & Data",
  "09 Projects",
  "10 Admin Requests",
  "11 Monthly Reports",
  "12 Scope Changes",
  "99 Archive",
];

// Creates the standard 13-folder structure for a newly-approved client.
// Called ONLY after admin approval (never from an unapproved intake) —
// see api/admin/intakes/[id]/approve.js. Each folder is created
// independently so one failure doesn't block the rest; failures are
// returned, not thrown, so approval can still succeed with a partial
// folder set and a clear note for staff to finish manually.
export async function createClientFolderStructure(clientLegalName) {
  const dbx = getClient();
  const safeName = String(clientLegalName).replace(/[\/\\]/g, "-").trim();
  const results = [];
  for (const sub of CLIENT_SUBFOLDERS) {
    const path = `/Clients/${safeName}/${sub}`;
    try {
      await dbx.filesCreateFolderV2({ path, autorename: false });
      results.push({ path, ok: true });
    } catch (err) {
      // "path/conflict/folder" just means it already exists — not a real failure.
      const alreadyExists = err?.error?.error?.path?.[".tag"] === "conflict";
      results.push({ path, ok: alreadyExists, error: alreadyExists ? null : String(err.message || err) });
    }
  }
  return results;
}
