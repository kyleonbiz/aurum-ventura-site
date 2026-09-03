# AI Agent Operations Dashboard — Setup

Phase 1 shipped a real, working **Lead Finder Agent** (OSM discovery).
Phase 2 adds a real **Business Research & Qualification Agent** (Claude
API research + scoring). Phase 3 adds the **Personalized Outreach Agent**
(Claude API draft generation + Resend sending + admin approval queue).
Nothing on the dashboard is fabricated: an agent that hasn't shipped
shows honest zeros, not placeholder activity.

## 1. What this adds

**Phase 1–3 (Lead Finder + Research + Outreach):**

- `db/003_agent_operations.sql` — agent registry, jobs, tasks, prospects,
  events, errors; seeded with all three agents.
- `db/004_research_qualification.sql` — prospect research/qualification
  tables + agent usage tracking.
- `db/005_outreach_agent.sql` — outreach_drafts + outreach_history tables,
  contact_email column on prospects.
- `api/_lib/agents.js`, `api/_lib/leadFinder.js`, `api/_lib/research.js`,
  `api/_lib/outreach.js` — agent libraries.
- `api/admin/agents/run-step.js` — unified orchestrator: discovery → research
  → outreach chaining, each agent type with its own step handler.
- `api/admin/agents/outreach/drafts.js` — admin approval queue: GET to list
  pending drafts, POST to approve + send via Resend.
- `admin-os/app.js` + `admin-os/index.html` — **AI Agents** nav item in Admin
  OS (tabs: Overview, Jobs, Activity, Errors; Outreach tab UI not yet built).
- `vercel.json` — cron entry advancing run-step automatically.

## 2. Database setup

Run all three migrations, in order, against the same Postgres database
already used for the intake/upload features (see `UPLOAD_SETUP.md` §6
if that isn't set up yet):

```bash
psql "$DATABASE_URL" -f db/003_agent_operations.sql
psql "$DATABASE_URL" -f db/004_research_qualification.sql
psql "$DATABASE_URL" -f db/005_outreach_agent.sql
```

All three are idempotent at the table-creation layer (`create table if
not exists`, `on conflict do nothing`), but include constraints that are
not safe to re-run — run each migration file once against a fresh or
properly initialized database. If you've already run 003 and 004 for an
earlier deployment, 005 is a new file and runs standalone.

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

**Phase 3 is complete:** Outreach Agent generates personalized drafts
via Claude API, auto-queues after research (score ≥60), and provides an
admin approval endpoint (`POST /api/admin/agents/outreach/drafts?action=approve`)
that sends via Resend + records in history.

**Still deferred for Phase 4+:**
- Admin UI tabs for the Outreach section (pending drafts queue, approve
  buttons) in admin-os/app.js — the backend endpoints are ready, just
  needs frontend tabs to call them.
- Admin override *history* tracking: schema exists (`agent_admin_overrides`)
  but nothing writes to it yet.
- Budget guards, broader dashboard (Work Queue filters, Pipeline
  visualization, System Health, Prospect Journey, etc.).
- These were deliberately deferred rather than half-built with fake
  data, per "do not create fake statistics."

## 8. Using it today

### Phase 1–2 (Discovery + Research): Using the dashboard

1. Deploy with the env vars above set and all three migrations run.
2. Open `/admin` → **AI Agents** in the sidebar → log in with
   `ADMIN_PASSWORD`.
3. **Overview** tab → **Start Prospecting Job** → enter an industry
   (e.g. "Property Management") and location (e.g. "Nashville, TN") and
   target count.
4. Click **Run Next Step** repeatedly (or wait for cron) to advance
   jobs: `QUEUED` → `RUNNING` → `COMPLETED`.
5. Discovery completes → automatically queues Research for new prospects.
6. Research completes → automatically queues Outreach for prospects with
   score ≥60 (HIGH_PRIORITY + GOOD_PROSPECT).
7. See discovered businesses in **Jobs** tab, real-time logs in
   **Activity** tab, errors in **Errors** tab.

### Phase 3 (Outreach): Approving and sending

The Outreach Agent generates personalized cold-email drafts in the
background via the orchestrator. To review and send them:

**Via API directly:**
```bash
# List pending drafts (status = DRAFT)
curl -X GET https://www.aurumventura.net/api/admin/agents/outreach/drafts \
  -H "Cookie: admin_session=<your_session_cookie>"

# Approve a draft and send the email
curl -X POST 'https://www.aurumventura.net/api/admin/agents/outreach/drafts?draftId=<id>&action=approve' \
  -H "Cookie: admin_session=<your_session_cookie>"
```

**Via Admin OS dashboard (UI not yet built, but the backend is ready):**
An **Outreach** tab in Admin OS will list pending drafts with approve
buttons once the frontend is built — the backend endpoints are fully
functional and waiting for UI integration.
