# AI Agent Operations Dashboard — Phase 1 Setup

This is Phase 1 of the "AI AGENT OPERATIONS" build: a real, working
**Lead Finder Agent** plus a real dashboard in Admin OS to watch it run.
The Business Research & Qualification Agent and Personalized Outreach
Agent are registered (visible on the dashboard, status `IDLE`) but their
actual logic is **not built yet** — see "What's NOT built yet" below.
Nothing on the dashboard is fabricated: an agent that hasn't shipped
shows honest zeros, not placeholder activity.

## 1. What this adds

- `db/003_agent_operations.sql` — new tables: `agents`, `agent_jobs`,
  `agent_tasks`, `prospects`, `agent_events`, `agent_errors`.
- `api/_lib/agents.js`, `api/_lib/leadFinder.js` — shared logic.
- `api/admin/agents/*` — the dashboard's API (all admin-auth protected,
  reusing the existing `ADMIN_PASSWORD` / session cookie system).
- `admin-os/app.js` + `admin-os/index.html` — a new **AI Agents** nav
  item in Admin OS: Overview, Jobs, Activity, and Errors tabs.
- `vercel.json` — a cron entry that advances the Lead Finder Agent
  automatically.

## 2. Database setup

Run `db/003_agent_operations.sql` against the same Postgres database
already used for the intake/upload features (see `UPLOAD_SETUP.md` §6
if that isn't set up yet):

```bash
psql "$DATABASE_URL" -f db/003_agent_operations.sql
```

It's idempotent (`create table if not exists`, `on conflict do nothing`)
— safe to re-run.

## 3. Environment variables

Reuses what's already required for the admin intake area:

- `DATABASE_URL` — same Postgres instance.
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — same admin login the
  intake-review area uses. The AI Agents section in Admin OS now also
  requires this login (Admin OS itself has no other auth).

One new variable:

- `CRON_SECRET` — any random string. Set it in Vercel's environment
  variables; Vercel Cron automatically sends it as
  `Authorization: Bearer <CRON_SECRET>` when it calls
  `/api/admin/agents/run-step`, so the endpoint can tell a legitimate
  cron call from a random request without requiring an admin session
  cookie. If you don't set it, cron-triggered runs won't be authorized
  — the dashboard's manual **"Run Next Step"** button (admin session)
  still works either way.

## 4. Vercel Cron — plan limitation

`vercel.json` schedules `run-step` every 5 minutes. **Vercel's Hobby
plan only allows cron jobs to run once per day**, regardless of the
schedule you set — Vercel silently limits it, it won't error. If you're
on Hobby:
- Cron will still fire once daily and make progress.
- Use the **"Run Next Step"** button in the AI Agents dashboard to
  advance a job on demand the rest of the time — this is a normal part
  of the intended workflow, not a workaround.
- Upgrading to Pro makes the 5‑minute schedule actually run that often.

## 5. Discovery data source — why OpenStreetMap

The Lead Finder Agent discovers businesses using OpenStreetMap's free,
keyless public APIs (Nominatim for geocoding, Overpass for business/POI
search) — chosen because it needs no billing account or API key to work
today. The tradeoff, shown honestly rather than hidden: coverage is
uneven by region, and many results are missing phone numbers or
websites (OSM data is only as complete as what's been mapped there).
If lead quality/coverage becomes a bottleneck, swap
`api/_lib/leadFinder.js`'s `discoverBusinesses()` for a paid provider
(e.g. Google Places) — nothing else in the pipeline depends on OSM
specifically.

## 6. What's NOT built yet (honest scope)

- Business Research & Qualification Agent (AI-based, would use the
  Claude API) — not implemented. Its dashboard card shows `IDLE` and
  zeros because there is nothing to report.
- Personalized Outreach Agent (Claude API draft generation) — same.
- Everything downstream of discovery in the original spec: research,
  qualification scoring, outreach drafts, admin approval queue,
  AI/API usage & cost tracking, budget guards, admin override history,
  and most of the wider dashboard (Work Queue, Job History filters,
  Pipeline visualization, System Health, Prospect Journey, etc.).
- These were deliberately deferred rather than half-built with fake
  data, per "do not create fake statistics." Phase 2 adds the Research
  & Qualification Agent and its slice of the dashboard; Phase 3 adds
  Outreach + the admin approval queue.

## 7. Using it today

1. Deploy with the env vars above set and the migration run.
2. Open `/admin` → **AI Agents** in the sidebar → log in with
   `ADMIN_PASSWORD`.
3. Overview tab → **Start Prospecting Job** → enter an industry (e.g.
   "Property Management") and location (e.g. "Nashville, TN") and a
   target count.
4. Click **Run Next Step** repeatedly (or wait for cron) to watch the
   job move from `QUEUED` → `RUNNING` → `COMPLETED`, with real
   discovered businesses landing in the **Jobs** tab's job detail page
   and the **Activity** tab's feed.
