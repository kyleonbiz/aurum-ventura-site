// Handles the AI Agent Operations dashboard's read views (overview,
// activity, errors, jobs list/detail) and write actions (create job,
// retry job, queue unresearched) in one function — merged from what
// were previously overview.js, activity.js, errors.js, jobs.js,
// jobs/[id].js, jobs/[id]/retry.js, and research/queue-unresearched.js.
// See api/upload/index.js for why (Vercel's 12-function Hobby cap).
// run-step.js is deliberately NOT merged here — Vercel Cron's `path`
// config points at it directly, and that's the one piece not worth any
// risk of disruption.
//
// vercel.json rewrites the original URLs to /api/admin/agents with a
// `view` (and sometimes `id`/`action`) query param; callers, including
// any future dashboard frontend, are unaffected.
//
// MOCK MODE: This API now returns realistic mock data for local development.
// This allows testing the Admin OS dashboard without a real database.
import { requireAdmin } from "../../_lib/adminAuth.js";

const MAX_REQUESTED_COUNT = 100; // budget guard: max businesses per job

// Mock data storage (persists during dev server session)
let mockJobs = generateMockJobs();
let mockEvents = generateMockEvents();
let mockErrors = generateMockErrors();

export default async function handler(req, res) {
  // CORS: Allow Admin OS from localhost:9999
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9999');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!requireAdmin(req, res)) return;
  const { view, id, action } = req.query;

  if (view === "overview") return req.method === "GET" ? handleOverview(req, res) : methodNotAllowed(res);
  if (view === "activity") return req.method === "GET" ? handleActivity(req, res) : methodNotAllowed(res);
  if (view === "errors") return req.method === "GET" ? handleErrors(req, res) : methodNotAllowed(res);
  if (view === "research-queue") return req.method === "POST" ? handleQueueUnresearched(req, res) : methodNotAllowed(res);
  if (view === "jobs") {
    if (req.method === "GET") return id ? handleJobDetail(req, res, id) : handleJobsList(req, res);
    if (req.method === "POST") {
      if (id && action === "retry") return handleJobRetry(req, res, id);
      if (!id) return handleJobCreate(req, res);
    }
    return methodNotAllowed(res);
  }
  return res.status(404).json({ error: "not_found" });
}

function methodNotAllowed(res) { return res.status(405).json({ error: "method_not_allowed" }); }

// MOCK: Generate realistic mock job data
function generateMockJobs() {
  return [
    {
      id: "job_1",
      jobCode: "AGJ-20260903-0001",
      agentId: "lead_finder",
      agentName: "Lead Finder Agent",
      jobType: "DISCOVERY",
      industry: "Property Management",
      location: "United States",
      requestedCount: 50,
      status: "COMPLETED",
      businessesFound: 142,
      duplicatesRemoved: 28,
      existingClientsExcluded: 15,
      suppressedExcluded: 8,
      newProspectsCreated: 91,
      attempts: 1,
      maxAttempts: 3,
      startedAt: "2026-09-02T10:30:00Z",
      completedAt: "2026-09-02T11:45:00Z",
      createdAt: "2026-09-02T10:00:00Z",
    },
    {
      id: "job_2",
      jobCode: "AGJ-20260903-0002",
      agentId: "research_qualification",
      agentName: "Research & Qualification Agent",
      jobType: "RESEARCH",
      industry: null,
      location: null,
      requestedCount: 91,
      status: "RUNNING",
      businessesFound: null,
      duplicatesRemoved: null,
      existingClientsExcluded: null,
      suppressedExcluded: null,
      newProspectsCreated: null,
      attempts: 1,
      maxAttempts: 3,
      startedAt: "2026-09-03T14:15:00Z",
      completedAt: null,
      createdAt: "2026-09-03T14:00:00Z",
    },
    {
      id: "job_3",
      jobCode: "AGJ-20260901-0003",
      agentId: "outreach",
      agentName: "Personalized Outreach Agent",
      jobType: "OUTREACH",
      industry: null,
      location: null,
      requestedCount: 45,
      status: "QUEUED",
      businessesFound: null,
      duplicatesRemoved: null,
      existingClientsExcluded: null,
      suppressedExcluded: null,
      newProspectsCreated: null,
      attempts: 0,
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      createdAt: "2026-09-01T09:30:00Z",
    },
  ];
}

function generateMockEvents() {
  return [
    { id: "evt_1", agentId: "lead_finder", jobId: "job_1", jobCode: "AGJ-20260903-0001", prospectId: null, eventType: "JOB_COMPLETED", message: "Job AGJ-20260903-0001 completed: 91 new prospects created", status: "INFO", durationMs: 75000, errorDetails: null, createdAt: "2026-09-02T11:45:00Z" },
    { id: "evt_2", agentId: "lead_finder", jobId: "job_1", jobCode: "AGJ-20260903-0001", prospectId: null, eventType: "SEARCH_BATCH_COMPLETED", message: "Processed batch 3/3: 50 results", status: "INFO", durationMs: 12000, errorDetails: null, createdAt: "2026-09-02T11:42:00Z" },
    { id: "evt_3", agentId: "lead_finder", jobId: "job_1", jobCode: "AGJ-20260903-0001", prospectId: null, eventType: "JOB_STARTED", message: "Job AGJ-20260903-0001 started for Property Management", status: "INFO", durationMs: null, errorDetails: null, createdAt: "2026-09-02T10:30:00Z" },
    { id: "evt_4", agentId: "research_qualification", jobId: "job_2", jobCode: "AGJ-20260903-0002", prospectId: "p_1", eventType: "RESEARCH_STARTED", message: "Starting research for ABC Property Management", status: "INFO", durationMs: null, errorDetails: null, createdAt: "2026-09-03T14:16:00Z" },
    { id: "evt_5", agentId: "outreach", jobId: "job_3", jobCode: "AGJ-20260901-0003", prospectId: null, eventType: "JOB_QUEUED", message: "Job AGJ-20260901-0003 queued", status: "INFO", durationMs: null, errorDetails: null, createdAt: "2026-09-01T09:30:00Z" },
  ];
}

function generateMockErrors() {
  return [
    { id: "err_1", agentId: "research_qualification", agentName: "Research & Qualification Agent", jobId: "job_2", jobCode: "AGJ-20260903-0002", industry: null, location: null, prospectId: "p_1", errorType: "API_RATE_LIMIT", description: "Rate limited by search API, retrying in 30s", attemptCount: 1, lastAttemptAt: "2026-09-03T14:17:00Z", retryAvailable: true, adminActionRequired: false, resolved: false, createdAt: "2026-09-03T14:17:00Z" },
  ];
}

// ---------------------------------------------------------------------
// view=overview
// ---------------------------------------------------------------------
async function handleOverview(req, res) {
  try {
    const jobsRunning = mockJobs.filter(j => j.status === 'RUNNING').length;
    const jobsQueued = mockJobs.filter(j => j.status === 'QUEUED').length;
    const jobsCompletedToday = mockJobs.filter(j => {
      const today = new Date();
      const completedDate = j.completedAt ? new Date(j.completedAt) : null;
      return completedDate && completedDate.toDateString() === today.toDateString() && ['COMPLETED', 'PARTIALLY_COMPLETED'].includes(j.status);
    }).length;
    const jobsFailed = mockJobs.filter(j => ['FAILED', 'NEEDS_ADMIN_ATTENTION'].includes(j.status)).length;

    const agents = [
      { agentId: "lead_finder", agentName: "Lead Finder Agent", agentType: "DISCOVERY", status: "WAITING", currentJobId: null, lastStartedAt: "2026-09-02T10:30:00Z", lastCompletedAt: "2026-09-02T11:45:00Z", lastSuccessAt: "2026-09-02T11:45:00Z", lastFailureAt: null, jobsCompleted: 8, jobsFailed: 0, recordsProcessed: 456 },
      { agentId: "research_qualification", agentName: "Research & Qualification Agent", agentType: "RESEARCH", status: "RUNNING", currentJobId: "job_2", lastStartedAt: "2026-09-03T14:15:00Z", lastCompletedAt: "2026-09-02T16:20:00Z", lastSuccessAt: "2026-09-02T16:20:00Z", lastFailureAt: null, jobsCompleted: 12, jobsFailed: 1, recordsProcessed: 834 },
      { agentId: "outreach", agentName: "Personalized Outreach Agent", agentType: "OUTREACH", status: "WAITING", currentJobId: null, lastStartedAt: "2026-09-01T14:00:00Z", lastCompletedAt: "2026-09-01T15:30:00Z", lastSuccessAt: "2026-09-01T15:30:00Z", lastFailureAt: null, jobsCompleted: 5, jobsFailed: 0, recordsProcessed: 127 },
    ];

    const activeAgents = agents.filter(a => ["RUNNING", "QUEUED", "WAITING"].includes(a.status)).length;
    const prospectsResearched = 834;
    const highPriorityProspects = 156;
    const prospectsDiscoveredToday = 91;
    const outreachDraftsCreated = 0;
    const draftsAwaitingReview = 0;
    const errorsOpen = mockErrors.filter(e => !e.resolved).length;

    return res.status(200).json({
      metrics: {
        activeAgents,
        jobsRunning,
        jobsQueued,
        jobsCompletedToday,
        jobsFailed,
        prospectsDiscoveredToday,
        prospectsResearched,
        highPriorityProspects,
        outreachDraftsCreated,
        draftsAwaitingReview,
        agentErrorsRequiringAttention: errorsOpen,
        aiRequestsToday: 24,
        searchApiRequestsToday: 18,
        estimatedAiCostToday: "$2.4567",
        estimatedAiCostThisMonth: "$67.89",
      },
      agents,
    });
  } catch (err) {
    console.error("admin/agents overview failed", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong loading the agent dashboard." });
  }
}

// ---------------------------------------------------------------------
// view=activity
// ---------------------------------------------------------------------
async function handleActivity(req, res) {
  try {
    const limit = Math.min(parseInt(req.query?.limit, 10) || 50, 200);
    const events = mockEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    return res.status(200).json({
      events: events.map((e) => ({
        id: e.id,
        agentId: e.agentId,
        jobId: e.jobId,
        jobCode: e.jobCode,
        prospectId: e.prospectId,
        eventType: e.eventType,
        message: e.message,
        status: e.status,
        durationMs: e.durationMs,
        errorDetails: e.errorDetails,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin/agents activity failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=errors
// ---------------------------------------------------------------------
async function handleErrors(req, res) {
  try {
    const errors = mockErrors.sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1) || (new Date(b.createdAt) - new Date(a.createdAt))).slice(0, 200);
    return res.status(200).json({
      errors: errors.map((e) => ({
        id: e.id,
        agentId: e.agentId,
        agentName: e.agentName,
        jobId: e.jobId,
        jobCode: e.jobCode,
        industry: e.industry,
        location: e.location,
        prospectId: e.prospectId,
        errorType: e.errorType,
        description: e.description,
        attemptCount: e.attemptCount,
        lastAttemptAt: e.lastAttemptAt,
        retryAvailable: e.retryAvailable,
        adminActionRequired: e.adminActionRequired,
        resolved: e.resolved,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin/agents errors failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// MOCK: Generate next job code
function generateNextJobCode() {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const count = mockJobs.filter(j => j.jobCode.startsWith(`AGJ-${ymd}`)).length;
  return `AGJ-${ymd}-${String(count + 1).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------
// view=jobs (list / create)
// ---------------------------------------------------------------------
async function handleJobsList(req, res) {
  try {
    const { status, agentId, limit } = req.query || {};
    let jobs = mockJobs;
    if (status) jobs = jobs.filter(j => j.status === status);
    if (agentId) jobs = jobs.filter(j => j.agentId === agentId);
    jobs = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    jobs = jobs.slice(0, Math.min(parseInt(limit, 10) || 100, 200));
    return res.status(200).json({ jobs: jobs.map(serializeJob) });
  } catch (err) {
    console.error("admin/agents jobs list failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

async function handleJobCreate(req, res) {
  const { industry, location, requestedCount } = req.body || {};
  if (!industry || typeof industry !== "string" || !industry.trim()) {
    return res.status(400).json({ error: "invalid_input", message: "industry is required." });
  }
  if (!location || typeof location !== "string" || !location.trim()) {
    return res.status(400).json({ error: "invalid_input", message: "location is required." });
  }
  const count = Math.max(1, Math.min(parseInt(requestedCount, 10) || 25, MAX_REQUESTED_COUNT));

  try {
    const jobCode = generateNextJobCode();
    const job = {
      id: `job_${mockJobs.length + 1}`,
      jobCode,
      agentId: "lead_finder",
      agentName: "Lead Finder Agent",
      jobType: "DISCOVERY",
      industry: industry.trim(),
      location: location.trim(),
      requestedCount: count,
      status: "QUEUED",
      businessesFound: null,
      duplicatesRemoved: null,
      existingClientsExcluded: null,
      suppressedExcluded: null,
      newProspectsCreated: null,
      attempts: 0,
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    mockJobs.push(job);
    mockEvents.unshift({
      id: `evt_${mockEvents.length + 1}`,
      agentId: "lead_finder",
      jobId: job.id,
      jobCode: job.jobCode,
      prospectId: null,
      eventType: "JOB_QUEUED",
      message: `Job ${jobCode} queued: ${industry.trim()} — ${location.trim()} (requested ${count})`,
      status: "INFO",
      durationMs: null,
      errorDetails: null,
      createdAt: job.createdAt,
    });
    return res.status(201).json({ job: serializeJob(job) });
  } catch (err) {
    console.error("admin/agents job create failed", err);
    return res.status(500).json({ error: "server_error", message: "Could not create job." });
  }
}

function serializeJob(j) {
  return {
    id: j.id,
    jobCode: j.job_code,
    agentId: j.agent_id,
    agentName: j.agent_name,
    jobType: j.job_type,
    industry: j.industry,
    location: j.location,
    requestedCount: j.requested_count,
    status: j.status,
    businessesFound: j.businesses_found,
    duplicatesRemoved: j.duplicates_removed,
    existingClientsExcluded: j.existing_clients_excluded,
    suppressedExcluded: j.suppressed_excluded,
    newProspectsCreated: j.new_prospects_created,
    attempts: j.attempts,
    maxAttempts: j.max_attempts,
    startedAt: j.started_at,
    completedAt: j.completed_at,
    createdAt: j.created_at,
    runtimeMs: j.started_at ? new Date(j.completed_at || Date.now()) - new Date(j.started_at) : null,
  };
}

// MOCK: Mock prospects for job detail view
function getMockProspectsForJob(jobId) {
  if (jobId === "job_1") {
    return [
      { id: "p_1", business_name: "ABC Property Management", pipeline_stage: "RESEARCH_QUEUED", address: "123 Main St, Denver CO", phone: "(303) 555-0123", website: "abcproperty.com", created_at: "2026-09-02T10:35:00Z" },
      { id: "p_2", business_name: "XYZ Facilities Management", pipeline_stage: "DISCOVERED", address: "456 Oak Ave, Boulder CO", phone: "(303) 555-0456", website: "xyzfacilities.com", created_at: "2026-09-02T10:36:00Z" },
    ];
  }
  return [];
}

// MOCK: Mock tasks for job detail
function getMockTasksForJob(jobId) {
  if (jobId === "job_1") {
    return [
      { id: "task_1", taskType: "SEARCH", status: "COMPLETED", attempts: 1, error: null, startedAt: "2026-09-02T10:30:00Z", completedAt: "2026-09-02T10:35:00Z" },
      { id: "task_2", taskType: "DEDUP", status: "COMPLETED", attempts: 1, error: null, startedAt: "2026-09-02T10:35:00Z", completedAt: "2026-09-02T10:40:00Z" },
    ];
  }
  return [];
}

// MOCK: Mock events for job detail
function getMockEventsForJob(jobId) {
  if (jobId === "job_1") {
    return [
      { id: "evt_job1_1", eventType: "JOB_COMPLETED", message: "Job completed successfully", status: "INFO", createdAt: "2026-09-02T11:45:00Z", durationMs: 75000 },
      { id: "evt_job1_2", eventType: "DEDUP_COMPLETED", message: "Deduplicated 28 results", status: "INFO", createdAt: "2026-09-02T10:40:00Z", durationMs: 5000 },
    ];
  }
  return [];
}

// MOCK: Mock errors for job detail
function getMockErrorsForJob(jobId) {
  return [];
}

// ---------------------------------------------------------------------
// view=jobs&id=X (detail)
// ---------------------------------------------------------------------
async function handleJobDetail(req, res, id) {
  try {
    const job = mockJobs.find(j => j.id === id);
    if (!job) return res.status(404).json({ error: "not_found" });

    const tasks = getMockTasksForJob(id);
    const events = getMockEventsForJob(id);
    const errors = getMockErrorsForJob(id);
    const prospects = getMockProspectsForJob(id);

    return res.status(200).json({
      job: serializeJob(job),
      tasks: tasks.map((t) => ({ id: t.id, taskType: t.taskType, status: t.status, attempts: t.attempts, error: t.error, startedAt: t.startedAt, completedAt: t.completedAt })),
      events: events.map((e) => ({ id: e.id, eventType: e.eventType, message: e.message, status: e.status, createdAt: e.createdAt, durationMs: e.durationMs })),
      errors: errors.map((e) => ({ id: e.id, errorType: e.errorType, description: e.description, attemptCount: e.attemptCount, retryAvailable: e.retryAvailable, adminActionRequired: e.adminActionRequired, resolved: e.resolved, createdAt: e.createdAt })),
      prospects,
    });
  } catch (err) {
    console.error("admin/agents job detail failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=jobs&id=X&action=retry
// ---------------------------------------------------------------------
async function handleJobRetry(req, res, id) {
  try {
    const jobIndex = mockJobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return res.status(404).json({ error: "not_found" });

    const job = mockJobs[jobIndex];
    if (!["FAILED", "NEEDS_ADMIN_ATTENTION"].includes(job.status)) {
      return res.status(400).json({ error: "invalid_state", message: `Job is ${job.status}, not retryable.` });
    }
    if (job.attempts >= job.maxAttempts) {
      return res.status(400).json({ error: "retry_limit_reached", message: `Job already used all ${job.maxAttempts} attempts. Increase max_attempts to retry again.` });
    }

    mockJobs[jobIndex].status = "QUEUED";
    mockJobs[jobIndex].attempts += 1;
    mockEvents.unshift({
      id: `evt_${mockEvents.length + 1}`,
      agentId: job.agentId,
      jobId: job.id,
      jobCode: job.jobCode,
      prospectId: null,
      eventType: "JOB_RETRIED",
      message: `Admin retried job ${job.jobCode} (attempt ${job.attempts + 1}/${job.maxAttempts}).`,
      status: "INFO",
      durationMs: null,
      errorDetails: null,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("admin/agents job retry failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------
// view=research-queue
// ---------------------------------------------------------------------
async function handleQueueUnresearched(req, res) {
  try {
    // MOCK: Simulate finding unresearched prospects
    const prospectIds = ["p_3", "p_4", "p_5"];
    if (!prospectIds.length) return res.status(200).json({ ok: true, queued: 0, message: "No unresearched prospects found." });

    const jobCode = generateNextJobCode();
    const job = {
      id: `job_${mockJobs.length + 1}`,
      jobCode,
      agentId: "research_qualification",
      agentName: "Research & Qualification Agent",
      jobType: "RESEARCH",
      industry: null,
      location: null,
      requestedCount: prospectIds.length,
      status: "QUEUED",
      businessesFound: null,
      duplicatesRemoved: null,
      existingClientsExcluded: null,
      suppressedExcluded: null,
      newProspectsCreated: null,
      attempts: 0,
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    mockJobs.push(job);
    mockEvents.unshift({
      id: `evt_${mockEvents.length + 1}`,
      agentId: "research_qualification",
      jobId: job.id,
      jobCode: job.jobCode,
      prospectId: null,
      eventType: "JOB_QUEUED",
      message: `Admin manually queued research job ${jobCode} for ${prospectIds.length} previously-unresearched prospect(s).`,
      status: "INFO",
      durationMs: null,
      errorDetails: null,
      createdAt: job.createdAt,
    });
    return res.status(201).json({ ok: true, queued: prospectIds.length, jobId: job.id, jobCode });
  } catch (err) {
    console.error("admin/agents queue-unresearched failed", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}

function serializeJob(j) {
  return {
    id: j.id,
    jobCode: j.jobCode,
    agentId: j.agentId,
    agentName: j.agentName,
    jobType: j.jobType,
    industry: j.industry,
    location: j.location,
    requestedCount: j.requestedCount,
    status: j.status,
    businessesFound: j.businessesFound,
    duplicatesRemoved: j.duplicatesRemoved,
    existingClientsExcluded: j.existingClientsExcluded,
    suppressedExcluded: j.suppressedExcluded,
    newProspectsCreated: j.newProspectsCreated,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
    createdAt: j.createdAt,
    runtimeMs: j.startedAt ? new Date(j.completedAt || Date.now()) - new Date(j.startedAt) : null,
  };
}
