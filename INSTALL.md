# Installing the Herrle Dashboard on Dave's laptop

This app runs **locally** on Dave's Windows laptop and **updates itself**. You
never "deploy" a release: you merge to `main`, and his laptop pulls the change
(once CI is green), rebuilds, and restarts on its own. Dave just opens
**http://herrle.internal** — no port, no terminal, nothing to click.

Setup is **one time** and uses a plain **`.cmd`** file (not PowerShell), so a
disabled PowerShell script policy can't block it. Node does the real work.

---

## Install (once, on Dave's laptop)

1. Copy `scripts\install.cmd` and the repo's `scripts\setup-local.mjs` onto the
   laptop — or just copy `install.cmd` (it clones the repo, which brings the rest).
2. **Right-click `install.cmd` → "Run as administrator."** (Admin is needed once
   for the hostname + port-80 mapping.)
3. It runs unattended:
   - installs **Node LTS** and **Git** via `winget` (skips if present),
   - clones the repo to `%USERPROFILE%\HerrleDashboard` — a **GitHub sign-in window opens
     the first time** if the repo is private; sign in once and Git remembers it
     for the automatic updates,
   - runs `setup-local.mjs`, which maps `herrle.internal` → `127.0.0.1`, forwards
     port **80 → 3000** (so the URL has no port and the app runs unprivileged),
     builds once, prompts for the **Anthropic API key** (hidden; stored in the OS
     vault; blank to skip), and registers the **scheduled tasks** (start at logon
     + self-update every 5 minutes).

When it finishes, open **http://herrle.internal**.

> No manual GitHub token needed: the first `git clone` uses Git Credential
> Manager's secure sign-in and stores the result for unattended auto-pull. (If
> you prefer, you can still pre-seed a read-only fine-grained token.)

## Connect the data sources

**Email** needs no provider registration: on the ⚙ Admin page Dave enters his
Gmail address and a 16-character **App Password** (Google Account → Security →
App passwords; requires 2-Step Verification). Read-only over IMAP — no Google
Cloud project. The dashboard verifies the login before saving.

**QuickBooks** and **Bank (Plaid)** need a one-time app registration by you, then
Dave connects with one click:

| Provider | Redirect URI to register | Where |
|---|---|---|
| QuickBooks | `http://localhost:3000/api/integrations/quickbooks/callback` | Intuit developer app |
| Bank (Plaid) | — (Plaid Link, no redirect) | Plaid dashboard (start in **Sandbox**) |

Paste each provider's client id/secret once under **Developer setup** on the
Admin page; those blocks then disappear and Dave sees only Connect / Disconnect.

> QuickBooks' connect flow briefly uses `localhost:3000` (Intuit rejects
> non-`localhost` `http` redirects); the everyday URL stays `herrle.internal`.

---

## How updates work (nothing for Dave to do)

You merge to `main` → the `build-check` workflow runs → the laptop's scheduled
task (`scripts/update.mjs`) sees the new **green** commit within 5 min, pulls it,
`npm ci` (only if dependencies changed), `npm run build`, and restarts.

**Protect `main`** with branch protection / required review: a merge to `main`
runs code on Dave's laptop.

## Checking / troubleshooting

- **Is it running?** Open `http://herrle.internal`, or `schtasks /query /tn "Herrle Dashboard Update"`.
- **Force an update now:** `node %USERPROFILE%\HerrleDashboard\scripts\update.mjs`
- **Re-run local setup** (hostname/portproxy/tasks): from an **admin** prompt,
  `node %USERPROFILE%\HerrleDashboard\scripts\setup-local.mjs`
- **"node isn't recognized" right after install:** Node was just installed and
  isn't on PATH yet — close the window and run `install.cmd` again (as admin); it
  skips the install and finishes.
- **Port 80 in use** (IIS / another app): free port 80, or change `PORT`/the
  portproxy and use `herrle.internal:<port>`.
- **Nothing at herrle.internal:** check the hosts entry and
  `netsh interface portproxy show all`.
- **PowerShell blocked?** Not used here — everything runs through `install.cmd`
  (batch) and Node.
