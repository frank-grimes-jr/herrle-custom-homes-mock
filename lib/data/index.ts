// Data adapters. Every domain is read through one getX() function; to wire a
// live source, change ONLY the body of that function. The UI never changes.
// Until a source is connected, objects are null and lists are empty — the UI
// shows "not connected" rather than inventing numbers.
import type {
  DashboardData,
  Financials,
  Project,
  Client,
  Pipeline,
  Team,
  SignatureDoc,
  Sub,
} from "./types";
import { deriveAttention } from "./attention";

export async function getFinancials(): Promise<Financials | null> {
  return null; // live: QuickBooks / Plaid (connected in Admin; reader not built yet)
}
export async function getProjects(): Promise<Project[]> {
  return []; // live: Google Sheets (project tracker)
}
export async function getClients(): Promise<Client[]> {
  return []; // live: Sheets / CRM
}
export async function getPipeline(): Promise<Pipeline | null> {
  return null; // live: Docusign + Sheets
}
export async function getTeam(): Promise<Team | null> {
  return null; // live: Claude usage analytics + Sheets
}
export async function getSignatures(): Promise<SignatureDoc[]> {
  return []; // live: Docusign eSignature API
}
export async function getSubs(): Promise<Sub[]> {
  return []; // live: COI tracking / Sheets
}

export async function getDashboard(): Promise<DashboardData> {
  const [financials, projects, clients, pipeline, team, signatures, subs] = await Promise.all([
    getFinancials(),
    getProjects(),
    getClients(),
    getPipeline(),
    getTeam(),
    getSignatures(),
    getSubs(),
  ]);
  return {
    asOf: new Date().toISOString(),
    financials,
    projects,
    clients,
    pipeline,
    team,
    signatures,
    attention: deriveAttention({ financials, projects, clients, team, signatures, subs }),
  };
}
