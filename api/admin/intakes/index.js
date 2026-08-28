// GET /api/admin/intakes — list all intake requests, newest first, plus
// the pending count the Admin dashboard badge shows.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("admin/intakes config error", err);
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  try {
    const rows = await sql`
      select id, reference_number, legal_name, primary_contact_name, primary_contact_email, status, received_at, client_id
      from intake_requests
      order by received_at desc
      limit 200
    `;
    const [{ pending }] = await sql`select count(*)::int as pending from intake_requests where status = 'PENDING REVIEW'`;
    return res.status(200).json({
      pendingCount: pending,
      intakes: rows.map((r) => ({
        id: r.id,
        referenceNumber: r.reference_number,
        company: r.legal_name,
        primaryContactName: r.primary_contact_name,
        primaryContactEmail: r.primary_contact_email,
        status: r.status,
        receivedAt: r.received_at,
        clientId: r.client_id,
      })),
    });
  } catch (err) {
    console.error("admin/intakes list failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading intakes." });
  }
}
