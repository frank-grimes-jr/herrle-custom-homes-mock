# Herrle Custom Homes — executive dashboard (mock)

An interactive prototype of a "single pane of glass" for Herrle Custom Homes:
a snapshot of company health, a personal effort board, and an AI email brief —
built to feel like the brand ("Built with intention"), not generic SaaS.

**Live:** https://frank-grimes-jr.github.io/herrle-custom-homes-mock/

All figures and inboxes are **synthetic sample data**.

## What's in it

- **Overview** (`/`) — an attention-first health dashboard: what needs Dave's
  attention vs. what's on track, plus financials, projects, pipeline, clients,
  team (incl. Claude adoption) and signatures.
- **Board** (`/board`) — Dave's board of high-level business efforts (not
  projects). Bespoke lanes, drag cards forward, and a **Run standup** button
  that surfaces topics worth bringing to the team (board + live escalations).
- **Inbox** (`/triage`) — morning / afternoon / evening email briefs that
  interpret and prioritize, with sentiment, urgency and suggested actions.

## Live AI (optional)

The Inbox briefs and the standup ship with deterministic **sample** output so
the site works with zero setup. In the local app, the briefs and the Analysis
are written by Claude through the computer's **Claude Code sign-in** (the
`claude` CLI, run headless) — no API key. GitHub Pages is static, so the hosted
site always shows the samples.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build` (static export to `out/`), `npm test`
(escalation-logic checks).

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS v4 ·
Recharts · Anthropic SDK. Deployed to GitHub Pages via GitHub Actions.
