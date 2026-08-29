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

    const [researched] = await sql`select count(*)::int as n from prospect_research where status = 'COMPLETED'`;
    const [highPriority] = await sql`select count(*)::int as n from prospect_qualification where level = 'HIGH_PRIORITY'`;
    const prospectsResearched = researched.n;
    const highPriorityProspects = highPriority.n;
    // Outreach drafts don't exist until Phase 3 ships that agent.
    const outreachDraftsCreated = 0;
    const draftsAwaitingReview = 0;

    const activeAgents = agents.filter((a) => ["RUNNING", "QUEUED", "WAITING"].includes(a.status)).length;

    const today = await sql`
      select
        count(*) filter (where usage_type = 'AI_CALL')::int as ai_requests,
        count(*) filter (where usage_type = 'SEARCH_API_CALL')::int as search_requests,
        sum(estimated_cost_usd) filter (where usage_type = 'AI_CALL') as ai_cost,
        count(*) filter (where usage_type = 'AI_CALL' and estimated_cost_usd is null)::int as ai_cost_unpriced
      from agent_usage where created_at >= date_trunc('day', now())
    `;
    const monthCost = await sql`
      select sum(estimated_cost_usd) as ai_cost, count(*) filter (where estimated_cost_usd is null)::int as unpriced
      from agent_usage where usage_type = 'AI_CALL' and created_at >= date_trunc('month', now())
    `;
    const t = today[0];
    // Only report a cost figure if every AI call this period actually had
    // a priced model — otherwise a real number would understate spend.
    const aiCostToday = t.ai_cost_unpriced > 0 ? "NOT AVAILABLE" : (t.ai_cost !== null ? `$${Number(t.ai_cost).toFixed(4)}` : (t.ai_requests > 0 ? "$0.0000" : "NOT AVAILABLE"));
    const aiCostMonth = monthCost[0].unpriced > 0 ? "NOT AVAILABLE" : (monthCost[0].ai_cost !== null ? `$${Number(monthCost[0].ai_cost).toFixed(4)}` : "NOT AVAILABLE");

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
        aiRequestsToday: t.ai_requests,
        searchApiRequestsToday: t.search_requests,
        estimatedAiCostToday: aiCostToday,
        estimatedAiCostThisMonth: aiCostMonth,
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
