// Claude through Dave's own Claude Code sign-in — no API key anywhere.
// Runs the installed `claude` CLI headless (`claude -p`) as a plain completion:
// no tools, no MCP, no hooks/plugins, no saved session, from an empty folder so
// there's nothing to auto-discover. The prompt goes over stdin (no shell, no
// command-line length limit) and the child gets no window.
// Node-testable module: no "server-only", relative .ts imports.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dataDir } from "./settings.ts";

export const SIGN_IN_HINT = "Open Claude Code on this computer and sign in, then try again.";

// The native installer's .exe first (runs without a shell), else whatever is on PATH.
function claudeBin(): string {
  const native = join(homedir(), ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude");
  return existsSync(native) ? native : "claude";
}

// Pure: the answer from `--output-format json`, or a readable error.
export function resultText(stdout: string): string {
  let out: { is_error?: boolean; result?: unknown; api_error_status?: number };
  try {
    out = JSON.parse(stdout);
  } catch {
    throw new Error(`unexpected output from claude: ${stdout.slice(0, 200)}`);
  }
  if (out.api_error_status === 401 || (out.is_error && /authenticat|log ?in/i.test(String(out.result)))) {
    throw new Error(SIGN_IN_HINT);
  }
  if (out.is_error || typeof out.result !== "string") throw new Error(`claude: ${String(out.result ?? "no result")}`);
  return out.result;
}

export function askClaude(opts: {
  model: string;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<string> {
  const cwd = join(dataDir(), "claude-workdir");
  mkdirSync(cwd, { recursive: true });
  const args = [
    "-p",
    "--output-format", "json",
    "--model", opts.model,
    "--system-prompt", opts.system,
    "--tools", "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--setting-sources", "project", // skips user hooks/plugins; the empty cwd has no project settings
  ];
  if (opts.effort) args.push("--effort", opts.effort);

  return new Promise((resolve, reject) => {
    const child = execFile(
      claudeBin(),
      args,
      { cwd, windowsHide: true, timeout: opts.timeoutMs ?? 300_000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (stdout) {
          try {
            return resolve(resultText(stdout));
          } catch (e) {
            return reject(e);
          }
        }
        const code = (err as NodeJS.ErrnoException | null)?.code;
        reject(new Error(code === "ENOENT" ? SIGN_IN_HINT : `claude failed: ${stderr || err?.message}`));
      },
    );
    child.stdin?.end(opts.prompt);
  });
}
