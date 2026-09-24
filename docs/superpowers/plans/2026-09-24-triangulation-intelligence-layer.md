# Triangulation Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand, read-only analysis that reasons across the live email stream and surfaces cross-source findings into the Overview attention feed with grounded provenance and a dismiss loop.

**Architecture:** Orchestrator runs GATHER (bounded, deduped, thread-collapsed email) → ENRICH (cheap model classifies/scores each thread; "map") → REASON (Opus reduces the salient enriched threads to structured findings) → VALIDATE (drop findings citing unknown source ids) → STORE (user-data JSON) → SURFACE (attention feed). Read-only end to end; the reasoning model never holds source credentials.

**Tech Stack:** Next.js 16 (App Router, server), TypeScript, `@anthropic-ai/sdk`, `imapflow` + `mailparser` (existing), `email-reply-parser` (new), `node --test` (native TS).

## Global Constraints

- **Read-only advisor.** Never send/edit/draft/create. Output is findings only.
- **On-demand only.** Human-triggered; nothing autonomous/unattended in v1.
- **v1 source = email only.** QBO/Plaid/Harvest data reads do not exist yet; do not depend on them.
- **Models:** reasoning default `claude-opus-4-8`, switchable to `claude-opus-5-5`; enrichment default `claude-haiku-4-5`. All from settings. Reasoning call: `thinking: {type:"adaptive"}` explicit, `output_config.effort` explicit (`"high"`), **no forced `tool_choice`** (5.5 400s on it).
- **Settings/prompts/findings are NOT secrets** — store in a user-data JSON file under `process.env.HERRLE_DATA_DIR ?? %LOCALAPPDATA%\HerrleDashboard`, outside the repo (survives `git reset --hard` auto-update). The vault (`lib/secrets.ts`) is for credentials only.
- **Copy standard:** no "AI"/vendor badges in user-facing UI. Provenance is the trust signal.
- **Grounding guardrail:** a finding may only cite source ids present in the bundle; drop any that don't.
- **Test style:** `node --test` with native TS, assert-based, alongside source (mirror `lib/data/attention.test.ts`, `lib/secrets.test.ts`). Add each new test file to the `test` script in `package.json`.
- **Anthropic key:** read via `getSecret(ANTHROPIC_KEY) ?? process.env.ANTHROPIC_API_KEY` (mirror `lib/triage/digest.ts`).

---

### Task 1: Settings store

**Files:**
- Create: `lib/settings.ts`
- Test: `lib/settings.test.ts`
- Modify: `package.json` (add test file to `test` script)

**Interfaces:**
- Produces: `type AnalysisSettings = { reasonModel: string; enrichModel: string; systemPrompt: string; windowDays: number; maxThreads: number; maxTokens: number }`; `getAnalysisSettings(): AnalysisSettings`; `saveAnalysisSettings(patch: Partial<AnalysisSettings>): AnalysisSettings`; `DEFAULT_SETTINGS: AnalysisSettings`; `dataDir(): string`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/settings.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HERRLE_DATA_DIR = mkdtempSync(join(tmpdir(), "herrle-settings-"));
const { getAnalysisSettings, saveAnalysisSettings, DEFAULT_SETTINGS } = await import("./settings.ts");

test("defaults are returned when nothing is saved", () => {
  assert.equal(getAnalysisSettings().reasonModel, "claude-opus-4-8");
  assert.equal(getAnalysisSettings().enrichModel, "claude-haiku-4-5");
  assert.ok(getAnalysisSettings().systemPrompt.length > 0);
});

test("a saved patch overrides only those fields and persists", () => {
  saveAnalysisSettings({ reasonModel: "claude-opus-5-5", windowDays: 45 });
  const s = getAnalysisSettings();
  assert.equal(s.reasonModel, "claude-opus-5-5");
  assert.equal(s.windowDays, 45);
  assert.equal(s.enrichModel, DEFAULT_SETTINGS.enrichModel); // untouched
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/settings.test.ts`
Expected: FAIL — `Cannot find module './settings.ts'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/settings.ts
// Non-secret analysis settings (model, prompt, caps). Stored as JSON in a
// user-data dir OUTSIDE the repo so the git auto-update never clobbers edits.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type AnalysisSettings = {
  reasonModel: string;
  enrichModel: string;
  systemPrompt: string;
  windowDays: number;
  maxThreads: number;
  maxTokens: number;
};

export const DEFAULT_SETTINGS: AnalysisSettings = {
  reasonModel: "claude-opus-4-8",
  enrichModel: "claude-haiku-4-5",
  windowDays: 30,
  maxThreads: 40,
  maxTokens: 8000,
  systemPrompt: `You are Dave Herrle's chief of staff at Herrle Custom Homes, a small high-craft custom home builder. You are given recent email threads (inbox + sent), each already tagged with a type, the project/client it concerns, and a sentiment. Find the few things Dave genuinely would not catch on his own. Focus on:
- Dropped commitments: promises Dave made in SENT mail ("I'll send that Friday") with no visible follow-through.
- Cooling relationships: a client whose tone is trending negative or who has gone quiet.
- Unbilled scope: threads where added or changed work is discussed — flag for Dave to confirm a change order exists.
Be strict: silence is fine. Only surface what a sharp right hand would raise. Every finding MUST cite the specific thread/message ids it is based on; never invent evidence.`,
};

export function dataDir(): string {
  const base =
    process.env.HERRLE_DATA_DIR ??
    join(process.env.LOCALAPPDATA ?? process.env.HOME ?? ".", "HerrleDashboard");
  mkdirSync(base, { recursive: true });
  return base;
}

function file(): string {
  return join(dataDir(), "analysis-settings.json");
}

export function getAnalysisSettings(): AnalysisSettings {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Partial<AnalysisSettings>;
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAnalysisSettings(patch: Partial<AnalysisSettings>): AnalysisSettings {
  const next = { ...getAnalysisSettings(), ...patch };
  writeFileSync(file(), JSON.stringify(next, null, 2));
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/settings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add to `package.json` test script and commit**

Edit `package.json` `test` script to append ` lib/settings.test.ts`, then:

```bash
git add lib/settings.ts lib/settings.test.ts package.json
git commit -m "feat: analysis settings store (user-data JSON, survives auto-update)"
```

---

### Task 2: Analysis types + signals store + grounding validation

**Files:**
- Create: `lib/analysis/types.ts`, `lib/signals.ts`
- Test: `lib/signals.test.ts`
- Modify: `package.json` (test script)

**Interfaces:**
- Consumes: `dataDir()` from `lib/settings.ts`.
- Produces (`lib/analysis/types.ts`): `type Provenance = { id: string; label: string }`; `type Finding = { id: string; signature: string; severity: "escalate"|"watch"; domain: string; title: string; detail: string; href?: string; confidence: "high"|"medium"; provenance: Provenance[] }`.
- Produces (`lib/signals.ts`): `validateFindings(raw: unknown, allowedIds: Set<string>): Finding[]`; `type SignalsState = { generatedAt: string; findings: Finding[]; dismissed: string[] }`; `loadSignals(): SignalsState`; `saveFindings(findings: Finding[]): void`; `dismiss(signature: string): void`; `visibleFindings(): Finding[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/signals.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HERRLE_DATA_DIR = mkdtempSync(join(tmpdir(), "herrle-signals-"));
const { validateFindings, saveFindings, dismiss, visibleFindings } = await import("./signals.ts");

const allowed = new Set(["m1", "m2"]);

test("drops findings that cite an id not in the bundle", () => {
  const raw = {
    findings: [
      { severity: "watch", domain: "clients", title: "Real", detail: "d", confidence: "high",
        provenance: [{ id: "m1", label: "email" }] },
      { severity: "escalate", domain: "clients", title: "Hallucinated", detail: "d", confidence: "high",
        provenance: [{ id: "ghost", label: "made up" }] },
    ],
  };
  const out = validateFindings(raw, allowed);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Real");
  assert.ok(out[0].signature.length > 0);
});

test("coerces bad severity/confidence to safe values", () => {
  const out = validateFindings(
    { findings: [{ severity: "nonsense", title: "X", detail: "d", confidence: "bogus", provenance: [{ id: "m1", label: "e" }] }] },
    allowed,
  );
  assert.equal(out[0].severity, "watch");
  assert.equal(out[0].confidence, "medium");
});

test("dismiss hides a finding by signature across reloads", () => {
  const out = validateFindings(
    { findings: [{ severity: "watch", domain: "clients", title: "Hide me", detail: "d", confidence: "high", provenance: [{ id: "m2", label: "e" }] }] },
    allowed,
  );
  saveFindings(out);
  assert.equal(visibleFindings().length, 1);
  dismiss(out[0].signature);
  assert.equal(visibleFindings().length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/signals.test.ts`
Expected: FAIL — cannot find `./signals.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/analysis/types.ts
export type Provenance = { id: string; label: string };

export type Finding = {
  id: string;
  signature: string; // stable across runs → dismissals stick
  severity: "escalate" | "watch";
  domain: string;
  title: string;
  detail: string;
  href?: string;
  confidence: "high" | "medium";
  provenance: Provenance[];
};
```

```ts
// lib/signals.ts
// Validates raw model output into grounded Findings and persists them + dismissals.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { dataDir } from "@/lib/settings";
import type { Finding, Provenance } from "@/lib/analysis/types";

export type SignalsState = { generatedAt: string; findings: Finding[]; dismissed: string[] };

function file(): string {
  return join(dataDir(), "signals.json");
}

function one<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function signature(title: string, prov: Provenance[]): string {
  const ids = prov.map((p) => p.id).sort().join(",");
  return createHash("sha256").update(`${title}|${ids}`).digest("hex").slice(0, 16);
}

// Keep only findings whose provenance ids are ALL present in the bundle.
export function validateFindings(raw: unknown, allowedIds: Set<string>): Finding[] {
  const list = Array.isArray((raw as { findings?: unknown })?.findings)
    ? ((raw as { findings: unknown[] }).findings)
    : [];
  const out: Finding[] = [];
  for (const item of list) {
    const f = item as Record<string, unknown>;
    const prov = Array.isArray(f.provenance)
      ? (f.provenance as Record<string, unknown>[])
          .map((p) => ({ id: String(p.id ?? ""), label: String(p.label ?? "") }))
          .filter((p) => p.id)
      : [];
    if (prov.length === 0 || !prov.every((p) => allowedIds.has(p.id))) continue; // grounding guard
    const title = typeof f.title === "string" ? f.title : "";
    if (!title) continue;
    out.push({
      id: randomUUID(),
      signature: signature(title, prov),
      severity: one(f.severity, ["escalate", "watch"], "watch"),
      domain: typeof f.domain === "string" ? f.domain : "general",
      title,
      detail: typeof f.detail === "string" ? f.detail : "",
      href: typeof f.href === "string" ? f.href : undefined,
      confidence: one(f.confidence, ["high", "medium"], "medium"),
      provenance: prov,
    });
  }
  return out;
}

export function loadSignals(): SignalsState {
  try {
    return JSON.parse(readFileSync(file(), "utf8")) as SignalsState;
  } catch {
    return { generatedAt: "", findings: [], dismissed: [] };
  }
}

export function saveFindings(findings: Finding[]): void {
  const prev = loadSignals();
  const state: SignalsState = { generatedAt: new Date().toISOString(), findings, dismissed: prev.dismissed };
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

export function dismiss(sig: string): void {
  const state = loadSignals();
  if (!state.dismissed.includes(sig)) state.dismissed.push(sig);
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

export function visibleFindings(): Finding[] {
  const state = loadSignals();
  const hidden = new Set(state.dismissed);
  return state.findings.filter((f) => !hidden.has(f.signature));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/signals.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

Append ` lib/signals.test.ts` to the `test` script, then:

```bash
git add lib/analysis/types.ts lib/signals.ts lib/signals.test.ts package.json
git commit -m "feat: signals store with grounded-finding validation + dismiss loop"
```

---

### Task 3: Email Gather — window, reply-strip, thread-collapse

**Files:**
- Create: `lib/analysis/gather.ts`
- Modify: `lib/analysis/types.ts` (add `RawMessage`, `ThreadSummary`); `package.json` (dep + test)
- Test: `lib/analysis/gather.test.ts`

**Interfaces:**
- Consumes: `getSecret`, `IMAP_USER/PASSWORD/HOST` from `lib/secrets`; `getAnalysisSettings()`.
- Produces (`types.ts`): `type RawMessage = { id: string; threadKey: string; folder: "inbox"|"sent"; from: string; subject: string; date: string; body: string }`; `type ThreadSummary = { threadId: string; subject: string; participants: string[]; turns: { id: string; from: string; date: string; text: string }[] }`.
- Produces (`gather.ts`): `stripQuoted(body: string): string`; `collapseThreads(msgs: RawMessage[]): ThreadSummary[]`; `gatherEmail(): Promise<ThreadSummary[]>`.

Add the dependency first:

```bash
npm install email-reply-parser
```

> Verify the library's visible-text call in `node_modules/email-reply-parser`. The plan uses `new EmailReplyParser().read(body).getVisibleText()`. If the installed API differs, adjust **only** the body of `stripQuoted`.
>
> Also verify the imapflow calls against the installed version (`client.search({ since })`, `client.fetch(range, { envelope, source, threadId })`, `msg.threadId`/`msg.uid`). `threadId` is Gmail-specific; the subject-based `threadKey` fallback already handles servers that don't return it. Adjust only inside `fetchFolder` if the API differs.

- [ ] **Step 1: Write the failing test** (pure transforms — no IMAP)

```ts
// lib/analysis/gather.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/analysis/gather.test.ts`
Expected: FAIL — cannot find `./gather.ts`.

- [ ] **Step 3: Write minimal implementation**

First add to `lib/analysis/types.ts`:

```ts
export type RawMessage = {
  id: string;
  threadKey: string;
  folder: "inbox" | "sent";
  from: string;
  subject: string;
  date: string; // ISO
  body: string;
};

export type ThreadSummary = {
  threadId: string;
  subject: string;
  participants: string[];
  turns: { id: string; from: string; date: string; text: string }[];
};
```

Then:

```ts
// lib/analysis/gather.ts
import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import EmailReplyParser from "email-reply-parser";
import { getSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "@/lib/secrets";
import { getAnalysisSettings } from "@/lib/settings";
import type { RawMessage, ThreadSummary } from "./types";

// Keep only the visible (non-quoted, non-signature) text of a message.
export function stripQuoted(body: string): string {
  try {
    return new EmailReplyParser().read(body).getVisibleText().trim();
  } catch {
    return body.trim();
  }
}

// Group messages into threads; turns ordered oldest→newest.
export function collapseThreads(msgs: RawMessage[]): ThreadSummary[] {
  const byThread = new Map<string, RawMessage[]>();
  for (const m of msgs) {
    const arr = byThread.get(m.threadKey) ?? [];
    arr.push(m);
    byThread.set(m.threadKey, arr);
  }
  const out: ThreadSummary[] = [];
  for (const [threadId, arr] of byThread) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
    out.push({
      threadId,
      subject: arr[arr.length - 1].subject,
      participants: [...new Set(arr.map((m) => m.from))],
      turns: arr.map((m) => ({ id: m.id, from: m.from, date: m.date, text: stripQuoted(m.body) })),
    });
  }
  return out;
}

const DEFAULT_HOST = "imap.gmail.com";

async function fetchFolder(client: ImapFlow, mailbox: string, folder: "inbox" | "sent", sinceDays: number, max: number): Promise<RawMessage[]> {
  const out: RawMessage[] = [];
  const lock = await client.getMailboxLock(mailbox);
  try {
    const since = new Date(Date.now() - sinceDays * 864e5);
    const uids = await client.search({ since });
    const recent = (uids || []).slice(-max);
    if (recent.length === 0) return out;
    for await (const msg of client.fetch(recent, { envelope: true, source: true, threadId: true })) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      out.push({
        id: String(msg.uid),
        threadKey: msg.threadId ? String(msg.threadId) : (parsed.subject || "").replace(/^(re|fwd):\s*/i, "").trim() || String(msg.uid),
        folder,
        from: parsed.from?.text || "(unknown)",
        subject: parsed.subject || "(no subject)",
        date: (parsed.date ?? new Date()).toISOString(),
        body: parsed.text || msg.envelope?.subject || "",
      });
    }
  } finally {
    lock.release();
  }
  return out;
}

// Live IMAP fetch (inbox + sent), deduped + thread-collapsed. [] when not configured.
export async function gatherEmail(): Promise<ThreadSummary[]> {
  const user = getSecret(IMAP_USER);
  const pass = getSecret(IMAP_PASSWORD);
  if (!user || !pass) return [];
  const { windowDays, maxThreads } = getAnalysisSettings();
  const host = getSecret(IMAP_HOST) || DEFAULT_HOST;
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });

  const msgs: RawMessage[] = [];
  await client.connect();
  try {
    msgs.push(...(await fetchFolder(client, "INBOX", "inbox", windowDays, maxThreads * 4)));
    try {
      msgs.push(...(await fetchFolder(client, "[Gmail]/Sent Mail", "sent", windowDays, maxThreads * 4)));
    } catch {
      /* sent mailbox name varies; inbox alone is still useful */
    }
  } finally {
    await client.logout();
  }
  return collapseThreads(msgs).slice(-maxThreads);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/analysis/gather.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Append ` lib/analysis/gather.test.ts` to the `test` script, then:

```bash
git add lib/analysis/gather.ts lib/analysis/types.ts lib/analysis/gather.test.ts package.json package-lock.json
git commit -m "feat: email gather — window, reply-strip dedupe, thread-collapse"
```

---

### Task 4: Enrich (the map) — classify/score threads on a cheap model

**Files:**
- Create: `lib/analysis/enrich.ts`
- Modify: `lib/analysis/types.ts` (add `EnrichedThread`)
- Test: `lib/analysis/enrich.test.ts`

**Interfaces:**
- Consumes: `ThreadSummary`; `getAnalysisSettings()`; Anthropic key.
- Produces (`types.ts`): `type EnrichedThread = ThreadSummary & { type: string; entity: string | null; sentiment: "positive"|"neutral"|"negative"; salient: boolean }`.
- Produces (`enrich.ts`): `applyEnrichment(threads: ThreadSummary[], rows: unknown): EnrichedThread[]` (pure merge/coerce); `enrichThreads(threads: ThreadSummary[]): Promise<EnrichedThread[]>` (one cheap-model call, falls back to neutral defaults on failure).

> Spec reconciliation: the spec said "reuse triage's sentiment." In practice `lib/triage` computes sentiment inside its own digest for its own window and does not expose a reusable per-thread function, so this task does the classification directly — but it honors the spec's real intent (the model classifies natively, **not** a separate ML subsystem) by keeping it to a **single cheap batched call**, not a per-message classifier.

- [ ] **Step 1: Write the failing test** (pure merge — no API)

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/analysis/enrich.test.ts`
Expected: FAIL — cannot find `./enrich.ts`.

- [ ] **Step 3: Write minimal implementation**

Add to `lib/analysis/types.ts`:

```ts
export type EnrichedThread = ThreadSummary & {
  type: string;
  entity: string | null;
  sentiment: "positive" | "neutral" | "negative";
  salient: boolean;
};
```

```ts
// lib/analysis/enrich.ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSecret, ANTHROPIC_KEY } from "@/lib/secrets";
import { getAnalysisSettings } from "@/lib/settings";
import type { ThreadSummary, EnrichedThread } from "./types";

type Row = { threadId?: string; type?: unknown; entity?: unknown; sentiment?: unknown; salient?: unknown };

// Pure: merge model rows onto threads, coercing to safe values.
export function applyEnrichment(threads: ThreadSummary[], raw: unknown): EnrichedThread[] {
  const rows = Array.isArray((raw as { threads?: unknown })?.threads) ? ((raw as { threads: Row[] }).threads) : [];
  const byId = new Map(rows.map((r) => [String(r.threadId), r]));
  const sentiments = ["positive", "neutral", "negative"] as const;
  return threads.map((t) => {
    const r = byId.get(t.threadId);
    const sentiment = sentiments.includes(r?.sentiment as never) ? (r!.sentiment as EnrichedThread["sentiment"]) : "neutral";
    return {
      ...t,
      type: typeof r?.type === "string" ? r.type : "other",
      entity: typeof r?.entity === "string" && r.entity ? r.entity : null,
      sentiment,
      salient: r?.salient === true,
    };
  });
}

const SYSTEM = `Classify email threads for a custom home builder. For each thread return type (one of: commitment, question, scope_change, complaint, fyi, other), entity (the project or client name it concerns, or null), sentiment (positive|neutral|negative), and salient (true only if it likely needs the owner's attention). Return ONLY JSON: {"threads":[{"threadId","type","entity","sentiment","salient"}]}.`;

function compact(threads: ThreadSummary[]) {
  return threads.map((t) => ({
    threadId: t.threadId,
    subject: t.subject,
    turns: t.turns.map((x) => ({ from: x.from, date: x.date, text: x.text.slice(0, 600) })),
  }));
}

export async function enrichThreads(threads: ThreadSummary[]): Promise<EnrichedThread[]> {
  const apiKey = getSecret(ANTHROPIC_KEY) ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey || threads.length === 0) return applyEnrichment(threads, { threads: [] });
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: getAnalysisSettings().enrichModel,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(compact(threads)) }],
    });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = start >= 0 && end >= 0 ? JSON.parse(text.slice(start, end + 1)) : { threads: [] };
    return applyEnrichment(threads, parsed);
  } catch (err) {
    console.error("[analysis] enrichment failed; using neutral defaults:", err);
    return applyEnrichment(threads, { threads: [] });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/analysis/enrich.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Append ` lib/analysis/enrich.test.ts` to the `test` script, then:

```bash
git add lib/analysis/enrich.ts lib/analysis/types.ts lib/analysis/enrich.test.ts package.json
git commit -m "feat: thread enrichment (cheap-model map: type/entity/sentiment/salience)"
```

---

### Task 5: Reason (the reduce) — salient threads → grounded findings

**Files:**
- Create: `lib/analysis/reason.ts`
- Test: `lib/analysis/reason.test.ts`

**Interfaces:**
- Consumes: `EnrichedThread`; `getAnalysisSettings()`; `validateFindings` from `lib/signals`; Anthropic key.
- Produces: `bundleIds(threads: EnrichedThread[]): Set<string>` (pure — the allowed ids); `buildUserPrompt(threads: EnrichedThread[]): string` (pure); `reason(threads: EnrichedThread[]): Promise<Finding[]>` (live call → `validateFindings`).

> v1 simplification (within Approach A): a single structured `messages.create` over the SALIENT enriched threads (JSON-only, mirroring `lib/triage/digest.ts`), not the Tool Runner. A read-only drill-down tool is the documented later upgrade.

- [ ] **Step 1: Write the failing test** (pure helpers — no API)

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/analysis/reason.test.ts`
Expected: FAIL — cannot find `./reason.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/analysis/reason.ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSecret, ANTHROPIC_KEY } from "@/lib/secrets";
import { getAnalysisSettings } from "@/lib/settings";
import { validateFindings } from "@/lib/signals";
import type { EnrichedThread, Finding } from "./types";

export function bundleIds(threads: EnrichedThread[]): Set<string> {
  const ids = new Set<string>();
  for (const t of threads) for (const turn of t.turns) ids.add(turn.id);
  return ids;
}

export function buildUserPrompt(threads: EnrichedThread[]): string {
  const rows = threads.map((t) => ({
    threadId: t.threadId,
    subject: t.subject,
    type: t.type,
    entity: t.entity,
    sentiment: t.sentiment,
    messages: t.turns.map((x) => ({ id: x.id, from: x.from, date: x.date, text: x.text })),
  }));
  return `Here are the salient email threads. Cite message "id" values as provenance.\n\n${JSON.stringify(rows, null, 2)}\n\nReturn ONLY JSON: {"findings":[{"severity":"escalate|watch","domain","title","detail","confidence":"high|medium","provenance":[{"id","label"}]}]}. If nothing warrants Dave's attention, return {"findings":[]}.`;
}

export async function reason(threads: EnrichedThread[]): Promise<Finding[]> {
  const salient = threads.filter((t) => t.salient);
  if (salient.length === 0) return [];
  const apiKey = getSecret(ANTHROPIC_KEY) ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const { reasonModel, systemPrompt, maxTokens } = getAnalysisSettings();
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: reasonModel,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" }, // explicit: 4.8 runs without it if omitted
    output_config: { effort: "high" }, // explicit: 5.5 defaults to medium
    system: systemPrompt,
    messages: [{ role: "user", content: buildUserPrompt(salient) }],
  });
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const parsed = start >= 0 && end >= 0 ? JSON.parse(text.slice(start, end + 1)) : { findings: [] };
  return validateFindings(parsed, bundleIds(salient));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/analysis/reason.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Append ` lib/analysis/reason.test.ts` to the `test` script, then:

```bash
git add lib/analysis/reason.ts lib/analysis/reason.test.ts package.json
git commit -m "feat: reasoning reduce — salient threads to grounded findings"
```

---

### Task 6: Orchestrator + Analyze API route

**Files:**
- Create: `lib/analysis/run.ts`, `app/api/analysis/run/route.ts`
- Modify: `next.config.ts` (add `email-reply-parser` to `serverExternalPackages`)

**Interfaces:**
- Consumes: `gatherEmail`, `enrichThreads`, `reason`, `saveFindings`, `isEmailConfigured`.
- Produces: `runAnalysis(): Promise<{ threads: number; findings: number }>`.

- [ ] **Step 1: Write the orchestrator**

```ts
// lib/analysis/run.ts
import "server-only";
import { gatherEmail } from "./gather";
import { enrichThreads } from "./enrich";
import { reason } from "./reason";
import { saveFindings } from "@/lib/signals";

export async function runAnalysis(): Promise<{ threads: number; findings: number }> {
  const threads = await gatherEmail();
  const enriched = await enrichThreads(threads);
  const findings = await reason(enriched);
  saveFindings(findings);
  return { threads: threads.length, findings: findings.length };
}
```

- [ ] **Step 2: Write the route handler**

```ts
// app/api/analysis/run/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runAnalysis } from "@/lib/analysis/run";

export async function POST() {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Connect email first." }, { status: 400 });
  }
  try {
    const result = await runAnalysis();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[analysis] run failed:", err);
    return NextResponse.json({ error: "Analysis unavailable — try again." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add `email-reply-parser` to server externals**

In `next.config.ts`, the non-pages branch, add `"email-reply-parser"` to the existing `serverExternalPackages` array.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: PASS; route table lists `ƒ /api/analysis/run`.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/run.ts app/api/analysis/run/route.ts next.config.ts
git commit -m "feat: analysis orchestrator + Analyze API route"
```

---

### Task 7: Admin Analysis panel + Analyze trigger

**Files:**
- Create: `app/api/analysis/settings/route.ts`, `components/admin/Analyze.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `getAnalysisSettings`, `saveAnalysisSettings`, `DEFAULT_SETTINGS`, `isEmailConfigured`, `loadSignals`.

- [ ] **Step 1: Settings save route**

```ts
// app/api/analysis/settings/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { saveAnalysisSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const form = await request.formData();
  saveAnalysisSettings({
    reasonModel: String(form.get("reasonModel") ?? "claude-opus-4-8"),
    enrichModel: String(form.get("enrichModel") ?? "claude-haiku-4-5"),
    systemPrompt: String(form.get("systemPrompt") ?? ""),
    windowDays: Number(form.get("windowDays") ?? 30),
    maxThreads: Number(form.get("maxThreads") ?? 40),
  });
  return NextResponse.redirect(new URL("/admin?analysis=saved", request.url), { status: 303 });
}
```

- [ ] **Step 2: Analyze button (client)**

```tsx
// components/admin/Analyze.tsx
"use client";
import { useState } from "react";

export function Analyze({ className }: { className?: string }) {
  const [state, setState] = useState<string>("");
  const run = async () => {
    setState("Analyzing…");
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      setState(res.ok ? `Found ${data.findings} item(s) across ${data.threads} threads.` : data.error);
    } catch {
      setState("Analysis unavailable — try again.");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button onClick={run} className={className}>Analyze now</button>
      {state && <span className="text-sm text-muted">{state}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Add the Analysis panel to the admin page**

In `app/admin/page.tsx`, import `getAnalysisSettings`, `DEFAULT_SETTINGS` from `@/lib/settings`, `isEmailConfigured` from `@/lib/email`, and `Analyze` from `@/components/admin/Analyze`. After the existing cards, render (using the same `SectionCard`/token styling as the other panels):

```tsx
{/* Analysis */}
<SectionCard title="Analysis" className="mt-6">
  {isEmailConfigured() ? (
    <Analyze className="rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90" />
  ) : (
    <p className="text-sm text-muted">Connect email above to enable analysis.</p>
  )}
  <form method="post" action="/api/analysis/settings" className="mt-6 grid gap-3 sm:max-w-xl">
    <label className="grid gap-1 text-sm">
      <span className="text-muted">Reasoning model</span>
      <select name="reasonModel" defaultValue={settings.reasonModel} className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
        <option value="claude-opus-4-8">Claude Opus 4.8 (default)</option>
        <option value="claude-opus-5-5">Claude Opus 5.5</option>
      </select>
    </label>
    <input type="hidden" name="enrichModel" value={settings.enrichModel} />
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-1 text-sm"><span className="text-muted">Window (days)</span>
        <input name="windowDays" type="number" defaultValue={settings.windowDays} className="rounded-lg border border-line bg-surface px-3 py-2 text-ink" /></label>
      <label className="grid gap-1 text-sm"><span className="text-muted">Max threads</span>
        <input name="maxThreads" type="number" defaultValue={settings.maxThreads} className="rounded-lg border border-line bg-surface px-3 py-2 text-ink" /></label>
    </div>
    <label className="grid gap-1 text-sm">
      <span className="text-muted">Reasoning prompt</span>
      <textarea name="systemPrompt" rows={8} defaultValue={settings.systemPrompt} className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink" />
    </label>
    <div className="flex gap-3">
      <button className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90">Save analysis settings</button>
      <button name="systemPrompt" value={DEFAULT_SETTINGS.systemPrompt} formNoValidate className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface-2">Reset prompt to default</button>
    </div>
  </form>
</SectionCard>
```

Add `const settings = getAnalysisSettings();` near the top of the component, and extend the `SP`/status map to include `analysis?: string` → "Analysis settings saved."

- [ ] **Step 4: Verify in the browser**

Run `npm run build`, start the preview, open `/admin`. Expected: the **Analysis** panel renders with the model dropdown, caps, editable prompt, Reset, and (if email connected) an **Analyze now** button. Screenshot it.

- [ ] **Step 5: Commit**

```bash
git add app/api/analysis/settings/route.ts components/admin/Analyze.tsx app/admin/page.tsx
git commit -m "feat: admin Analysis panel (model, prompt, caps) + Analyze trigger"
```

---

### Task 8: Surface findings in the attention feed + dismiss

**Files:**
- Create: `app/api/analysis/dismiss/route.ts`, `components/AnalysisFindings.tsx`
- Modify: `app/page.tsx` (render findings under the attention feed)

**Interfaces:**
- Consumes: `visibleFindings` from `@/lib/signals`.

- [ ] **Step 1: Dismiss route**

```ts
// app/api/analysis/dismiss/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { dismiss } from "@/lib/signals";

export async function POST(request: Request) {
  const form = await request.formData();
  const sig = String(form.get("signature") ?? "");
  if (sig) dismiss(sig);
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
```

- [ ] **Step 2: Findings component (server)**

```tsx
// components/AnalysisFindings.tsx
import type { Finding } from "@/lib/analysis/types";

export function AnalysisFindings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="font-serif text-lg text-ink">Worth a look</h3>
      <ul className="mt-2 divide-y divide-line">
        {findings.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${f.severity === "escalate" ? "bg-terracotta" : "bg-amber"}`} />
              <span className="text-ink">{f.title}</span>
              {f.detail && <p className="mt-1 text-sm text-muted">{f.detail}</p>}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted">Why</summary>
                <p className="mt-1 text-xs text-muted">{f.provenance.map((p) => p.label).join(" · ")}</p>
              </details>
            </div>
            <form method="post" action="/api/analysis/dismiss">
              <input type="hidden" name="signature" value={f.signature} />
              <button className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-ink">Dismiss</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Render on the Overview page**

In `app/page.tsx`: add `export const dynamic = "force-dynamic";` (findings are runtime state), import `visibleFindings` from `@/lib/signals` and `AnalysisFindings`, and render `<AnalysisFindings findings={visibleFindings()} />` inside the attention section, after the rule-based items.

- [ ] **Step 4: Verify build + render**

Run: `npm run build` then `npm test` (all suites green). Start preview, open `/`. With no findings stored, the section is absent (component returns null). Manually seed one finding via `saveFindings` in a Node REPL to confirm it renders with a working "Why" expander and Dismiss.

- [ ] **Step 5: Commit**

```bash
git add app/api/analysis/dismiss/route.ts components/AnalysisFindings.tsx app/page.tsx
git commit -m "feat: surface analysis findings in the attention feed with dismiss"
```

---

## Manual end-to-end verification (after Task 8)

1. `npm test` — all suites pass (settings, signals, gather, enrich, reason, plus existing).
2. `npm run build` — clean; new routes register as dynamic.
3. In `/admin`: connect email (real Gmail + app password), tune the window if desired, click **Analyze now**. Confirm the status shows threads/findings counts.
4. On `/`: confirm findings appear under "Worth a look" with grounded "Why" provenance; Dismiss one and confirm it stays gone after re-analyzing.
5. Switch the reasoning model to Opus 5.5 in the panel (only if the account has access) and re-run.

## Notes / deferred (out of this plan)

- QBO/Plaid/Harvest **data reads** → richer cross-source findings (each its own slice; extend `gather` + prompt).
- Read-only drill-down **tool** (Tool Runner) for the reasoning step.
- Live-roaming agent via Claude Code / Agent SDK + MCP.
- Scheduling (on-demand → nightly).
- "Not useful" feedback tuning the prompt.
