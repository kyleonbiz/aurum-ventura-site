// GET /api/admin/intakes/:id — full detail for the admin review screen.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("admin/intakes/[id] config error", err);
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  try {
    const [intake] = await sql`select * from intake_requests where id = ${id}`;
    if (!intake) return res.status(404).json({ error: "not_found", message: "Intake not found." });

    const contacts = await sql`select * from intake_authorized_contacts where intake_id = ${id} order by created_at asc`;

    let potentialDuplicate = null;
    if (intake.status === "PENDING REVIEW") {
      const [dup] = await sql`
        select id, legal_name, client_number, status from clients
        where lower(legal_name) = lower(${intake.legal_name}) or lower(primary_email) = lower(${intake.primary_contact_email})
        limit 1
      `;
      if (dup) potentialDuplicate = { id: dup.id, legalName: dup.legal_name, clientNumber: dup.client_number, status: dup.status };
    }

    return res.status(200).json({
      intake: {
        id: intake.id,
        referenceNumber: intake.reference_number,
        status: intake.status,
        source: intake.source,
        legalName: intake.legal_name,
        dbaName: intake.dba_name,
        industry: intake.industry,
        website: intake.website,
        addressStreet: intake.address_street,
        addressCity: intake.address_city,
        addressState: intake.address_state,
        addressZip: intake.address_zip,
        numLocations: intake.num_locations,
        numEmployees: intake.num_employees,
        yearEstablished: intake.year_established,
        primaryContactName: intake.primary_contact_name,
        primaryContactTitle: intake.primary_contact_title,
        primaryContactEmail: intake.primary_contact_email,
        primaryContactPhone: intake.primary_contact_phone,
        preferredContactMethod: intake.preferred_contact_method,
        businessHours: intake.business_hours,
        timezone: intake.timezone,
        mainAdminContact: intake.main_admin_contact,
        systems: intake.systems,
        administrativeAreas: intake.administrative_areas,
        businessNotes: intake.business_notes,
        recurringNotes: intake.recurring_notes,
        additionalNotes: intake.additional_notes,
        adminMessage: intake.admin_message,
        rejectionReason: intake.rejection_reason,
        reviewedAt: intake.reviewed_at,
        reviewedBy: intake.reviewed_by,
        approvedAt: intake.approved_at,
        approvedBy: intake.approved_by,
        clientId: intake.client_id,
        receivedAt: intake.received_at,
      },
      authorizedContacts: contacts.map((c) => ({
        id: c.id, fullName: c.full_name, title: c.title, email: c.email, phone: c.phone, notes: c.authorization_notes,
      })),
      potentialDuplicate,
    });
  } catch (err) {
    console.error("admin/intakes/[id] failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading this intake." });
  }
}
