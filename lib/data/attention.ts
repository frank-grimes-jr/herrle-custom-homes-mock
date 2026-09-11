import type {
  AttentionItem,
  Client,
  Financials,
  Project,
  SignatureDoc,
  Team,
} from "./types";

export type AttentionInput = {
  financials: Financials;
  projects: Project[];
  clients: Client[];
  team: Team;
  signatures: SignatureDoc[];
};

// Tunable thresholds. These are the knobs to calibrate with Dave later —
// deliberately plain constants, not a rules engine. ponytail: rules engine
// only if the rule count outgrows a readable list of if-statements.
export const THRESHOLDS = {
  budgetOverEscalatePct: 10, // projected cost over budget by this % → escalate
  budgetOverWatchPct: 5,
  arOver90Escalate: 50_000, // $ aged past 90 days
  runwayMonthsEscalate: 1.5,
  runwayMonthsWatch: 3,
  marginBelowTargetWatch: 5, // points below target margin
  marginBelowTargetEscalate: 10,
  signaturePendingWatchDays: 7,
  clientNoContactWatchDays: 21,
  openDecisionsWatch: 4,
};

// Projected final cost from spend-to-date and % complete.
function projectedOverBudgetPct(p: Project): number | null {
  if (p.percentComplete < 5) return null; // too early to project meaningfully
  const projected = p.spent / (p.percentComplete / 100);
  return ((projected - p.budget) / p.budget) * 100;
}

const SEV_ORDER = { escalate: 0, watch: 1 } as const;

// Compact USD (Intl is a global — no import, keeps this file test-standalone).
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export function deriveAttention(d: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const push = (i: AttentionItem) => items.push(i);
  const T = THRESHOLDS;
  const { financials: f } = d;

  // — Financials —
  if (f.ar.over90 >= T.arOver90Escalate) {
    push({
      id: "fin-ar90",
      severity: "escalate",
      domain: "Financials",
      title: "Receivables aging past 90 days",
      detail: `${money(f.ar.over90)} outstanding over 90 days — collect or escalate.`,
    });
  }
  const months = f.monthlyBurn <= 0 ? Infinity : f.cashOnHand / f.monthlyBurn;
  if (months < T.runwayMonthsEscalate) {
    push({
      id: "fin-runway",
      severity: "escalate",
      domain: "Financials",
      title: "Cash runway is short",
      detail: `~${months.toFixed(1)} months of operating cash at current burn.`,
    });
  } else if (months < T.runwayMonthsWatch) {
    push({
      id: "fin-runway",
      severity: "watch",
      domain: "Financials",
      title: "Cash runway tightening",
      detail: `~${months.toFixed(1)} months of operating cash — watch draw schedule.`,
    });
  }
  const marginGap = f.targetMarginPct - f.grossMarginPct;
  if (marginGap >= T.marginBelowTargetEscalate) {
    push({
      id: "fin-margin",
      severity: "escalate",
      domain: "Financials",
      title: "Gross margin well below target",
      detail: `${f.grossMarginPct.toFixed(1)}% vs ${f.targetMarginPct}% target.`,
    });
  } else if (marginGap >= T.marginBelowTargetWatch) {
    push({
      id: "fin-margin",
      severity: "watch",
      domain: "Financials",
      title: "Gross margin below target",
      detail: `${f.grossMarginPct.toFixed(1)}% vs ${f.targetMarginPct}% target.`,
    });
  }

  // — Projects —
  for (const p of d.projects) {
    const overPct = projectedOverBudgetPct(p);
    if (overPct !== null && overPct >= T.budgetOverEscalatePct) {
      push({
        id: `proj-budget-${p.id}`,
        severity: "escalate",
        domain: "Projects",
        title: `${p.name} trending over budget`,
        detail: `Projected ~${overPct.toFixed(0)}% over cost budget at ${p.percentComplete}% complete.`,
      });
    } else if (overPct !== null && overPct >= T.budgetOverWatchPct) {
      push({
        id: `proj-budget-${p.id}`,
        severity: "watch",
        domain: "Projects",
        title: `${p.name} nearing budget`,
        detail: `Projected ~${overPct.toFixed(0)}% over cost budget at ${p.percentComplete}% complete.`,
      });
    }
    if (p.schedule === "behind") {
      push({
        id: `proj-sched-${p.id}`,
        severity: "escalate",
        domain: "Projects",
        title: `${p.name} is behind schedule`,
        detail: `Next: ${p.nextMilestone} in ${p.daysToNextMilestone} days.`,
      });
    } else if (p.schedule === "at_risk") {
      push({
        id: `proj-sched-${p.id}`,
        severity: "watch",
        domain: "Projects",
        title: `${p.name} schedule at risk`,
        detail: `Next: ${p.nextMilestone} in ${p.daysToNextMilestone} days.`,
      });
    }
  }

  // — Clients —
  for (const c of d.clients) {
    if (c.sentiment === "at_risk") {
      push({
        id: `client-sent-${c.id}`,
        severity: "escalate",
        domain: "Clients",
        title: `${c.name} relationship at risk`,
        detail: `${c.project} — last contact ${c.lastContactDays} days ago.`,
      });
    } else if (c.lastContactDays > T.clientNoContactWatchDays) {
      push({
        id: `client-contact-${c.id}`,
        severity: "watch",
        domain: "Clients",
        title: `${c.name} has gone quiet`,
        detail: `No contact in ${c.lastContactDays} days on ${c.project}.`,
      });
    }
    if (c.openDecisions >= T.openDecisionsWatch) {
      push({
        id: `client-dec-${c.id}`,
        severity: "watch",
        domain: "Clients",
        title: `${c.name} has open selections`,
        detail: `${c.openDecisions} decisions pending — may hold up the schedule.`,
      });
    }
  }

  // — Signatures —
  for (const s of d.signatures) {
    if (s.status === "overdue") {
      push({
        id: `sig-${s.id}`,
        severity: "escalate",
        domain: "Signatures",
        title: `${s.title} overdue for signature`,
        detail: `Sent ${s.sentDaysAgo} days ago${s.amount ? ` — ${money(s.amount)}` : ""}.`,
      });
    } else if (s.status === "pending" && s.sentDaysAgo > T.signaturePendingWatchDays) {
      push({
        id: `sig-${s.id}`,
        severity: "watch",
        domain: "Signatures",
        title: `${s.title} awaiting signature`,
        detail: `Sent ${s.sentDaysAgo} days ago${s.amount ? ` — ${money(s.amount)}` : ""}.`,
      });
    }
  }

  // — Team / tools —
  if (d.team.claudeSeatsActive < d.team.claudeSeats) {
    const idle = d.team.claudeSeats - d.team.claudeSeatsActive;
    push({
      id: "team-tools",
      severity: "watch",
      domain: "Team",
      title: `${idle} software seat${idle > 1 ? "s" : ""} sitting idle`,
      detail: `Only ${d.team.claudeSeatsActive} of ${d.team.claudeSeats} seats were active this week — you're paying for tools no one's using.`,
    });
  }

  return items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}
