// lib/analysis/gather.ts
// Node-testable module: no "server-only", relative .ts imports (see Global Constraints).
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import EmailReplyParser from "email-reply-parser";
import { getSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "../secrets.ts";
import { getAnalysisSettings } from "../settings.ts";
import type { RawMessage, ThreadSummary } from "./types.ts";

// Keep only the visible (non-quoted, non-signature) text of a message.
export function stripQuoted(body: string): string {
  try {
    return new EmailReplyParser().read(body).getVisibleText().trim();
  } catch {
    return body.trim();
  }
}

// Group messages into threads; turns ordered oldest→newest.
export function collapseThreads(msgs: RawMessage[]): ThreadSummary[] {
  const byThread = new Map<string, RawMessage[]>();
  for (const m of msgs) {
    const arr = byThread.get(m.threadKey) ?? [];
    arr.push(m);
    byThread.set(m.threadKey, arr);
  }
  const out: ThreadSummary[] = [];
  for (const [threadId, arr] of byThread) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
    out.push({
      threadId,
      subject: arr[arr.length - 1].subject,
      participants: [...new Set(arr.map((m) => m.from))],
      turns: arr.map((m) => ({ id: m.id, from: m.from, date: m.date, text: stripQuoted(m.body) })),
    });
  }
  return out;
}

const DEFAULT_HOST = "imap.gmail.com";

async function fetchFolder(client: ImapFlow, mailbox: string, folder: "inbox" | "sent", sinceDays: number, max: number): Promise<RawMessage[]> {
  const out: RawMessage[] = [];
  const lock = await client.getMailboxLock(mailbox);
  try {
    const since = new Date(Date.now() - sinceDays * 864e5);
    const uids = await client.search({ since });
    const recent = (uids || []).slice(-max);
    if (recent.length === 0) return out;
    for await (const msg of client.fetch(recent, { envelope: true, source: true, threadId: true })) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      out.push({
        id: String(msg.uid),
        threadKey: msg.threadId ? String(msg.threadId) : (parsed.subject || "").replace(/^(re|fwd):\s*/i, "").trim() || String(msg.uid),
        folder,
        from: parsed.from?.text || "(unknown)",
        subject: parsed.subject || "(no subject)",
        date: (parsed.date ?? new Date()).toISOString(),
        body: parsed.text || "", // mailparser derives .text from HTML; never fall back to the subject line

      });
    }
  } finally {
    lock.release();
  }
  return out;
}

// Live IMAP fetch (inbox + sent), deduped + thread-collapsed. [] when not configured.
export async function gatherEmail(): Promise<ThreadSummary[]> {
  const user = getSecret(IMAP_USER);
  const pass = getSecret(IMAP_PASSWORD);
  if (!user || !pass) return [];
  const { windowDays, maxThreads } = getAnalysisSettings();
  const host = getSecret(IMAP_HOST) || DEFAULT_HOST;
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  client.on("error", (err) => console.error("[analysis] imap connection error:", err.message)); // unheard = uncaught exception

  const msgs: RawMessage[] = [];
  await client.connect();
  try {
    msgs.push(...(await fetchFolder(client, "INBOX", "inbox", windowDays, maxThreads * 4)));
    try {
      msgs.push(...(await fetchFolder(client, "[Gmail]/Sent Mail", "sent", windowDays, maxThreads * 4)));
    } catch {
      /* sent mailbox name varies; inbox alone is still useful */
    }
  } finally {
    await client.logout();
  }
  return collapseThreads(msgs).slice(-maxThreads);
}
