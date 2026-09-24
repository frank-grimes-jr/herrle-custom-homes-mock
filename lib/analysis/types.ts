// lib/analysis/types.ts
export type Provenance = { id: string; label: string };

export type Finding = {
  id: string;
  signature: string; // stable across runs → dismissals stick
  severity: "escalate" | "watch";
  domain: string;
  title: string;
  detail: string;
  href?: string;
  confidence: "high" | "medium";
  provenance: Provenance[];
};

export type RawMessage = {
  id: string;
  threadKey: string;
  folder: "inbox" | "sent";
  from: string;
  subject: string;
  date: string; // ISO
  body: string;
};

export type ThreadSummary = {
  threadId: string;
  subject: string;
  participants: string[];
  turns: { id: string; from: string; date: string; text: string }[];
};
