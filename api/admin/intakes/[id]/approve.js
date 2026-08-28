// POST /api/admin/intakes/:id/approve  { force?: boolean }
//
// The only endpoint that may create an official client. Everything from
// "generate client number" through "link the intake back to the client"
// happens inside one Postgres transaction — either all of it lands, or
// none of it does. Dropbox folder creation and the approval email are
// deliberately OUTSIDE the transaction (they're calls to other services,
// not database writes) and are best-effort with logged outcomes, per the
// brief's requirement that a downstream failure there shouldn't be able
// to leave the database in an inconsistent state.
import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { nextClientNumber } from "../../../_lib/clientNumber.js";
import { createClientFolderStructure, isStorageConfigured } from "../../../_lib/dropbox.js";
import { sendIntakeApprovedEmail, isEmailConfigured } from "../../../_lib/email.js";
import { logAudit } from "../../../_lib/audit.js";
import { clientIp } from "../../../_lib/ratelimit.js";

const ONBOARDING_CHECKLIST = [
  "Send welcome email and onboarding overview",
  "Collect signed services agreement",
  "Set up client folder access",
  "Confirm scope of services with client",
  "Schedule kickoff call",
  "Add client to monthly reporting cycle",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  const force = !!(req.body && req.body.force);
  const ip = clientIp(req);

  let sql;
  try {
    sql = db();
  } catch (err) {
    console.error("approve config error", err);
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  let outcome;
  try {
    outcome = await sql.begin(async (tx) => {
      const [intake] = await tx`select * from intake_requests where id = ${id} for update`;
      if (!intake) return { kind: "not_found" };

      if (intake.status === "APPROVED") {
        // Idempotent replay (double-click / retried request) — the
        // client already exists, just hand back its info again.
        const [client] = await tx`select id, client_number from clients where id = ${intake.client_id}`;
        return { kind: "already_approved", clientId: client?.id, clientNumber: client?.client_number };
      }
      if (intake.status === "REJECTED") {
        return { kind: "invalid_status", status: intake.status };
      }
      // PENDING REVIEW or MORE INFORMATION REQUIRED may both be approved
      // — an admin who got the missing info by phone/email shouldn't be
      // blocked from proceeding without a full resubmission flow.

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

  // outcome.kind === "approved" — the transaction succeeded. Everything
  // below is best-effort and outside the transaction on purpose.
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
