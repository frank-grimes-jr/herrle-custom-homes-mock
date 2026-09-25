import "server-only";
import type { Bucket, Digest, DigestItem, Email, Period } from "./types";
import { SECTION_TITLES } from "./types";
import { fetchRecentEmails, isEmailConfigured } from "@/lib/email";
import { askClaude } from "@/lib/claude";
import { getAnalysisSettings } from "@/lib/settings";
import { address, lessons, loadVotes, mutedSenders } from "./feedback";

// Claude (via this computer's Claude Code sign-in) writes the digest; without
// it (or on any failure) the real inbox renders as a plain list. Successes are
// cached per period so reloads don't re-run it.
const cache = new Map<Period, Digest>();
// After a failure (signed out / not installed) skip Claude for a while so every
// page load doesn't wait on a call that will fail again.
let claudeDownUntil = 0;

// A vote changes what the next brief should look like, so rebuild on next load.
export function clearDigestCache(): void {
  cache.clear();
}

export async function getDigest(period: Period): Promise<Digest> {
  const cached = cache.get(period);
  if (cached) return cached;

  if (!isEmailConfigured()) return emptyDigest(period, "Email isn't connected yet — set it up in Admin.");

  // ponytail: all three briefs pull the same recent inbox and are flavored by the
  // per-period prompt. Add time-of-day windows later if the split matters.
  const votes = loadVotes();
  const muted = mutedSenders(votes);
  const emails = (await fetchRecentEmails()).filter((e) => !muted.has(address(e.from)));

  if (emails.length > 0 && Date.now() >= claudeDownUntil) {
    try {
      const digest = await generateWithClaude(period, emails, lessons(votes));
      cache.set(period, digest); // only cache real successes → transient errors can retry
      return digest;
    } catch (err) {
      claudeDownUntil = Date.now() + 10 * 60_000;
      console.error("[triage] Claude digest failed; falling back:", err);
    }
  }
  // No summarizer (or it failed): a plain list of the real inbox.
  return basicDigest(period, emails);
}

const SYSTEM = `You are the chief of staff for Dave Herrle, owner of Herrle Custom Homes, a small high-craft custom home builder on the Connecticut shoreline. You triage his inbox three times a day and brief him like a sharp, trusted right hand — not an inbox manager.

Your job is to INTERPRET, not list. Read the emails and tell Dave what actually matters: who needs him, who's unhappy, what decision is waiting, what can wait. Connect related threads (e.g. a client complaint and the vendor delay that caused it). Be direct and plain-spoken. Recommend a concrete next action wherever one is warranted.

LEAVE OUT anything Dave would not want to see: marketing, promotions, ads, newsletters, sales pitches, receipts, shipping notices, automated alerts, and personal mail unrelated to the business — unless it genuinely needs him (e.g. a failed payment, a permit or inspection notice). Leaving things out is expected; an empty brief is fine.

Sort every email you keep into exactly one bucket:
- "needs_you": needs Dave's action, decision, or reply.
- "sentiment": notable tone (especially a frustrated or worried client) he should be aware of, even if no action is strictly required.
- "fyi": informational or easily handled/delegated.

Return ONLY valid JSON (no markdown, no prose outside the JSON) in exactly this shape:
{
  "headline": "2-4 sentence narrative brief for this time of day — lead with what needs him most",
  "sections": [
    {
      "key": "needs_you" | "sentiment" | "fyi",
      "items": [
        {
          "emailId": "<the email id>",
          "sentiment": "positive" | "neutral" | "negative",
          "urgency": "high" | "medium" | "low",
          "summary": "one line interpreting the email — not the subject echoed back",
          "suggestedAction": "concrete next step (omit if genuinely none)"
        }
      ]
    }
  ]
}`;

function userPrompt(period: Period, emails: Email[]): string {
  return `Time of day: ${period}. Here are the emails since the last brief:\n\n${JSON.stringify(
    emails,
    null,
    2,
  )}\n\nWrite Dave's ${period} brief as JSON.`;
}

async function generateWithClaude(period: Period, emails: Email[], learned: string): Promise<Digest> {
  const text = await askClaude({
    model: getAnalysisSettings().reasonModel, // one model switch (Admin) for all of Claude's work
    system: SYSTEM + learned,
    prompt: userPrompt(period, emails),
    effort: "medium",
  });
  const parsed = extractJson(text.trim());
  return normalize(period, parsed, emails);
}

// Tolerate stray prose or ```json fences around the JSON object.
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

// Coerce model output into a Digest, backfilling from/subject/project from the
// source emails. Throws if the shape is unusable (→ caller falls back to a plain list).
function normalize(period: Period, raw: unknown, emails: Email[]): Digest {
  const data = raw as { headline?: unknown; sections?: unknown };
  if (typeof data.headline !== "string" || !Array.isArray(data.sections)) {
    throw new Error("model output missing headline/sections");
  }
  const byId = new Map(emails.map((e) => [e.id, e]));
  const order: Bucket[] = ["needs_you", "sentiment", "fyi"];

  const sections = order
    .map((key) => {
      const raw = (data.sections as Array<{ key?: string; items?: unknown }>).find((s) => s.key === key);
      const items: DigestItem[] = Array.isArray(raw?.items)
        ? (raw!.items as Array<Record<string, unknown>>)
            .map((it): DigestItem | null => {
              const src = byId.get(String(it.emailId));
              if (!src) return null;
              return {
                emailId: src.id,
                from: src.from,
                subject: src.subject,
                project: src.project,
                sentiment: coerce(it.sentiment, ["positive", "neutral", "negative"], "neutral"),
                urgency: coerce(it.urgency, ["high", "medium", "low"], "medium"),
                summary: typeof it.summary === "string" ? it.summary : src.subject,
                suggestedAction:
                  typeof it.suggestedAction === "string" && it.suggestedAction.trim()
                    ? it.suggestedAction
                    : undefined,
              };
            })
            .filter((x): x is DigestItem => x !== null)
        : [];
      return { key, title: SECTION_TITLES[key], items };
    })
    .filter((s) => s.items.length > 0);

  const all = sections.flatMap((s) => s.items);

  return {
    period,
    generatedAt: new Date().toISOString(),
    source: "claude",
    headline: data.headline,
    counts: {
      total: emails.length,
      needsYou: sections.find((s) => s.key === "needs_you")?.items.length ?? 0,
      flagged: all.filter((i) => i.sentiment === "negative").length,
    },
    sections,
  };
}

function coerce<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

// Plain, honest list of real emails when no summarizer is available — no
// interpretation, no invented urgency.
function basicDigest(period: Period, emails: Email[]): Digest {
  if (emails.length === 0) return emptyDigest(period, "Nothing new in the inbox.");
  const items: DigestItem[] = emails.map((e) => ({
    emailId: e.id,
    from: e.from,
    subject: e.subject,
    project: e.project,
    sentiment: "neutral",
    urgency: "low",
    summary: e.subject,
  }));
  return {
    period,
    generatedAt: new Date().toISOString(),
    source: "basic",
    headline: `Recent inbox — ${emails.length} message${emails.length === 1 ? "" : "s"}.`,
    counts: { total: emails.length, needsYou: 0, flagged: 0 },
    // Uninterpreted → never claim it needs Dave; it's just the (bulk-filtered) inbox.
    sections: items.length ? [{ key: "fyi", title: SECTION_TITLES.fyi, items }] : [],
  };
}

function emptyDigest(period: Period, headline: string): Digest {
  return {
    period,
    generatedAt: new Date().toISOString(),
    source: "basic",
    headline,
    counts: { total: 0, needsYou: 0, flagged: 0 },
    sections: [],
  };
}
