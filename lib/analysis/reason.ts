// lib/analysis/reason.ts
// Node-testable module: no "server-only", relative .ts imports (see Global Constraints).
import { askClaude } from "../claude.ts";
import { getAnalysisSettings } from "../settings.ts";
import { validateFindings } from "../signals.ts";
import type { EnrichedThread, Finding } from "./types.ts";

export function bundleIds(threads: EnrichedThread[]): Set<string> {
  const ids = new Set<string>();
  for (const t of threads) for (const turn of t.turns) ids.add(turn.id);
  return ids;
}

export function buildUserPrompt(threads: EnrichedThread[]): string {
  const rows = threads.map((t) => ({
    threadId: t.threadId,
    subject: t.subject,
    type: t.type,
    entity: t.entity,
    sentiment: t.sentiment,
    messages: t.turns.map((x) => ({ id: x.id, from: x.from, date: x.date, text: x.text })),
  }));
  return `Here are the salient email threads. Cite message "id" values as provenance.\n\n${JSON.stringify(rows, null, 2)}\n\nReturn ONLY JSON: {"findings":[{"severity":"escalate|watch","domain","title","detail","confidence":"high|medium","provenance":[{"id","label"}]}]}. If nothing warrants Dave's attention, return {"findings":[]}.`;
}

export async function reason(threads: EnrichedThread[]): Promise<Finding[]> {
  const salient = threads.filter((t) => t.salient);
  if (salient.length === 0) return [];
  const { reasonModel, systemPrompt } = getAnalysisSettings();
  const text = await askClaude({
    model: reasonModel,
    system: systemPrompt,
    prompt: buildUserPrompt(salient),
    effort: "high", // explicit: 5.5 defaults to medium
  });
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const parsed = start >= 0 && end >= 0 ? JSON.parse(text.slice(start, end + 1)) : { findings: [] };
  return validateFindings(parsed, bundleIds(salient));
}
