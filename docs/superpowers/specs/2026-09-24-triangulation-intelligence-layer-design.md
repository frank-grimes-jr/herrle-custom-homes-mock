# Triangulation intelligence layer — design

**Date:** 2026-09-24
**Status:** Approved design, pending implementation plan

## Context & purpose

The Herrle dashboard already surfaces attention items from **deterministic rules**
(`lib/data/attention.ts` → `deriveAttention`). This adds a second, **probabilistic
tier**: an on-demand analysis that reasons *across* Dave's connected tools and
surfaces things he wouldn't otherwise catch — a client quietly cooling, a promise
he dropped, scope discussed but never papered.

Both tiers feed **one attention feed**. No new home-screen surface (per the
cockpit-simplicity rule): the intelligence lands where Dave already looks.

This is the highest-value *and* highest-risk part of the product; it lives or dies
on precision, so the design is built around grounding, read-only access, and a
dismiss/feedback loop.

## Non-goals / v1 constraints

- **Read-only advisor.** It reads, reasons, and writes findings. It never sends,
  edits, drafts, or creates anything. Dave (or the developer) acts on what it surfaces.
- **On-demand only.** A human clicks "Analyze." Nothing autonomous runs unattended.
  (Scheduling is a later extension.)
- **Email is the only live real source today.** QuickBooks and Plaid are
  connect-only (credentials stored, no data reads built yet); Harvest isn't built;
  `lib/data` is still mock. So **v1 triangulates the live email stream only.** The
  architecture is designed so adding a source later = extend the Gather step + the
  editable prompt, not a redesign.

## Architecture

All on Dave's local server, read-only end to end:

```
[Analyze button] → orchestrator
   → GATHER    (fetch scoped, read-only email window; dedupe; thread-collapse)
   → ENRICH    (cheap model: classify + sentiment + entity per thread; flag salience)  ── "map"
   → REASON    (Opus 4.8 over the salient enriched summaries → structured findings)      ── "reduce"
   → VALIDATE  (drop findings citing unknown source ids; coerce severity)
   → STORE     (findings + dismissed signatures in the user-data dir)
   → SURFACE   (merge into the Overview attention feed with provenance + dismiss)
```

### 1. Trigger

An **Analyze** action in the console/admin. Human-initiated (bounds cost, avoids an
unattended autonomous agent). Shows the latest run's raw results on that screen.

### 2. Gather — bounded, deduped, thread-collapsed

The load-bearing ingest design (Dave's inbox has thousands of emails with heavy
reply redundancy):

- **Window, not the mailbox.** Default **30 days** (configurable), **inbox + sent**
  (sent is where dropped commitments live). Window + caps are configurable settings.
- **Kill reply redundancy at ingest.** Each message runs through an
  **email-reply-parser library** (not hand-rolled regex) to strip quoted history and
  signatures, so a message contributes only its *new* text.
- **Group into threads** (References/In-Reply-To headers) represented as a compact
  timeline: participants, subject, each turn's fresh content, latest status. The
  model sees conversations, not a flat pile of duplicated replies.
- **Hard caps** (max threads, max tokens/run) bound every run; an oversized window
  processes the most recent/salient and reports coverage rather than blowing budget.

### 3. Enrich (the "map") — explicit, on a cheaper model

Per-thread enrichment into **structured fields**, so tone/type/entity are
groundable and trendable (not a separate ML subsystem — the model does it natively):

- `type` — scope-change discussion, question, FYI, etc.
- `entity` — which project / client / sub it belongs to (**entity resolution**, the
  connective tissue that makes cross-source correlation possible).
- `sentiment` — for communications; **reuse the triage digest's existing per-email
  sentiment/bucketing** (`lib/triage`) rather than a parallel classifier.
- `salience` — whether it's worth the expensive reasoning pass.

Runs on a **cheaper model** — default **`claude-haiku-4-5`**, configurable in the
Analysis panel (bump to Sonnet 5 if entity/sentiment quality needs it) — bulk, cheap, parallel.

### 4. Reason (the "reduce") — Opus, configurable

The triangulation reasons **only over the salient enriched thread summaries** (a few
dozen compact records — never raw thousands of emails) and returns **structured
findings**. Implemented with the **Anthropic API Tool Runner** (`@anthropic-ai/sdk`
agentic loop) over one custom **read-only "pull more detail" tool** — Claude "thinks
across the tools" without ever holding live source credentials. Streaming (long
output). The full Claude Code / Agent SDK harness is the **documented upgrade path**
for a future live-roaming version, not v1.

**Model:** default **`claude-opus-4-8`**, switchable to **`claude-opus-5-5`** from
admin. One code path; the 4.8↔5.5 differences are handled explicitly:
- `tool_choice: auto` (never forced) — 5.5 400s on forced tool use.
- `output_config.effort` set **explicitly** (e.g. `high`) — 5.5 defaults to `medium`.
- `thinking: {type: "adaptive"}` explicit — correct for both (4.8 runs without
  thinking if omitted; 5.5 can't disable it).
- Selecting 5.5 before the account has access surfaces the run-time 400 as a clear
  error, not a silent failure.

### 5. Findings model, provenance & grounding

A **finding** extends the existing `AttentionItem` (severity, domain, title, detail,
optional `href`) with:
- `provenance` — the concrete source items it's built from (email ids + short human
  labels), shown as a "why" expander.
- `confidence` — a high/medium band.
- a **stable signature** (hash of claim + cited sources) so the same finding is
  recognized across runs (that's what makes dismissals stick).

**Grounding guardrail (the one shipped check):** the bundle carries a stable id for
every item; findings may only cite ids present in the bundle. On the way out, **drop
any finding citing an unknown id** — the defense against hallucinated evidence.

### 6. Surface & the dismiss/feedback loop

- Findings **merge into the Overview attention feed** alongside rule-based items.
- Per the copy standard: **no "AI" badge** — the provenance expander *is* the trust
  signal. Each finding has a **Dismiss** control.
- **Dismiss** writes the finding's signature to the user-data store; it won't
  resurface. (v1 = hide-and-remember; a "not useful" tuning signal is a later extension.)

### 7. Configuration & storage — deliberately NOT the vault

Model choice, editable prompt(s), and caps are **settings, not secrets**, and a
Windows credential blob is too small for a multi-paragraph prompt. They live in a
small JSON file in a **user-data dir** (`%LOCALAPPDATA%\HerrleDashboard\`),
**outside the repo**, so the `git reset --hard` auto-update never clobbers Dave's
edits. Sensible defaults ship in code; the file holds only overrides.

- New `lib/settings.ts` — reads/writes the JSON settings (model, prompts, caps).
- New `lib/signals.ts` — reads/writes current findings + dismissed signatures.
- Admin gets an **Analysis** panel: model dropdown, editable reasoning prompt(s)
  with **Reset to default**, and the window/caps.

## Security model

- Read-only throughout; human-triggered; the reasoning engine **never holds source
  credentials** (the orchestrator fetches and hands over data snapshots).
- Output is **data-only** (findings) — never actions.
- Per-run token cap; scoped window.

## Cost & failure handling

- On-demand + scoped window + two-stage (cheap map, bounded reduce) keep spend
  predictable.
- Reasoning call streams. On failure or bad JSON: "analysis unavailable — try again."
  Never crash, never fabricate.

## Testing

One `node --test` over a fixture model-output (no live API): asserts the grounding
filter drops findings citing unknown ids, and that finding signatures are stable so
dismissals persist across runs. Mirrors the existing `lib/data/attention.test.ts` style.

## New/changed modules (indicative)

- `lib/settings.ts` (user-data JSON settings) + test
- `lib/signals.ts` (findings + dismissed store) + grounding/validation + test
- `lib/analysis/gather.ts` (email window, reply-parser dedupe, thread-collapse)
- `lib/analysis/enrich.ts` (cheap-model map: type/entity/sentiment/salience; reuse `lib/triage`)
- `lib/analysis/reason.ts` (Tool Runner reduce → structured findings; model from settings)
- `app/api/analysis/run/route.ts` (the Analyze trigger, streaming)
- Admin: an **Analysis** settings panel
- Overview attention feed: render triangulation findings (provenance expander + dismiss)
- New dep: an email-reply-parser library

## Future extensions (explicitly out of v1)

- **Richer cross-source findings** (unbilled change orders w/ QBO cross-check;
  cash-vs-promised w/ Plaid; utilization w/ Harvest) — light up as each source's
  **data reads** are built (each its own slice; extend Gather + prompt).
- **Live-roaming agent** via Claude Code headless / Agent SDK + MCP (e.g. Harvest's
  existing MCP) — the "Approach C" upgrade when live tool access is wanted.
- **Scheduling** — move from on-demand to a nightly run feeding the morning brief.
- **Feedback-tuned prompts** — feed "not useful" dismissals back into the prompt.
