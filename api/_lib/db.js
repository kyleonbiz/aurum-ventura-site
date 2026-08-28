// Thin Postgres client wrapper. Works against any standard Postgres
// (Supabase, Neon, Vercel Postgres, RDS, etc.) via a single DATABASE_URL
// connection string — see UPLOAD_SETUP.md.
//
// Uses the `postgres` package (github.com/porsager/postgres) — a small,
// dependency-free, connection-pooling-aware client that's a good fit for
// serverless functions (cheap cold starts, works over TLS out of the box).
import postgres from "postgres";

let sql;

// Lazily create the connection so a missing DATABASE_URL doesn't crash the
// whole function file at import time — callers get a clear runtime error
// on first real query instead, which api/upload/*.js turns into the
// "storage/database not configured" error response.
export function db() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error("DATABASE_URL is not configured"), { code: "DB_NOT_CONFIGURED" });
  }
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 3, // serverless: keep pooled connections small per instance
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}
