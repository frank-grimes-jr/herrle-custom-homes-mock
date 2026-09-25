import type { Client } from "@/lib/data/types";
import { sentimentMeta } from "@/lib/ui";
import { NotConnected, SectionCard } from "./SectionCard";

export function ClientsSection({ clients }: { clients: Client[] }) {
  return (
    <SectionCard title="Clients" right={`${clients.length} active`}>
      {clients.length === 0 && <NotConnected what="client data" />}
      <ul className="divide-y divide-line">
        {clients.map((c) => {
          const s = sentimentMeta[c.sentiment];
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted">{c.project}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm ${s.text}`}>{s.label}</p>
                <p className="text-xs text-muted">
                  {c.lastContactDays}d since contact
                  {c.openDecisions > 0 ? ` · ${c.openDecisions} open` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
