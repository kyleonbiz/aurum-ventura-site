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
