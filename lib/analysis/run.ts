import "server-only";
import { gatherEmail } from "./gather";
import { enrichThreads } from "./enrich";
import { reason } from "./reason";
import { saveFindings } from "@/lib/signals";

export async function runAnalysis(): Promise<{ threads: number; findings: number }> {
  const threads = await gatherEmail();
  const enriched = await enrichThreads(threads);
  const findings = await reason(enriched);
  saveFindings(findings);
  return { threads: threads.length, findings: findings.length };
}
