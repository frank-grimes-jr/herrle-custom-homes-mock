// Secure credential store. Values live ONLY in the OS credential vault
// (Windows Credential Manager / DPAPI, encrypted to the logged-in user) — never
// in .env, on disk, or in git. Read and written from server code only.
//
// ponytail: intentionally no `import "server-only"` here — Next stubs that
// module at build time, which makes it un-importable under `node --test`
// (secrets.test.ts). The native `@napi-rs/keyring` import below already makes
// this module impossible to bundle for the client, which is the real guard.
import { Entry } from "@napi-rs/keyring";

const SERVICE = "herrle-dashboard";

// Known secret ids — use these constants at call sites.
export const GOOGLE_CLIENT_ID = "google_client_id";
export const GOOGLE_CLIENT_SECRET = "google_client_secret";
export const GOOGLE_REFRESH_TOKEN = "google_refresh_token";

export function getSecret(key: string): string | null {
  try {
    return new Entry(SERVICE, key).getPassword(); // null when unset
  } catch {
    return null; // vault locked/unreadable → treat as unset
  }
}

export function setSecret(key: string, value: string): void {
  new Entry(SERVICE, key).setPassword(value);
}

export function deleteSecret(key: string): void {
  try {
    new Entry(SERVICE, key).deletePassword();
  } catch {
    // already absent or unreadable → nothing to do
  }
}

export function hasSecret(key: string): boolean {
  return getSecret(key) !== null;
}
