// Run: npm test  (node --test, native TS type-stripping — no framework)
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveAttention, type AttentionInput } from "./attention.ts";

// A baseline that trips NO rules; each test overrides one slice.
function healthy(): AttentionInput {
  return {
    financials: {
      revenueYTD: 5_000_000,
      revenuePriorYTD: 4_500_000,
      grossMarginPct: 25,
      targetMarginPct: 26,
      cashOnHand: 3_000_000,
      monthlyBurn: 300_000, // runway 10 months
      backlog: 8_000_000,
      ar: { current: 100_000, d31_60: 0, d61_90: 0, over90: 0 },
      ap: { current: 50_000, overdue: 0 },
      revenueTrend: [],
      backlogTrend: [],
    },
    projects: [],
    clients: [],
    team: { members: [], claudeSeats: 6, claudeSeatsActive: 6, claudeAdoptionTrend: [] },
    signatures: [],
  };
}

const proj = (over: Partial<AttentionInput["projects"][number]>) => ({
  id: "p1", name: "Test Build", client: "X", location: "Y",
  contractValue: 3_000_000, budget: 2_000_000, spent: 1_000_000,
  percentComplete: 50, schedule: "on_track" as const, nextMilestone: "Framing",
  daysToNextMilestone: 10, targetCompletion: "2027-01-01", openDecisions: 0,
  ...over,
});

test("healthy input produces no attention items", () => {
  assert.equal(deriveAttention(healthy()).length, 0);
});

test("AR over 90 days escalates", () => {
  const d = healthy();
  d.financials.ar.over90 = 92_000;
  const ids = deriveAttention(d).map((i) => i.id);
  assert.ok(ids.includes("fin-ar90"));
  assert.equal(deriveAttention(d).find((i) => i.id === "fin-ar90")!.severity, "escalate");
});

test("short cash runway escalates, tightening runway only watches", () => {
  const d = healthy();
  d.financials.monthlyBurn = 3_000_000; // runway 1 month
  assert.equal(deriveAttention(d).find((i) => i.id === "fin-runway")!.severity, "escalate");
  d.financials.monthlyBurn = 1_200_000; // runway 2.5 months
  assert.equal(deriveAttention(d).find((i) => i.id === "fin-runway")!.severity, "watch");
});

test("projected over-budget escalates past 10%, watches at 5–10%", () => {
  // spent 1.4M at 50% → projected 2.8M vs 2.0M budget = +40% → escalate
  const esc = deriveAttention({ ...healthy(), projects: [proj({ spent: 1_400_000 })] });
  assert.equal(esc.find((i) => i.id === "proj-budget-p1")!.severity, "escalate");
  // spent 1.07M at 50% → projected 2.14M = +7% → watch
  const watch = deriveAttention({ ...healthy(), projects: [proj({ spent: 1_070_000 })] });
  assert.equal(watch.find((i) => i.id === "proj-budget-p1")!.severity, "watch");
});

test("behind schedule escalates", () => {
  const items = deriveAttention({ ...healthy(), projects: [proj({ schedule: "behind" })] });
  assert.equal(items.find((i) => i.id === "proj-sched-p1")!.severity, "escalate");
});

test("overdue signature escalates", () => {
  const d = healthy();
  d.signatures = [{ id: "s1", title: "Change Order #3", type: "change_order", project: "Test Build", status: "overdue", sentDaysAgo: 11, amount: 145_000 }];
  assert.equal(deriveAttention(d).find((i) => i.id === "sig-s1")!.severity, "escalate");
});

test("idle Claude seats produce a watch", () => {
  const d = healthy();
  d.team.claudeSeatsActive = 4;
  assert.equal(deriveAttention(d).find((i) => i.id === "team-claude")!.severity, "watch");
});

test("escalate items sort before watch items", () => {
  const d = healthy();
  d.financials.ar.over90 = 92_000; // escalate
  d.team.claudeSeatsActive = 4; // watch
  const sev = deriveAttention(d).map((i) => i.severity);
  assert.deepEqual(sev, [...sev].sort((a, b) => (a === "escalate" ? -1 : 1) - (b === "escalate" ? -1 : 1)));
  assert.equal(sev[0], "escalate");
});
