# Installing the Herrle Dashboard on Dave's laptop

This app runs **locally** on Dave's Windows laptop and **updates itself**. You
never "deploy" a release: you merge to `main`, and his laptop pulls the change
(once CI is green), rebuilds, and restarts on its own. Dave just opens
**http://herrle.internal** — no port, no terminal, nothing to click.

Setup is **one time**. Do it yourself on his machine, or hand him the two-prompt
bootstrap below.

---

## What you need first (5 minutes, once)

1. **Make the repo private** (recommended — it's his business tool). No secrets
   live in the repo, but private is prudent.
2. **A read-only GitHub token** so the laptop can auto-pull a private repo:
   GitHub → Settings → Developer settings → **Fine-grained tokens** → new token,
   scoped to *only this repo*, permission **Contents: Read-only**. Copy it.
   *(Skip if you keep the repo public.)*
3. **An Anthropic API key** (for the inbox briefs / intelligence). Optional — the
   app runs without it, just without the AI summaries.

## Install (on Dave's laptop, once)

1. Copy `scripts\bootstrap.ps1` onto the laptop (or clone the repo once and run it
   from there).
2. Right-click it → **Run with PowerShell** (choose **Yes** at the admin prompt),
   or from an elevated PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
   ```
3. Answer two prompts: the **GitHub token** and the **Anthropic key** (either can
   be blank).

The bootstrap then, unattended:
- installs **Node LTS** and **Git** via `winget` (skips if present),
- stores the token in **Windows Credential Manager** (for auto-pull),
- clones the repo to `C:\HerrleDashboard`,
- runs **`setup-local.ps1`**, which: maps `herrle.internal` → `127.0.0.1`,
  forwards port **80 → 3000** (so the URL has no port and the app runs
  unprivileged), builds once, stores the Anthropic key in the **OS vault**, and
  registers the **"Herrle Dashboard"** scheduled task (start at log-on + self-update
  every 5 minutes).

When it finishes, open **http://herrle.internal**.

## Register the integrations (one time, per provider)

Each provider needs its *app* registered once (this is unavoidable with OAuth /
bank aggregators — see the PR notes). After that, **Dave** connects his own
accounts from the ⚙ **Admin** page with a single Connect button.

| Provider | Redirect URI to register | Where |
|---|---|---|
| Google Workspace | `http://localhost:3000/api/integrations/google/callback` | Google Cloud → OAuth client (Web application; **Internal** app in Herrle's Workspace = no verification warning) |
| QuickBooks | `http://localhost:3000/api/integrations/quickbooks/callback` | Intuit developer app |
| Bank (Plaid) | — (Plaid Link, no redirect) | Plaid dashboard (start in **Sandbox**) |

Paste each provider's client id/secret once under **Developer setup** on the
Admin page; those blocks then disappear and Dave sees only Connect / Disconnect.

> The connect flow briefly uses `localhost:3000` (Google/Intuit reject non-`localhost`
> `http` redirects); the everyday URL stays `herrle.internal`.

---

## How updates work (nothing for Dave to do)

You merge to `main` → the `build-check` workflow runs → the laptop's scheduled task
(`scripts/update.mjs`) sees the new **green** commit within 5 min, pulls it,
`npm ci` (only if dependencies changed), `npm run build`, and restarts.

**Protect `main`** with branch protection / required review: a merge to `main`
runs code on Dave's laptop.

## Checking / troubleshooting

- **Is it running?** Open `http://herrle.internal`. Or `Get-ScheduledTask "Herrle Dashboard"`.
- **Force an update now:** `node C:\HerrleDashboard\scripts\update.mjs`
- **Re-run local setup** (hostname/portproxy/task): re-run `setup-local.ps1` elevated.
- **`node`/`git` "not found" right after install:** open a fresh PowerShell (PATH
  refresh) and re-run.
- **Port 80 in use** (e.g. IIS/Skype): change `$Port`/portproxy, or free port 80.
- **Auto-pull fails on a private repo:** the token expired or lacks *Contents: Read* —
  re-run `bootstrap.ps1` and paste a new one.
- **Nothing at herrle.internal:** confirm the hosts entry and
  `netsh interface portproxy show all`.
