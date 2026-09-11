// Email-triage types. An Email is what a raw Gmail fetch would give us; the
// Digest is the "intelligent brain" output (narrative + prioritized buckets).

export type Period = "morning" | "afternoon" | "evening";
export type Sentiment = "positive" | "neutral" | "negative";
export type Urgency = "high" | "medium" | "low";
export type EmailRole =
  | "client"
  | "subcontractor"
  | "vendor"
  | "lead"
  | "authority"
  | "architect"
  | "internal"
  | "personal";

// Bucket: one email lands in exactly one. needs_you = action/decision/reply;
// sentiment = notable tone worth awareness; fyi = informational / handled-able.
export type Bucket = "needs_you" | "sentiment" | "fyi";

export type Email = {
  id: string;
  from: string;
  role: EmailRole;
  subject: string;
  body: string;
  receivedAt: string; // ISO
  project?: string;
};

export type DigestItem = {
  emailId: string;
  from: string;
  subject: string;
  sentiment: Sentiment;
  urgency: Urgency;
  summary: string; // one-line interpretation, not a subject echo
  suggestedAction?: string;
  project?: string;
};

export type DigestSection = {
  key: Bucket;
  title: string;
  items: DigestItem[];
};

export type Digest = {
  period: Period;
  generatedAt: string;
  source: "claude" | "sample"; // which brain wrote it
  headline: string; // the narrative brief
  counts: { total: number; needsYou: number; flagged: number };
  sections: DigestSection[];
};

export const SECTION_TITLES: Record<Bucket, string> = {
  needs_you: "Needs you",
  sentiment: "Worth a read",
  fyi: "FYI / handled",
};
