import type { Financials } from "@/lib/data/types";
import { fmtUSD, fmtPct, fmtDelta, runwayMonths } from "@/lib/format";
import { SectionCard } from "./SectionCard";
import { StatTile } from "./StatTile";
import TrendArea from "./TrendArea";

export function FinancialsSection({ f }: { f: Financials }) {
  const delta = fmtDelta(f.revenueYTD, f.revenuePriorYTD);
  const runway = runwayMonths(f.cashOnHand, f.monthlyBurn);
  const arRows: { label: string; value: number; over?: boolean }[] = [
    { label: "Current", value: f.ar.current },
    { label: "31–60", value: f.ar.d31_60 },
    { label: "61–90", value: f.ar.d61_90 },
    { label: "90+", value: f.ar.over90, over: true },
  ];
  const arTotal = f.ar.current + f.ar.d31_60 + f.ar.d61_90 + f.ar.over90;

  return (
    <SectionCard title="Financial health" right={`${fmtPct(f.grossMarginPct, 1)} gross margin`}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Revenue YTD" value={fmtUSD(f.revenueYTD, true)} delta={delta} sub="vs. same period last year" />
        <StatTile
          label="Gross margin"
          value={fmtPct(f.grossMarginPct, 1)}
          sub={`${f.targetMarginPct}% target`}
          accent={f.targetMarginPct - f.grossMarginPct >= 5 ? "text-amber" : "text-ink"}
        />
        <StatTile
          label="Cash on hand"
          value={fmtUSD(f.cashOnHand, true)}
          sub={`~${runway.toFixed(1)} mo runway`}
          accent={runway < 3 ? "text-amber" : "text-ink"}
          href="/cash"
        />
        <StatTile label="Backlog" value={fmtUSD(f.backlog, true)} sub="contracted future work" accent="text-primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted">Revenue · trailing 12 months</p>
          <TrendArea data={f.revenueTrend} color="var(--primary)" height={72} valueFormat="usd" />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">
            Receivables aging · {fmtUSD(arTotal, true)} outstanding
          </p>
          <ul className="space-y-1.5">
            {arRows.map((r) => (
              <li key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-muted">{r.label} days</span>
                <span className={r.over && r.value > 0 ? "font-medium text-terracotta" : "text-ink"}>
                  {fmtUSD(r.value, true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
