// Simple DB-backed rate limiter — one row per attempt, windowed count
// query. No extra infrastructure (Redis/Upstash) needed for v1's volume;
// swap this for a real rate-limiting service if upload traffic ever
// justifies it.
import { db } from "./db.js";

const WINDOW_MINUTES = 15;
const DEFAULT_MAX_ATTEMPTS = 10;

// scope: a short string identifying the endpoint (e.g. "upload_init").
// key: usually the caller's IP. maxAttempts lets a call site raise the
// ceiling for endpoints that are legitimately called many times per
// session (e.g. one request per file, up to MAX_FILES_PER_UPLOAD).
// Returns true if the request should be allowed, false if over the limit.
export async function checkRateLimit(scope, key, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  const sql = db();
  const [{ count }] = await sql`
    select count(*)::int as count
    from rate_limit_events
    where scope = ${scope}
      and key = ${key}
      and created_at > now() - make_interval(mins => ${WINDOW_MINUTES})
  `;
  if (count >= maxAttempts) return false;
  await sql`insert into rate_limit_events (scope, key) values (${scope}, ${key})`;
  return true;
}

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
