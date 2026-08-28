// Pure, runtime-agnostic constants + validators shared between the
// client-facing intake form and the serverless API — same pattern as
// shared/uploadShared.js, so the two can't quietly drift apart.
import { isMeaningfulText } from "./uploadShared.js";
export { isMeaningfulText };

export const SYSTEM_OPTIONS = [
  "Google Workspace", "Microsoft 365", "Dropbox", "OneDrive", "Google Drive",
  "QuickBooks", "Xero", "Jobber", "HubSpot", "Salesforce", "Monday.com",
  "Asana", "ClickUp", "Other CRM", "Other Accounting System",
  "Other Project Management System", "Other",
];

export const ADMIN_AREA_OPTIONS = [
  "Document Preparation & Management",
  "Invoice Administration",
  "License & Renewal Tracking",
  "Vendor Administration",
  "CRM & Data Management",
  "Project Administration",
  "Forms & Paperwork",
  "Data Entry & Reporting",
  "General Administrative Support",
  "Other",
];

export const CONTACT_METHODS = ["Email", "Phone", "Text"];

export const MIN_BUSINESS_NOTES_LENGTH = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email.trim());
}

// The required-field contract for one intake submission. Used identically
// client-side (to drive the disabled state of the submit button) and
// server-side (as the real gate) — see shared usage in App.jsx / api/intake/submit.js.
export function intakeValidationErrors(form) {
  const errors = {};
  if (!form.legalName?.trim()) errors.legalName = "Legal business name is required.";
  if (!form.industry?.trim()) errors.industry = "Industry / business type is required.";
  if (!form.addressStreet?.trim()) errors.addressStreet = "Street address is required.";
  if (!form.addressCity?.trim()) errors.addressCity = "City is required.";
  if (!form.addressState?.trim()) errors.addressState = "State is required.";
  if (!form.addressZip?.trim()) errors.addressZip = "ZIP code is required.";
  if (!form.numLocations || Number(form.numLocations) < 1) errors.numLocations = "Number of locations is required.";
  if (!form.primaryContactName?.trim()) errors.primaryContactName = "Primary contact name is required.";
  if (!form.primaryContactTitle?.trim()) errors.primaryContactTitle = "Primary contact title is required.";
  if (!isValidEmail(form.primaryContactEmail)) errors.primaryContactEmail = "A valid email address is required.";
  if (!form.primaryContactPhone?.trim()) errors.primaryContactPhone = "Primary contact phone is required.";
  if (!isMeaningfulText(form.businessNotes, MIN_BUSINESS_NOTES_LENGTH)) {
    errors.businessNotes = `Tell us about your business (at least ${MIN_BUSINESS_NOTES_LENGTH} characters).`;
  }
  return errors;
}

export function isIntakeReady(form) {
  return Object.keys(intakeValidationErrors(form)).length === 0;
}
