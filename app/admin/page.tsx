import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SectionCard } from "@/components/SectionCard";
import { isGoogleConfigured, isGoogleConnected } from "@/lib/google";

export const dynamic = "force-dynamic"; // reflect live vault state on every request

const STATUS: Record<string, string> = {
  connected: "Google connected.",
  disconnected: "Google disconnected.",
  configured: "Google credentials saved — you can connect now.",
  not_configured: "Add Google credentials first.",
  error: "Something went wrong connecting Google. Please try again.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google: status } = await searchParams;
  const configured = isGoogleConfigured();
  const connected = isGoogleConnected();

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

      {status && STATUS[status] && (
        <p className="mb-6 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink">
          {STATUS[status]}
        </p>
      )}

      <SectionCard title="Connections">
        <div className="divide-y divide-line">
          {/* Google Workspace */}
          <div className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg text-ink">Google Workspace</span>
                <StatusPill ok={connected} okLabel="Connected" offLabel="Not connected" />
              </div>
              <p className="mt-1 text-sm text-muted">
                Read-only access to Gmail, Calendar, and Drive.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {connected ? (
                <form method="post" action="/api/integrations/google/disconnect">
                  <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
                    Disconnect
                  </button>
                </form>
              ) : configured ? (
                <a
                  href="/api/integrations/google/start"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-canvas hover:opacity-90"
                >
                  Connect Google
                </a>
              ) : null}
            </div>
          </div>

          {/* Bank & financials — reserved slot */}
          <div className="flex flex-wrap items-start justify-between gap-4 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg text-ink">Bank &amp; financials</span>
                <StatusPill ok={false} okLabel="" offLabel="Not set up" />
              </div>
              <p className="mt-1 text-sm text-muted">
                Cash and account balances. Configured in a later update.
              </p>
            </div>
            <button
              disabled
              className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-sm text-muted opacity-60"
            >
              Connect
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Developer setup — normally done once. Hidden after credentials exist. */}
      {!configured && (
        <SectionCard title="Set up Google credentials" className="mt-6">
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Paste the OAuth client from your Google Cloud project (type: Web application), and
            register this redirect URI on it:{" "}
            <code className="text-ink">
              http://localhost:3000/api/integrations/google/callback
            </code>
          </p>
          <form
            method="post"
            action="/api/integrations/google/config"
            className="grid gap-3 sm:max-w-md"
          >
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Client ID</span>
              <input
                name="clientId"
                required
                autoComplete="off"
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Client secret</span>
              <input
                name="clientSecret"
                type="password"
                required
                autoComplete="off"
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
              />
            </label>
            <button className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-canvas hover:opacity-90">
              Save credentials
            </button>
          </form>
        </SectionCard>
      )}
    </main>
  );
}

function StatusPill({
  ok,
  okLabel,
  offLabel,
}: {
  ok: boolean;
  okLabel: string;
  offLabel: string;
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${ok ? "bg-sage/15 text-sage" : "text-muted"}`}>
      {ok ? okLabel : offLabel}
    </span>
  );
}
