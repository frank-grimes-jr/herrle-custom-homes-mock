"use client";

import { useState } from "react";
import type { Digest, Period } from "@/lib/triage/types";
import { PeriodTabs } from "./PeriodTabs";
import { BriefHeader } from "./BriefHeader";
import { TriageSection } from "./TriageSection";

// All three briefs are built at render/build time and switched client-side —
// no server round-trip, so it works on the static (GitHub Pages) build.
export function TriageBoard({ digests }: { digests: Record<Period, Digest> }) {
  const [period, setPeriod] = useState<Period>("morning");
  const digest = digests[period];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Daily briefs</p>
        <PeriodTabs active={period} onSelect={setPeriod} />
      </div>

      <div className="space-y-5">
        <BriefHeader digest={digest} />
        <div className="grid gap-5">
          {digest.sections.map((s) => (
            <TriageSection key={s.key} section={s} />
          ))}
        </div>
      </div>
    </>
  );
}
