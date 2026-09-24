import type { Finding } from "@/lib/analysis/types";

export function AnalysisFindings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="font-serif text-lg text-ink">Worth a look</h3>
      <ul className="mt-2 divide-y divide-line">
        {findings.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${f.severity === "escalate" ? "bg-terracotta" : "bg-amber"}`} />
              <span className="text-ink">{f.title}</span>
              {f.detail && <p className="mt-1 text-sm text-muted">{f.detail}</p>}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted">Why</summary>
                <p className="mt-1 text-xs text-muted">{f.provenance.map((p) => p.label).join(" · ")}</p>
              </details>
            </div>
            <form method="post" action="/api/analysis/dismiss">
              <input type="hidden" name="signature" value={f.signature} />
              <button className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-ink">Dismiss</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
