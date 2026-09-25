# Installing the Herrle Dashboard on Dave's laptop

The app runs **locally** on Dave's Windows laptop and **keeps itself up to
date without him noticing**. There are no console windows, no scheduled builds,
and no Node, Git or npm on his machine.

- **You merge to `main`.** GitHub Actions ([`release.yml`](.github/workflows/release.yml))
  tests and builds the app, boots the packaged result as a smoke test, and
  publishes it as a GitHub Release (`build-N`).
- **The laptop runs one hidden background app.** `HerrleDashboard.exe` starts at
  sign-in and runs the prebuilt server, which serves **http://herrle.internal**.
  Every 30 minutes it checks for a newer release. When it finds one, it
  downloads it, verifies the checksum, unpacks it beside the current version,
  and restarts into it (about a 2-second blip).

## What Dave's laptop needs

- Windows 10 (1803+) or 11. The built-in `curl` and `tar` do the downloading.
- **Claude Code installed and signed in.** The Inbox briefs and the Analysis run
  through that sign-in (`claude -p`, headless and windowless), so no API key is
  needed. If he's signed out, Admin → *Analyze now* says **"Open Claude Code on
  this computer and sign in"**, and the Inbox shows a plain message list until
  he does.
- Admin rights **once**, for the `herrle.internal` name and the port-80 mapping.

## Install (once)

1. Get `install.cmd`. It's attached to every release:
   `https://github.com/frank-grimes-jr/herrle-custom-homes-mock/releases/latest/download/install.cmd`
   (or copy `scripts\install.cmd`). For an offline install, put
   `herrle-dashboard-win-x64.zip` from a release in the same folder.
2. **Right-click `install.cmd` → "Run as administrator."** If SmartScreen says
   *"Windows protected your PC"*, choose *More info → Run anyway*. It's a plain,
   readable batch file.
3. It runs unattended, with no questions:
   - downloads the latest build (~45 MB) into `%LOCALAPPDATA%\HerrleDashboard\app`,
   - maps `herrle.internal` → `127.0.0.1` and forwards port **80 → 3000**,
   - registers the hidden launcher to start at sign-in (it shows as
     *HerrleDashboard* in Task Manager → Startup apps),
   - starts it and opens **http://herrle.internal**.

Running it again is safe; use it to repair or reinstall. It also removes the
previous git + npm setup (its two scheduled tasks and its
`%USERPROFILE%\HerrleDashboard` checkout).

## Connect the data sources

**Email** needs no provider registration. On the ⚙ Admin page, Dave enters his
Gmail address and a 16-character **App Password**, created at
<https://myaccount.google.com/apppasswords>. Google no longer lists that page
in the Security menu, and it only works once 2-Step Verification is on. The
Admin form links to it. Access is read-only over IMAP,
with no Google Cloud project, and the dashboard verifies the login before
saving.

**QuickBooks** and **Bank (Plaid)** each need a one-time app registration by
you; after that, Dave connects with one click:

| Provider | Redirect URI to register | Where |
|---|---|---|
| QuickBooks | `http://localhost:3000/api/integrations/quickbooks/callback` | Intuit developer app |
| Bank (Plaid) | — (Plaid Link, no redirect) | Plaid dashboard (start in **Sandbox**) |

Paste each provider's client id/secret once under **Developer setup** on the
Admin page. Those blocks then disappear, and Dave sees only Connect / Disconnect.
Credentials live in Windows Credential Manager (service `herrle-dashboard`),
never in files.

> QuickBooks' connect flow briefly uses `localhost:3000` (Intuit rejects
> non-`localhost` `http` redirects); the everyday URL stays `herrle.internal`.

---

## How updates work (nothing for Dave to do)

Merge → `release.yml` publishes `build-N` → within 30 minutes the laptop
installs it. The previous build stays on disk.

- **Roll back:** delete the bad release on GitHub's Releases page. The laptop
  installs whatever is "latest" again on its next check.
- **Protect `main`** with branch protection / required review: a merge to
  `main` becomes code running on Dave's laptop.
- **Keep the repo public, or plan for a token.** The updater downloads releases
  anonymously. The code holds no secrets (those are in the vault). If the repo
  goes private, updates stop until the updater is given a read-only token.
- Pull requests are checked by `build-check.yml`. Only merged, smoke-tested
  builds are ever published.

## Checking / troubleshooting

- **Which version is he on?** The bottom of the Admin page shows `Version build-N`.
- **Logs:** `%LOCALAPPDATA%\HerrleDashboard\logs\app.log` (updates, restarts, errors).
- **Not running?** Sign out and back in, or double-click
  `%LOCALAPPDATA%\HerrleDashboard\app\HerrleDashboard.exe`.
- **Nothing at herrle.internal:** check the hosts entry and
  `netsh interface portproxy show all`.
- **Port 80 in use** (IIS / another app): free port 80, or browse to
  `http://herrle.internal:3000`.
- **Uninstall:** from an admin prompt:
  ```bat
  reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v HerrleDashboard /f
  taskkill /f /im HerrleDashboard.exe
  netsh interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1
  rmdir /s /q "%LOCALAPPDATA%\HerrleDashboard\app"
  ```
  Then remove the `herrle.internal` line from `C:\Windows\System32\drivers\etc\hosts`.
  Settings and findings live in `%LOCALAPPDATA%\HerrleDashboard`; credentials
  are in Credential Manager under `herrle-dashboard`.

## Building a release locally (developers)

```bash
npm run build
node scripts/package-release.mjs local-1   # → dist/herrle-dashboard-win-x64.zip (+ .sha256)
```
