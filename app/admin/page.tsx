import type { ReactNode } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SectionCard } from "@/components/SectionCard";
import { PlaidConnect } from "@/components/admin/PlaidConnect";
import { isGoogleConfigured, isGoogleConnected } from "@/lib/google";
import { isQuickBooksConfigured, isQuickBooksConnected } from "@/lib/quickbooks";
import { isPlaidConfigured, isPlaidConnected } from "@/lib/plaid";

export const dynamic = "force-dynamic"; // reflect live vault state on every request

const PRIMARY = "rounded-lg bg-primary px-3 py-1.5 text-sm text-canvas hover:opacity-90";
const SECONDARY = "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2";

const MESSAGES: Record<string, string> = {
  connected: "connected.",
  disconnected: "disconnected.",
  configured: "credentials saved — you can connect now.",
  not_configured: "needs credentials first.",
  error: "couldn’t connect. Please try again.",
};
const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  quickbooks: "QuickBooks",
  plaid: "Bank",
};

type SP = { google?: string; quickbooks?: string; plaid?: string };

function statusNotice(sp: SP): string | null {
  for (const key of ["google", "quickbooks", "plaid"] as const) {
    const v = sp[key];
    if (v && MESSAGES[v]) return `${PROVIDER_NAMES[key]} ${MESSAGES[v]}`;
  }
  return null;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const notice = statusNotice(sp);

  const google = { configured: isGoogleConfigured(), connected: isGoogleConnected() };
  const qbo = { configured: isQuickBooksConfigured(), connected: isQuickBooksConnected() };
  const plaid = { configured: isPlaidConfigured(), connected: isPlaidConnected() };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <TopNav active="admin" />

      <div className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Overview
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">Admin &amp; integrations</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Connect the data sources behind the dashboard. Credentials are kept in this
          computer&rsquo;s secure vault — never in the project files.
        </p>
      </div>

      {notice && (
        <p className="mb-6 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <SectionCard title="Connections">
        <div className="divide-y divide-line">
          <ConnectionRow
            name="Google Workspace"
            description="Read-only access to Gmail, Calendar, and Drive."
            connected={google.connected}
          >
            {google.connected ? (
              <DisconnectForm action="/api/integrations/google/disconnect" />
            ) : google.configured ? (
              <a href="/api/integrations/google/start" className={PRIMARY}>
                Connect Google
              </a>
            ) : (
              <NeedsSetup />
            )}
          </ConnectionRow>

          <ConnectionRow
            name="QuickBooks"
            description="Your books — invoices, AR/AP, and margins."
            connected={qbo.connected}
          >
            {qbo.connected ? (
              <DisconnectForm action="/api/integrations/quickbooks/disconnect" />
            ) : qbo.configured ? (
              <a href="/api/integrations/quickbooks/start" className={PRIMARY}>
                Connect QuickBooks
              </a>
            ) : (
              <NeedsSetup />
            )}
          </ConnectionRow>

          <ConnectionRow
            name="Bank"
            description="Live account balances and cash, connected through Plaid."
            connected={plaid.connected}
          >
            {plaid.connected ? (
              <DisconnectForm action="/api/integrations/plaid/disconnect" />
            ) : plaid.configured ? (
              <PlaidConnect className={PRIMARY} />
            ) : (
              <NeedsSetup />
            )}
          </ConnectionRow>
        </div>
      </SectionCard>

      {/* Developer setup — one-time per provider. Each block disappears once that
          provider's credentials exist, so in normal use Dave sees only the
          Connect / Disconnect rows above. */}
      {(!google.configured || !qbo.configured || !plaid.configured) && (
        <SectionCard title="Developer setup (one-time)" className="mt-6">
          <div className="grid gap-8">
            {!google.configured && (
              <SetupForm
                title="Google Workspace"
                action="/api/integrations/google/config"
                redirectUri="http://localhost:3000/api/integrations/google/callback"
                note="OAuth client from Google Cloud (type: Web application)."
                fields={[
                  { name: "clientId", label: "Client ID" },
                  { name: "clientSecret", label: "Client secret", password: true },
                ]}
              />
            )}
            {!qbo.configured && (
              <SetupForm
                title="QuickBooks"
                action="/api/integrations/quickbooks/config"
                redirectUri="http://localhost:3000/api/integrations/quickbooks/callback"
                note="OAuth client from your Intuit developer app."
                fields={[
                  { name: "clientId", label: "Client ID" },
                  { name: "clientSecret", label: "Client secret", password: true },
                ]}
              />
            )}
            {!plaid.configured && (
              <SetupForm
                title="Bank (Plaid)"
                action="/api/integrations/plaid/config"
                note="Keys from your Plaid dashboard. Start in Sandbox to test."
                fields={[
                  { name: "clientId", label: "Client ID" },
                  { name: "secret", label: "Secret", password: true },
                ]}
                environment
              />
            )}
          </div>
        </SectionCard>
      )}
    </main>
  );
}

function ConnectionRow({
  name,
  description,
  connected,
  children,
}: {
  name: string;
  description: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg text-ink">{name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              connected ? "bg-sage/15 text-sage" : "text-muted"
            }`}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function DisconnectForm({ action }: { action: string }) {
  return (
    <form method="post" action={action}>
      <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
        Disconnect
      </button>
    </form>
  );
}

function NeedsSetup() {
  return <span className="text-xs text-muted">Needs setup below</span>;
}

function SetupForm({
  title,
  action,
  note,
  redirectUri,
  fields,
  environment,
}: {
  title: string;
  action: string;
  note: string;
  redirectUri?: string;
  fields: { name: string; label: string; password?: boolean }[];
  environment?: boolean;
}) {
  return (
    <div>
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {note}
        {redirectUri && (
          <>
            {" "}
            Register this redirect URI: <code className="text-ink">{redirectUri}</code>
          </>
        )}
      </p>
      <form method="post" action={action} className="mt-3 grid gap-3 sm:max-w-md">
        {fields.map((f) => (
          <label key={f.name} className="grid gap-1 text-sm">
            <span className="text-muted">{f.label}</span>
            <input
              name={f.name}
              type={f.password ? "password" : "text"}
              required
              autoComplete="off"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            />
          </label>
        ))}
        {environment && (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Environment</span>
            <select
              name="environment"
              defaultValue="sandbox"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            >
              <option value="sandbox">Sandbox (test)</option>
              <option value="production">Production</option>
            </select>
          </label>
        )}
        <button className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90">
          Save credentials
        </button>
      </form>
    </div>
  );
}
