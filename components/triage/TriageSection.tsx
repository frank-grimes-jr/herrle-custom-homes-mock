import type { DigestItem, DigestSection, Sentiment, Urgency } from "@/lib/triage/types";
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

function Item({ item }: { item: DigestItem }) {
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
          <Item key={it.emailId} item={it} />
        ))}
      </ul>
    </SectionCard>
  );
}
