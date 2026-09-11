// Domain types for the dashboard. Every adapter in ./index.ts returns these,
// whether the data is mock (now) or live (later) — so the UI never changes.

export type Money = number; // USD
export type TrendPoint = { label: string; value: number };
export type Severity = "escalate" | "watch" | "ok";

export type Financials = {
  revenueYTD: Money;
  revenuePriorYTD: Money;
  grossMarginPct: number; // 0–100
  targetMarginPct: number;
  cashOnHand: Money;
  monthlyBurn: Money; // avg monthly operating outflow → runway
  backlog: Money; // contracted future revenue
  ar: { current: Money; d31_60: Money; d61_90: Money; over90: Money };
  ap: { current: Money; overdue: Money };
  revenueTrend: TrendPoint[]; // trailing 12 months
  backlogTrend: TrendPoint[];
};

export type ScheduleStatus = "on_track" | "at_risk" | "behind";

export type ChangeOrder = {
  id: string;
  title: string;
  amount: Money;
  status: "approved" | "pending" | "overdue";
};

export type MilestoneStatus = "done" | "upcoming" | "at_risk" | "late";
export type Milestone = { label: string; date: string; status: MilestoneStatus };

export type Selection = {
  label: string;
  status: "chosen" | "pending" | "overdue";
  allowance?: Money;
  actual?: Money; // set once chosen; overage = actual − allowance
};

export type LongLeadItem = {
  label: string;
  vendor?: string;
  neededBy: string; // ISO
  eta: string; // ISO
  status: "on_time" | "at_risk" | "late";
};

export type Project = {
  id: string;
  name: string;
  client: string;
  location: string;
  contractValue: Money;
  budget: Money; // cost budget
  spent: Money;
  forecastCost: Money; // current projected final cost (> budget = margin fade)
  percentComplete: number; // 0–100
  schedule: ScheduleStatus;
  nextMilestone: string;
  daysToNextMilestone: number;
  targetCompletion: string; // ISO date
  openDecisions: number; // client selections pending
  changeOrders: ChangeOrder[];
  milestones: Milestone[];
  selections: Selection[];
  longLead: LongLeadItem[];
};

export type Client = {
  id: string;
  name: string;
  project: string;
  sentiment: "positive" | "neutral" | "at_risk";
  lastContactDays: number;
  openDecisions: number;
};

export type PipelineStage = "lead" | "proposal" | "contract";
export type Opportunity = {
  id: string;
  name: string;
  stage: PipelineStage;
  estValue: Money;
  probability: number; // 0–100
  ageDays: number;
};
export type Pipeline = {
  opportunities: Opportunity[];
  winRatePct: number;
  signedYTD: number; // contracts signed this year
  signedValueYTD: Money;
  contractsTrend: TrendPoint[]; // monthly signed value
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  currentProject: string | null;
  utilizationPct: number;
  claudeSeat: boolean;
  claudeWeeklyMessages: number; // AI adoption signal
};
export type Team = {
  members: TeamMember[];
  claudeSeats: number;
  claudeSeatsActive: number; // used in the last 7 days
  claudeAdoptionTrend: TrendPoint[]; // weekly active seats
};

export type SignatureStatus = "signed" | "pending" | "overdue";
export type SignatureDoc = {
  id: string;
  title: string;
  type: "contract" | "change_order" | "proposal";
  project: string;
  status: SignatureStatus;
  sentDaysAgo: number;
  amount: Money;
};

export type Domain =
  | "Financials"
  | "Projects"
  | "Pipeline"
  | "Clients"
  | "Team"
  | "Signatures";

export type AttentionItem = {
  id: string;
  severity: Exclude<Severity, "ok">; // only escalate | watch are surfaced
  title: string;
  detail: string;
  domain: Domain;
  href?: string; // optional deep-link (e.g. a project drill-down)
};

export type DashboardData = {
  asOf: string;
  financials: Financials;
  projects: Project[];
  clients: Client[];
  pipeline: Pipeline;
  team: Team;
  signatures: SignatureDoc[];
  attention: AttentionItem[];
};
