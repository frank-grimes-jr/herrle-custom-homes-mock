import type { Financials } from "@/lib/data/types";
import { fmtUSD } from "@/lib/format";
import { SectionCard } from "../SectionCard";
import TrendArea from "../TrendArea";

const FLOOR = 300_000;

export function CashForecast({ f }: { f: Financials }) {
  const weeks = f.cashForecast;
  const min = weeks.reduce((m, w) => (w.balance < m.balance ? w : m), weeks[0]);
  const data = weeks.map((w) => ({ label: w.label, value: w.balance }));
  const tight = min.balance < FLOOR;

  return (
    <SectionCard title="Cash outlook" right={`next ${weeks.length} weeks`}>
      <p className="font-serif text-xl text-ink">
        Tightest week: <span className={tight ? "text-amber" : "text-ink"}>{fmtUSD(min.balance, true)}</span> the week of{" "}
        {min.label}.
      </p>
      <p className="mt-1 text-sm text-muted">Draws coming in vs. subs and materials going out.</p>

      <div className="mt-4">
        <TrendArea data={data} color={tight ? "var(--amber)" : "var(--primary)"} height={96} valueFormat="usd" />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-1 font-normal">Week of</th>
              <th className="py-1 text-right font-normal">In</th>
              <th className="py-1 text-right font-normal">Out</th>
              <th className="py-1 text-right font-normal">Balance</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.label} className="border-t border-line">
                <td className="py-2 text-ink">{w.label}</td>
                <td className="py-2 text-right text-sage">{w.inflow ? fmtUSD(w.inflow, true) : "—"}</td>
                <td className="py-2 text-right text-muted">{fmtUSD(w.outflow, true)}</td>
                <td className={`py-2 text-right ${w.balance < FLOOR ? "text-amber" : "text-ink"}`}>
                  {fmtUSD(w.balance, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
