// Auto-updater for Dave's laptop. Registered by scripts/setup-local.ps1 as a
// Task Scheduler task (At log on + repeat every 5 min). Each run pulls the latest
// GREEN commit from origin/main, rebuilds if anything changed, and keeps one
// `next start` process alive. Windows-only (matches the deployment).
//
// ponytail: no process manager (pm2) — Task Scheduler does the scheduling and a
// detached child is the daemon. Full rebuild on change = a few seconds of
// downtime; fine for a single-user cockpit. Upgrade path: skip the rebuild when
// the diff touches no build inputs.
import { execSync, spawn } from "node:child_process";

const ROOT = process.cwd();
const BRANCH = "main";
const PORT = 3000;

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

// Only land commits whose CI passed, so Dave never runs a broken build.
// Best-effort: if gh isn't installed/authed, don't block the update.
function commitIsGreen(sha) {
  try {
    return sh(`gh api repos/{owner}/{repo}/commits/${sha}/status --jq .state`) === "success";
  } catch {
    log("CI status unavailable — proceeding without the green-commit gate");
    return true;
  }
}

const lockHash = () => {
  try {
    return sh("git hash-object package-lock.json");
  } catch {
    return "";
  }
};

function serverUp() {
  try {
    sh(`powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:${PORT} -TimeoutSec 3|Out-Null;exit 0}catch{exit 1}"`);
    return true;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    const pids = sh(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
    );
    for (const pid of pids.split(/\s+/).filter(Boolean)) {
      try {
        sh(`taskkill /F /PID ${pid}`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function startServer() {
  log("starting server");
  const child = spawn("npm", ["run", "start"], { cwd: ROOT, detached: true, stdio: "ignore", shell: true });
  child.unref();
}

try {
  sh(`git fetch origin ${BRANCH}`);
  const local = sh("git rev-parse HEAD");
  const remote = sh(`git rev-parse origin/${BRANCH}`);
  if (local !== remote && commitIsGreen(remote)) {
    log(`updating ${local.slice(0, 7)} → ${remote.slice(0, 7)}`);
    const beforeLock = lockHash();
    sh(`git reset --hard origin/${BRANCH}`); // consumer mirror — no local commits to preserve
    if (lockHash() !== beforeLock) {
      log("deps changed — npm ci");
      sh("npm ci");
    }
    sh("npm run build");
    killPort(PORT); // stop the old server; the check below restarts it
  } else {
    log(local === remote ? "up to date" : "remote not green yet — skipping");
  }
} catch (err) {
  log("update error:", err.message);
}

if (!serverUp()) startServer();
