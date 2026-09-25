// Assembles the self-contained Windows release that Dave's laptop installs:
// the Next standalone server + static assets + this node.exe + the supervisor
// and the hidden launcher. Run on Windows after `npm run build` (CI does this
// in .github/workflows/release.yml):
//   node scripts/package-release.mjs <version>
// Output: dist/herrle-dashboard-win-x64.zip (+ .sha256).
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

const version = process.argv[2] ?? "";
if (!/^\w[\w.-]*$/.test(version)) throw new Error("usage: node scripts/package-release.mjs <version>");

const WIN = process.env.SystemRoot ?? "C:\\Windows";
const out = join("dist", "herrle-dashboard");
const zip = join("dist", "herrle-dashboard-win-x64.zip");

rmSync("dist", { recursive: true, force: true });
cpSync(join(".next", "standalone"), out, { recursive: true });
cpSync(join(".next", "static"), join(out, ".next", "static"), { recursive: true }); // standalone omits these
cpSync("public", join(out, "public"), { recursive: true });
cpSync(process.execPath, join(out, "node.exe")); // same Node that built + tested it
cpSync(join("scripts", "supervisor.mjs"), join(out, "supervisor.mjs"));
writeFileSync(join(out, "version.txt"), version);

// .NET Framework's compiler ships with Windows — no SDK needed.
execFileSync(
  join(WIN, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
  ["/nologo", "/target:winexe", `/out:${join(out, "HerrleDashboard.exe")}`, join("scripts", "launcher.cs")],
  { stdio: "inherit" },
);

// Windows' bsdtar writes zip with -a (Git's GNU tar can't — hence the full path).
execFileSync(join(WIN, "System32", "tar.exe"), ["-a", "-c", "-f", zip, "-C", out, "."], { stdio: "inherit" });
writeFileSync(`${zip}.sha256`, `${createHash("sha256").update(readFileSync(zip)).digest("hex")}\n`);
console.log(`packaged ${version} -> ${zip}`);
