import crypto from "node:crypto";
import { db } from "./db.js";

// Constant-time compare so responses don't leak the upload code length/
// contents via timing. The code itself lives only in the
// AURUM_UPLOAD_CODE environment variable — it is never present in any
// frontend bundle or committed file.
export function isValidUploadCode(submitted) {
  const expected = process.env.AURUM_UPLOAD_CODE;
  if (!expected) throw Object.assign(new Error("AURUM_UPLOAD_CODE is not configured"), { code: "UPLOAD_CODE_NOT_CONFIGURED" });
  if (typeof submitted !== "string" || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // still do a comparison of equal-length buffers to avoid a fast-path
    // timing tell on length mismatches
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// The upload code alone is only a lightweight gate — per the brief, real
// identity comes from a recognized client/contact email, looked up here.
// Deliberately returns the SAME shape whether the email doesn't exist at
// all or exists but belongs to an inactive client, so the response never
// reveals which case occurred.
export async function lookupClientByEmail(email) {
  const sql = db();
  const normalized = email.trim().toLowerCase();

  const [primary] = await sql`
    select id, legal_name, status, null::uuid as contact_id, null::text as contact_name
    from clients
    where lower(primary_email) = ${normalized} and status = 'ACTIVE'
  `;
  if (primary) return { clientId: primary.id, clientLegalName: primary.legal_name, contactId: null, contactName: null };

  const [viaContact] = await sql`
    select c.id as client_id, c.legal_name, cc.id as contact_id, cc.name as contact_name
    from client_contacts cc
    join clients c on c.id = cc.client_id
    where lower(cc.email) = ${normalized} and c.status = 'ACTIVE'
  `;
  if (viaContact) {
    return { clientId: viaContact.client_id, clientLegalName: viaContact.legal_name, contactId: viaContact.contact_id, contactName: viaContact.contact_name };
  }

  return null;
}

// Lightweight same-origin check. This API has no cookie-based session (auth
// is per-request via upload code + verified email), which is what
// traditional CSRF tokens protect — there's no ambient session for a
// forged cross-site request to ride on. The one thing worth guarding
// against is a *different site* silently proxying requests here, so we
// still confirm the request actually came from our own origin.
export function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin browser requests may omit Origin; non-browser callers are gated by the upload code + email checks regardless
  const allowed = process.env.AURUM_SITE_ORIGIN;
  if (!allowed) return true; // not configured — don't block on it, just skip this extra check
  return origin === allowed;
}
