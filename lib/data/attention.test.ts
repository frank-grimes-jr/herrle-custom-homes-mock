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
  contractValue: 3_000_000, budget: 2_400_000, spent: 1_000_000, forecastCost: 2_400_000, // planned margin 20%
  percentComplete: 50, schedule: "on_track" as const, nextMilestone: "Framing",
  daysToNextMilestone: 10, targetCompletion: "2027-01-01", openDecisions: 0,
  changeOrders: [], milestones: [], selections: [], longLead: [],
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

test("a healthy build produces no attention item", () => {
  assert.equal(deriveAttention({ ...healthy(), projects: [proj({})] }).length, 0);
});

test("margin fade escalates past 6 points, watches at 3–6", () => {
  // planned 20%; forecast 2.7M → projected 10% → 10pt fade → escalate
  const esc = deriveAttention({ ...healthy(), projects: [proj({ forecastCost: 2_700_000 })] });
  assert.equal(esc.find((i) => i.id === "project-p1")!.severity, "escalate");
  // forecast 2.52M → projected 16% → 4pt fade → watch
  const watch = deriveAttention({ ...healthy(), projects: [proj({ forecastCost: 2_520_000 })] });
  assert.equal(watch.find((i) => i.id === "project-p1")!.severity, "watch");
});

test("behind schedule escalates its build", () => {
  const items = deriveAttention({ ...healthy(), projects: [proj({ schedule: "behind" })] });
  assert.equal(items.find((i) => i.id === "project-p1")!.severity, "escalate");
});

test("a late long-lead item escalates its build", () => {
  const items = deriveAttention({
    ...healthy(),
    projects: [proj({ longLead: [{ label: "Windows", neededBy: "2026-09-15", eta: "2026-09-29", status: "late" }] })],
  });
  assert.equal(items.find((i) => i.id === "project-p1")!.severity, "escalate");
});

test("overdue signature escalates", () => {
  const d = healthy();
  d.signatures = [{ id: "s1", title: "Change Order #3", type: "change_order", project: "Test Build", status: "overdue", sentDaysAgo: 11, amount: 145_000 }];
  assert.equal(deriveAttention(d).find((i) => i.id === "sig-s1")!.severity, "escalate");
});

test("idle software seats produce a watch", () => {
  const d = healthy();
  d.team.claudeSeatsActive = 4;
  assert.equal(deriveAttention(d).find((i) => i.id === "team-tools")!.severity, "watch");
});

test("escalate items sort before watch items", () => {
  const d = healthy();
  d.financials.ar.over90 = 92_000; // escalate
  d.team.claudeSeatsActive = 4; // watch
  const sev = deriveAttention(d).map((i) => i.severity);
  assert.deepEqual(sev, [...sev].sort((a, b) => (a === "escalate" ? -1 : 1) - (b === "escalate" ? -1 : 1)));
  assert.equal(sev[0], "escalate");
});
