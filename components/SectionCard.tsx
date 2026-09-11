import type { ReactNode } from "react";

export function SectionCard({
  title,
  right,
  className = "",
  children,
}: {
  title: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        {right && <div className="text-sm text-muted">{right}</div>}
      </div>
      {children}
    </section>
  );
}
