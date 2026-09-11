import Link from "next/link";
import type { SignatureDoc } from "@/lib/data/types";
import { fmtUSD } from "@/lib/format";
import { SectionCard } from "./SectionCard";

const statusMeta: Record<SignatureDoc["status"], { label: string; text: string; dot: string }> = {
  signed: { label: "Signed", text: "text-sage", dot: "bg-sage" },
  pending: { label: "Pending", text: "text-amber", dot: "bg-amber" },
  overdue: { label: "Overdue", text: "text-terracotta", dot: "bg-terracotta" },
};

export function SignaturesSection({ docs }: { docs: SignatureDoc[] }) {
  const pending = docs.filter((d) => d.status !== "signed").length;
  return (
    <SectionCard
      title="Documents & signatures"
      right={`${pending} awaiting signature`}
    >
      <ul className="divide-y divide-line">
        {docs.map((d) => {
          const s = statusMeta[d.status];
          return (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{d.title}</p>
                <p className="text-xs text-muted">
                  {fmtUSD(d.amount, true)} · sent {d.sentDaysAgo}d ago
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm ${s.text}`}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/compliance" className="mt-3 inline-block text-xs text-muted hover:text-ink">
        Insurance &amp; lien waivers →
      </Link>
    </SectionCard>
  );
}
