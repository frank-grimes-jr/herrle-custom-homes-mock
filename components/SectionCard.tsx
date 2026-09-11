import type { ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  right,
  className = "",
  children,
}: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-oak">{eyebrow}</p>
          )}
          <h2 className="font-serif text-xl text-ink">{title}</h2>
        </div>
        {right && <div className="text-sm text-muted">{right}</div>}
      </div>
      {children}
    </section>
  );
}
