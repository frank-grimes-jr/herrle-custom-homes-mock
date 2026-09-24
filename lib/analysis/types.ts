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
