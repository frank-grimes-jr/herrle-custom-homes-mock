"use client";

import type { Period } from "@/lib/triage/types";

const TABS: { key: Period; label: string; time: string }[] = [
  { key: "morning", label: "Morning", time: "8 AM" },
  { key: "afternoon", label: "Afternoon", time: "1 PM" },
  { key: "evening", label: "Evening", time: "6 PM" },
];

export function PeriodTabs({
  active,
  onSelect,
}: {
  active: Period;
  onSelect: (p: Period) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
            active === t.key ? "bg-surface-2 font-medium text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t.label} <span className="text-muted/60">· {t.time}</span>
        </button>
      ))}
    </div>
  );
}
