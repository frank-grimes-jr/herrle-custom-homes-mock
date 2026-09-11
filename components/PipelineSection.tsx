import type { Pipeline } from "@/lib/data/types";
import { fmtUSD, fmtPct } from "@/lib/format";
import { SectionCard } from "./SectionCard";
import { StatTile } from "./StatTile";

const stageLabel: Record<Pipeline["opportunities"][number]["stage"], string> = {
  lead: "Lead",
  proposal: "Proposal",
  contract: "Contract",
};

export function PipelineSection({ p }: { p: Pipeline }) {
  const weighted = p.opportunities.reduce((s, o) => s + (o.estValue * o.probability) / 100, 0);

  return (
    <SectionCard title="Pipeline">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Signed YTD" value={p.signedYTD} sub={`${fmtUSD(p.signedValueYTD, true)} contracted`} />
        <StatTile label="Win rate" value={fmtPct(p.winRatePct)} sub="last 12 months" />
      </div>

      <div className="mt-4">
        <p className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted">
          <span>Open opportunities</span>
          <span className="normal-case tracking-normal">{fmtUSD(weighted, true)} weighted</span>
        </p>
        <ul className="divide-y divide-line">
          {p.opportunities.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{o.name}</p>
                <p className="text-xs text-muted">
                  {stageLabel[o.stage]} · {o.probability}% · {o.ageDays}d old
                </p>
              </div>
              <span className="shrink-0 text-sm text-ink">{fmtUSD(o.estValue, true)}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
