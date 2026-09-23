import "server-only";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import {
  getSecret,
  setSecret,
  deleteSecret,
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_ENV,
  PLAID_ACCESS_TOKEN,
  PLAID_ITEM_ID,
} from "@/lib/secrets";

export function isPlaidConfigured(): boolean {
  return !!getSecret(PLAID_CLIENT_ID) && !!getSecret(PLAID_SECRET);
}

export function isPlaidConnected(): boolean {
  return isPlaidConfigured() && !!getSecret(PLAID_ACCESS_TOKEN);
}

function client(): PlaidApi | null {
  const id = getSecret(PLAID_CLIENT_ID);
  const secret = getSecret(PLAID_SECRET);
  if (!id || !secret) return null;
  const env = getSecret(PLAID_ENV) ?? "sandbox";
  const config = new Configuration({
    basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
    baseOptions: { headers: { "PLAID-CLIENT-ID": id, "PLAID-SECRET": secret } },
  });
  return new PlaidApi(config);
}

// Plaid uses the Link widget, not an OAuth redirect: the server mints a
// link_token, the browser opens Link and returns a public_token, and the server
// swaps that for a long-lived access_token (stored in the vault).
export async function createLinkToken(): Promise<string | null> {
  const api = client();
  if (!api) return null;
  const res = await api.linkTokenCreate({
    user: { client_user_id: "herrle-dashboard" },
    client_name: "Herrle Dashboard",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return res.data.link_token;
}

export async function exchangePublicToken(publicToken: string): Promise<boolean> {
  const api = client();
  if (!api) return false;
  const res = await api.itemPublicTokenExchange({ public_token: publicToken });
  setSecret(PLAID_ACCESS_TOKEN, res.data.access_token);
  setSecret(PLAID_ITEM_ID, res.data.item_id);
  return true;
}

export function disconnectPlaid(): void {
  deleteSecret(PLAID_ACCESS_TOKEN);
  deleteSecret(PLAID_ITEM_ID);
}
