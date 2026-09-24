"use client";
import { useState } from "react";

export function Analyze({ className }: { className?: string }) {
  const [state, setState] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setState("Analyzing…");
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      setState(res.ok ? `Found ${data.findings} item(s) across ${data.threads} threads.` : data.error);
    } catch {
      setState("Analysis unavailable — try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy} className={className}>Analyze now</button>
      {state && <span className="text-sm text-muted">{state}</span>}
    </div>
  );
}
