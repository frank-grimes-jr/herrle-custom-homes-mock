import type { Project } from "@/lib/data/types";
import { fmtUSD } from "@/lib/format";
import { scheduleMeta } from "@/lib/ui";
import { SectionCard } from "./SectionCard";
import { Bar } from "./Bar";

function budgetColor(p: Project): string {
  if (p.percentComplete < 5) return "var(--primary)";
  const projected = p.spent / (p.percentComplete / 100);
  const over = (projected - p.budget) / p.budget;
  if (over >= 0.1) return "var(--terracotta)";
  if (over >= 0.05) return "var(--amber)";
  return "var(--primary)";
}

export function ProjectsSection({ projects }: { projects: Project[] }) {
  return (
    <SectionCard title="Active projects" right={`${projects.length} builds`}>
      <ul className="divide-y divide-line">
        {projects.map((p) => {
          const sched = scheduleMeta[p.schedule];
          return (
            <li key={p.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.client} · {p.location}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 text-sm ${sched.text}`}>
                    <span className={`h-2 w-2 rounded-full ${sched.dot}`} />
                    {sched.label}
                  </span>
                  <p className="text-xs text-muted">{fmtUSD(p.contractValue, true)} contract</p>
                </div>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>Complete</span>
                    <span className="text-ink">{p.percentComplete}%</span>
                  </div>
                  <Bar pct={p.percentComplete} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>Cost budget</span>
                    <span className="text-ink">
                      {fmtUSD(p.spent, true)} / {fmtUSD(p.budget, true)}
                    </span>
                  </div>
                  <Bar pct={(p.spent / p.budget) * 100} color={budgetColor(p)} />
                </div>
                <div className="text-xs">
                  <p className="text-muted">Next milestone</p>
                  <p className="text-ink">
                    {p.nextMilestone} <span className="text-muted">· {p.daysToNextMilestone}d</span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
