"use client";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

// Dave's "Connect bank" button. Fetches a Plaid link_token, opens Plaid Link so
// he picks his bank and logs into it directly (we never see those credentials),
// then hands the returned public_token to the server to store an access_token.
export function PlaidConnect({ className }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSuccess = useCallback(async (publicToken: string | null) => {
    if (!publicToken) return;
    await fetch("/api/integrations/plaid/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token: publicToken }),
    });
    window.location.href = "/admin?plaid=connected";
  }, []);

  const { open, ready } = usePlaidLink({ token: token ?? "", onSuccess });

  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/plaid/link-token", { method: "POST" });
      const data = await res.json();
      if (data.link_token) setToken(data.link_token);
      else window.location.href = "/admin?plaid=error";
    } catch {
      window.location.href = "/admin?plaid=error";
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={connect} disabled={busy} className={className}>
      {busy ? "Opening…" : "Connect bank"}
    </button>
  );
}
