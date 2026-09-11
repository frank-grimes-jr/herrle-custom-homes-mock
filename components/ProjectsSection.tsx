import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Project } from "@/lib/data/types";
import { fmtUSD } from "@/lib/format";
import { scheduleMeta } from "@/lib/ui";
import { SectionCard } from "./SectionCard";
import { Bar } from "./Bar";

function budgetColor(p: Project): string {
  const over = (p.forecastCost - p.budget) / p.budget;
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
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-surface-2/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink group-hover:underline">{p.name}</p>
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
                </div>

                <ChevronRight
                  size={18}
                  className="shrink-0 text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
