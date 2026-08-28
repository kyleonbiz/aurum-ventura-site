// Admin authentication for the /admin intake-review area.
//
// There is no existing admin auth system anywhere in this project to
// reuse — the standalone "Admin OS" tool has none (it's a single-browser
// localStorage app with no login of any kind), and nothing else in this
// codebase has an admin surface. This is a real, working mechanism, sized
// to match reality: one shared admin login (ADMIN_PASSWORD), not an
// invented multi-user/role system nobody asked for or could use yet.
//
// Session model: a signed, httpOnly cookie containing an expiry
// timestamp, HMAC-signed with ADMIN_SESSION_SECRET. No session table
// needed — verification is just "is the signature valid and not expired."
import crypto from "node:crypto";

const COOKIE_NAME = "av_admin_session";
const SESSION_HOURS = 12;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw Object.assign(new Error("ADMIN_SESSION_SECRET is not configured"), { code: "ADMIN_NOT_CONFIGURED" });
  return secret;
}

export function isValidAdminPassword(submitted) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw Object.assign(new Error("ADMIN_PASSWORD is not configured"), { code: "ADMIN_NOT_CONFIGURED" });
  if (typeof submitted !== "string" || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function sign(payload) {
  const secret = getSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionCookieValue() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function isValidSessionValue(value) {
  if (typeof value !== "string") return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  let expected;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function setAdminSessionCookie(res) {
  const value = createSessionCookieValue();
  const maxAge = SESSION_HOURS * 60 * 60;
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

export function clearAdminSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export function isAdminRequest(req) {
  const cookies = parseCookies(req);
  return isValidSessionValue(cookies[COOKIE_NAME]);
}

// Call at the top of every admin-only endpoint. Returns true if the
// request is authenticated (caller should proceed); sends a 401 and
// returns false otherwise.
export function requireAdmin(req, res) {
  if (isAdminRequest(req)) return true;
  res.status(401).json({ error: "unauthorized", message: "Admin login required." });
  return false;
}
