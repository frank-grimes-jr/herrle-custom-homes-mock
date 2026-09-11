import type { Digest } from "@/lib/triage/types";

function SourceBadge({ source }: { source: Digest["source"] }) {
  if (source === "claude") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-sage">
        <span className="h-2 w-2 rounded-full bg-sage" />
        Written by Claude
      </span>
    );
  }
  return (
    <span className="text-xs text-muted">Sample brief · add an API key for live AI</span>
  );
}

export function BriefHeader({ digest }: { digest: Digest }) {
  const chip = "rounded-full border border-line bg-surface-2/50 px-3 py-1";
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-oak">
          Your {digest.period} brief
        </p>
        <SourceBadge source={digest.source} />
      </div>
      <p className="font-serif text-xl leading-relaxed text-ink md:text-2xl md:leading-relaxed">
        {digest.headline}
      </p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <span className={chip}>{digest.counts.total} emails</span>
        <span className={`${chip} text-primary`}>{digest.counts.needsYou} need you</span>
        {digest.counts.flagged > 0 && (
          <span className={`${chip} text-terracotta`}>{digest.counts.flagged} sentiment flag{digest.counts.flagged > 1 ? "s" : ""}</span>
        )}
      </div>
    </section>
  );
}
