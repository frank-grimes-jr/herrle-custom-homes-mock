// Formatting helpers — Intl does the work (stdlib).

export function fmtUSD(n: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

// Signed percentage delta, e.g. +16% / -4%.
export function fmtDelta(current: number, prior: number): { text: string; up: boolean } {
  const pct = prior === 0 ? 0 : ((current - prior) / prior) * 100;
  const up = pct >= 0;
  return { text: `${up ? "+" : ""}${pct.toFixed(0)}%`, up };
}

export function runwayMonths(cash: number, monthlyBurn: number): number {
  return monthlyBurn <= 0 ? Infinity : cash / monthlyBurn;
}

// Gross margin % from contract value and a cost figure.
export function marginPct(contract: number, cost: number): number {
  return contract <= 0 ? 0 : ((contract - cost) / contract) * 100;
}

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}
