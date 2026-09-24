// lib/analysis/enrich.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEnrichment } from "./enrich.ts";
import type { ThreadSummary } from "./types.ts";

const threads: ThreadSummary[] = [
  { threadId: "t1", subject: "Deck", participants: ["c@x.com"], turns: [{ id: "m1", from: "c@x.com", date: "2026-09-01T00:00:00Z", text: "hi" }] },
];

test("merges model rows onto threads and coerces bad sentiment", () => {
  const rows = { threads: [{ threadId: "t1", type: "question", entity: "Blackledge", sentiment: "furious", salient: true }] };
  const [e] = applyEnrichment(threads, rows);
  assert.equal(e.type, "question");
  assert.equal(e.entity, "Blackledge");
  assert.equal(e.sentiment, "neutral"); // "furious" is not a valid value → neutral
  assert.equal(e.salient, true);
});

test("threads missing from model output default to neutral, non-salient", () => {
  const [e] = applyEnrichment(threads, { threads: [] });
  assert.equal(e.sentiment, "neutral");
  assert.equal(e.salient, false);
  assert.equal(e.entity, null);
});
