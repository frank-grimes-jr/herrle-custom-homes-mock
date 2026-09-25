// Dave's thumbs up/down on triage items — the learning loop. Votes are stored in
// the user-data dir (survives auto-updates) and fed back two ways:
//   1. mutedSenders(): an address he's thumbed down twice (never up) is dropped
//      before Claude sees the inbox — deterministic, free.
//   2. lessons(): recent votes go into the prompt as examples of his judgment.
// Node-testable: no "server-only", relative .ts imports.
// ponytail: prompt-injected examples, not fine-tuning or an eval harness. Upgrade
// path if 40 examples stop being enough: have Claude distill votes into a short
// preferences note (the MEMORY.md idea) and inject that instead.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "../settings.ts";
import type { Bucket } from "./types.ts";

export type Vote = {
  emailId: string;
  from: string;
  subject: string;
  bucket: Bucket;
  vote: "up" | "down";
  at: string; // ISO
};

const MAX_VOTES = 500;
const LESSONS = 40;

function file(): string {
  return join(dataDir(), "triage-feedback.json");
}

export function loadVotes(): Vote[] {
  try {
    const v = JSON.parse(readFileSync(file(), "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// One vote per email: re-voting replaces the old one.
export function recordVote(v: Omit<Vote, "at">): void {
  const votes = loadVotes().filter((x) => x.emailId !== v.emailId);
  votes.push({ ...v, at: new Date().toISOString() });
  writeFileSync(file(), JSON.stringify(votes.slice(-MAX_VOTES), null, 2));
}

// "Jane <Jane@X.com>" → "jane@x.com"
export function address(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
}

export function mutedSenders(votes: Vote[]): Set<string> {
  const tally = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    const t = tally.get(address(v.from)) ?? { up: 0, down: 0 };
    t[v.vote]++;
    tally.set(address(v.from), t);
  }
  return new Set([...tally].filter(([, t]) => t.down >= 2 && t.up === 0).map(([a]) => a));
}

// Prompt block of Dave's recent verdicts, or "" when he hasn't voted yet.
export function lessons(votes: Vote[]): string {
  const recent = votes.slice(-LESSONS);
  if (recent.length === 0) return "";
  const lines = recent.map((v) =>
    v.vote === "up"
      ? `- GOOD CALL: "${v.subject}" from ${v.from} → ${v.bucket}`
      : `- WRONG CALL: "${v.subject}" from ${v.from} was put in ${v.bucket}; Dave did not want it there`,
  );
  return `\n\nDave has rated past briefs. Learn his judgment from these and apply it to similar senders and topics (a WRONG CALL on a promotional or irrelevant email means leave that kind out entirely):\n${lines.join("\n")}`;
}
