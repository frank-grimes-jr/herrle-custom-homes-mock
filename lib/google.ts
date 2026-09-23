import "server-only";
import { google } from "googleapis";
import {
  getSecret,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} from "@/lib/secrets";
import type { Email } from "@/lib/triage/types";

// Everything Dave connects is read-only by design.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

// Google only accepts https or http://localhost for OAuth redirects, so the
// one-time connect flow uses localhost:3000 even though the everyday app URL is
// http://herrle.internal. A redirect URI is public, not a secret; override via
// env only if the local port differs.
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/integrations/google/callback";

export function oauthClient() {
  const id = getSecret(GOOGLE_CLIENT_ID);
  const secret = getSecret(GOOGLE_CLIENT_SECRET);
  if (!id || !secret) return null; // provider not set up yet
  return new google.auth.OAuth2(id, secret, GOOGLE_REDIRECT_URI);
}

export function isGoogleConfigured(): boolean {
  return !!getSecret(GOOGLE_CLIENT_ID) && !!getSecret(GOOGLE_CLIENT_SECRET);
}

export function isGoogleConnected(): boolean {
  return isGoogleConfigured() && !!getSecret(GOOGLE_REFRESH_TOKEN);
}

function authed() {
  const client = oauthClient();
  const refresh = getSecret(GOOGLE_REFRESH_TOKEN);
  if (!client || !refresh) return null;
  client.setCredentials({ refresh_token: refresh }); // googleapis auto-refreshes access tokens
  return client;
}

// Recent inbox mapped to the Email shape the digest expects. Read-only; uses the
// Gmail message snippet as the body (enough to triage, and cheap). Returns []
// when Google isn't connected so the caller can fall back to the mock inbox.
export async function fetchRecentEmails(max = 15): Promise<Email[]> {
  const auth = authed();
  if (!auth) return [];
  const gmail = google.gmail({ version: "v1", auth });
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
    q: "in:inbox newer_than:2d",
  });
  const messages = list.data.messages ?? [];
  const emails = await Promise.all(
    messages.map(async (m): Promise<Email | null> => {
      if (!m.id) return null;
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = msg.data.payload?.headers ?? [];
      const header = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const date = header("Date");
      return {
        id: m.id,
        from: header("From") || "(unknown sender)",
        role: "unknown",
        subject: header("Subject") || "(no subject)",
        body: msg.data.snippet ?? "",
        receivedAt: date
          ? new Date(date).toISOString()
          : new Date(Number(msg.data.internalDate ?? Date.now())).toISOString(),
      };
    }),
  );
  return emails.filter((e): e is Email => e !== null);
}
