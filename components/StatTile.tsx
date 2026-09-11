import Link from "next/link";
import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  sub,
  delta,
  accent = "text-ink",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { text: string; up: boolean };
  accent?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
        {href && (
          <span className="ml-1 inline-block text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
            →
          </span>
        )}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`font-serif text-2xl leading-none ${accent}`}>{value}</p>
        {delta && (
          <span className={`text-xs font-medium ${delta.up ? "text-sage" : "text-terracotta"}`}>
            {delta.up ? "▲" : "▼"} {delta.text}
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = "block rounded-xl border border-line bg-surface-2/40 p-4";
  return href ? (
    <Link href={href} className={`group ${cls} transition-colors hover:bg-surface-2/70`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
