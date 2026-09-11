import Link from "next/link";
import type { MilestoneStatus, Project } from "@/lib/data/types";
import { fmtUSD, fmtDate, marginPct } from "@/lib/format";
import { scheduleMeta } from "@/lib/ui";
import { SectionCard } from "../SectionCard";
import { StatTile } from "../StatTile";
import { Bar } from "../Bar";

const msMeta: Record<MilestoneStatus, { label: string; text: string; dot: string }> = {
  done: { label: "Done", text: "text-muted", dot: "bg-stone" },
  upcoming: { label: "Upcoming", text: "text-ink", dot: "bg-primary" },
  at_risk: { label: "At risk", text: "text-amber", dot: "bg-amber" },
  late: { label: "Late", text: "text-terracotta", dot: "bg-terracotta" },
};

const coMeta: Record<Project["changeOrders"][number]["status"], { label: string; text: string }> = {
  approved: { label: "Approved", text: "text-sage" },
  pending: { label: "Pending", text: "text-amber" },
  overdue: { label: "Overdue", text: "text-terracotta" },
};

export function ProjectDetail({ project: p }: { project: Project }) {
  const sched = scheduleMeta[p.schedule];
  const plannedMargin = marginPct(p.contractValue, p.budget);
  const projectedMargin = marginPct(p.contractValue, p.forecastCost);
  const projectedProfit = p.contractValue - p.forecastCost;
  const fade = plannedMargin - projectedMargin;
  const profitAccent = fade >= 6 ? "text-terracotta" : fade >= 3 ? "text-amber" : "text-ink";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-ink">{p.name}</h1>
            <p className="text-sm text-muted">
              {p.client} · {p.location}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 text-sm ${sched.text}`}>
              <span className={`h-2 w-2 rounded-full ${sched.dot}`} />
              {sched.label}
            </span>
            <p className="text-xs text-muted">
              {p.percentComplete}% complete · target {fmtDate(p.targetCompletion)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Money */}
        <SectionCard title="Money" right={`${projectedMargin.toFixed(0)}% projected margin`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Contract" value={fmtUSD(p.contractValue, true)} />
            <StatTile
              label="Projected profit"
              value={fmtUSD(projectedProfit, true)}
              accent={profitAccent}
              sub={`${projectedMargin.toFixed(0)}% · planned ${plannedMargin.toFixed(0)}%`}
            />
            <StatTile label="Spent to date" value={fmtUSD(p.spent, true)} sub={`of ${fmtUSD(p.forecastCost, true)} forecast`} />
            <StatTile label="Cost budget" value={fmtUSD(p.budget, true)} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Spent vs. forecast vs. budget</span>
            </div>
            <Bar pct={(p.spent / p.forecastCost) * 100} color={p.forecastCost > p.budget ? "var(--terracotta)" : "var(--primary)"} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">Change orders</p>
            {p.changeOrders.length === 0 ? (
              <p className="text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-line">
                {p.changeOrders.map((co) => (
                  <li key={co.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{co.title}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className={coMeta[co.status].text}>{coMeta[co.status].label}</span>
                      <span className="w-16 text-right text-ink">{fmtUSD(co.amount, true)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        {/* Schedule */}
        <SectionCard title="Schedule">
          <ul className="space-y-3">
            {p.milestones.map((m, i) => {
              const meta = msMeta[m.status];
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                  <span className="flex-1 text-sm text-ink">{m.label}</span>
                  <span className="text-xs text-muted">{fmtDate(m.date)}</span>
                  <span className={`w-16 text-right text-xs ${meta.text}`}>{meta.label}</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Selections */}
        {p.selections.length > 0 && (
          <SectionCard title="Selections">
            <ul className="divide-y divide-line">
              {p.selections.map((s, i) => {
                const over =
                  s.actual !== undefined && s.allowance !== undefined ? s.actual - s.allowance : 0;
                const status =
                  s.status === "chosen"
                    ? { label: "Chosen", text: "text-sage" }
                    : s.status === "overdue"
                      ? { label: "Overdue", text: "text-terracotta" }
                      : { label: "Pending", text: "text-amber" };
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-ink">{s.label}</p>
                      {s.allowance !== undefined && (
                        <p className="text-xs text-muted">
                          Allowance {fmtUSD(s.allowance, true)}
                          {s.actual !== undefined ? ` · chosen ${fmtUSD(s.actual, true)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={status.text}>{status.label}</p>
                      {over > 0 && <p className="text-xs text-terracotta">{fmtUSD(over, true)} over</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        )}

        {/* Long-lead items */}
        {p.longLead.length > 0 && (
          <SectionCard title="Long-lead items">
            <ul className="divide-y divide-line">
              {p.longLead.map((item, i) => {
                const meta =
                  item.status === "late"
                    ? { label: "Late", text: "text-terracotta" }
                    : item.status === "at_risk"
                      ? { label: "At risk", text: "text-amber" }
                      : { label: "On time", text: "text-sage" };
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-ink">{item.label}</p>
                      <p className="text-xs text-muted">
                        {item.vendor ? `${item.vendor} · ` : ""}need by {fmtDate(item.neededBy)} · ETA {fmtDate(item.eta)}
                      </p>
                    </div>
                    <span className={`shrink-0 ${meta.text}`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
