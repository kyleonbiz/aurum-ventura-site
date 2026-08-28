// Email sending via Resend (resend.com) — a straightforward fit for a
// Vercel-hosted app, generous free tier, simple API-key auth. Swapping
// providers later means rewriting this file only.
import { Resend } from "resend";

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw Object.assign(new Error("RESEND_API_KEY is not configured"), { code: "EMAIL_NOT_CONFIGURED" });
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export function isEmailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.AURUM_FROM_EMAIL);
}

// Per the brief: never attach the uploaded documents to this email.
export async function sendClientConfirmationEmail({ to, contactName, referenceNumber, fileCount, category, documentDescription, requestedAction }) {
  const resend = getClient();
  const greetingName = contactName || "there";
  const text = [
    `Hello ${greetingName},`,
    ``,
    `We have received your document upload.`,
    ``,
    `Reference: ${referenceNumber}`,
    `Files received: ${fileCount}`,
    `Category: ${category}`,
    `Document: ${documentDescription}`,
    `Requested action: ${requestedAction}`,
    ``,
    `We will contact you if additional information or clarification is required.`,
    ``,
    `Aurum Ventura Enterprise LLC`,
    `Business Administrative Services`,
    `"Your Business. Our Back Office."`,
  ].join("\n");

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `Aurum Ventura — Documents Received — ${referenceNumber}`,
    text,
  });
}

// Internal notification never includes Dropbox tokens/credentials — it
// only ever receives the values already computed by the caller.
export async function sendInternalNotificationEmail({ clientLegalName, submittedByName, submittedEmail, category, documentDescription, requestedAction, fileCount, referenceNumber, adminRecordUrl }) {
  const resend = getClient();
  const to = process.env.AURUM_INTERNAL_NOTIFY_EMAIL;
  if (!to) throw Object.assign(new Error("AURUM_INTERNAL_NOTIFY_EMAIL is not configured"), { code: "EMAIL_NOT_CONFIGURED" });

  const lines = [
    `Client: ${clientLegalName}`,
    `Submitting contact: ${submittedByName || "(no name on file)"}`,
    `Email: ${submittedEmail}`,
    `Category: ${category}`,
    `Document description: ${documentDescription}`,
    `Requested action: ${requestedAction}`,
    `File count: ${fileCount}`,
    `Reference number: ${referenceNumber}`,
    `Timestamp: ${new Date().toISOString()}`,
  ];
  if (adminRecordUrl) lines.push(``, `Admin OS record: ${adminRecordUrl}`);

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `New Client Upload — ${clientLegalName} — ${referenceNumber}`,
    text: lines.join("\n"),
  });
}

// ---------------------------------------------------------------------
// Client Intake emails
// ---------------------------------------------------------------------

export async function sendIntakeConfirmationEmail({ to, contactName, companyName, referenceNumber }) {
  const resend = getClient();
  const text = [
    `Hello ${contactName || "there"},`,
    ``,
    `We have received your Client Intake information.`,
    ``,
    `Company:`,
    companyName,
    ``,
    `Reference:`,
    referenceNumber,
    ``,
    `Your information is currently being reviewed by Aurum Ventura.`,
    ``,
    `Submission of the Client Intake form does not automatically activate your client profile.`,
    ``,
    `We will contact you if additional information is required.`,
    ``,
    `Aurum Ventura Enterprise LLC`,
    `Business Administrative Services`,
    `"Your Business. Our Back Office."`,
  ].join("\n");

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `Aurum Ventura — Client Intake Received — ${referenceNumber}`,
    text,
  });
}

export async function sendInternalIntakeNotificationEmail({ companyName, contactName, contactEmail, contactPhone, referenceNumber, adminReviewUrl }) {
  const resend = getClient();
  const to = process.env.AURUM_INTERNAL_NOTIFY_EMAIL;
  if (!to) throw Object.assign(new Error("AURUM_INTERNAL_NOTIFY_EMAIL is not configured"), { code: "EMAIL_NOT_CONFIGURED" });

  const lines = [
    `Company: ${companyName}`,
    `Contact: ${contactName}`,
    `Email: ${contactEmail}`,
    `Phone: ${contactPhone}`,
    `Reference: ${referenceNumber}`,
    `Submitted: ${new Date().toISOString()}`,
  ];
  if (adminReviewUrl) lines.push(``, `Review intake: ${adminReviewUrl}`);

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `New Client Intake — ${companyName} — ${referenceNumber}`,
    text: lines.join("\n"),
  });
}

export async function sendIntakeApprovedEmail({ to, contactName, companyName, clientNumber }) {
  const resend = getClient();
  const text = [
    `Hello ${contactName || "there"},`,
    ``,
    `Your company information has been reviewed and your Aurum Ventura client profile has been established.`,
    ``,
    `Company:`,
    companyName,
    ``,
    `Client Reference:`,
    clientNumber,
    ``,
    `Your account is now entering the onboarding stage.`,
    ``,
    `We will provide any additional onboarding instructions or document requests as needed.`,
    ``,
    `Aurum Ventura Enterprise LLC`,
    `Business Administrative Services`,
    `"Your Business. Our Back Office."`,
  ].join("\n");

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `Aurum Ventura — Client Intake Approved`,
    text,
  });
}

export async function sendIntakeMoreInfoRequestedEmail({ to, contactName, companyName, referenceNumber, adminMessage }) {
  const resend = getClient();
  const text = [
    `Hello ${contactName || "there"},`,
    ``,
    `We're reviewing the Client Intake information you submitted and need a bit more detail before we can continue.`,
    ``,
    `Company:`,
    companyName,
    ``,
    `Reference:`,
    referenceNumber,
    ``,
    `What we need:`,
    adminMessage,
    ``,
    `Aurum Ventura Enterprise LLC`,
    `Business Administrative Services`,
    `"Your Business. Our Back Office."`,
  ].join("\n");

  return resend.emails.send({
    from: process.env.AURUM_FROM_EMAIL,
    to,
    subject: `Aurum Ventura — Additional Information Needed — ${referenceNumber}`,
    text,
  });
}
