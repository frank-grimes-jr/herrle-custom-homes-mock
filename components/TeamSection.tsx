import type { Team } from "@/lib/data/types";
import { fmtPct } from "@/lib/format";
import { SectionCard } from "./SectionCard";
import { Bar } from "./Bar";
import TrendArea from "./TrendArea";

export function TeamSection({ team }: { team: Team }) {
  const avgUtil = Math.round(
    team.members.reduce((s, m) => s + m.utilizationPct, 0) / team.members.length,
  );

  return (
    <SectionCard
      title="Team"
      right={`${team.members.length} people · ${avgUtil}% avg utilization`}
    >
      <div className="mb-4 rounded-xl border border-line bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Software adoption</p>
          <p className="text-sm text-ink">
            <span className={team.claudeSeatsActive < team.claudeSeats ? "text-amber" : "text-sage"}>
              {team.claudeSeatsActive}
            </span>
            /{team.claudeSeats} seats active this week
          </p>
        </div>
        <div className="mt-2">
          <TrendArea data={team.claudeAdoptionTrend} color="var(--oak)" height={44} />
        </div>
      </div>

      <ul className="divide-y divide-line">
        {team.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{m.name}</p>
              <p className="text-xs text-muted">
                {m.role}
                {m.currentProject ? ` · ${m.currentProject}` : ""}
              </p>
            </div>
            <div className="w-20 shrink-0">
              <Bar pct={m.utilizationPct} color="var(--stone)" />
              <p className="mt-1 text-right text-[11px] text-muted">{fmtPct(m.utilizationPct)}</p>
            </div>
            <div className="w-16 shrink-0 text-right text-xs">
              {m.claudeSeat ? (
                <span className={m.claudeWeeklyMessages === 0 ? "text-amber" : "text-muted"}>
                  {m.claudeWeeklyMessages}/wk
                </span>
              ) : (
                <span className="text-muted/50">no seat</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
