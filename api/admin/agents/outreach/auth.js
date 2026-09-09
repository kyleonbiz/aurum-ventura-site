// POST /api/admin/agents/outreach/auth — authenticate with admin password
// Header: X-Admin-Password: [password]
// Response: { authenticated: boolean }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Get password from header
  const password = req.headers["x-admin-password"];

  // Validate password against environment variable
  const expectedPassword = process.env.ADMIN_OUTREACH_PASSWORD;

  if (!expectedPassword) {
    console.error("ADMIN_OUTREACH_PASSWORD not configured");
    return res.status(503).json({ error: "not_configured", authenticated: false });
  }

  const isValid = password === expectedPassword;

  if (!isValid) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: true });
}
