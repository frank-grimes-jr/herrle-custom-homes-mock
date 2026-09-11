import type { Digest } from "@/lib/triage/types";

export function BriefHeader({ digest }: { digest: Digest }) {
  const chip = "rounded-full border border-line bg-surface-2/50 px-3 py-1";
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-oak">
        Your {digest.period} brief
      </p>
      <p className="font-serif text-xl leading-relaxed text-ink md:text-2xl md:leading-relaxed">
        {digest.headline}
      </p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <span className={chip}>{digest.counts.total} emails</span>
        <span className={`${chip} text-primary`}>{digest.counts.needsYou} need you</span>
        {digest.counts.flagged > 0 && (
          <span className={`${chip} text-terracotta`}>{digest.counts.flagged} flagged</span>
        )}
      </div>
    </section>
  );
}
