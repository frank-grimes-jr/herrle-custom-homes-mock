// Run: npm test. The triage learning loop: votes persist, mutes, and prompt lessons.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HERRLE_DATA_DIR = mkdtempSync(join(tmpdir(), "herrle-feedback-"));
const { recordVote, loadVotes, mutedSenders, lessons, address } = await import("./feedback.ts");

const promo = { from: "Deals <Deals@Shop.com>", subject: "50% off", bucket: "fyi" as const };

test("re-voting an email replaces the old vote", () => {
  recordVote({ ...promo, emailId: "1", vote: "up" });
  recordVote({ ...promo, emailId: "1", vote: "down" });
  const votes = loadVotes();
  assert.equal(votes.length, 1);
  assert.equal(votes[0].vote, "down");
});

test("two thumbs-down (and no up) mutes the sender, case-insensitively", () => {
  assert.equal(mutedSenders(loadVotes()).size, 0);
  recordVote({ ...promo, emailId: "2", vote: "down" });
  assert.deepEqual([...mutedSenders(loadVotes())], ["deals@shop.com"]);
  recordVote({ ...promo, emailId: "3", vote: "up" });
  assert.equal(mutedSenders(loadVotes()).size, 0, "an up-vote un-mutes");
});

test("lessons are empty with no votes and name the call otherwise", () => {
  assert.equal(lessons([]), "");
  assert.match(lessons(loadVotes()), /WRONG CALL: "50% off"/);
  assert.equal(address("plain@x.com"), "plain@x.com");
});
