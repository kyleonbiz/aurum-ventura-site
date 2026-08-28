// Generates client-facing reference numbers, e.g. AV-UP-20260828-0147
// (uploads) or AV-IN-20260828-A82F4D (intakes). Collisions are
// astronomically unlikely, but the unique constraint on the relevant
// table's reference_number column plus the retry loop below makes it
// impossible to ever hand out a duplicate regardless.
import crypto from "node:crypto";

function datePart() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// suffix: "digits" -> 4 random digits (uploads' existing format);
// "hex" -> 6 random uppercase hex chars (intakes' format, per the brief's
// example AV-IN-20260828-A82F4D).
export function generateReferenceNumber(prefix = "AV-UP", suffix = "digits") {
  const suffixValue = suffix === "hex"
    ? crypto.randomBytes(3).toString("hex").toUpperCase()
    : String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${datePart()}-${suffixValue}`;
}

// Runs `insertFn(referenceNumber)` and retries with a fresh number on a
// unique-constraint collision (Postgres error code 23505). Any other error
// is rethrown immediately.
export async function withUniqueReferenceNumber(insertFn, options = {}) {
  const { prefix = "AV-UP", suffix = "digits", attempts = 5 } = options;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const referenceNumber = generateReferenceNumber(prefix, suffix);
    try {
      return await insertFn(referenceNumber);
    } catch (err) {
      if (err && err.code === "23505") {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("Could not generate a unique reference number");
}
