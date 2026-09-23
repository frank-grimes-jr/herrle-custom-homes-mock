// Local setup for Dave's Windows laptop. Run elevated — via install.cmd, or:
//   node scripts/setup-local.mjs
// PowerShell-free on purpose: Node isn't affected by the ExecutionPolicy that
// blocks .ps1 scripts on locked-down machines. Sets the hostname, the port-80
// proxy, does the first build, vaults the Anthropic key, and registers the
// auto-start / auto-update scheduled tasks. Needs admin (hosts + portproxy).
import { execSync, execFileSync } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HOST = "herrle.internal"; // change if you like; avoid .local (mDNS)
const PORT = 3000;
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

function requireAdmin() {
  try {
    execSync("net session", { stdio: "ignore" });
  } catch {
    console.error('\nRun as administrator: right-click install.cmd > "Run as administrator".');
    process.exit(1);
  }
}

// Read a secret without echoing it. Set HERRLE_ANTHROPIC_KEY to skip the prompt.
function askHidden(query) {
  if (process.env.HERRLE_ANTHROPIC_KEY !== undefined) {
    return Promise.resolve(process.env.HERRLE_ANTHROPIC_KEY.trim());
  }
  return new Promise((resolve) => {
    process.stdout.write(query);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = () => {}; // mute the echo
    rl.question("", (a) => {
      rl.close();
      process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

requireAdmin();
console.log(`Setting up Herrle Dashboard in ${REPO}\n`);

// 1. Hostname -> loopback, so the URL isn't "localhost".
const hostsFile = join(process.env.SystemRoot, "System32", "drivers", "etc", "hosts");
const hasHost = readFileSync(hostsFile, "utf8")
  .split(/\r?\n/)
  .some((line) => line.trim() && !line.trim().startsWith("#") && line.split(/\s+/).includes(HOST));
if (hasHost) {
  console.log("  = hosts entry already present");
} else {
  appendFileSync(hostsFile, `\r\n127.0.0.1\t${HOST}\r\n`);
  console.log(`  + hosts: ${HOST} -> 127.0.0.1`);
}

// 2. Port 80 -> app (loopback only), so the URL drops the port and Node stays unprivileged.
try {
  execSync("netsh interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1", { stdio: "ignore" });
} catch {
  /* nothing to delete */
}
sh(`netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=${PORT} connectaddress=127.0.0.1`);
console.log(`  + portproxy: 127.0.0.1:80 -> 127.0.0.1:${PORT}`);

// 3. First build.
console.log("\nInstalling and building (first run)...");
sh("npm ci", { cwd: REPO });
sh("npm run build", { cwd: REPO });

// 4. Anthropic key -> OS vault (optional; the sample inbox renders without it).
const ak = await askHidden("Anthropic API key (blank to skip): ");
if (ak) {
  execFileSync(
    NODE,
    ["-e", "new (require('@napi-rs/keyring').Entry)('herrle-dashboard','anthropic_api_key').setPassword(process.env.__AK)"],
    { cwd: REPO, env: { ...process.env, __AK: ak }, stdio: "inherit" },
  );
  console.log("  + Anthropic key stored in the OS vault");
}

// 5. Auto-start + auto-update tasks (schtasks, not PowerShell). Both run as the
//    logged-in user, unprivileged, and just call the idempotent updater.
const tr = `"${NODE}" "${join(REPO, "scripts", "update.mjs")}"`;
const tasks = [
  ["Herrle Dashboard Start", ["/sc", "onlogon"]],
  ["Herrle Dashboard Update", ["/sc", "minute", "/mo", "5"]],
];
for (const [name, sched] of tasks) {
  execFileSync("schtasks", ["/create", "/tn", name, "/tr", tr, ...sched, "/rl", "limited", "/f"], { stdio: "inherit" });
}
console.log("  + scheduled tasks registered (start at logon + update every 5 min)");

console.log(`\nDone. Open http://${HOST}`);
console.log("QuickBooks OAuth redirect (register it): http://localhost:" + PORT + "/api/integrations/quickbooks/callback\n");
sh(`"${NODE}" "${join(REPO, "scripts", "update.mjs")}"`, { cwd: REPO }); // start it now
