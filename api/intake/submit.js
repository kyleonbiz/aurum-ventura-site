// POST /api/intake/submit
// Validates the intake code + all required fields, creates a
// PENDING REVIEW intake_requests row (+ authorized contacts), sends the
// client confirmation and internal notification emails. Does NOT create
// a client — that only ever happens via admin approval
// (api/admin/intakes/[id]/approve.js).
import crypto from "node:crypto";
import { db } from "../_lib/db.js";
import { isSameOriginRequest } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/ratelimit.js";
import { withUniqueReferenceNumber } from "../_lib/refnum.js";
import { logAudit } from "../_lib/audit.js";
import { sendIntakeConfirmationEmail, sendInternalIntakeNotificationEmail, isEmailConfigured } from "../_lib/email.js";
import { intakeValidationErrors, isValidEmail, SYSTEM_OPTIONS, ADMIN_AREA_OPTIONS } from "../../shared/intakeShared.js";

const MAX_AUTHORIZED_CONTACTS = 15;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "forbidden" });

  const ip = clientIp(req);
  let sql;
  try {
    sql = db();
    const allowed = await checkRateLimit("intake_submit", ip, 5);
    if (!allowed) return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." });
  } catch (err) {
    return configErrorResponse(res, err);
  }

  const body = req.body || {};
  const { intakeCode, idempotencyKey } = body;

  let codeOk;
  try {
    codeOk = isValidIntakeCode(intakeCode);
  } catch (err) {
    return configErrorResponse(res, err);
  }
  if (!codeOk) {
    await logAudit({ actor: "system", action: "intake_invalid_code", ip });
    return res.status(400).json({ error: "invalid_code", message: "We could not verify this intake request. Please confirm your information or contact Aurum Ventura for assistance." });
  }

  const errors = intakeValidationErrors(body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: "invalid_fields", message: "Please complete all required fields.", fields: errors });
  }

  const authorizedContacts = Array.isArray(body.authorizedContacts) ? body.authorizedContacts : [];
  if (authorizedContacts.length > MAX_AUTHORIZED_CONTACTS) {
    return res.status(400).json({ error: "too_many_contacts", message: `You can add up to ${MAX_AUTHORIZED_CONTACTS} authorized contacts.` });
  }
  for (const c of authorizedContacts) {
    if (!c.fullName?.trim() || !isValidEmail(c.email)) {
      return res.status(400).json({ error: "invalid_contact", message: "Each authorized contact needs at least a name and a valid email." });
    }
  }

  const systems = Array.isArray(body.systems) ? body.systems.filter((s) => typeof s === "string" && s.trim()).slice(0, 30) : [];
  const administrativeAreas = Array.isArray(body.administrativeAreas)
    ? body.administrativeAreas.filter((a) => typeof a === "string" && a.trim()).slice(0, ADMIN_AREA_OPTIONS.length)
    : [];

  try {
    if (idempotencyKey) {
      const [existing] = await sql`select id, reference_number from intake_requests where idempotency_key = ${idempotencyKey}`;
      if (existing) return res.status(200).json({ referenceNumber: existing.reference_number });
    }

    const intake = await withUniqueReferenceNumber(
      (referenceNumber) => sql`
        insert into intake_requests (
          reference_number, idempotency_key, status, source,
          legal_name, dba_name, industry, website,
          address_street, address_city, address_state, address_zip,
          num_locations, num_employees, year_established,
          primary_contact_name, primary_contact_title, primary_contact_email, primary_contact_phone,
          preferred_contact_method, business_hours, timezone, main_admin_contact,
          systems, administrative_areas,
          business_notes, recurring_notes, additional_notes
        ) values (
          ${referenceNumber}, ${idempotencyKey || null}, 'PENDING REVIEW', 'WEBSITE CLIENT INTAKE',
          ${body.legalName.trim()}, ${body.dbaName?.trim() || null}, ${body.industry.trim()}, ${body.website?.trim() || null},
          ${body.addressStreet.trim()}, ${body.addressCity.trim()}, ${body.addressState.trim()}, ${body.addressZip.trim()},
          ${Number(body.numLocations)}, ${body.numEmployees?.trim() || null}, ${body.yearEstablished?.trim() || null},
          ${body.primaryContactName.trim()}, ${body.primaryContactTitle.trim()}, ${body.primaryContactEmail.trim().toLowerCase()}, ${body.primaryContactPhone.trim()},
          ${body.preferredContactMethod || null}, ${body.businessHours?.trim() || null}, ${body.timezone?.trim() || null}, ${body.mainAdminContact?.trim() || null},
          ${sql.json(systems)}, ${sql.json(administrativeAreas)},
          ${body.businessNotes.trim()}, ${body.recurringNotes?.trim() || null}, ${body.additionalNotes?.trim() || null}
        )
        returning id, reference_number
      `.then((rows) => rows[0]),
      { prefix: "AV-IN", suffix: "hex" }
    );

    for (const c of authorizedContacts) {
      await sql`
        insert into intake_authorized_contacts (intake_id, full_name, title, email, phone, authorization_notes)
        values (${intake.id}, ${c.fullName.trim()}, ${c.title?.trim() || null}, ${c.email.trim().toLowerCase()}, ${c.phone?.trim() || null}, ${c.notes?.trim() || null})
      `;
    }

    await logAudit({ actor: "system", action: "intake_submitted", entityType: "intake_request", entityId: intake.id, detail: { legalName: body.legalName }, ip });

    if (isEmailConfigured()) {
      try {
        await sendIntakeConfirmationEmail({
          to: body.primaryContactEmail.trim(),
          contactName: body.primaryContactName.trim(),
          companyName: body.legalName.trim(),
          referenceNumber: intake.reference_number,
        });
      } catch (err) {
        console.error("intake confirmation email failed", err);
        await logAudit({ actor: "system", action: "intake_confirmation_email_failed", entityType: "intake_request", entityId: intake.id, detail: { error: String(err.message || err) }, ip });
      }
      try {
        const base = process.env.AURUM_SITE_ORIGIN || "";
        await sendInternalIntakeNotificationEmail({
          companyName: body.legalName.trim(),
          contactName: body.primaryContactName.trim(),
          contactEmail: body.primaryContactEmail.trim(),
          contactPhone: body.primaryContactPhone.trim(),
          referenceNumber: intake.reference_number,
          adminReviewUrl: base ? `${base}/admin/intakes/${intake.id}` : null,
        });
      } catch (err) {
        console.error("internal intake notification failed", err);
        await logAudit({ actor: "system", action: "intake_internal_notification_failed", entityType: "intake_request", entityId: intake.id, detail: { error: String(err.message || err) }, ip });
      }
    }

    return res.status(200).json({ referenceNumber: intake.reference_number });
  } catch (err) {
    console.error("intake/submit failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again shortly." });
  }
}

function isValidIntakeCode(submitted) {
  const expected = process.env.CLIENT_INTAKE_CODE;
  if (!expected) throw Object.assign(new Error("CLIENT_INTAKE_CODE is not configured"), { code: "INTAKE_NOT_CONFIGURED" });
  if (typeof submitted !== "string" || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function configErrorResponse(res, err) {
  console.error("intake/submit config error", err);
  return res.status(503).json({ error: "not_configured", message: "Client intake isn't fully set up yet. Please contact Aurum Ventura directly for now." });
}
