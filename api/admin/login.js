// POST /api/admin/login  { password }
import { isValidAdminPassword, setAdminSessionCookie } from "../_lib/adminAuth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { logAudit } from "../_lib/audit.js";
import { isSameOriginRequest } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const ip = clientIp(req);
  try {
    const allowed = await checkRateLimit("admin_login", ip, 8);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    console.error("admin/login rate limit check failed", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }

  const { password } = req.body || {};
  let ok;
  try {
    ok = isValidAdminPassword(password);
  } catch (err) {
    console.error("admin/login config error", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }

  if (!ok) {
    await logAudit({ actor: "unknown", action: "admin_login_failed", ip });
    return res.status(401).json({ error: "invalid_password", message: "Incorrect password." });
  }

  try {
    setAdminSessionCookie(res);
  } catch (err) {
    console.error("admin/login session cookie failed", err);
    return res.status(503).json({ error: "not_configured", message: "Admin login isn't fully set up yet." });
  }
  await logAudit({ actor: "admin", action: "admin_login_succeeded", ip });
  return res.status(200).json({ ok: true });
}
