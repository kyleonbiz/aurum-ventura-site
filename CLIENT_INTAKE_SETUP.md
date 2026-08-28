# Client Intake — Setup & Deliverables

Real, working implementation — not a mockup. Built on the same infrastructure as the document-upload
feature (same Postgres database, same `clients`/`client_contacts` tables extended rather than duplicated,
same Dropbox and email layers) per your instruction to reuse what already exists.

## 1. Files created

```
website/
  api/
    _lib/
      adminAuth.js       — admin password check + signed session cookie (NEW: no admin auth existed anywhere before)
      audit.js            — general admin/system audit log writer
      clientNumber.js       — safe, sequence-based client numbering (AV-0027, never row-count-based)
    admin/
      login.js               — POST: admin sign-in
      logout.js                — POST: clear session
      session.js                 — GET: is the caller currently signed in
      intakes/
        index.js                  — GET: list intakes + pending count (dashboard badge)
        [id].js                     — GET: full intake detail for the review screen
        [id]/
          approve.js                 — POST: the ONLY endpoint that can create a client (transactional)
          request-info.js              — POST: sets MORE INFORMATION REQUIRED + emails the client
          reject.js                      — POST: sets REJECTED, internal-only reason
    intake/
      submit.js                          — POST: public submission endpoint (creates PENDING REVIEW only)
  db/
    002_client_intake.sql                  — schema migration (see §3)
  shared/
    intakeShared.js                          — validation constants shared by frontend + backend
```

## 2. Files modified

- `src/App.jsx` — added `/client-intake`, `/admin`, `/admin/intakes`, `/admin/intakes/:id` pages and
  routing; added "For Clients" footer column (Client Intake, Upload Documents); fixed a pre-existing footer
  layout bug (`.footer-cols` had no `flex-wrap`, so a third column would have overflowed off-screen on
  mobile instead of wrapping).
- `src/entry-server.jsx` — added `ClientIntake` to the public route list (real prerendered page); added a
  separate `ADMIN_ROUTES` export for the `/admin` shell (prerendered for the SPA fallback, but deliberately
  excluded from the sitemap and marked `noindex`).
- `scripts/prerender.mjs` — renders both route lists; injects `<meta name="robots" content="noindex, nofollow">`
  on admin pages; sitemap.xml is still built from the public list only.
- `vercel.json` — added a rewrite so every `/admin/*` path (intake IDs aren't known at build time) serves the
  same prerendered shell, which the client-side router then resolves — the same pattern already used for
  service-detail pages, just with a rewrite instead of build-time enumeration since admin IDs are dynamic.
- `api/_lib/refnum.js` — generalized to accept a prefix/suffix style (`AV-IN-...-A82F4D` hex suffix for
  intakes, vs. uploads' existing `AV-UP-...-0147` digit suffix) — fully backward compatible, the upload
  feature's existing call site needed no changes.
- `api/_lib/dropbox.js` — added `createClientFolderStructure()`, the 13-subfolder set, called only from the
  approve endpoint.
- `api/_lib/email.js` — added the four intake emails (confirmation, internal notification, approved, more-info-requested).

## 3. Database changes

Run `db/002_client_intake.sql` once, after `db/schema.sql` (already applied for the upload feature). It:

- **Extends `clients`** (does not replace it) with the fuller company profile, a unique `client_number`, and
  `intake_reference` — plus widens the `status` check constraint to allow `ONBOARDING` (new clients start
  here, never `ACTIVE`, per your explicit requirement).
- **Extends `client_contacts`** with `title`, `phone`, `authorization_notes`.
- Adds a Postgres **sequence** (`client_number_seq`) for collision-free client numbering — never a row count.
- Adds `intake_requests`, `intake_authorized_contacts`, `client_systems`, `client_service_interests`
  (explicitly NOT the final Scope of Services — see the code comment), `client_onboarding_tasks`, and a
  general `audit_log` (separate from the upload feature's `upload_audit_log`, which is hard-scoped to that
  feature via a foreign key).

## 4. New API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/intake/submit` | POST | intake code + validation | Creates a `PENDING REVIEW` intake. Never creates a client. |
| `/api/admin/login` | POST | — | Admin sign-in |
| `/api/admin/logout` | POST | — | Clear session |
| `/api/admin/session` | GET | — | Is the caller signed in |
| `/api/admin/intakes` | GET | admin session | List + pending count |
| `/api/admin/intakes/:id` | GET | admin session | Full review detail |
| `/api/admin/intakes/:id/approve` | POST | admin session | **The only path to creating a client** |
| `/api/admin/intakes/:id/request-info` | POST | admin session | Sets status, emails client |
| `/api/admin/intakes/:id/reject` | POST | admin session | Sets status, no client, no auto-email |

## 5. Environment variables required

**New for this feature:**

| Variable | Purpose |
|---|---|
| `CLIENT_INTAKE_CODE` | The intake code, checked server-side only. |
| `ADMIN_PASSWORD` | The single shared admin login password. |
| `ADMIN_SESSION_SECRET` | Random secret used to sign admin session cookies — e.g. `openssl rand -hex 32`. |

**Already required from the upload feature (reused, no changes):** `DATABASE_URL`, `DROPBOX_APP_KEY` /
`DROPBOX_APP_SECRET` / `DROPBOX_REFRESH_TOKEN` (or `DROPBOX_ACCESS_TOKEN`), `RESEND_API_KEY`,
`AURUM_FROM_EMAIL`, `AURUM_INTERNAL_NOTIFY_EMAIL`, `AURUM_SITE_ORIGIN`.

## 6. "Admin OS" changes — an honest note

There is still no backend behind the standalone Admin OS tool you shared — that hasn't changed. This
feature's admin review screens (`/admin/intakes`, `/admin/intakes/:id`) are new pages built directly into
this website's codebase, gated by the new password + session-cookie auth in `api/_lib/adminAuth.js`, backed
by the same Postgres database the upload feature already uses. This is a real, working internal review
system — just not living inside that separate static-HTML tool, which still has no server to host one.

## 7. Email integration changes

Four new emails (all via the existing Resend integration, no new provider):
1. **Intake confirmation** → submitting contact, immediately on submission
2. **Internal notification** → your team, immediately on submission, with a link to the admin review screen
3. **Approval email** → client, only sent after a successful client creation (never before)
4. **More-information-requested email** → client, includes your written message, never the internal
   rejection-reason field (that stays internal-only in all cases)

## 8. Security protections implemented

- Server-side intake code verification (constant-time compare, same pattern as the upload code)
- Real admin authentication: password + HMAC-signed, httpOnly, Secure, SameSite=Strict session cookie —
  no session table needed, verification is just "is the signature valid and not expired"
- Rate limiting on intake submission and admin login attempts (DB-backed, reused from the upload feature)
- Same-origin request check (the CSRF-equivalent already established for this API's auth model — no
  cookie-based session for a forged cross-site request to exploit, see `api/_lib/auth.js`)
- Input validation + sanitization, shared identically between frontend and backend (`shared/intakeShared.js`)
- No production secrets anywhere in source — verified, all of §5 lives only in Vercel environment variables
- No passwords/credentials collected from intake submitters (explicit UI notice, and the form has no such field)
- **Transactional approval** — see §9
- **Idempotency** — the intake submission form generates one idempotency key per page load; a resubmit
  (double-click, retry) returns the same reference number instead of creating a duplicate row
- **Duplicate-client detection** — approval checks `clients.legal_name` and `clients.primary_email` before
  creating a new client; if a match exists, approval is blocked with a `potential_duplicate` response unless
  the admin explicitly confirms again (`force: true`) after seeing the warning
- Audit logging — every admin action (login attempt, approve, reject, request-info) and every meaningful
  system event (email failures, folder-creation failures) is recorded with actor, action, entity, and outcome

## 9. How approval creates the client (transactional)

Everything from client-number generation through linking the intake back to the new client happens inside
one Postgres transaction (`sql.begin(...)` in `api/admin/intakes/[id]/approve.js`):

1. Lock the intake row (`for update`) — makes a concurrent double-approval impossible
2. Check for a duplicate client (unless already confirmed via `force`)
3. Generate the client number from the sequence
4. Insert the `clients` row (status `ONBOARDING`)
5. Insert one `client_contacts` row per authorized contact
6. Insert `client_systems` and `client_service_interests` rows
7. Insert the starter `client_onboarding_tasks` checklist
8. Update the intake: `status = APPROVED`, `client_id` set, `approved_at`/`approved_by` recorded

**Either all eight steps land, or none do** — a failure at any point rolls back the whole transaction, so
"client created but intake still pending" or the reverse is not possible. The original intake row is never
deleted or overwritten — it's the permanent audit record, exactly as required.

Dropbox folder creation and the approval email happen **after** the transaction commits (they're calls to
other services, not database writes) and are best-effort with logged outcomes — a Dropbox hiccup can't roll
back a client that was already successfully created.

## 10. How to test the complete workflow

1. Apply `db/002_client_intake.sql`, set the three new env vars (§5) in Vercel (or via `vercel env pull` for
   local testing with `vercel dev` — `vite dev` alone does not run the `/api/*` functions).
2. Visit `/client-intake`, enter the intake code, complete the form, submit → confirmation screen shows a
   reference number like `AV-IN-20260828-A82F4D`; check the submitting email for the confirmation, and your
   internal notify address for the internal alert.
3. Visit `/admin`, sign in with `ADMIN_PASSWORD` → `/admin/intakes` shows the new row with **1 Pending**.
4. Click **Review** → verify every submitted field renders correctly, including authorized contacts, systems,
   and administrative areas.
5. Click **Approve Intake** → **Approve & Create Client** → confirm the resulting client number is shown, a
   `clients` row exists with `status = ONBOARDING`, `client_contacts`/`client_systems`/
   `client_service_interests`/`client_onboarding_tasks` rows exist, the intake now shows `APPROVED`, the
   client's Dropbox folder structure exists (if Dropbox is configured), and the approval email arrived.
6. Submit a second intake with the same legal name or email, then try to approve it → verify the
   "Potential existing client detected" warning appears and blocks a silent duplicate.
7. Test **Request More Information** and **Reject** on separate test intakes — verify status changes, the
   correct email fires (or doesn't, for reject), and no client is created either way.

## 11. Setup to complete in Vercel

1. Set `CLIENT_INTAKE_CODE`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (generate with `openssl rand -hex 32`).
2. Run `db/002_client_intake.sql` against the same database used for the upload feature.
3. Nothing else — Dropbox/email/database credentials are shared with the upload feature and don't need to be
   set again.

## 12. What could not be completed, and why

- **No live connection to the standalone Admin OS tool.** As established when building the upload feature,
  it has no backend to connect to. This feature's review UI is a real, working substitute built directly into
  this codebase — not a gap left unfilled, but worth being clear it's not literally inside that other tool.
- **No resubmission flow for "More Information Required."** The database is designed for it (the intake row
  is simply updated, never duplicated), but building a client-facing "edit and resubmit your intake" page
  wasn't in the brief's explicit field list and would meaningfully expand scope — for now, an admin can
  approve directly from `MORE INFORMATION REQUIRED` status once they have the missing details by phone/email,
  or a future intake resubmission page can write to the exact same row.
- **No rejection email.** The brief specifies confirmation, internal-notification, and approval emails in
  detail, but doesn't specify rejection email content — rather than invent wording you didn't ask for, I left
  it unbuilt. `api/admin/intakes/[id]/reject.js` is the exact place to add one if you want it.
