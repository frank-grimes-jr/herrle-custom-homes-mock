// Mock data — a realistic Herrle Custom Homes snapshot. Names/figures are
// synthetic. Real projects (e.g. Greystone) are complete; these are plausible
// active builds. A few things are deliberately off so the Attention panel has
// something to show.
import type {
  Client,
  Financials,
  Opportunity,
  Pipeline,
  Project,
  SignatureDoc,
  Team,
  TeamMember,
  TrendPoint,
} from "./types";

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const trend = (vals: number[]): TrendPoint[] => vals.map((value, i) => ({ label: MONTHS[i], value }));

export const financials: Financials = {
  revenueYTD: 6_850_000,
  revenuePriorYTD: 5_900_000,
  grossMarginPct: 24.8,
  targetMarginPct: 26,
  cashOnHand: 1_250_000,
  monthlyBurn: 520_000, // → ~2.4 months runway (a watch)
  backlog: 9_200_000,
  ar: { current: 380_000, d31_60: 145_000, d61_90: 45_000, over90: 92_000 }, // over90 → escalate
  ap: { current: 210_000, overdue: 0 },
  revenueTrend: trend([420, 480, 510, 390, 460, 540, 610, 660, 700, 720, 690, 780].map((v) => v * 1000)),
  backlogTrend: trend([6.1, 6.4, 6.9, 7.2, 7.0, 7.6, 8.1, 8.4, 8.0, 8.7, 9.0, 9.2].map((v) => v * 1_000_000)),
};

export const projects: Project[] = [
  {
    id: "blackledge", name: "Blackledge Point", client: "Harmon Residence", location: "Old Lyme, CT",
    contractValue: 3_900_000, budget: 3_100_000, spent: 1_550_000, forecastCost: 3_120_000, percentComplete: 55,
    schedule: "on_track", nextMilestone: "Framing inspection", daysToNextMilestone: 6,
    targetCompletion: "2026-12-15", openDecisions: 2,
    changeOrders: [{ id: "co-bl1", title: "Added mudroom built-ins", amount: 22_000, status: "approved" }],
    milestones: [
      { label: "Foundation", date: "2026-05-10", status: "done" },
      { label: "Framing complete", date: "2026-08-20", status: "done" },
      { label: "Framing inspection", date: "2026-09-17", status: "upcoming" },
      { label: "Mechanicals rough-in", date: "2026-10-15", status: "upcoming" },
      { label: "Interior finishes", date: "2026-12-01", status: "upcoming" },
    ],
    selections: [
      { label: "Primary bath tile", status: "pending", allowance: 18_000 },
      { label: "Kitchen cabinetry", status: "chosen", allowance: 95_000, actual: 98_000 },
    ],
    longLead: [{ label: "Custom entry doors", vendor: "Upstate Door", neededBy: "2026-10-20", eta: "2026-10-12", status: "on_time" }],
  },
  {
    id: "hawksnest", name: "Hawk's Nest Bluff", client: "Delano Residence", location: "East Lyme, CT",
    contractValue: 5_400_000, budget: 4_300_000, spent: 3_440_000, forecastCost: 4_900_000, percentComplete: 70,
    schedule: "at_risk", nextMilestone: "Window install", daysToNextMilestone: 5,
    targetCompletion: "2027-04-01", openDecisions: 2,
    changeOrders: [
      { id: "co-hn3", title: "Change Order #3 — structural steel upgrade", amount: 145_000, status: "overdue" },
      { id: "co-hn1", title: "Site drainage revision", amount: 60_000, status: "approved" },
    ],
    milestones: [
      { label: "Foundation", date: "2026-04-15", status: "done" },
      { label: "Framing complete", date: "2026-08-05", status: "done" },
      { label: "Window install", date: "2026-09-20", status: "late" },
      { label: "Roofing", date: "2026-10-05", status: "at_risk" },
      { label: "Mechanicals rough-in", date: "2026-11-15", status: "upcoming" },
    ],
    selections: [{ label: "Exterior stone", status: "chosen", allowance: 80_000, actual: 92_000 }],
    longLead: [{ label: "Black-frame windows", vendor: "Marvin Windows & Doors", neededBy: "2026-09-15", eta: "2026-09-29", status: "late" }],
  },
  {
    id: "eightmile", name: "Eightmile Ridge", client: "Pruitt Residence", location: "Lyme, CT",
    contractValue: 2_600_000, budget: 2_050_000, spent: 1_780_000, forecastCost: 2_090_000, percentComplete: 88,
    schedule: "behind", nextMilestone: "Millwork + final trim", daysToNextMilestone: 8,
    targetCompletion: "2026-10-30", openDecisions: 1,
    changeOrders: [{ id: "co-em1", title: "Extra millwork in study", amount: 34_000, status: "approved" }],
    milestones: [
      { label: "Framing complete", date: "2026-03-10", status: "done" },
      { label: "Mechanicals + insulation", date: "2026-07-01", status: "done" },
      { label: "Millwork + final trim", date: "2026-10-10", status: "late" },
      { label: "Punch list", date: "2026-10-25", status: "at_risk" },
      { label: "Final walkthrough", date: "2026-10-30", status: "upcoming" },
    ],
    selections: [],
    longLead: [{ label: "Custom range hood", vendor: "Best Range Hoods", neededBy: "2026-10-01", eta: "2026-09-24", status: "on_time" }],
  },
  {
    id: "saltmeadow", name: "Saltmeadow", client: "Whitcomb Residence", location: "Old Saybrook, CT",
    contractValue: 4_100_000, budget: 3_250_000, spent: 650_000, forecastCost: 3_250_000, percentComplete: 20,
    schedule: "on_track", nextMilestone: "Foundation pour", daysToNextMilestone: 15,
    targetCompletion: "2027-06-15", openDecisions: 3,
    changeOrders: [],
    milestones: [
      { label: "Sitework + excavation", date: "2026-08-25", status: "done" },
      { label: "Foundation pour", date: "2026-09-26", status: "upcoming" },
      { label: "Framing", date: "2026-11-10", status: "upcoming" },
    ],
    selections: [
      { label: "Window package", status: "pending", allowance: 120_000 },
      { label: "Roofing material", status: "pending", allowance: 45_000 },
      { label: "Exterior siding (Kebony)", status: "pending", allowance: 90_000 },
    ],
    longLead: [{ label: "Geothermal system", vendor: "Shoreline Geothermal", neededBy: "2027-01-10", eta: "2027-01-06", status: "on_time" }],
  },
  {
    id: "whippoorwill", name: "Whippoorwill Hollow", client: "Alden Residence", location: "Essex, CT",
    contractValue: 1_900_000, budget: 1_500_000, spent: 1_350_000, forecastCost: 1_480_000, percentComplete: 95,
    schedule: "on_track", nextMilestone: "Punch list + walkthrough", daysToNextMilestone: 6,
    targetCompletion: "2026-09-30", openDecisions: 0,
    changeOrders: [{ id: "co-wh1", title: "Upgraded lighting package", amount: 18_000, status: "approved" }],
    milestones: [
      { label: "Interior finishes", date: "2026-08-15", status: "done" },
      { label: "Punch list", date: "2026-09-20", status: "upcoming" },
      { label: "Final walkthrough", date: "2026-09-30", status: "upcoming" },
    ],
    selections: [],
    longLead: [],
  },
];

export const clients: Client[] = [
  { id: "harmon", name: "The Harmons", project: "Blackledge Point", sentiment: "positive", lastContactDays: 4, openDecisions: 2 },
  { id: "delano", name: "The Delanos", project: "Hawk's Nest Bluff", sentiment: "at_risk", lastContactDays: 9, openDecisions: 2 }, // at_risk → escalate
  { id: "pruitt", name: "The Pruitts", project: "Eightmile Ridge", sentiment: "neutral", lastContactDays: 25, openDecisions: 1 }, // quiet → watch
  { id: "whitcomb", name: "The Whitcombs", project: "Saltmeadow", sentiment: "positive", lastContactDays: 6, openDecisions: 3 },
  { id: "alden", name: "The Aldens", project: "Whippoorwill Hollow", sentiment: "positive", lastContactDays: 3, openDecisions: 0 },
];

const opportunities: Opportunity[] = [
  { id: "sill", name: "Sill Lane Estate", stage: "contract", estValue: 6_200_000, probability: 90, ageDays: 9 },
  { id: "cove", name: "Cove Road New Build", stage: "proposal", estValue: 4_800_000, probability: 60, ageDays: 18 },
  { id: "ferry", name: "Ferry Landing Addition", stage: "proposal", estValue: 2_300_000, probability: 45, ageDays: 40 },
  { id: "rockyneck", name: "Rocky Neck Renovation", stage: "lead", estValue: 1_200_000, probability: 25, ageDays: 6 },
];
export const pipeline: Pipeline = {
  opportunities,
  winRatePct: 38,
  signedYTD: 4,
  signedValueYTD: 12_400_000,
  contractsTrend: trend([0, 3.9, 0, 2.6, 0, 0, 4.1, 0, 1.9, 0, 0, 0].map((v) => v * 1_000_000)),
};

const members: TeamMember[] = [
  { id: "dave", name: "Dave Herrle", role: "Owner / Builder", currentProject: null, utilizationPct: 100, claudeSeat: true, claudeWeeklyMessages: 40 },
  { id: "adam", name: "Adam Pipkin", role: "Project Manager", currentProject: "Hawk's Nest Bluff", utilizationPct: 95, claudeSeat: true, claudeWeeklyMessages: 120 },
  { id: "alexa", name: "Alexa Ashton", role: "Project Manager", currentProject: "Blackledge Point", utilizationPct: 90, claudeSeat: true, claudeWeeklyMessages: 85 },
  { id: "gayle", name: "Gayle Wirtz", role: "CFO / Operations", currentProject: null, utilizationPct: 80, claudeSeat: true, claudeWeeklyMessages: 24 },
  { id: "doug", name: "Doug Garner", role: "Millwork Manager", currentProject: "Eightmile Ridge", utilizationPct: 90, claudeSeat: true, claudeWeeklyMessages: 0 }, // idle seat
  { id: "paul", name: "Paul Wirtz", role: "Operations", currentProject: null, utilizationPct: 70, claudeSeat: true, claudeWeeklyMessages: 0 }, // idle seat
  { id: "will", name: "Will Cooley", role: "Timber Frame Master", currentProject: "Saltmeadow", utilizationPct: 85, claudeSeat: false, claudeWeeklyMessages: 0 },
];
export const team: Team = {
  members,
  claudeSeats: 6,
  claudeSeatsActive: 4, // Doug + Paul idle this week → watch
  claudeAdoptionTrend: trend([2, 2, 3, 3, 4, 4, 5, 5, 5, 4, 5, 4]),
};

export const signatures: SignatureDoc[] = [
  { id: "co-hawks3", title: "Hawk's Nest — Change Order #3", type: "change_order", project: "Hawk's Nest Bluff", status: "overdue", sentDaysAgo: 11, amount: 145_000 }, // escalate
  { id: "contract-sill", title: "Sill Lane Estate — Construction Contract", type: "contract", project: "Sill Lane Estate", status: "pending", sentDaysAgo: 9, amount: 6_200_000 }, // watch
  { id: "co-salt1", title: "Saltmeadow — Allowance Addendum", type: "change_order", project: "Saltmeadow", status: "pending", sentDaysAgo: 3, amount: 38_000 },
  { id: "final-whip", title: "Whippoorwill — Final Payment Release", type: "proposal", project: "Whippoorwill Hollow", status: "signed", sentDaysAgo: 20, amount: 190_000 },
];
