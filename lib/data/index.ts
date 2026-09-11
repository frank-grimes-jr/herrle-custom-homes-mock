// Data adapters. Every domain is read through one getX() function.
// TODAY these return mock data. To wire a live source LATER, change ONLY the
// body of the relevant function (e.g. getFinancials → call QuickBooks;
// getProjects → read the Google Sheet). The UI never changes.
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
import * as mock from "./mock";
import { deriveAttention } from "./attention";

export async function getFinancials(): Promise<Financials> {
  return mock.financials; // live: accounting API (QuickBooks Online, etc.)
}
export async function getProjects(): Promise<Project[]> {
  return mock.projects; // live: Google Sheets (project tracker)
}
export async function getClients(): Promise<Client[]> {
  return mock.clients; // live: Sheets / CRM
}
export async function getPipeline(): Promise<Pipeline> {
  return mock.pipeline; // live: Docusign + Sheets
}
export async function getTeam(): Promise<Team> {
  return mock.team; // live: Claude usage analytics + Sheets
}
export async function getSignatures(): Promise<SignatureDoc[]> {
  return mock.signatures; // live: Docusign eSignature API
}
export async function getSubs(): Promise<Sub[]> {
  return mock.subs; // live: COI tracking / Sheets
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
