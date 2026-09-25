// Node-testable module (email.test.ts): no "server-only", relative .ts imports —
// same reasoning as secrets.ts; the native/IMAP imports keep it off the client.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "./secrets.ts";
import type { Email } from "./triage/types.ts";

// Read-only Gmail over IMAP with an App Password — no Google Cloud project, no
// OAuth. Dave generates a 16-char App Password (Google account > Security) and
// pastes it once; it lives in the OS vault like every other credential.
const DEFAULT_HOST = "imap.gmail.com";

// Coerce a Date/string (or nothing, or garbage) to a valid ISO timestamp.
function iso(d?: Date | string): string {
  const t = d ? new Date(d).getTime() : Date.now();
  return new Date(Number.isNaN(t) ? Date.now() : t).toISOString();
}

export function isEmailConfigured(): boolean {
  return !!getSecret(IMAP_USER) && !!getSecret(IMAP_PASSWORD);
}

function connection(user: string, pass: string, host: string) {
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  // imapflow emits "error" later (e.g. a socket timeout); unheard, that's an uncaught exception.
  client.on("error", (err) => console.error("[email] connection error:", err.message));
  return client;
}

export type LoginProblem = "app_password_required" | "bad_login" | "google_blocked" | "unreachable" | "error";

// Pure: turn an imapflow login error into a reason Dave can act on. Gmail says
// exactly what's wrong in responseText; the admin page maps these codes to copy
// (codes, not raw server text, go in the URL).
export function loginProblem(err: unknown): LoginProblem {
  const e = (err ?? {}) as { authenticationFailed?: boolean; responseText?: string; code?: string };
  const text = e.responseText ?? "";
  if (/application-specific password/i.test(text)) return "app_password_required";
  if (/web browser/i.test(text)) return "google_blocked";
  if (e.authenticationFailed) return "bad_login";
  if (/^(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ETIMEOUT|EHOSTUNREACH|ENETUNREACH|NoConnection)$/.test(e.code ?? "")) {
    return "unreachable";
  }
  return "error";
}

// Credential check for the setup form: null when the login works, otherwise why
// it didn't — so a wrong password says what to fix instead of failing silently.
export async function verifyLogin(user: string, pass: string, host = DEFAULT_HOST): Promise<LoginProblem | null> {
  const client = connection(user, pass, host);
  try {
    await client.connect();
    await client.logout();
    return null;
  } catch (err) {
    client.close(); // a failed login otherwise leaves the socket open
    const e = err as { message?: string; responseText?: string; code?: string };
    console.error("[email] login check failed:", e.responseText || e.code || e.message);
    return loginProblem(err);
  }
}

// Pure: is this mass mail (marketing, newsletters, list traffic)? Gmail/Yahoo
// require List-Unsubscribe on bulk senders, so it's the one reliable tell.
// ponytail: header heuristic only; misses one-to-one-looking cold pitches — Dave's
// thumbs-down mutes those (lib/triage/feedback.ts).
export function isBulk(headers: Map<string, unknown>): boolean {
  if (headers.has("list-unsubscribe") || headers.has("list-id")) return true;
  return /^(bulk|list|junk)$/i.test(String(headers.get("precedence") ?? "").trim());
}

// Recent person-to-person inbox mapped to the Email shape the digest expects.
// Scans the last `scan` messages, skips bulk mail, keeps the newest `max`.
// Returns [] when email isn't set up, so the caller falls back to the mock inbox.
export async function fetchRecentEmails(max = 15, scan = 75): Promise<Email[]> {
  const user = getSecret(IMAP_USER);
  const pass = getSecret(IMAP_PASSWORD);
  if (!user || !pass) return [];
  const host = getSecret(IMAP_HOST) || DEFAULT_HOST;

  const client = connection(user, pass, host);
  const emails: Email[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0;
      if (!total) return [];
      const start = Math.max(1, total - scan + 1);
      for await (const msg of client.fetch(`${start}:*`, { envelope: true, source: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        if (isBulk(parsed.headers)) continue;
        emails.push({
          id: String(msg.uid ?? msg.seq),
          from: parsed.from?.text || msg.envelope?.from?.[0]?.address || "(unknown sender)",
          role: "unknown",
          subject: parsed.subject || msg.envelope?.subject || "(no subject)",
          body: (parsed.text || "").trim().slice(0, 500),
          receivedAt: iso(parsed.date ?? msg.envelope?.date),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return emails.reverse().slice(0, max); // newest first
}
