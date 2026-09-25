// lib/analysis/reason.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { bundleIds, buildUserPrompt } from "./reason.ts";
import type { EnrichedThread } from "./types.ts";

const threads: EnrichedThread[] = [
  { threadId: "t1", subject: "Deck", participants: ["c@x.com"], type: "commitment", entity: "Blackledge", sentiment: "neutral", salient: true,
    turns: [{ id: "m1", from: "Dave", date: "2026-09-01T00:00:00Z", text: "I'll send the number Friday" }] },
  { threadId: "t2", subject: "Newsletter", participants: ["n@x.com"], type: "fyi", entity: null, sentiment: "neutral", salient: false,
    turns: [{ id: "m9", from: "News", date: "2026-09-01T00:00:00Z", text: "bulletin" }] },
];

test("bundleIds only includes ids from SALIENT threads", () => {
  const ids = bundleIds(threads.filter((t) => t.salient));
  assert.ok(ids.has("m1"));
  assert.ok(!ids.has("m9"));
});

test("prompt includes salient thread content", () => {
  const p = buildUserPrompt(threads.filter((t) => t.salient));
  assert.ok(p.includes("m1"));
  assert.ok(p.includes("send the number Friday"));
});
