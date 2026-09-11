import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  sub,
  delta,
  accent = "text-ink",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { text: string; up: boolean };
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`font-serif text-2xl leading-none ${accent}`}>{value}</p>
        {delta && (
          <span className={`text-xs font-medium ${delta.up ? "text-sage" : "text-terracotta"}`}>
            {delta.up ? "▲" : "▼"} {delta.text}
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
