# Phase 3 Outreach Agent — Test Plan

This document outlines how to test the Personalized Outreach Agent end-to-end.

## Prerequisites

1. **Database**: All three migrations must be run first:
   ```bash
   psql "$DATABASE_URL" -f db/003_agent_operations.sql
   psql "$DATABASE_URL" -f db/004_research_qualification.sql
   psql "$DATABASE_URL" -f db/005_outreach_agent.sql
   ```

2. **Environment variables set:**
   - `DATABASE_URL` — Postgres connection
   - `ADMIN_PASSWORD` — for admin session auth
   - `ADMIN_SESSION_SECRET` — for session cookie signing
   - `CRON_SECRET` — for cron authorization
   - `ANTHROPIC_API_KEY` — for Claude API (required for draft generation)
   - `RESEND_API_KEY` — for email sending (required for final send test)
   - `AURUM_FROM_EMAIL` — verified sender email in Resend
   - `ANTHROPIC_API_KEY` — for draft generation

3. **Contact emails in prospects**: For the final send test, prospects need a
   `contact_email` value. The schema added this column; you can update existing
   prospects or create test ones.

## Test 1: Database & Schema Validation

Verify the migrations created all required tables:

```bash
psql "$DATABASE_URL" -c "
  select table_name from information_schema.tables 
  where table_schema = 'public' 
  and table_name in ('outreach_drafts', 'outreach_history')
"
```

Expected: Two rows (outreach_drafts, outreach_history).

Check the outreach_drafts schema:
```bash
psql "$DATABASE_URL" -c "\d outreach_drafts"
```

Expected columns: id, job_id, prospect_id, draft_text, status, created_at, approved_at, sent_at, sent_error.

## Test 2: Outreach Library Functions

Create a test file `test-outreach.js` to verify the library exports and functions exist:

```javascript
import { generateOutreachDraft, sendOutreachEmail, estimateOutreachCost } from "./api/_lib/outreach.js";

console.log("✓ Functions loaded:");
console.log("  - generateOutreachDraft:", typeof generateOutreachDraft);
console.log("  - sendOutreachEmail:", typeof sendOutreachEmail);
console.log("  - estimateOutreachCost:", typeof estimateOutreachCost);

// Test cost estimation
const cost = estimateOutreachCost(100, 50);
console.log("✓ Cost estimation: 100 input + 50 output tokens = $" + cost.toFixed(6));
```

Run with: `node test-outreach.js` (requires Node 18+)

Expected output: All three functions should be "function" type, and cost should be calculated.

## Test 3: Orchestrator Integration

### 3a. Manual Step Execution

Start a new prospecting job and advance it through all stages:

1. **Create a Discovery job** (via POST to /api/admin/agents/jobs):
   ```bash
   curl -X POST http://localhost:3000/api/admin/agents/jobs \
     -H "Cookie: admin_session=<your_session_cookie>" \
     -H "Content-Type: application/json" \
     -d '{"industry":"Property Management","location":"Nashville, TN","requestedCount":5}'
   ```
   
   Expected: Returns `{ jobId: "...", jobCode: "AGJ-..." }`

2. **Run discovery steps** (POST /api/admin/agents/run-step):
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/admin/agents/run-step \
       -H "Authorization: Bearer $CRON_SECRET"
     sleep 1
   done
   ```
   
   Expected: Job progresses QUEUED → RUNNING → COMPLETED. Each step returns
   `{ ranStep: true, action: "prospect_created"|"duplicate_skipped"|"job_completed", ... }`

3. **Check Job Detail** to see discovered prospects:
   ```bash
   curl -X GET "http://localhost:3000/api/admin/agents/jobs?view=jobs&id=<jobId>" \
     -H "Cookie: admin_session=<your_session_cookie>"
   ```
   
   Expected: Shows `new_prospects_created`, list of discovered businesses.

### 3b. Research & Auto-Queueing

Continue advancing run-step to trigger research:

```bash
# Run 20 more steps to advance research job (one prospect per step)
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/admin/agents/run-step \
    -H "Authorization: Bearer $CRON_SECRET"
  sleep 1
done
```

Expected: Research job auto-queues after discovery completes. Each research
step returns `{ ranStep: true, action: "research_completed", score: XX, level: "HIGH_PRIORITY"|"GOOD_PROSPECT"|... }`

### 3c. Outreach Auto-Queueing & Draft Generation

Continue to trigger outreach:

```bash
# Run 20 more steps to advance outreach job (one draft per step for ≥60 scores)
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/admin/agents/run-step \
    -H "Authorization: Bearer $CRON_SECRET"
  sleep 1
done
```

Expected: Outreach job auto-queues after research completes (for prospects
with score ≥60). Each outreach step returns:
```json
{ "ranStep": true, "action": "draft_generated", "jobId": "...", "prospectId": "..." }
```

### 3d. Check Draft Generation

Query the database to see generated drafts:

```bash
psql "$DATABASE_URL" -c "
  select od.id, p.business_name, od.status, length(od.draft_text) as draft_len
  from outreach_drafts od
  join prospects p on od.prospect_id = p.id
  limit 5;
"
```

Expected: One or more rows with status='DRAFT', draft_text is non-empty (personalized email).

## Test 4: Admin Approval Endpoints

### 4a. List Pending Drafts

```bash
curl -X GET http://localhost:3000/api/admin/agents/outreach/drafts \
  -H "Cookie: admin_session=<your_session_cookie>"
```

Expected response:
```json
{
  "drafts": [
    {
      "id": "...",
      "job_id": "...",
      "prospect_id": "...",
      "business_name": "Example Business",
      "location": "Nashville, TN",
      "industry": "Property Management",
      "contact_email": "owner@example.com",
      "score": 75,
      "level": "GOOD_PROSPECT",
      "draft_text": "Hello [name],\n\nI noticed you've been managing...",
      "status": "DRAFT",
      "created_at": "2026-09-03T..."
    }
  ]
}
```

### 4b. Test Email Send (with contact_email)

If your test prospects have contact_email values:

```bash
DRAFT_ID="<from_step_4a>"
curl -X POST "http://localhost:3000/api/admin/agents/outreach/drafts?draftId=$DRAFT_ID&action=approve" \
  -H "Cookie: admin_session=<your_session_cookie>"
```

Expected (success):
```json
{
  "action": "draft_approved_and_sent",
  "draftId": "...",
  "prospectId": "...",
  "sent_to": "owner@example.com",
  "sent_at": "2026-09-03T..."
}
```

Expected (if contact_email is null):
```json
{
  "error": "no_contact_email",
  "message": "Prospect has no email address on file."
}
```

### 4c. Verify Draft Status Update

Query the draft after approval:

```bash
psql "$DATABASE_URL" -c "
  select id, status, approved_at, sent_at
  from outreach_drafts
  where id = '<DRAFT_ID>'
"
```

Expected: status='SENT' (or 'FAILED' if email send failed), approved_at and sent_at are non-null.

### 4d. Verify Outreach History

Check that sending was logged:

```bash
psql "$DATABASE_URL" -c "
  select prospect_id, draft_id, sent_to_email, sent_at
  from outreach_history
  order by sent_at desc
  limit 3;
"
```

Expected: One or more rows with prospect_id, draft_id matching the sent draft.

## Test 5: Error Handling

### 5a. Draft without contact_email

Manually update a prospect to have no contact_email:

```bash
psql "$DATABASE_URL" -c "
  update prospects
  set contact_email = null
  where id = '<prospect_id>'
"
```

Then try to approve a draft for that prospect (step 4b). Expected: Returns 
`{ error: "no_contact_email", message: "..." }`

### 5b. Missing ANTHROPIC_API_KEY

Temporarily unset `ANTHROPIC_API_KEY` and run a new outreach job step:

```bash
unset ANTHROPIC_API_KEY
curl -X POST http://localhost:3000/api/admin/agents/run-step \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: Returns `{ ranStep: true, action: "job_needs_attention", reason: "AI_NOT_CONFIGURED" }`.
The outreach job should move to status='NEEDS_ADMIN_ATTENTION'.

Restore the env var and retry with `?action=retry` on the job to recover.

### 5c. Missing RESEND_API_KEY

Temporarily unset `RESEND_API_KEY` and try to approve a draft:

```bash
unset RESEND_API_KEY
curl -X POST "http://localhost:3000/api/admin/agents/outreach/drafts?draftId=<id>&action=approve" \
  -H "Cookie: admin_session=<your_session_cookie>"
```

Expected: Returns `{ error: "email_send_failed", message: "RESEND_API_KEY is not configured.", draftId: "..." }`.
The draft status should remain 'DRAFT' (not permanently marked FAILED, can retry).

## Test 6: Event & Error Logging

Query the event log to verify all steps were logged:

```bash
psql "$DATABASE_URL" -c "
  select agent_id, event_type, message, status, created_at
  from agent_events
  where agent_id = 'personalized_outreach'
  order by created_at desc
  limit 10;
"
```

Expected: One row per outreach action:
- JOB_STARTED (when job begins)
- OUTREACH_DRAFT_GENERATED (per draft)
- OUTREACH_SENT (per approval)
- JOB_COMPLETED (when all drafts processed)

Query error log:

```bash
psql "$DATABASE_URL" -c "
  select agent_id, error_type, description, admin_action_required
  from agent_errors
  where agent_id = 'personalized_outreach'
  order by created_at desc
  limit 5;
"
```

Expected: Should be empty if no errors occurred. If you ran Test 5 (error scenarios), you should see rows.

## Test 7: Cost Tracking

Verify that usage was tracked for draft generation:

```bash
psql "$DATABASE_URL" -c "
  select agent_id, purpose, model, input_tokens, output_tokens, estimated_cost_usd, success
  from agent_usage
  where agent_id = 'personalized_outreach'
  order by created_at desc
  limit 3;
"
```

Expected: One row per draft generated, with:
- purpose='GENERATE_OUTREACH_DRAFT'
- model='claude-haiku-4-5-20251001' (or whatever CLAUDE_RESEARCH_MODEL is set to)
- input/output tokens from Claude API response
- estimated_cost_usd calculated from token counts
- success=true

## Summary Checklist

- [ ] Migrations run without error
- [ ] Schema tables created (outreach_drafts, outreach_history)
- [ ] Library functions load and export correctly
- [ ] Discovery job completes and discovers prospects
- [ ] Research job auto-queues and scores prospects
- [ ] Outreach job auto-queues for ≥60-score prospects
- [ ] Drafts are generated with personalized text
- [ ] GET /api/admin/agents/outreach/drafts lists pending drafts
- [ ] POST approve endpoint sends email (if contact_email present)
- [ ] Draft status updates to SENT after approval
- [ ] Event log shows all actions
- [ ] Cost tracking records draft generation usage
- [ ] Error handling gracefully fails on missing config

If all tests pass, Phase 3 is ready for deployment or UI building.
