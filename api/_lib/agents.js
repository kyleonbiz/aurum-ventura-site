// Shared helpers for the AI Agent Operations dashboard endpoints
// (api/admin/agents/*). Keeps event/error logging and job-code
// generation in one place so every endpoint writes the activity feed
// the same way.
import { db } from "./db.js";

export async function logEvent(sql, { agentId, jobId, prospectId, eventType, message, status = "INFO", startedAt, completedAt, metadata, errorDetails }) {
  const durationMs = startedAt && completedAt ? new Date(completedAt) - new Date(startedAt) : null;
  await sql`
    insert into agent_events (agent_id, job_id, prospect_id, event_type, message, status, started_at, completed_at, duration_ms, metadata, error_details)
    values (${agentId || null}, ${jobId || null}, ${prospectId || null}, ${eventType}, ${message}, ${status},
            ${startedAt || null}, ${completedAt || null}, ${durationMs}, ${sql.json(metadata || {})}, ${errorDetails || null})
  `;
}

export async function logError(sql, { agentId, jobId, taskId, prospectId, errorType, description, attemptCount = 1, retryAvailable = true, adminActionRequired = false }) {
  await sql`
    insert into agent_errors (agent_id, job_id, task_id, prospect_id, error_type, description, attempt_count, retry_available, admin_action_required)
    values (${agentId || null}, ${jobId || null}, ${taskId || null}, ${prospectId || null}, ${errorType}, ${description}, ${attemptCount}, ${retryAvailable}, ${adminActionRequired})
  `;
}

// AGJ-YYYYMMDD-NNNN, sequential per day, computed from a count query.
// A tiny race window exists between the count and insert under real
// concurrency; acceptable for Phase 1's admin-triggered volume, and the
// job_code column is UNIQUE so a collision fails loudly rather than
// silently duplicating.
export async function nextJobCode(sql) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const [{ count }] = await sql`
    select count(*)::int as count from agent_jobs where job_code like ${"AGJ-" + ymd + "-%"}
  `;
  const seq = String(count + 1).padStart(4, "0");
  return `AGJ-${ymd}-${seq}`;
}

export function getDb() {
  return db();
}
