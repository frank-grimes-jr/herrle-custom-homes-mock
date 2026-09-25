import type { ReactNode } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SectionCard } from "@/components/SectionCard";
import { PlaidConnect } from "@/components/admin/PlaidConnect";
import { Analyze } from "@/components/admin/Analyze";
import { isEmailConfigured } from "@/lib/email";
import { isQuickBooksConfigured, isQuickBooksConnected, QBO_REDIRECT_URI, QBO_START_URL } from "@/lib/quickbooks";
import { isPlaidConfigured, isPlaidConnected } from "@/lib/plaid";
import { getAnalysisSettings, DEFAULT_SETTINGS } from "@/lib/settings";

export const dynamic = "force-dynamic"; // reflect live vault state on every request

const PRIMARY = "rounded-lg bg-primary px-3 py-1.5 text-sm text-canvas hover:opacity-90";
// Google hides this page from the Security menu; the direct link is the only reliable way in.
const APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";

const MESSAGES: Record<string, string> = {
  connected: "connected.",
  disconnected: "disconnected.",
  configured: "credentials saved — you can connect now.",
  not_configured: "needs credentials first.",
  error: "couldn’t connect. Please check the details and try again.",
  saved: "settings saved.",
  // Email login failures — Gmail's reason, in plain words.
  bad_login: "sign-in was rejected. Check the Gmail address and the 16-character App Password.",
  app_password_required:
    "needs an App Password, not your regular Google password — create one at myaccount.google.com/apppasswords.",
  google_blocked: "sign-in was blocked by Google. Open Gmail in a browser, confirm it was you, then try again.",
  unreachable: "couldn’t reach Gmail. Check the internet connection and try again.",
};
const PROVIDER_NAMES: Record<string, string> = {
  email: "Email",
  quickbooks: "QuickBooks",
  plaid: "Bank",
  analysis: "Analysis",
};

type SP = { email?: string; quickbooks?: string; plaid?: string; analysis?: string };

function statusNotice(sp: SP): string | null {
  for (const key of ["email", "quickbooks", "plaid", "analysis"] as const) {
    const v = sp[key];
    if (v && MESSAGES[v]) return `${PROVIDER_NAMES[key]} ${MESSAGES[v]}`;
  }
  return null;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const notice = statusNotice(sp);

  const email = isEmailConfigured();
  const qbo = { configured: isQuickBooksConfigured(), connected: isQuickBooksConnected() };
  const plaid = { configured: isPlaidConfigured(), connected: isPlaidConnected() };
  const settings = getAnalysisSettings();

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
          {/* Email (Gmail over IMAP — app password, no Google Cloud) */}
          <div className="py-4 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg text-ink">Email (Gmail)</span>
                  <StatusPill ok={email} />
                </div>
                <p className="mt-1 text-sm text-muted">Reads your inbox for the daily briefs.</p>
              </div>
              {email && <DisconnectForm action="/api/integrations/email/disconnect" />}
            </div>

            {!email && (
              <form
                method="post"
                action="/api/integrations/email/config"
                className="mt-3 grid gap-3 sm:max-w-md"
              >
                <p className="text-sm text-muted">
                  Enter your Gmail address and a 16-character <strong>App Password</strong> — not
                  your regular Google password. Create one at{" "}
                  <a
                    href={APP_PASSWORDS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline underline-offset-2"
                  >
                    myaccount.google.com/apppasswords
                  </a>{" "}
                  (2-Step Verification must be on first).
                </p>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted">Gmail address</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted">App password</span>
                  <input
                    name="appPassword"
                    type="password"
                    required
                    autoComplete="off"
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
                  />
                </label>
                <button className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90">
                  Connect email
                </button>
              </form>
            )}
          </div>

          <ConnectionRow
            name="QuickBooks"
            description="Your books — invoices, AR/AP, and margins."
            connected={qbo.connected}
          >
            {qbo.connected ? (
              <DisconnectForm action="/api/integrations/quickbooks/disconnect" />
            ) : qbo.configured ? (
              <a href={QBO_START_URL} className={PRIMARY}>
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

      {/* Developer setup — one-time per provider. Hidden once configured. */}
      {(!qbo.configured || !plaid.configured) && (
        <SectionCard title="Developer setup (one-time)" className="mt-6">
          <div className="grid gap-8">
            {!qbo.configured && (
              <SetupForm
                title="QuickBooks"
                action="/api/integrations/quickbooks/config"
                redirectUri={QBO_REDIRECT_URI}
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

      {/* Analysis */}
      <SectionCard title="Analysis" className="mt-6">
        {isEmailConfigured() ? (
          <Analyze className="rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90" />
        ) : (
          <p className="text-sm text-muted">Connect email above to enable analysis.</p>
        )}
        <p className="mt-2 text-xs text-muted">Uses this computer&rsquo;s Claude Code sign-in.</p>
        <form method="post" action="/api/analysis/settings" className="mt-6 grid gap-3 sm:max-w-xl">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Reasoning model</span>
            <select
              name="reasonModel"
              defaultValue={settings.reasonModel}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            >
              <option value="claude-opus-4-8">Claude Opus 4.8 (default)</option>
              <option value="claude-opus-5-5">Claude Opus 5.5</option>
            </select>
          </label>
          <input type="hidden" name="enrichModel" value={settings.enrichModel} />
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Window (days)</span>
              <input
                name="windowDays"
                type="number"
                min="1"
                required
                defaultValue={settings.windowDays}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Max threads</span>
              <input
                name="maxThreads"
                type="number"
                min="1"
                required
                defaultValue={settings.maxThreads}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Reasoning prompt</span>
            <textarea
              name="systemPrompt"
              rows={8}
              defaultValue={settings.systemPrompt}
              className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink"
            />
          </label>
          <div className="flex gap-3">
            <button className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90">
              Save analysis settings
            </button>
            <button
              name="systemPrompt"
              value={DEFAULT_SETTINGS.systemPrompt}
              formNoValidate
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface-2"
            >
              Reset prompt to default
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Set by scripts/supervisor.mjs — shows which build auto-update has installed. */}
      {process.env.HERRLE_VERSION && (
        <p className="mt-6 text-xs text-muted">Version {process.env.HERRLE_VERSION}</p>
      )}
    </main>
  );
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${ok ? "bg-sage/15 text-sage" : "text-muted"}`}>
      {ok ? "Connected" : "Not connected"}
    </span>
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
    <div className="flex flex-wrap items-start justify-between gap-4 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg text-ink">{name}</span>
          <StatusPill ok={connected} />
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
