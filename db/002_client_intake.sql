-- Client Intake feature — migration 002.
-- Run this AFTER db/schema.sql (which already created `clients` and
-- `client_contacts` for the document-upload feature). This migration
-- extends those same tables rather than creating parallel ones, per
-- "do not duplicate Client tables that already exist."
--
-- Relationship modeled here:
--   intake_requests  (client-submitted, PENDING REVIEW / APPROVED / ...)
--     -> intake_authorized_contacts (one row per contact the client added)
--     -> on APPROVAL, transactionally:
--          - a new row in `clients` (status = ONBOARDING, not ACTIVE)
--          - one `client_contacts` row per intake_authorized_contacts row
--          - `client_systems` rows for selected systems/software
--          - `client_service_interests` rows for requested admin areas
--            (explicitly NOT the final Scope of Services — see app code)
--          - `client_onboarding_tasks` rows (a starter checklist)
--          - intake_requests.client_id is set, linking back
-- The original intake row is never deleted or overwritten by approval —
-- it stays as the permanent audit record of what was submitted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Extend `clients` with the fuller company profile an approved intake
-- populates, plus a human-facing client number and a link back to the
-- intake it came from.
-- ---------------------------------------------------------------------
alter table clients
  add column if not exists client_number text unique,
  add column if not exists dba_name text,
  add column if not exists industry text,
  add column if not exists website text,
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip text,
  add column if not exists num_locations integer,
  add column if not exists num_employees text,
  add column if not exists year_established text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_title text,
  add column if not exists primary_contact_phone text,
  add column if not exists preferred_contact_method text,
  add column if not exists business_hours text,
  add column if not exists timezone text,
  add column if not exists main_admin_contact text,
  add column if not exists business_notes text,
  add column if not exists recurring_notes text,
  add column if not exists additional_notes text,
  add column if not exists intake_reference text;

-- Widen the status check to include ONBOARDING (a newly-approved client
-- is NOT ACTIVE yet, per the brief). Constraint name matches Postgres's
-- default auto-generated name for an unnamed column check.
alter table clients drop constraint if exists clients_status_check;
alter table clients add constraint clients_status_check
  check (status in ('ONBOARDING', 'ACTIVE', 'INACTIVE'));

-- Safe, collision-free client numbering (AV-0027-style) — a sequence,
-- not a row count, per the brief's explicit warning about duplicates.
create sequence if not exists client_number_seq start 1;

-- Authorized-contact detail the upload feature's simpler client_contacts
-- didn't need yet.
alter table client_contacts
  add column if not exists title text,
  add column if not exists phone text,
  add column if not exists authorization_notes text;

-- ---------------------------------------------------------------------
-- intake_requests — the client-submitted, NOT-YET-A-CLIENT record.
-- ---------------------------------------------------------------------
create table if not exists intake_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique,
  idempotency_key text unique,
  status text not null default 'PENDING REVIEW'
    check (status in ('PENDING REVIEW', 'APPROVED', 'REJECTED', 'MORE INFORMATION REQUIRED')),
  source text not null default 'WEBSITE CLIENT INTAKE',

  -- Company information
  legal_name text not null,
  dba_name text,
  industry text not null,
  website text,
  address_street text not null,
  address_city text not null,
  address_state text not null,
  address_zip text not null,
  num_locations integer not null,
  num_employees text,
  year_established text,

  -- Primary contact
  primary_contact_name text not null,
  primary_contact_title text not null,
  primary_contact_email text not null,
  primary_contact_phone text not null,

  -- Business operations
  preferred_contact_method text,
  business_hours text,
  timezone text,
  main_admin_contact text,

  -- Systems & administrative areas — stored as jsonb arrays; each entry
  -- is either a known option string or a client-typed custom value.
  systems jsonb not null default '[]'::jsonb,
  administrative_areas jsonb not null default '[]'::jsonb,

  -- Notes
  business_notes text not null,
  recurring_notes text,
  additional_notes text,

  -- Admin review
  admin_message text,       -- used for MORE INFORMATION REQUIRED
  rejection_reason text,    -- internal only — never emailed to the client
  reviewed_at timestamptz,
  reviewed_by text,
  approved_at timestamptz,
  approved_by text,
  client_id uuid references clients(id),

  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists intake_requests_status_idx on intake_requests (status);
create index if not exists intake_requests_email_lower_idx on intake_requests (lower(primary_contact_email));

create table if not exists intake_authorized_contacts (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references intake_requests(id) on delete cascade,
  full_name text not null,
  title text,
  email text not null,
  phone text,
  authorization_notes text,
  created_at timestamptz not null default now()
);
create index if not exists intake_authorized_contacts_intake_id_idx on intake_authorized_contacts (intake_id);

-- ---------------------------------------------------------------------
-- Populated on approval only.
-- ---------------------------------------------------------------------
create table if not exists client_systems (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  system_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_systems_client_id_idx on client_systems (client_id);

-- Explicitly NOT the final Scope of Services — this is what the client
-- said they were interested in at intake time, for onboarding/setup
-- purposes only. See app code / UPLOAD_SETUP-style docs.
create table if not exists client_service_interests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  area_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_service_interests_client_id_idx on client_service_interests (client_id);

create table if not exists client_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  task text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'DONE')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists client_onboarding_tasks_client_id_idx on client_onboarding_tasks (client_id);

-- ---------------------------------------------------------------------
-- General admin-action audit log. Separate from upload_audit_log (which
-- is scoped to the document-upload feature via a hard FK to `uploads`) —
-- this one covers admin logins, intake review actions, and approvals.
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id bigserial primary key,
  actor text not null,             -- 'admin' (single shared login for now) or 'system'
  action text not null,            -- e.g. 'intake_approved', 'admin_login_failed'
  entity_type text,                -- 'intake_request' | 'client' | 'admin_session'
  entity_id text,
  detail jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id);
