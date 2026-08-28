-- Aurum Ventura — Client Document Upload schema
--
-- Run this once against whatever Postgres database you provision
-- (Supabase, Neon, Vercel Postgres, etc.) before the upload feature can
-- work end-to-end. See website/UPLOAD_SETUP.md for full setup steps.
--
-- Design notes:
--   - `clients` / `client_contacts` are the minimal "client directory"
--     the upload flow verifies emails against. This is a REAL, separate
--     table from the standalone Admin OS tool (which only has
--     browser-local storage and no API) — see UPLOAD_SETUP.md for why,
--     and how to eventually replace this with a call into a real Admin
--     OS API if that tool grows a backend.
--   - `uploads` starts life as PENDING_FILES (created by /api/upload/init)
--     and moves to "NEW — NEEDS REVIEW" once /api/upload/complete runs.
--   - `upload_files` is one row per file — never a single string blob.
--   - `administrative_requests` is auto-created for every completed
--     upload that has a requested_action (which is required, so: always).
--   - `upload_audit_log` is an append-only trail of what happened to a
--     given upload, for support/debugging and the "audit logging"
--     security requirement.
--   - `rate_limit_events` backs a simple DB-based rate limiter (one row
--     per attempt) so we don't need a separate Redis/Upstash dependency
--     for v1.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  primary_email text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  unique (client_id, email)
);
create index if not exists client_contacts_email_idx on client_contacts (lower(email));
create unique index if not exists clients_primary_email_lower_idx on clients (lower(primary_email));

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique,
  idempotency_key text unique,
  client_id uuid not null references clients(id),
  client_legal_name text not null,
  submitted_by_contact_id uuid references client_contacts(id),
  submitted_email text not null,
  category text not null,
  document_description text not null,
  requested_action text not null,
  additional_notes text,
  file_count integer not null default 0,
  storage_provider text not null default 'dropbox',
  storage_folder_path text,
  status text not null default 'PENDING_FILES'
    check (status in ('PENDING_FILES', 'NEW — NEEDS REVIEW', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  confirmation_email_status text not null default 'PENDING'
    check (confirmation_email_status in ('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE')),
  reviewed_at timestamptz,
  reviewed_by text,
  related_vendor_id uuid,
  related_invoice_id uuid,
  related_project_id uuid,
  related_renewal_id uuid,
  related_request_id uuid,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists uploads_client_id_idx on uploads (client_id);
create index if not exists uploads_status_idx on uploads (status);

create table if not exists upload_files (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references uploads(id) on delete cascade,
  client_id uuid not null references clients(id),
  original_filename text not null,
  stored_filename text not null,
  mime_type text,
  file_size bigint,
  storage_path text,
  category text,
  restricted_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists upload_files_upload_id_idx on upload_files (upload_id);

create table if not exists administrative_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  upload_reference text references uploads(reference_number),
  category text,
  description text,
  requested_action text,
  status text not null default 'NEW',
  priority text not null default 'NORMAL',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists administrative_requests_client_id_idx on administrative_requests (client_id);

create table if not exists upload_audit_log (
  id bigserial primary key,
  upload_id uuid references uploads(id) on delete set null,
  event text not null,
  detail jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists upload_audit_log_upload_id_idx on upload_audit_log (upload_id);

create table if not exists rate_limit_events (
  id bigserial primary key,
  scope text not null,          -- e.g. 'upload_init' — lets different endpoints rate-limit independently
  key text not null,            -- e.g. the caller's IP
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_scope_key_idx on rate_limit_events (scope, key, created_at);
