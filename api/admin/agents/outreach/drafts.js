// GET /api/admin/agents/outreach/drafts — list pending outreach drafts awaiting approval
// POST /api/admin/agents/outreach/drafts/:id/approve — approve a draft and send it

import { db } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { logEvent, logError } from "../../../_lib/agents.js";
import { sendOutreachEmail } from "../../../_lib/outreach.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured" });
  }

  if (req.method === "GET") return handleListDrafts(sql, res);
  if (req.method === "POST") {
    const { action } = req.query;
    if (action === "approve") return handleApproveDraft(req, sql, res);
    return res.status(400).json({ error: "unknown_action" });
  }
  return res.status(405).json({ error: "method_not_allowed" });
}

async function handleListDrafts(sql, res) {
  try {
    const drafts = await sql`
      select
        od.id, od.job_id, od.prospect_id, od.draft_text, od.status, od.created_at,
        p.business_name, p.location, p.industry, p.contact_email,
        pq.score, pq.level
      from outreach_drafts od
      join prospects p on od.prospect_id = p.id
      left join prospect_qualification pq on p.id = pq.prospect_id
      where od.status = 'DRAFT'
      order by pq.score desc, od.created_at asc
    `;

    return res.status(200).json({ drafts });
  } catch (err) {
    console.error("GET /api/admin/agents/outreach/drafts failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}

async function handleApproveDraft(req, sql, res) {
  const { draftId } = req.query;
  if (!draftId) {
    return res.status(400).json({ error: "draft_id_required" });
  }

  try {
    // Get the draft and prospect details
    const [draft] = await sql`
      select od.*, p.business_name, p.contact_email, p.industry, p.location
      from outreach_drafts od
      join prospects p on od.prospect_id = p.id
      where od.id = ${draftId}
    `;

    if (!draft) {
      return res.status(404).json({ error: "draft_not_found" });
    }

    if (draft.status !== "DRAFT") {
      return res.status(400).json({ error: "draft_already_processed", status: draft.status });
    }

    // Validate contact email
    if (!draft.contact_email) {
      return res.status(400).json({ error: "no_contact_email", message: "Prospect has no email address on file." });
    }

    const approvedAt = new Date();

    try {
      // Send the email via Resend
      await sendOutreachEmail({
        prospect: {
          id: draft.prospect_id,
          business_name: draft.business_name,
          contact_email: draft.contact_email,
        },
        draftId: draft.id,
        draftText: draft.draft_text,
        db: sql,
        logger: { log: (type, msg, data) => console.log(`[${type}]`, msg, data) },
      });

      // Mark draft as sent
      const sentAt = new Date();
      await sql`
        update outreach_drafts
        set status = 'SENT', approved_at = ${approvedAt}, sent_at = ${sentAt}
        where id = ${draftId}
      `;

      // Update prospect pipeline stage
      await sql`
        update prospects
        set pipeline_stage = 'ADMIN_APPROVED', updated_at = now()
        where id = ${draft.prospect_id}
      `;

      // Log the event
      await logEvent(sql, {
        agentId: "personalized_outreach",
        jobId: draft.job_id,
        prospectId: draft.prospect_id,
        eventType: "OUTREACH_SENT",
        status: "SUCCESS",
        message: `Outreach email sent to ${draft.business_name} (${draft.contact_email}).`,
        completedAt: sentAt,
      });

      return res.status(200).json({
        action: "draft_approved_and_sent",
        draftId,
        prospectId: draft.prospect_id,
        sent_to: draft.contact_email,
        sent_at: sentAt,
      });
    } catch (emailErr) {
      // Email failed — mark draft as failed but keep it for retry
      await sql`
        update outreach_drafts
        set status = 'FAILED', approved_at = ${approvedAt}, sent_error = ${emailErr.message}
        where id = ${draftId}
      `;

      await logError(sql, {
        agentId: "personalized_outreach",
        jobId: draft.job_id,
        prospectId: draft.prospect_id,
        errorType: "EMAIL_SEND_FAILED",
        description: emailErr.message,
        adminActionRequired: true,
      });

      return res.status(400).json({
        error: "email_send_failed",
        message: emailErr.message,
        draftId,
      });
    }
  } catch (err) {
    console.error("POST /api/admin/agents/outreach/drafts/approve failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}
