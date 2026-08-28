import { isAdminRequest } from "../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({ authenticated: isAdminRequest(req) });
}
