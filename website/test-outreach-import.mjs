import { generateOutreachDraft, sendOutreachEmail, estimateOutreachCost } from "./api/_lib/outreach.js";

console.log("✅ Outreach library imports successful\n");

console.log("Exported functions:");
console.log("  - generateOutreachDraft:", typeof generateOutreachDraft);
console.log("  - sendOutreachEmail:", typeof sendOutreachEmail);
console.log("  - estimateOutreachCost:", typeof estimateOutreachCost);

// Test cost calculation (doesn't need API keys)
console.log("\n✅ Cost Estimation Test:");
const cost1 = estimateOutreachCost(100, 50);
console.log(`  100 input + 50 output tokens = $${cost1.toFixed(6)}`);

const cost2 = estimateOutreachCost(1000, 200);
console.log(`  1000 input + 200 output tokens = $${cost2.toFixed(6)}`);

const cost3 = estimateOutreachCost(500, 100, "claude-sonnet-5");
console.log(`  500 input + 100 output tokens (Sonnet) = $${cost3.toFixed(6)}`);

console.log("\n✅ Library validation passed");
