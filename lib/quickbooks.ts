import "server-only";
import {
  getSecret,
  setSecret,
  deleteSecret,
  QBO_CLIENT_ID,
  QBO_CLIENT_SECRET,
  QBO_REFRESH_TOKEN,
  QBO_REALM_ID,
} from "@/lib/secrets";

// QuickBooks Online uses standard OAuth2, so this is hand-rolled with fetch —
// no SDK needed to connect and store tokens. (A reader for actual QBO data is a
// later slice, mirroring how Gmail was wired into triage.)
const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QBO_SCOPE = "com.intuit.quickbooks.accounting";

export const QBO_REDIRECT_URI =
  process.env.QBO_REDIRECT_URI ?? "http://localhost:3000/api/integrations/quickbooks/callback";

export function isQuickBooksConfigured(): boolean {
  return !!getSecret(QBO_CLIENT_ID) && !!getSecret(QBO_CLIENT_SECRET);
}

export function isQuickBooksConnected(): boolean {
  return isQuickBooksConfigured() && !!getSecret(QBO_REFRESH_TOKEN);
}

export function authorizeUrl(state: string): string | null {
  const id = getSecret(QBO_CLIENT_ID);
  if (!id) return null;
  const params = new URLSearchParams({
    client_id: id,
    response_type: "code",
    scope: QBO_SCOPE,
    redirect_uri: QBO_REDIRECT_URI,
    state,
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string, realmId: string): Promise<boolean> {
  const id = getSecret(QBO_CLIENT_ID);
  const secret = getSecret(QBO_CLIENT_SECRET);
  if (!id || !secret) return false;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: QBO_REDIRECT_URI,
    }),
  });
  if (!res.ok) return false;
  const tokens = (await res.json()) as { refresh_token?: string };
  if (tokens.refresh_token) setSecret(QBO_REFRESH_TOKEN, tokens.refresh_token);
  if (realmId) setSecret(QBO_REALM_ID, realmId);
  return isQuickBooksConnected();
}

export function disconnectQuickBooks(): void {
  deleteSecret(QBO_REFRESH_TOKEN);
  deleteSecret(QBO_REALM_ID);
}
