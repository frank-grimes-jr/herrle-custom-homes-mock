import type {
  AttentionItem,
  Client,
  Financials,
  Project,
  SignatureDoc,
  Sub,
  Team,
} from "./types";

export type AttentionInput = {
  financials: Financials;
  projects: Project[];
  clients: Client[];
  team: Team;
  signatures: SignatureDoc[];
  subs: Sub[];
};

// Tunable thresholds. These are the knobs to calibrate with Dave later —
// deliberately plain constants, not a rules engine. ponytail: rules engine
// only if the rule count outgrows a readable list of if-statements.
export const THRESHOLDS = {
  marginFadeEscalate: 6, // projected margin below plan by this many points → escalate
  marginFadeWatch: 3,
  allowanceOverWatch: 10_000, // a selection over its allowance by this much → watch
  arOver90Escalate: 50_000, // $ aged past 90 days
  cashFloorEscalate: 100_000, // projected weekly balance dips below this → escalate
  cashFloorWatch: 300_000,
  coiExpiryWarnDays: 14, // sub insurance expiring within this window → watch
  marginBelowTargetWatch: 5, // points below target margin
  marginBelowTargetEscalate: 10,
  signaturePendingWatchDays: 7,
  clientNoContactWatchDays: 21,
  openDecisionsWatch: 4,
};

const SEV_ORDER = { escalate: 0, watch: 1 } as const;

// Compact USD (Intl is a global — no import, keeps this file test-standalone).
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

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
  // Cash-flow forecast: flag the coming low point (supersedes a raw runway ratio).
  if (f.cashForecast.length > 0) {
    let min = f.cashForecast[0];
    for (const w of f.cashForecast) if (w.balance < min.balance) min = w;
    if (min.balance < T.cashFloorEscalate) {
      push({ id: "fin-cashgap", severity: "escalate", domain: "Financials", title: "Cash gap coming", detail: `Projected to dip to ${money(min.balance)} the week of ${min.label} — line up a draw now.`, href: "/cash" });
    } else if (min.balance < T.cashFloorWatch) {
      push({ id: "fin-cashgap", severity: "watch", domain: "Financials", title: "Cash gets tight soon", detail: `Dips to about ${money(min.balance)} the week of ${min.label} — time a draw or a bill.`, href: "/cash" });
    }
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

  // — Projects — ONE line per troubled build (its worst issue), deep-linked to
  // the drill-down. Prevents a single project from spamming the feed. Healthy = silent.
  for (const p of d.projects) {
    const issues: { severity: "escalate" | "watch"; text: string }[] = [];

    // Margin fade (job cost): planned vs projected gross margin.
    const planned = ((p.contractValue - p.budget) / p.contractValue) * 100;
    const projected = ((p.contractValue - p.forecastCost) / p.contractValue) * 100;
    const fade = planned - projected;
    if (fade >= T.marginFadeEscalate) {
      issues.push({ severity: "escalate", text: `profit projected at ${projected.toFixed(0)}% (planned ${planned.toFixed(0)}%)` });
    } else if (fade >= T.marginFadeWatch) {
      issues.push({ severity: "watch", text: `margin slipping to ${projected.toFixed(0)}% (planned ${planned.toFixed(0)}%)` });
    }

    // Schedule.
    if (p.schedule === "behind") issues.push({ severity: "escalate", text: "behind schedule" });
    else if (p.schedule === "at_risk") issues.push({ severity: "watch", text: "schedule at risk" });

    // Long-lead procurement (e.g. the window delay).
    for (const item of p.longLead) {
      if (item.status === "late") issues.push({ severity: "escalate", text: `${item.label} delayed` });
      else if (item.status === "at_risk") issues.push({ severity: "watch", text: `${item.label} may slip` });
    }

    // Selections / allowances.
    for (const s of p.selections) {
      if (s.status === "overdue") issues.push({ severity: "watch", text: `${s.label} selection overdue` });
      else if (s.actual !== undefined && s.allowance !== undefined && s.actual - s.allowance >= T.allowanceOverWatch) {
        issues.push({ severity: "watch", text: `${s.label} over allowance` });
      }
    }

    if (issues.length === 0) continue;
    const top = issues.find((i) => i.severity === "escalate") ?? issues[0];
    const more = issues.length - 1;
    push({
      id: `project-${p.id}`,
      severity: issues.some((i) => i.severity === "escalate") ? "escalate" : "watch",
      domain: "Projects",
      title: `${p.name} — ${top.text}`,
      detail: more > 0 ? `+${more} more to review on this build.` : "Open the build for detail.",
      href: `/projects/${p.id}`,
    });
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

  // — Compliance (sub insurance & lien waivers) — one line per sub, worst issue.
  const now = Date.now();
  const day = 86_400_000;
  for (const s of d.subs) {
    const issues: { severity: "escalate" | "watch"; text: string }[] = [];
    const daysToExpiry = (new Date(s.coiExpires).getTime() - now) / day;
    if (daysToExpiry < 0) issues.push({ severity: "escalate", text: `insurance expired ${shortDate(s.coiExpires)}` });
    else if (daysToExpiry <= T.coiExpiryWarnDays) issues.push({ severity: "watch", text: `insurance expires ${shortDate(s.coiExpires)}` });
    if (!s.lienWaiverCurrent) issues.push({ severity: "watch", text: "lien waiver outstanding" });
    if (issues.length === 0) continue;
    const top = issues.find((i) => i.severity === "escalate") ?? issues[0];
    push({
      id: `sub-${s.id}`,
      severity: issues.some((i) => i.severity === "escalate") ? "escalate" : "watch",
      domain: "Compliance",
      title: `${s.name} — ${top.text}`,
      detail:
        issues.length > 1
          ? `+${issues.length - 1} more · ${s.trade} on ${s.projects[0]}.`
          : `${s.trade} on ${s.projects[0]}.`,
      href: "/compliance",
    });
  }

  return items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}
