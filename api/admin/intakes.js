// Handles list/detail/approve/reject/request-info for Client Intake
// review in one function — merged from what were previously
// intakes/index.js, intakes/[id].js, and intakes/[id]/{approve,reject,
// request-info}.js. See api/upload/index.js for why (Vercel's
// 12-function Hobby cap). vercel.json rewrites the original
// /api/admin/intakes[/:id[/:action]] URLs here with `id`/`action` query
// params; callers are unaffected.
import { db } from "../_lib/db.js";
import { requireAdmin } from "../_lib/adminAuth.js";
import { nextClientNumber } from "../_lib/clientNumber.js";
import { createClientFolderStructure, isStorageConfigured } from "../_lib/dropbox.js";
import { sendIntakeApprovedEmail, sendIntakeMoreInfoRequestedEmail, isEmailConfigured } from "../_lib/email.js";
import { logAudit } from "../_lib/audit.js";
import { clientIp } from "../_lib/ratelimit.js";
import { isMeaningfulText } from "../../shared/uploadShared.js";

const ONBOARDING_CHECKLIST = [
  "Send welcome email and onboarding overview",
  "Collect signed services agreement",
  "Set up client folder access",
  "Confirm scope of services with client",
  "Schedule kickoff call",
  "Add client to monthly reporting cycle",
];

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const { id, action } = req.query;

  if (req.method === "GET") {
    return id ? handleDetail(req, res, id) : handleList(req, res);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!id) return res.status(400).json({ error: "missing_id" });
  if (action === "approve") return handleApprove(req, res, id);
  if (action === "reject") return handleReject(req, res, id);
  if (action === "request-info") return handleRequestInfo(req, res, id);
  return res.status(404).json({ error: "not_found" });
}

function configErrorResponse(res, err, label) {
  console.error(`${label} config error`, err);
  return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
}

// ---------------------------------------------------------------------
// GET (list)
// ---------------------------------------------------------------------
async function handleList(req, res) {
  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err, "admin/intakes list");
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

// ---------------------------------------------------------------------
// GET (detail)
// ---------------------------------------------------------------------
async function handleDetail(req, res, id) {
  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err, "admin/intakes detail");
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
    console.error("admin/intakes detail failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading this intake." });
  }
}

// ---------------------------------------------------------------------
// POST action=approve
// ---------------------------------------------------------------------
async function handleApprove(req, res, id) {
  const force = !!(req.body && req.body.force);
  const ip = clientIp(req);

  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err, "approve");
  }

  let outcome;
  try {
    outcome = await sql.begin(async (tx) => {
      const [intake] = await tx`select * from intake_requests where id = ${id} for update`;
      if (!intake) return { kind: "not_found" };

      if (intake.status === "APPROVED") {
        const [client] = await tx`select id, client_number from clients where id = ${intake.client_id}`;
        return { kind: "already_approved", clientId: client?.id, clientNumber: client?.client_number };
      }
      if (intake.status === "REJECTED") {
        return { kind: "invalid_status", status: intake.status };
      }

      if (!force) {
        const [dup] = await tx`
          select id, legal_name, client_number, status from clients
          where lower(legal_name) = lower(${intake.legal_name}) or lower(primary_email) = lower(${intake.primary_contact_email})
          limit 1
        `;
        if (dup) {
          return { kind: "potential_duplicate", duplicate: { id: dup.id, legalName: dup.legal_name, clientNumber: dup.client_number, status: dup.status } };
        }
      }

      const clientNumber = await nextClientNumber(tx);

      const [client] = await tx`
        insert into clients (
          legal_name, primary_email, status, client_number,
          dba_name, industry, website,
          address_street, address_city, address_state, address_zip,
          num_locations, num_employees, year_established,
          primary_contact_name, primary_contact_title, primary_contact_phone,
          preferred_contact_method, business_hours, timezone, main_admin_contact,
          business_notes, recurring_notes, additional_notes,
          intake_reference
        ) values (
          ${intake.legal_name}, ${intake.primary_contact_email}, 'ONBOARDING', ${clientNumber},
          ${intake.dba_name}, ${intake.industry}, ${intake.website},
          ${intake.address_street}, ${intake.address_city}, ${intake.address_state}, ${intake.address_zip},
          ${intake.num_locations}, ${intake.num_employees}, ${intake.year_established},
          ${intake.primary_contact_name}, ${intake.primary_contact_title}, ${intake.primary_contact_phone},
          ${intake.preferred_contact_method}, ${intake.business_hours}, ${intake.timezone}, ${intake.main_admin_contact},
          ${intake.business_notes}, ${intake.recurring_notes}, ${intake.additional_notes},
          ${intake.reference_number}
        )
        returning id, client_number
      `;

      const authorizedContacts = await tx`select * from intake_authorized_contacts where intake_id = ${intake.id}`;
      for (const c of authorizedContacts) {
        await tx`
          insert into client_contacts (client_id, name, email, title, phone, authorization_notes)
          values (${client.id}, ${c.full_name}, ${c.email}, ${c.title}, ${c.phone}, ${c.authorization_notes})
          on conflict (client_id, email) do nothing
        `;
      }

      const systems = Array.isArray(intake.systems) ? intake.systems : [];
      for (const s of systems) {
        await tx`insert into client_systems (client_id, system_name) values (${client.id}, ${s})`;
      }

      const areas = Array.isArray(intake.administrative_areas) ? intake.administrative_areas : [];
      for (const a of areas) {
        await tx`insert into client_service_interests (client_id, area_name) values (${client.id}, ${a})`;
      }

      let sortOrder = 0;
      for (const task of ONBOARDING_CHECKLIST) {
        await tx`insert into client_onboarding_tasks (client_id, task, sort_order) values (${client.id}, ${task}, ${sortOrder})`;
        sortOrder += 1;
      }

      await tx`
        update intake_requests
        set status = 'APPROVED', client_id = ${client.id}, approved_at = now(), approved_by = 'admin',
            reviewed_at = now(), reviewed_by = 'admin', updated_at = now()
        where id = ${intake.id}
      `;

      return {
        kind: "approved",
        clientId: client.id,
        clientNumber: client.client_number,
        primaryContactEmail: intake.primary_contact_email,
        primaryContactName: intake.primary_contact_name,
        legalName: intake.legal_name,
      };
    });
  } catch (err) {
    console.error("approve transaction failed", err);
    await logAudit({ actor: "admin", action: "intake_approve_failed", entityType: "intake_request", entityId: id, detail: { error: String(err.message || err) }, ip });
    return res.status(500).json({ error: "server_error", message: "Approval could not be completed. No changes were made." });
  }

  if (outcome.kind === "not_found") return res.status(404).json({ error: "not_found", message: "Intake not found." });
  if (outcome.kind === "invalid_status") return res.status(409).json({ error: "invalid_status", message: `This intake is already ${outcome.status}.` });
  if (outcome.kind === "potential_duplicate") {
    return res.status(409).json({ error: "potential_duplicate", message: "Potential existing client detected.", duplicate: outcome.duplicate });
  }
  if (outcome.kind === "already_approved") {
    return res.status(200).json({ clientId: outcome.clientId, clientNumber: outcome.clientNumber, alreadyApproved: true });
  }

  await logAudit({ actor: "admin", action: "intake_approved", entityType: "intake_request", entityId: id, detail: { clientId: outcome.clientId, clientNumber: outcome.clientNumber }, ip });

  let folderResults = null;
  if (isStorageConfigured()) {
    try {
      folderResults = await createClientFolderStructure(outcome.legalName);
    } catch (err) {
      console.error("client folder creation failed", err);
      await logAudit({ actor: "system", action: "client_folder_creation_failed", entityType: "client", entityId: outcome.clientId, detail: { error: String(err.message || err) }, ip });
    }
  }

  if (isEmailConfigured()) {
    try {
      await sendIntakeApprovedEmail({
        to: outcome.primaryContactEmail,
        contactName: outcome.primaryContactName,
        companyName: outcome.legalName,
        clientNumber: outcome.clientNumber,
      });
    } catch (err) {
      console.error("approval email failed", err);
      await logAudit({ actor: "system", action: "intake_approval_email_failed", entityType: "client", entityId: outcome.clientId, detail: { error: String(err.message || err) }, ip });
    }
  }

  return res.status(200).json({ clientId: outcome.clientId, clientNumber: outcome.clientNumber, folderResults });
}

// ---------------------------------------------------------------------
// POST action=reject
// ---------------------------------------------------------------------
async function handleReject(req, res, id) {
  const { reason } = req.body || {};
  const ip = clientIp(req);

  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err, "reject");
  }

  try {
    const [intake] = await sql`select id, status from intake_requests where id = ${id}`;
    if (!intake) return res.status(404).json({ error: "not_found", message: "Intake not found." });
    if (intake.status === "APPROVED") return res.status(409).json({ error: "invalid_status", message: "This intake has already been approved." });

    await sql`
      update intake_requests
      set status = 'REJECTED', rejection_reason = ${reason?.trim() || null}, reviewed_at = now(), reviewed_by = 'admin', updated_at = now()
      where id = ${id}
    `;
    await logAudit({ actor: "admin", action: "intake_rejected", entityType: "intake_request", entityId: id, detail: { reason: reason?.trim() || null }, ip });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("reject failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong. Please try again." });
  }
}

// ---------------------------------------------------------------------
// POST action=request-info
// ---------------------------------------------------------------------
async function handleRequestInfo(req, res, id) {
  const { message } = req.body || {};
  const ip = clientIp(req);

  if (!isMeaningfulText(message, 10)) {
    return res.status(400).json({ error: "invalid_message", message: "Describe what additional information is needed." });
  }

  let sql;
  try {
    sql = db();
  } catch (err) {
    return configErrorResponse(res, err, "request-info");
  }

  try {
    const [intake] = await sql`select * from intake_requests where id = ${id}`;
    if (!intake) return res.status(404).json({ error: "not_found", message: "Intake not found." });
    if (intake.status === "APPROVED") return res.status(409).json({ error: "invalid_status", message: "This intake has already been approved." });

    await sql`
      update intake_requests
      set status = 'MORE INFORMATION REQUIRED', admin_message = ${message.trim()}, reviewed_at = now(), reviewed_by = 'admin', updated_at = now()
      where id = ${id}
    `;
    await logAudit({ actor: "admin", action: "intake_more_info_requested", entityType: "intake_request", entityId: id, detail: { message: message.trim() }, ip });

    if (isEmailConfigured()) {
      try {
        await sendIntakeMoreInfoRequestedEmail({
          to: intake.primary_contact_email,
          contactName: intake.primary_contact_name,
          companyName: intake.legal_name,
          referenceNumber: intake.reference_number,
          adminMessage: message.trim(),
        });
      } catch (err) {
        console.error("more-info email failed", err);
        await logAudit({ actor: "system", action: "intake_more_info_email_failed", entityType: "intake_request", entityId: id, detail: { error: String(err.message || err) }, ip });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("request-info failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong. Please try again." });
  }
}
