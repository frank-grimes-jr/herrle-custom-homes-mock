// lib/analysis/enrich.ts
// Node-testable module: no "server-only", relative .ts imports (see Global Constraints).
import { askClaude, SIGN_IN_HINT } from "../claude.ts";
import { getAnalysisSettings } from "../settings.ts";
import type { ThreadSummary, EnrichedThread } from "./types.ts";

type Row = { threadId?: string; type?: unknown; entity?: unknown; sentiment?: unknown; salient?: unknown };

// Pure: merge model rows onto threads, coercing to safe values.
export function applyEnrichment(threads: ThreadSummary[], raw: unknown): EnrichedThread[] {
  const rows = Array.isArray((raw as { threads?: unknown })?.threads) ? ((raw as { threads: Row[] }).threads) : [];
  const byId = new Map(rows.map((r) => [String(r.threadId), r]));
  const sentiments = ["positive", "neutral", "negative"] as const;
  return threads.map((t) => {
    const r = byId.get(t.threadId);
    const sentiment = sentiments.includes(r?.sentiment as never) ? (r!.sentiment as EnrichedThread["sentiment"]) : "neutral";
    return {
      ...t,
      type: typeof r?.type === "string" ? r.type : "other",
      entity: typeof r?.entity === "string" && r.entity ? r.entity : null,
      sentiment,
      salient: r?.salient === true,
    };
  });
}

const SYSTEM = `Classify email threads for a custom home builder. For each thread return type (one of: commitment, question, scope_change, complaint, fyi, other), entity (the project or client name it concerns, or null), sentiment (positive|neutral|negative), and salient (true only if it likely needs the owner's attention). Return ONLY JSON of this shape: {"threads":[{"threadId":"<the thread id>","type":"scope_change","entity":"Blackledge","sentiment":"neutral","salient":true}]}.`;

function compact(threads: ThreadSummary[]) {
  return threads.map((t) => ({
    threadId: t.threadId,
    subject: t.subject,
    turns: t.turns.map((x) => ({ from: x.from, date: x.date, text: x.text.slice(0, 600) })),
  }));
}

export async function enrichThreads(threads: ThreadSummary[]): Promise<EnrichedThread[]> {
  if (threads.length === 0) return [];
  try {
    const text = await askClaude({
      model: getAnalysisSettings().enrichModel,
      system: SYSTEM,
      prompt: JSON.stringify(compact(threads)),
    });
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = start >= 0 && end >= 0 ? JSON.parse(text.slice(start, end + 1)) : { threads: [] };
    return applyEnrichment(threads, parsed);
  } catch (err) {
    // Signed out = nothing downstream can work; say so instead of "no findings".
    if (err instanceof Error && err.message === SIGN_IN_HINT) throw err;
    console.error("[analysis] enrichment failed; using neutral defaults:", err);
    return applyEnrichment(threads, { threads: [] });
  }
}
