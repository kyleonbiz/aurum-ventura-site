-- Business Research & Qualification Agent — migration 004 (Phase 2).
--
-- Adds: prospect_research (what the agent found), prospect_qualification
-- (the score it derived), agent_usage (real AI call metering for the
-- Usage & Cost dashboard), and agent_admin_overrides (audit trail any
-- time an admin corrects AI output — required before this system can
-- honestly claim "admin overrides are tracked").
--
-- Research jobs are NOT admin-started like Lead Finder discovery jobs —
-- they're auto-created (see api/admin/agents/run-step.js) whenever a
-- discovery job produces new prospects, one research agent_jobs row
-- wrapping that batch. This reuses agent_jobs/agent_tasks rather than
-- inventing a parallel queue table.

create extension if not exists pgcrypto;

alter table agent_jobs
  add constraint agent_jobs_job_type_check check (job_type in ('DISCOVERY', 'RESEARCH'));

create table if not exists prospect_research (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  job_id uuid references agent_jobs(id),
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','COMPLETED','FAILED')),
  website_fetch_status text check (website_fetch_status in ('NOT_ATTEMPTED','NO_WEBSITE','FETCHED','UNREACHABLE')),
  summary text,
  signals jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb, -- URLs actually used
  attempts integer not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists prospect_research_prospect_id_idx on prospect_research (prospect_id);
create index if not exists prospect_research_job_id_idx on prospect_research (job_id);

create table if not exists prospect_qualification (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  score integer check (score >= 0 and score <= 100),
  level text check (level in ('HIGH_PRIORITY','GOOD_PROSPECT','POSSIBLE_FIT','LOW_PRIORITY')),
  rationale text,
  signals jsonb not null default '{}'::jsonb,
  low_confidence boolean not null default false, -- e.g. scored without a website to review
  admin_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists prospect_qualification_prospect_id_idx on prospect_qualification (prospect_id);
create index if not exists prospect_qualification_level_idx on prospect_qualification (level);

-- ---------------------------------------------------------------------
-- AGENT_USAGE — one row per AI or search/data API call, real numbers
-- only. The Usage & Cost dashboard sums this; if a call doesn't log
-- here (e.g. cost unknown for a model), it correctly reports
-- "NOT AVAILABLE" rather than guessing.
-- ---------------------------------------------------------------------
create table if not exists agent_usage (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(agent_id),
  job_id uuid references agent_jobs(id),
  prospect_id uuid references prospects(id),
  usage_type text not null check (usage_type in ('AI_CALL','SEARCH_API_CALL')),
  provider text not null, -- 'anthropic', 'osm'
  model text,
  purpose text, -- 'RESEARCH_AND_QUALIFY', 'DISCOVERY_GEOCODE', etc.
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(10,6), -- null when pricing for the model isn't configured
  duration_ms integer,
  success boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists agent_usage_created_at_idx on agent_usage (created_at desc);
create index if not exists agent_usage_agent_id_idx on agent_usage (agent_id);

-- ---------------------------------------------------------------------
-- AGENT_ADMIN_OVERRIDES — append-only history any time an admin changes
-- something the AI produced. Never overwrite AI output silently.
-- ---------------------------------------------------------------------
create table if not exists agent_admin_overrides (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  field_name text not null, -- 'qualification_score','qualification_level','research_summary','prospect_status','outreach_message','do_not_contact'
  original_value jsonb,
  admin_value jsonb not null,
  admin_user text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists agent_admin_overrides_prospect_id_idx on agent_admin_overrides (prospect_id);
