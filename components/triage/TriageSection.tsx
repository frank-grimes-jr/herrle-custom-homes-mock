"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Bucket, DigestItem, DigestSection, Sentiment, Urgency } from "@/lib/triage/types";
import { SectionCard } from "../SectionCard";

const SENT: Record<Sentiment, { label: string; cls: string }> = {
  positive: { label: "Positive", cls: "text-sage" },
  neutral: { label: "Neutral", cls: "text-muted" },
  negative: { label: "Negative", cls: "text-terracotta" },
};
const URG: Record<Urgency, { label: string; cls: string }> = {
  high: { label: "Urgent", cls: "text-terracotta" },
  medium: { label: "Soon", cls: "text-amber" },
  low: { label: "Low", cls: "text-muted" },
};

const displayName = (from: string) => from.split(" <")[0];

type Vote = "up" | "down";

// Dave's verdict on one call. Down-votes teach the next brief what to leave out.
function Rate({ item, bucket }: { item: DigestItem; bucket: Bucket }) {
  const [vote, setVote] = useState<Vote | null>(null);
  const send = async (v: Vote) => {
    setVote(v);
    const res = await fetch("/api/triage/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emailId: item.emailId, from: item.from, subject: item.subject, bucket, vote: v }),
    }).catch(() => null);
    if (!res?.ok) setVote(null);
  };
  const btn = (v: Vote, label: string, Icon: typeof ThumbsUp) => (
    <button
      type="button"
      onClick={() => send(v)}
      aria-label={label}
      aria-pressed={vote === v}
      title={label}
      className={`rounded p-1 hover:bg-line/40 ${vote === v ? "text-ink" : "text-muted/50"}`}
    >
      <Icon size={13} />
    </button>
  );
  return (
    <span className="flex items-center">
      {btn("up", "Good call", ThumbsUp)}
      {btn("down", "Shouldn't be here", ThumbsDown)}
    </span>
  );
}

function Item({ item, bucket }: { item: DigestItem; bucket: Bucket }) {
  return (
    <li className="border-b border-line/60 py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{item.summary}</p>
          <p className="truncate text-xs text-muted">
            {displayName(item.from)}
            {item.project ? ` · ${item.project}` : ""} — “{item.subject}”
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
          <span className={SENT[item.sentiment].cls}>{SENT[item.sentiment].label}</span>
          <span className="text-muted/40">·</span>
          <span className={URG[item.urgency].cls}>{URG[item.urgency].label}</span>
          <Rate item={item} bucket={bucket} />
        </div>
      </div>
      {item.suggestedAction && (
        <p className="mt-1.5 flex gap-1.5 text-sm text-primary">
          <span aria-hidden>→</span>
          <span>{item.suggestedAction}</span>
        </p>
      )}
    </li>
  );
}

export function TriageSection({ section }: { section: DigestSection }) {
  return (
    <SectionCard title={section.title} right={`${section.items.length}`}>
      <ul>
        {section.items.map((it) => (
          <Item key={it.emailId} item={it} bucket={section.key} />
        ))}
      </ul>
    </SectionCard>
  );
}
