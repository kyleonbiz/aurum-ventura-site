-- AI Agent Operations — migration 003.
--
-- Backs the "AI AGENT OPERATIONS" admin dashboard. This is Phase 1:
-- real schema for the agent registry, jobs, tasks, activity feed and
-- errors, plus the `prospects` table the Lead Finder Agent writes to.
-- The Research/Qualification and Outreach agents are registered here
-- (status IDLE) but their own work tables (prospect_research,
-- prospect_qualification, outreach_drafts, agent_usage,
-- agent_admin_overrides) are intentionally deferred to the migration
-- that ships those agents — adding empty tables now would just be
-- dead schema, and the dashboard must never show fabricated activity
-- for agents that don't run yet.
--
-- Reuses the existing Postgres (see db/schema.sql) — no new database,
-- no new service. Admin auth for the new /api/admin/agents/* endpoints
-- reuses api/_lib/adminAuth.js (same ADMIN_PASSWORD/session cookie as
-- the intake-review admin area).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- AGENTS — the registry. One row per agent, seeded below. Additional
-- Aurum Ventura agents are added by inserting a new row here; nothing
-- in the dashboard is hardcoded to these three.
-- ---------------------------------------------------------------------
create table if not exists agents (
  agent_id text primary key, -- short stable slug, e.g. 'lead_finder'
  agent_name text not null,
  agent_type text not null, -- e.g. 'DISCOVERY', 'RESEARCH_QUALIFICATION', 'OUTREACH'
  status text not null default 'IDLE'
    check (status in ('IDLE','QUEUED','RUNNING','WAITING','COMPLETED','PARTIALLY_COMPLETED','FAILED','PAUSED','NEEDS_ADMIN_ATTENTION')),
  current_job_id uuid,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  jobs_completed integer not null default 0,
  jobs_failed integer not null default 0,
  records_processed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into agents (agent_id, agent_name, agent_type)
values
  ('lead_finder', 'Lead Finder Agent', 'DISCOVERY'),
  ('research_qualification', 'Business Research & Qualification Agent', 'RESEARCH_QUALIFICATION'),
  ('personalized_outreach', 'Personalized Outreach Agent', 'OUTREACH')
on conflict (agent_id) do nothing;

-- ---------------------------------------------------------------------
-- AGENT_JOBS — one row per prospecting/research/outreach job an admin
-- (or, later, a schedule) starts. Phase 1 only ever creates
-- agent_type = 'lead_finder' jobs.
-- ---------------------------------------------------------------------
create table if not exists agent_jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique not null, -- e.g. AGJ-20260828-0042
  agent_id text not null references agents(agent_id),
  job_type text not null, -- 'DISCOVERY' for Phase 1
  industry text,
  location text,
  requested_count integer,
  status text not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','WAITING','COMPLETED','PARTIALLY_COMPLETED','FAILED','PAUSED','NEEDS_ADMIN_ATTENTION')),
  -- discovery counters, updated as the job runs
  businesses_found integer not null default 0,
  duplicates_removed integer not null default 0,
  existing_clients_excluded integer not null default 0,
  suppressed_excluded integer not null default 0,
  new_prospects_created integer not null default 0,
  -- pagination/cursor state so run-step can resume a job across invocations
  cursor jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  created_by text, -- admin identifier (Phase 1: just "admin")
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_jobs_agent_id_idx on agent_jobs (agent_id);
create index if not exists agent_jobs_status_idx on agent_jobs (status);
create index if not exists agent_jobs_created_at_idx on agent_jobs (created_at desc);

alter table agents
  add constraint agents_current_job_fk foreign key (current_job_id) references agent_jobs(id) on delete set null;

-- ---------------------------------------------------------------------
-- AGENT_TASKS — sub-units of work inside a job. For a discovery job,
-- one task per attempted "page" of results from the discovery API, so
-- retries and errors are attributable at a finer grain than the job.
-- ---------------------------------------------------------------------
create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agent_jobs(id) on delete cascade,
  agent_id text not null references agents(agent_id),
  task_type text not null, -- 'DISCOVER_BATCH', 'GEOCODE_LOCATION', etc.
  prospect_id uuid, -- fk added after prospects table exists
  status text not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','COMPLETED','FAILED','NEEDS_ADMIN_ATTENTION')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists agent_tasks_job_id_idx on agent_tasks (job_id);
create index if not exists agent_tasks_status_idx on agent_tasks (status);

-- ---------------------------------------------------------------------
-- PROSPECTS — businesses the Lead Finder Agent has discovered. Later
-- agents (research/qualification/outreach) will add columns/tables
-- linked by prospect_id rather than duplicating this record.
-- ---------------------------------------------------------------------
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  source_job_id uuid references agent_jobs(id),
  business_name text not null,
  industry text,
  location text,
  address text,
  phone text,
  website text,
  source text not null default 'osm', -- discovery data source
  source_ref text, -- external id from the discovery source, for de-duplication
  dedupe_key text not null, -- normalized name+location, unique
  pipeline_stage text not null default 'DISCOVERED'
    check (pipeline_stage in (
      'DISCOVERED','RESEARCH_QUEUED','RESEARCH_STARTED','RESEARCH_COMPLETED',
      'QUALIFICATION_SCORED','OUTREACH_DRAFT_QUEUED','OUTREACH_DRAFT_GENERATED',
      'AWAITING_ADMIN_REVIEW','ADMIN_APPROVED','ADMIN_EDITED','ADMIN_REJECTED',
      'DO_NOT_CONTACT'
    )),
  do_not_contact boolean not null default false,
  is_existing_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists prospects_dedupe_key_idx on prospects (dedupe_key);
create index if not exists prospects_source_job_id_idx on prospects (source_job_id);
create index if not exists prospects_pipeline_stage_idx on prospects (pipeline_stage);
create index if not exists prospects_created_at_idx on prospects (created_at desc);

alter table agent_tasks
  add constraint agent_tasks_prospect_fk foreign key (prospect_id) references prospects(id) on delete set null;

-- ---------------------------------------------------------------------
-- AGENT_EVENTS — the append-only chronological activity feed.
-- ---------------------------------------------------------------------
create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(agent_id),
  job_id uuid references agent_jobs(id),
  prospect_id uuid references prospects(id),
  event_type text not null, -- e.g. 'JOB_STARTED', 'PROSPECT_CREATED', 'DUPLICATE_REMOVED', 'RESEARCH_FAILED'
  message text not null,
  status text not null default 'INFO' check (status in ('INFO','SUCCESS','WARNING','ERROR')),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  error_details text,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_created_at_idx on agent_events (created_at desc);
create index if not exists agent_events_job_id_idx on agent_events (job_id);
create index if not exists agent_events_agent_id_idx on agent_events (agent_id);

-- ---------------------------------------------------------------------
-- AGENT_ERRORS — structured operational errors, separate from the
-- general activity feed so the Error Center can query just these.
-- ---------------------------------------------------------------------
create table if not exists agent_errors (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(agent_id),
  job_id uuid references agent_jobs(id),
  task_id uuid references agent_tasks(id),
  prospect_id uuid references prospects(id),
  error_type text not null, -- e.g. 'SEARCH_API_FAILED', 'RATE_LIMIT_REACHED', 'TIMEOUT'
  description text not null,
  attempt_count integer not null default 1,
  last_attempt_at timestamptz not null default now(),
  retry_available boolean not null default true,
  admin_action_required boolean not null default false,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists agent_errors_created_at_idx on agent_errors (created_at desc);
create index if not exists agent_errors_resolved_idx on agent_errors (resolved);

-- Job code sequence helper (AGJ-YYYYMMDD-NNNN), generated in application
-- code from a per-day count query rather than a Postgres sequence, so no
-- extra sequence object is needed here.
