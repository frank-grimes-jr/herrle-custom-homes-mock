import type { Sub } from "@/lib/data/types";
import { fmtDate } from "@/lib/format";
import { NotConnected, SectionCard } from "../SectionCard";

const DAY = 86_400_000;
const SOON_DAYS = 45;

function coiStatus(iso: string) {
  const days = (new Date(iso).getTime() - Date.now()) / DAY;
  if (days < 0) return { label: `Expired ${fmtDate(iso)}`, text: "text-terracotta" };
  if (days <= SOON_DAYS) return { label: `Expires ${fmtDate(iso)}`, text: "text-amber" };
  return { label: `Current · ${fmtDate(iso)}`, text: "text-sage" };
}

export function ComplianceList({ subs }: { subs: Sub[] }) {
  return (
    <SectionCard title="Subcontractors" right={`${subs.length} active`}>
      {subs.length === 0 && <NotConnected what="subcontractor records" />}
      <ul className="divide-y divide-line">
        {subs.map((s) => {
          const coi = coiStatus(s.coiExpires);
          return (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-muted">
                  {s.trade} · {s.projects.join(", ")}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className={coi.text}>Insurance: {coi.label}</p>
                <p className={`text-xs ${s.lienWaiverCurrent ? "text-muted" : "text-terracotta"}`}>
                  {s.lienWaiverCurrent ? "Lien waiver current" : "Lien waiver outstanding"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
