// lib/settings.ts
// Non-secret analysis settings (model, prompt, caps). Stored as JSON in a
// user-data dir OUTSIDE the repo so the git auto-update never clobbers edits.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type AnalysisSettings = {
  reasonModel: string;
  enrichModel: string;
  systemPrompt: string;
  windowDays: number;
  maxThreads: number;
  maxTokens: number;
};

export const DEFAULT_SETTINGS: AnalysisSettings = {
  reasonModel: "claude-opus-4-8",
  enrichModel: "claude-haiku-4-5",
  windowDays: 30,
  maxThreads: 40,
  maxTokens: 8000,
  systemPrompt: `You are Dave Herrle's chief of staff at Herrle Custom Homes, a small high-craft custom home builder. You are given recent email threads (inbox + sent), each already tagged with a type, the project/client it concerns, and a sentiment. Find the few things Dave genuinely would not catch on his own. Focus on:
- Dropped commitments: promises Dave made in SENT mail ("I'll send that Friday") with no visible follow-through.
- Cooling relationships: a client whose tone is trending negative or who has gone quiet.
- Unbilled scope: threads where added or changed work is discussed — flag for Dave to confirm a change order exists.
Be strict: silence is fine. Only surface what a sharp right hand would raise. Every finding MUST cite the specific thread/message ids it is based on; never invent evidence.`,
};

export function dataDir(): string {
  const base =
    process.env.HERRLE_DATA_DIR ??
    join(process.env.LOCALAPPDATA ?? process.env.HOME ?? ".", "HerrleDashboard");
  mkdirSync(base, { recursive: true });
  return base;
}

function file(): string {
  return join(dataDir(), "analysis-settings.json");
}

export function getAnalysisSettings(): AnalysisSettings {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Partial<AnalysisSettings>;
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAnalysisSettings(patch: Partial<AnalysisSettings>): AnalysisSettings {
  const next = { ...getAnalysisSettings(), ...patch };
  writeFileSync(file(), JSON.stringify(next, null, 2));
  return next;
}
