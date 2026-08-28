// Generates client numbers like AV-0027 using a Postgres SEQUENCE
// (client_number_seq, created in db/002_client_intake.sql) — never a
// row-count-based scheme, which the brief explicitly warns can produce
// duplicates (e.g. after a deletion). `nextval()` is atomic and safe
// under concurrent approvals.
export async function nextClientNumber(sql) {
  const [{ n }] = await sql`select nextval('client_number_seq') as n`;
  return `AV-${String(n).padStart(4, "0")}`;
}
