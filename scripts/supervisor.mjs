// Runs Dave's dashboard and keeps it current — the only process on the laptop.
// HerrleDashboard.exe (scripts/launcher.cs) starts it hidden, from
// %LOCALAPPDATA%\HerrleDashboard\app\<version>\, at sign-in and whenever it exits.
//
// It serves the prebuilt Next app in-process and checks GitHub Releases every
// 30 min. When CI has published a newer build it downloads it, verifies the
// checksum, unpacks it beside this version, points current.txt at it and exits
// 0; the launcher then starts the new version. No git, npm, builds or console
// windows on the laptop. Roll back by deleting the bad release on GitHub —
// "latest" then differs from what's installed, so the previous build comes back.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ASSET = "herrle-dashboard-win-x64.zip";

// Pure: the release to install, or null when there's nothing new/usable.
// The tag becomes a folder name, so it must be a plain name (no "..", no slashes).
export function pickUpdate(release, current) {
  const tag = release?.tag_name;
  if (typeof tag !== "string" || !/^\w[\w.-]*$/.test(tag) || tag === current) return null;
  const find = (name) => (Array.isArray(release.assets) ? release.assets.find((a) => a?.name === name) : undefined);
  const zip = find(ASSET);
  const sum = find(`${ASSET}.sha256`);
  return zip?.url && sum?.url ? { tag, zip, sum } : null;
}

const HERE = dirname(fileURLToPath(import.meta.url)); // app\<version>
const APP = dirname(HERE); // app\ — holds current.txt, the launcher and each version
const PORT = Number(process.env.HERRLE_PORT) || 3000; // the portproxy (80 -> 3000) expects 3000
const CHECK_EVERY = 30 * 60_000;
const RELEASES =
  process.env.HERRLE_RELEASES_API ??
  "https://api.github.com/repos/frank-grimes-jr/herrle-custom-homes-mock/releases/latest";
const DATA = process.env.HERRLE_DATA_DIR ?? join(process.env.LOCALAPPDATA ?? HERE, "HerrleDashboard");
const LOG = join(DATA, "logs", "app.log");

const log = (...a) => console.log(new Date().toISOString(), "[supervisor]", ...a);

// No console exists, so send everything (ours and Next's) to a log file.
function logToFile() {
  mkdirSync(dirname(LOG), { recursive: true });
  try {
    if (statSync(LOG).size > 5e6) renameSync(LOG, `${LOG}.1`); // ponytail: one rollover, plenty for one user
  } catch {
    /* no log yet */
  }
  const write = (chunk, enc, cb) => {
    try {
      appendFileSync(LOG, chunk);
    } catch {
      /* never let logging take the app down */
    }
    (typeof enc === "function" ? enc : cb)?.();
    return true;
  };
  process.stdout.write = process.stderr.write = write;
}

const portFree = (port) =>
  new Promise((resolve) => {
    const s = createServer()
      .once("error", () => resolve(false))
      .listen(port, "127.0.0.1", () => s.close(() => resolve(true)));
  });

const get = async (url, accept, ms) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "herrle-dashboard", Accept: accept },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res;
};

function prune(keep) {
  for (const d of readdirSync(APP, { withFileTypes: true })) {
    if (!d.isDirectory() || keep.includes(d.name) || !existsSync(join(APP, d.name, "version.txt"))) continue;
    try {
      rmSync(join(APP, d.name), { recursive: true, force: true });
    } catch {
      /* in use — next update retries */
    }
  }
}

async function checkForUpdate(current) {
  const release = await (await get(RELEASES, "application/vnd.github+json", 30_000)).json();
  const u = pickUpdate(release, current);
  if (!u) return;
  log(`update ${current} -> ${u.tag}`);

  // Asset API urls + octet-stream: works for public repos and follows GitHub's redirect.
  const zip = Buffer.from(await (await get(u.zip.url, "application/octet-stream", 600_000)).arrayBuffer());
  const want = (await (await get(u.sum.url, "application/octet-stream", 30_000)).text()).trim().split(/\s+/)[0];
  if (createHash("sha256").update(zip).digest("hex") !== want?.toLowerCase()) throw new Error("checksum mismatch");

  const staging = join(APP, "_staging");
  const zipPath = join(APP, "_download.zip");
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging);
  writeFileSync(zipPath, zip);
  // Windows' own bsdtar (reads zip); by full path so a Git-for-Windows tar on PATH can't shadow it.
  execFileSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), ["-xf", zipPath, "-C", staging], {
    windowsHide: true,
  });
  rmSync(zipPath);
  if (!existsSync(join(staging, "node.exe")) || !existsSync(join(staging, "supervisor.mjs"))) {
    throw new Error("release is missing node.exe/supervisor.mjs");
  }

  const target = join(APP, u.tag);
  rmSync(target, { recursive: true, force: true });
  renameSync(staging, target);
  writeFileSync(join(APP, "current.txt"), u.tag);
  prune([u.tag, current]); // keep the new build and this one (still running)
  log(`installed ${u.tag}; restarting`);
  process.exit(0); // the launcher starts current.txt's version
}

if (import.meta.main) {
  const version = basename(HERE); // the folder current.txt names — the one source of truth
  logToFile();
  process.on("exit", (code) => log(`exit ${code}`));

  // A second copy (or anything else on 3000) → exit 3 so the launcher stops retrying.
  if (!(await portFree(PORT))) {
    log(`port ${PORT} is busy — not starting`);
    process.exit(3);
  }

  let checking = false;
  const check = async () => {
    if (checking) return;
    checking = true;
    await checkForUpdate(version).catch((e) => log("update check failed:", e.message));
    checking = false;
  };
  setTimeout(check, 15_000); // let the server come up first
  setInterval(check, CHECK_EVERY);

  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1"; // loopback only — never reachable from the network
  process.env.HERRLE_VERSION = version;
  log(`starting ${version}`);
  await import("./server.js");
}
