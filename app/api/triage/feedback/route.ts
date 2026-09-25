import "server-only";
import { recordVote } from "@/lib/triage/feedback";
import { clearDigestCache } from "@/lib/triage/digest";
import type { Bucket } from "@/lib/triage/types";

const BUCKETS: Bucket[] = ["needs_you", "sentiment", "fyi"];

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const vote = b.vote === "up" || b.vote === "down" ? b.vote : null;
  const bucket = BUCKETS.find((k) => k === b.bucket);
  if (!vote || !bucket || typeof b.emailId !== "string" || !b.emailId) {
    return Response.json({ error: "bad vote" }, { status: 400 });
  }
  recordVote({
    emailId: b.emailId.slice(0, 100),
    from: String(b.from ?? "").slice(0, 200),
    subject: String(b.subject ?? "").slice(0, 200),
    bucket,
    vote,
  });
  clearDigestCache();
  return Response.json({ ok: true });
}
