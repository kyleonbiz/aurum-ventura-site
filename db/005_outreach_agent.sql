-- Phase 3: Personalized Outreach Agent
-- Stores generated email drafts, approval status, and sending history.

-- Add contact_email column to prospects if it doesn't exist (needed for outreach sending)
alter table prospects
  add column if not exists contact_email text;

create table if not exists outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agent_jobs(id) on delete cascade,
  prospect_id uuid not null references prospects(id) on delete cascade,
  draft_text text not null,
  status text not null default 'DRAFT', -- DRAFT, APPROVED, SENT, FAILED
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  sent_at timestamptz,
  sent_error text, -- if status = FAILED, reason
  unique(prospect_id, job_id) -- one draft per prospect per job
);

create index if not exists idx_outreach_drafts_job_id on outreach_drafts(job_id);
create index if not exists idx_outreach_drafts_prospect_id on outreach_drafts(prospect_id);
create index if not exists idx_outreach_drafts_status on outreach_drafts(status);

create table if not exists outreach_history (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  draft_id uuid not null references outreach_drafts(id) on delete cascade,
  sent_to_email text not null,
  sent_at timestamptz not null default now(),
  response_status text -- DELIVERED, BOUNCED, COMPLAINED, etc. (from Resend webhook, future)
);

create index if not exists idx_outreach_history_prospect_id on outreach_history(prospect_id);
create index if not exists idx_outreach_history_sent_at on outreach_history(sent_at);
