import { test } from "node:test";
import assert from "node:assert/strict";
import { stripQuoted, collapseThreads } from "./gather.ts";
import type { RawMessage } from "./types.ts";

test("stripQuoted removes quoted reply history", () => {
  const body = "Yes, let's proceed.\n\nOn Mon, Dave wrote:\n> the original question\n> more quoted";
  const out = stripQuoted(body);
  assert.ok(out.includes("Yes, let's proceed."));
  assert.ok(!out.includes("original question"));
});

test("collapseThreads groups by threadKey and orders turns by date", () => {
  const msgs: RawMessage[] = [
    { id: "b", threadKey: "t1", folder: "inbox", from: "Client <c@x.com>", subject: "Re: Deck", date: "2026-09-02T10:00:00Z", body: "later reply" },
    { id: "a", threadKey: "t1", folder: "inbox", from: "Dave <d@h.com>", subject: "Deck", date: "2026-09-01T10:00:00Z", body: "first message" },
  ];
  const [thread] = collapseThreads(msgs);
  assert.equal(thread.threadId, "t1");
  assert.deepEqual(thread.turns.map((t) => t.id), ["a", "b"]); // chronological
  assert.equal(thread.participants.length, 2);
});
