# Herrle Custom Homes — executive dashboard

A "single pane of glass" for Herrle Custom Homes: company health, a personal
effort board, and an email brief. Runs locally on Dave's laptop and updates
itself from GitHub Releases — see [INSTALL.md](INSTALL.md).

## What's in it

- **Overview** (`/`) — attention-first health dashboard: what needs Dave's
  attention vs. what's on track, plus financials, projects, pipeline, clients,
  team and signatures. Each section reads from a data source connected in
  Admin; until one is connected the section says so.
- **Board** (`/board`) — Dave's board of high-level business efforts. Bespoke
  lanes, drag cards forward, and **Run standup** to pull topics worth bringing
  to the team (board + live escalations).
- **Inbox** (`/triage`) — morning / afternoon / evening briefs of the connected
  Gmail inbox, interpreted by Claude through this computer's **Claude Code
  sign-in** (no API key). Without Claude it shows a plain list.
- **Admin** (`/admin`) — connect email, QuickBooks and bank; analysis settings.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm test` runs the escalation-logic and module checks; `npm run build` makes
the standalone server build that CI packages into a release.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts.
