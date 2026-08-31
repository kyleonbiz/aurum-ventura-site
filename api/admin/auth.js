// Handles admin login/logout/session-check in one function — merged
// from what were previously login.js, logout.js, and session.js.
// See api/upload/index.js for why (Vercel's 12-function Hobby cap).
// vercel.json rewrites /api/admin/login, /logout, /session here with an
// `action` query param; the original URLs are unchanged for callers.
import { isValidAdminPassword, setAdminSessionCookie, clearAdminSessionCookie, isAdminRequest } from "../_lib/adminAuth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { logAudit } from "../_lib/audit.js";
import { isSameOriginRequest } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method === "GET") return handleSession(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const action = req.query.action;
  if (action === "login") return handleLogin(req, res);
  if (action === "logout") return handleLogout(req, res);
  return res.status(404).json({ error: "not_found" });
}

function handleSession(req, res) {
  return res.status(200).json({ authenticated: isAdminRequest(req) });
}

function handleLogout(req, res) {
  clearAdminSessionCookie(res);
  return res.status(200).json({ ok: true });
}

async function handleLogin(req, res) {
  const ip = clientIp(req);
  try {
    const allowed = await checkRateLimit("admin_login", ip, 8);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    console.error("admin login rate limit check failed", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }

  const { password } = req.body || {};
  let ok;
  try {
    ok = isValidAdminPassword(password);
  } catch (err) {
    console.error("admin login config error", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }

  if (!ok) {
    await logAudit({ actor: "unknown", action: "admin_login_failed", ip });
    return res.status(401).json({ error: "invalid_password", message: "Incorrect password." });
  }

  try {
    setAdminSessionCookie(res);
  } catch (err) {
    console.error("admin login session cookie failed", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }
  await logAudit({ actor: "admin", action: "admin_login_succeeded", ip });
  return res.status(200).json({ ok: true });
}
