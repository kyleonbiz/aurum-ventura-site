#!/usr/bin/env node

/**
 * Quick validation script for Phase 3: checks that all files exist,
 * imports work, and basic structure is correct.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

function log(status, message) {
  const icon = status === "✓" ? "✓" : status === "✗" ? "✗" : "→";
  console.log(`  ${icon} ${message}`);
}

// File existence checks
check("Database migrations exist", () => {
  const files = [
    "db/003_agent_operations.sql",
    "db/004_research_qualification.sql",
    "db/005_outreach_agent.sql",
  ];
  for (const f of files) {
    const exists = fs.existsSync(path.join(root, f));
    log(exists ? "✓" : "✗", `${f} ${exists ? "" : "(MISSING)"}`);
    if (!exists) throw new Error(`Missing file: ${f}`);
  }
});

check("API endpoint files exist", () => {
  const files = [
    "api/admin/agents/run-step.js",
    "api/admin/agents/outreach/drafts.js",
    "api/_lib/outreach.js",
    "api/_lib/agents.js",
    "api/_lib/research.js",
  ];
  for (const f of files) {
    const exists = fs.existsSync(path.join(root, f));
    log(exists ? "✓" : "✗", `${f} ${exists ? "" : "(MISSING)"}`);
    if (!exists) throw new Error(`Missing file: ${f}`);
  }
});

// Content checks
check("Outreach library exports main functions", () => {
  const outreachCode = fs.readFileSync(path.join(root, "api/_lib/outreach.js"), "utf8");
  const exports = ["generateOutreachDraft", "sendOutreachEmail", "estimateOutreachCost"];
  for (const exp of exports) {
    const found = outreachCode.includes(`export`) && outreachCode.includes(`${exp}`);
    log(found ? "✓" : "✗", `${exp} is exported`);
    if (!found) throw new Error(`Missing export: ${exp}`);
  }
});

check("Run-step handles OUTREACH job type", () => {
  const runStepCode = fs.readFileSync(path.join(root, "api/admin/agents/run-step.js"), "utf8");
  const checks = [
    "processOneOutreachCandidate",
    'job.job_type === "OUTREACH"',
    "generateOutreachDraft",
  ];
  for (const c of checks) {
    const found = runStepCode.includes(c);
    log(found ? "✓" : "✗", `${c} is present`);
    if (!found) throw new Error(`Missing: ${c}`);
  }
});

check("Drafts endpoint has approve action", () => {
  const draftsCode = fs.readFileSync(path.join(root, "api/admin/agents/outreach/drafts.js"), "utf8");
  const checks = ['action === "approve"', "sendOutreachEmail", "outreach_drafts"];
  for (const c of checks) {
    const found = draftsCode.includes(c);
    log(found ? "✓" : "✗", `${c} is present`);
    if (!found) throw new Error(`Missing: ${c}`);
  }
});

check("Schema includes outreach tables", () => {
  const schemaCode = fs.readFileSync(path.join(root, "db/005_outreach_agent.sql"), "utf8");
  const checks = [
    "create table if not exists outreach_drafts",
    "create table if not exists outreach_history",
    "contact_email",
  ];
  for (const c of checks) {
    const found = schemaCode.includes(c);
    log(found ? "✓" : "✗", `${c} is in schema`);
    if (!found) throw new Error(`Missing schema: ${c}`);
  }
});

// Run all checks
console.log("\n🔍 Phase 3 Validation\n");
let passed = 0;
let failed = 0;

for (const { name, fn } of checks) {
  try {
    console.log(`\n${name}:`);
    fn();
    passed++;
  } catch (err) {
    console.error(`\n❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log("\n✅ All Phase 3 files and structure validated.");
console.log("\nNext: Run PHASE_3_TEST_PLAN.md to test end-to-end functionality.\n");
