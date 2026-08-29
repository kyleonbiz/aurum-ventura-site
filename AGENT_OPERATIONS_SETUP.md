# AI Agent Operations Dashboard — Setup

Phase 1 shipped a real, working **Lead Finder Agent**. Phase 2 adds a
real **Business Research & Qualification Agent** (Claude API) that
automatically researches and scores whatever Lead Finder discovers.
The **Personalized Outreach Agent** is registered (visible on the
dashboard, status `IDLE`) but not built yet — see "What's NOT built
yet" below. Nothing on the dashboard is fabricated: an agent that
hasn't shipped shows honest zeros, not placeholder activity.

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

Run both migrations, in order, against the same Postgres database
already used for the intake/upload features (see `UPLOAD_SETUP.md` §6
if that isn't set up yet):

```bash
psql "$DATABASE_URL" -f db/003_agent_operations.sql
psql "$DATABASE_URL" -f db/004_research_qualification.sql
```

`003` is idempotent (`create table if not exists`, `on conflict do
nothing`) — safe to re-run. `004` adds a `check` constraint via a plain
`alter table ... add constraint`, which is **not** safe to re-run (it
will error the second time) — matching the existing convention in
`002_client_intake.sql`. Run each migration file once.

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
- `ANTHROPIC_API_KEY` — required for the Research & Qualification
  Agent. Without it, a research job will run its first step, hit
  `AI_PROVIDER_NOT_CONFIGURED`, and stop itself in
  `NEEDS_ADMIN_ATTENTION` (it won't burn through the whole queue
  retrying an error that can't succeed) — Discovery jobs still work
  fine without this key, they just won't get auto-researched until it's
  set and the job is retried.
- `CLAUDE_RESEARCH_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`.
  Haiku was chosen because this agent runs once per prospect at
  potentially high volume and the research/scoring task doesn't need a
  larger model; override this if you want stronger research at higher
  cost per prospect.

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

## 6. The qualification rubric

`api/_lib/research.js`'s `RESEARCH_SYSTEM_PROMPT` is the entire rubric,
in one place, in plain English — read it before trusting scores. In
short, from public signals only: no/thin/dated website is treated as a
*good* fit signal (suggests an under-resourced back office), industry
fit (property management, construction, professional services, etc.),
business-size signals, and basic contactability. Score bands: ≥80
`HIGH_PRIORITY`, 60–79 `GOOD_PROSPECT`, 40–59 `POSSIBLE_FIT`, <40
`LOW_PRIORITY`. A prospect scored without a fetchable website is
flagged `low_confidence` in the dashboard rather than hidden — treat
those scores as weaker evidence. This rubric is a starting point, not
a fixed spec; tune the prompt as real results come in.

## 7. What's NOT built yet (honest scope)

- Personalized Outreach Agent (Claude API draft generation) — not
  implemented. Its dashboard card shows `IDLE` and zeros because there
  is nothing to report.
- Everything downstream of qualification in the original spec: outreach
  drafts, the admin approval queue, admin override *history* (schema
  exists — `agent_admin_overrides` — but nothing writes to it yet since
  there's no admin-editable AI output until Outreach ships), budget
  guards, and most of the wider dashboard (Work Queue, Job History
  filters, Pipeline visualization, System Health, Prospect Journey,
  etc.).
- These were deliberately deferred rather than half-built with fake
  data, per "do not create fake statistics." Phase 3 adds the Outreach
  Agent, the admin approval queue, and override tracking.

## 8. Using it today

1. Deploy with the env vars above set and both migrations run.
2. Open `/admin` → **AI Agents** in the sidebar → log in with
   `ADMIN_PASSWORD`.
3. Overview tab → **Start Prospecting Job** → enter an industry (e.g.
   "Property Management") and location (e.g. "Nashville, TN") and a
   target count.
4. Click **Run Next Step** repeatedly (or wait for cron) to watch the
   job move from `QUEUED` → `RUNNING` → `COMPLETED`, with real
   discovered businesses landing in the **Jobs** tab's job detail page
   and the **Activity** tab's feed.
5. Once a discovery job completes, it automatically queues a Research
   job for its new prospects — keep clicking **Run Next Step** (or wait
   for cron) to watch that job research and score each one. Open it
   from the Jobs tab to see each prospect's score, level, and summary.
   Prospects that existed before this shipped (or somehow missed
   auto-queueing) can be picked up via **Queue Unresearched Prospects**
   on the Overview tab.
