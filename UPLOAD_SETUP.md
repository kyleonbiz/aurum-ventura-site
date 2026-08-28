# Client Document Upload — Setup & Deliverables

This is the real, working implementation of the client document upload feature — not a mockup. It's fully built and verified end-to-end against the frontend and error-handling paths; the storage/database/email steps are wired with correct, complete code but need **your own credentials** to actually move data (see "What's missing" below — nothing was faked to skip that).

## 1. Files created

```
website/
  api/
    _lib/
      auth.js          — upload-code check (constant-time compare) + client/contact email lookup
      db.js             — Postgres connection (lazy, env-var driven)
      dropbox.js         — storage abstraction (Dropbox today; swap this one file for another provider later)
      email.js            — client confirmation + internal notification emails (Resend)
      ratelimit.js          — simple DB-backed rate limiter
      refnum.js               — reference number generation (AV-UP-YYYYMMDD-XXXX) with collision retry
      scan.js                   — malware-scan integration point (currently a documented no-op — see below)
      validate.js                — server-side file/text validation
    upload/
      init.js                      — POST: validates code+email+fields, creates the upload record
      file.js                        — POST: one file per call, streams to Dropbox, records it
      complete.js                      — POST: finalizes, creates the linked admin request, sends emails
  db/
    schema.sql                          — full schema (run this once against your database)
    seed_example.sql                     — template for adding real clients (contains no real data)
  shared/
    uploadShared.js                       — validation constants shared by frontend + backend (no drift)
```

## 2. Files modified

- `src/App.jsx` — added the `/upload` page (`UploadPage` component), added "Upload Documents" to the
  header nav (desktop + mobile), added routing (`pathFor`/`pageFromPath`), page title/description entries.
- `src/entry-server.jsx` — added `/upload` to the prerendered route list (so it gets real static HTML too).
- `package.json` — added `dropbox`, `formidable`, `postgres`, `resend` dependencies.

## 3. Why this needed a real architecture decision first

Before writing any code, per your own instruction to inspect the existing system first: **this project had
no backend of any kind** — a static Vite/React site with zero server code, and a separately-built "Admin OS"
that turned out to be a single-browser localStorage tool with no API or database. Neither could "receive" an
upload. So this feature adds:

- Three Vercel serverless functions under `api/upload/` (Node runtime — Vercel auto-detects and deploys these
  alongside the static site, no extra config needed).
- A **new, minimal Postgres database** (`db/schema.sql`) to hold clients, contacts, uploads, files, and the
  linked administrative requests. This is *not* the Admin OS tool you shared — that tool still has no backend
  to write to. Once/if the Admin OS gets a real API, the honest integration point is `api/_lib/auth.js`'s
  `lookupClientByEmail()` (swap the query for an API call) — see "What's missing" below.

## 4. Why uploads are split into three requests (init → file → complete)

Vercel's Node serverless functions cap request bodies at roughly 4.5MB. A single "submit everything at once"
endpoint would silently fail on real multi-file submissions. Splitting into one small request per file:

- keeps every individual request well under the limit,
- gives real per-file progress in the UI (not a fake progress bar),
- and means one bad/oversized file can't take the whole submission down — partial failures are handled
  per-file, and the client shows exactly which file failed and why.

## 5. Environment variables required

Set these in Vercel (Project Settings → Environment Variables) — **never commit them**:

| Variable | Purpose |
|---|---|
| `AURUM_UPLOAD_CODE` | The shared upload code, checked server-side only. Never in frontend code. |
| `DATABASE_URL` | Postgres connection string (Supabase/Neon/Vercel Postgres/etc.) |
| `DROPBOX_APP_KEY` + `DROPBOX_APP_SECRET` + `DROPBOX_REFRESH_TOKEN` | **Recommended** — long-lived server auth (see §7) |
| `DROPBOX_ACCESS_TOKEN` | Fallback for quick testing only — Dropbox access tokens expire in a few hours |
| `RESEND_API_KEY` | Email sending |
| `AURUM_FROM_EMAIL` | The verified "from" address for both emails (needs a domain verified in Resend) |
| `AURUM_INTERNAL_NOTIFY_EMAIL` | Where the internal "new upload" notification goes |
| `AURUM_SITE_ORIGIN` | *(optional)* `https://www.aurumventura.net` — enables a same-origin request check |

If any of these are missing, the relevant endpoint returns a clear `503 not_configured` error instead of
pretending to succeed — nothing fails silently.

## 6. Database setup

1. Provision a Postgres database. **Supabase** (supabase.com, free tier) is the easiest path — create a
   project, then copy the connection string (Project Settings → Database → Connection string → "URI",
   use the *pooled* connection string) into `DATABASE_URL`.
2. Run `db/schema.sql` against it once (Supabase's SQL Editor, or `psql "$DATABASE_URL" -f db/schema.sql`).
3. Add your real clients — copy the pattern in `db/seed_example.sql` (no real client data is included; you
   add your own).

No ORM, no migration framework — just one plain SQL file. If the schema changes later, add a
`db/002_*.sql` file with the diff.

## 7. Dropbox setup

1. Create an app at [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps) — choose
   **Scoped access**, **App folder** or **Full Dropbox** (Full Dropbox is required to write to
   `/Clients/...` at the root; App folder would sandbox everything under a folder named after the app).
2. Under **Permissions**, enable `files.content.write` and `files.content.read`, then re-authorize.
3. Get a refresh token (recommended — access tokens alone expire in ~4 hours):
   - Visit `https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&token_access_type=offline&response_type=code`
   - Exchange the returned `code` for a refresh token:
     ```bash
     curl https://api.dropboxapi.com/oauth2/token \
       -d code=THE_CODE_FROM_ABOVE \
       -d grant_type=authorization_code \
       -d client_id=YOUR_APP_KEY \
       -d client_secret=YOUR_APP_SECRET
     ```
   - The response's `refresh_token` is `DROPBOX_REFRESH_TOKEN`.
4. Set `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` in Vercel.

Files land at `/Clients/[Client Legal Name]/03 Client Uploads/[YEAR]/[MONTH]/[random-name].[ext]` —
Dropbox creates the folder path automatically on first upload. Clients never get Dropbox access of any kind.

## 8. Email setup (Resend)

1. Create a free account at [resend.com](https://resend.com).
2. Verify a sending domain (Resend walks you through the DNS records).
3. Create an API key → `RESEND_API_KEY`.
4. Set `AURUM_FROM_EMAIL` to an address on that verified domain (e.g. `notifications@aurumventura.net`).
5. Set `AURUM_INTERNAL_NOTIFY_EMAIL` to wherever your team should receive new-upload alerts.

## 9. What's missing / honestly not built

Per your instruction not to fake functionality — these are real, clearly-marked integration points rather
than invented behavior:

- **No live connection to the Admin OS tool you shared.** That tool has no backend to connect to (see the
  architecture discussion earlier in this conversation). This feature's database is a separate, purpose-built
  one. `lookupClientByEmail()` in `api/_lib/auth.js` is the one place to change if/when the Admin OS gets a
  real API to call instead.
- **No malware scanning is actually performed.** `api/_lib/scan.js` is a real abstraction (every uploaded
  file passes through `scanFile()`) but it's a documented no-op — no scanning service is configured anywhere.
  Wiring in a real one (VirusTotal API, ClamAV, Cloudmersive, etc.) means rewriting that one function.
- **No production credentials exist anywhere in this repo.** Every secret above must be created and set by
  you in Vercel — none were invented, guessed, or hardcoded.
- **CSRF protection** is a same-origin check (`AURUM_SITE_ORIGIN`), not a token — this API has no
  cookie-based session for a forged cross-site request to ride on (auth is per-request, via the upload code +
  verified email), which is what CSRF tokens actually protect against. Documented in `api/_lib/auth.js`.

## 10. Local testing

`vite dev` (the site's normal local dev server) does **not** run Vercel serverless functions — `/api/*`
requests will 404 locally with it, and the frontend already handles that gracefully (you'll see "Something
went wrong" rather than a crash). To actually test the backend locally:

```bash
npm install -g vercel   # if you don't have it
vercel dev              # runs both the static site AND the /api functions locally
```

`vercel dev` will prompt for the environment variables above on first run (or read them from `vercel env
pull` if the project is already linked).

## 11. Production deployment

Nothing new to do beyond normal deploys — Vercel auto-detects the `api/` directory and deploys those files
as serverless functions alongside the static site on every push to `main`, exactly like today. Just make sure
the environment variables in §5 are set in the Vercel project **before** the first real client tries to use
the form.

## 12. Security controls implemented

- HTTPS only (enforced by Vercel)
- Server-side upload-code validation, constant-time compare (`api/_lib/auth.js`)
- Server-side email verification against the client/contact directory — never trusts client-claimed identity
- The exact "we could not verify this upload request" message for any unrecognized/inactive email, so the
  response never reveals whether an email exists
- Rate limiting (DB-backed, per-IP, per-endpoint)
- File size limits (4MB/file, enforced both client-side for UX and server-side as the real gate)
- Allowlist-only file type validation (extension + declared MIME), not a denylist
- Explicit executable/script extension block as defense-in-depth on top of the allowlist
- Sanitized original filenames; all stored filenames are server-generated random values, never derived from
  client input
- No secrets in any frontend bundle — verified: `AURUM_UPLOAD_CODE`, `DATABASE_URL`, Dropbox and Resend
  credentials only ever exist in `api/` files, which never ship to the browser
- No raw credentials in any log statement (only error messages/codes are logged, not secret values)
- Audit logging (`upload_audit_log` table) — every meaningful event (init, per-file success/failure, storage
  failure, completion, email outcome) is recorded
- Malware-scan integration point, honestly marked as unconfigured (see §9)
- Idempotency key (generated once per page load) prevents a double-click or retried `/init` call from
  creating two upload records
- Partial multi-file failure handling — each file is its own request/transaction; one failing doesn't affect
  the others
- Email failure never deletes already-stored files or rolls back the database record — `confirmation_email_
  status` is marked `FAILED` and the failure is logged for internal follow-up, per your explicit requirement

## 13. Test checklist

| Scenario | How to verify |
|---|---|
| Valid client upload | Full form + 1 file → see `NEW — NEEDS REVIEW` row in `uploads`, `upload_files` row, `administrative_requests` row, both emails sent |
| Invalid upload code | Wrong code → `400 invalid_code`, exact message shown, no DB row created |
| Invalid/unrecognized email | Email not in `clients`/`client_contacts`, or client `INACTIVE` → the generic "could not verify" message, identical in both cases |
| No file selected | Submit button stays disabled until ≥1 valid file is attached |
| Multiple files | Attach 3+ files → each shows its own progress bar and completes independently |
| Folder upload | "Browse Folder" (or drag a folder) → all files within are enumerated and queued |
| File too large | Attach a file >4MB → rejected client-side instantly, and server would reject it too if sent directly |
| Unsupported file type | Attach a `.zip`-disguised `.exe` or any non-allowlisted extension → clear rejection message, both client and server |
| Duplicate submission | Rapid double-click "Submit" → only one `uploads` row (idempotency key), no duplicate emails |
| Dropbox failure | Temporarily break `DROPBOX_ACCESS_TOKEN` → that file shows a clear per-file error; other files unaffected |
| Database failure | Temporarily break `DATABASE_URL` → `503 not_configured`-style error, no partial/corrupt state |
| Email failure | Temporarily break `RESEND_API_KEY` after files are stored → upload still completes successfully; `confirmation_email_status = FAILED`; logged for staff follow-up |
| Mobile upload | Test on a phone browser — "Upload Documents" is in the mobile nav menu, dropzone/browse buttons work with touch |
| Admin OS record creation | *(blocked — see §9)* No live Admin OS API exists yet to create a record in; the equivalent data lives in this feature's own `uploads`/`administrative_requests` tables instead |

Everything above except "Admin OS record creation" (which is architecturally blocked, not unbuilt) is fully
implemented and ready to verify as soon as real credentials are in place.
