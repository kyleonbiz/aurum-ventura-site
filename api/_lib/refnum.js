// Generates the client-facing reference number, e.g. AV-UP-20260828-0147.
// Collisions are astronomically unlikely (4 random digits) but the unique
// constraint on uploads.reference_number plus a retry loop makes it
// impossible to ever hand out a duplicate regardless.
export function generateReferenceNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `AV-UP-${y}${m}${d}-${suffix}`;
}

// Runs `insertFn(referenceNumber)` and retries with a fresh number on a
// unique-constraint collision (Postgres error code 23505). Any other error
// is rethrown immediately.
export async function withUniqueReferenceNumber(insertFn, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const referenceNumber = generateReferenceNumber();
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
