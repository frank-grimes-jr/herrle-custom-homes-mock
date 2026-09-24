// lib/signals.ts
// Validates raw model output into grounded Findings and persists them + dismissals.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { dataDir } from "./settings.ts";
import type { Finding, Provenance } from "./analysis/types.ts";

export type SignalsState = { generatedAt: string; findings: Finding[]; dismissed: string[] };

function file(): string {
  return join(dataDir(), "signals.json");
}

function one<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function signature(title: string, prov: Provenance[]): string {
  const ids = prov.map((p) => p.id).sort().join(",");
  return createHash("sha256").update(`${title}|${ids}`).digest("hex").slice(0, 16);
}

// Keep only findings whose provenance ids are ALL present in the bundle.
export function validateFindings(raw: unknown, allowedIds: Set<string>): Finding[] {
  const list = Array.isArray((raw as { findings?: unknown })?.findings)
    ? ((raw as { findings: unknown[] }).findings)
    : [];
  const out: Finding[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue; // skip malformed row
    const f = item as Record<string, unknown>;
    const prov = Array.isArray(f.provenance)
      ? (f.provenance as unknown[])
          .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
          .map((p) => ({ id: String(p.id ?? ""), label: String(p.label ?? "") }))
          .filter((p) => p.id)
      : [];
    if (prov.length === 0 || !prov.every((p) => allowedIds.has(p.id))) continue; // grounding guard
    const title = typeof f.title === "string" ? f.title : "";
    if (!title) continue;
    out.push({
      id: randomUUID(),
      signature: signature(title, prov),
      severity: one(f.severity, ["escalate", "watch"], "watch"),
      domain: typeof f.domain === "string" ? f.domain : "general",
      title,
      detail: typeof f.detail === "string" ? f.detail : "",
      href: typeof f.href === "string" ? f.href : undefined,
      confidence: one(f.confidence, ["high", "medium"], "medium"),
      provenance: prov,
    });
  }
  return out;
}

export function loadSignals(): SignalsState {
  try {
    return JSON.parse(readFileSync(file(), "utf8")) as SignalsState;
  } catch {
    return { generatedAt: "", findings: [], dismissed: [] };
  }
}

export function saveFindings(findings: Finding[]): void {
  const prev = loadSignals();
  const state: SignalsState = { generatedAt: new Date().toISOString(), findings, dismissed: prev.dismissed };
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

export function dismiss(sig: string): void {
  const state = loadSignals();
  if (!state.dismissed.includes(sig)) state.dismissed.push(sig);
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

export function visibleFindings(): Finding[] {
  const state = loadSignals();
  const hidden = new Set(state.dismissed);
  return state.findings.filter((f) => !hidden.has(f.signature));
}
