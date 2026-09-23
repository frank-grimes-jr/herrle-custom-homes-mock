import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "@/lib/secrets";
import type { Email } from "@/lib/triage/types";

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
  return new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
}

// Quick credential check for the setup form, so a wrong app password fails loudly
// instead of silently falling back to the sample inbox.
export async function verifyLogin(user: string, pass: string, host = DEFAULT_HOST): Promise<boolean> {
  const client = connection(user, pass, host);
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch {
    return false;
  }
}

// Recent inbox mapped to the Email shape the digest expects. Returns [] when
// email isn't set up, so the caller falls back to the mock inbox.
export async function fetchRecentEmails(max = 15): Promise<Email[]> {
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
      const start = Math.max(1, total - max + 1);
      for await (const msg of client.fetch(`${start}:*`, { envelope: true, source: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
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
  return emails.reverse(); // newest first
}
