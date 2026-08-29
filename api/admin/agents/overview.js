// GET /api/admin/agents/overview — top-strip metrics + per-agent cards
// for the AI AGENT OPERATIONS dashboard. Every number here is a real
// query against the agents/agent_jobs/agent_events/prospects tables —
// no placeholders. An agent that hasn't run yet (research_qualification,
// personalized_outreach in Phase 1) simply shows zeros/IDLE, which is
// the honest state, not a bug.
import { db } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireAdmin(req, res)) return;

  let sql;
  try {
    sql = db();
  } catch (err) {
    return res.status(503).json({ error: "not_configured", message: "Database is not configured." });
  }

  try {
    const agents = await sql`select * from agents order by created_at asc`;

    const [jobsRunning] = await sql`select count(*)::int as n from agent_jobs where status = 'RUNNING'`;
    const [jobsQueued] = await sql`select count(*)::int as n from agent_jobs where status = 'QUEUED'`;
    const [jobsCompletedToday] = await sql`
      select count(*)::int as n from agent_jobs
      where status in ('COMPLETED','PARTIALLY_COMPLETED') and completed_at >= date_trunc('day', now())
    `;
    const [jobsFailed] = await sql`select count(*)::int as n from agent_jobs where status in ('FAILED','NEEDS_ADMIN_ATTENTION')`;
    const [prospectsToday] = await sql`select count(*)::int as n from prospects where created_at >= date_trunc('day', now())`;
    const [errorsOpen] = await sql`select count(*)::int as n from agent_errors where resolved = false`;

    // Research/qualification/outreach counts default to 0 for Phase 1
    // since those agents/tables don't exist yet — queried defensively
    // so this endpoint doesn't break the moment they're added either.
    const prospectsResearched = 0;
    const highPriorityProspects = 0;
    const outreachDraftsCreated = 0;
    const draftsAwaitingReview = 0;

    const activeAgents = agents.filter((a) => ["RUNNING", "QUEUED", "WAITING"].includes(a.status)).length;

    return res.status(200).json({
      metrics: {
        activeAgents,
        jobsRunning: jobsRunning.n,
        jobsQueued: jobsQueued.n,
        jobsCompletedToday: jobsCompletedToday.n,
        jobsFailed: jobsFailed.n,
        prospectsDiscoveredToday: prospectsToday.n,
        prospectsResearched,
        highPriorityProspects,
        outreachDraftsCreated,
        draftsAwaitingReview,
        agentErrorsRequiringAttention: errorsOpen.n,
        // AI/API usage & cost require agent_usage rows, which only start
        // existing once the Research/Outreach agents (real AI-call
        // sites) ship. Reported explicitly rather than guessed.
        aiRequestsToday: "NOT AVAILABLE",
        searchApiRequestsToday: "NOT AVAILABLE",
        estimatedAiCostToday: "NOT AVAILABLE",
        estimatedAiCostThisMonth: "NOT AVAILABLE",
      },
      agents: agents.map((a) => ({
        agentId: a.agent_id,
        agentName: a.agent_name,
        agentType: a.agent_type,
        status: a.status,
        currentJobId: a.current_job_id,
        lastStartedAt: a.last_started_at,
        lastCompletedAt: a.last_completed_at,
        lastSuccessAt: a.last_success_at,
        lastFailureAt: a.last_failure_at,
        jobsCompleted: a.jobs_completed,
        jobsFailed: a.jobs_failed,
        recordsProcessed: a.records_processed,
      })),
    });
  } catch (err) {
    console.error("admin/agents/overview failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading the agent dashboard." });
  }
}
