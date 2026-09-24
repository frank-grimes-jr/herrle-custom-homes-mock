"use client";
import { useState } from "react";

export function Analyze({ className }: { className?: string }) {
  const [state, setState] = useState<string>("");
  const run = async () => {
    setState("Analyzing…");
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      setState(res.ok ? `Found ${data.findings} item(s) across ${data.threads} threads.` : data.error);
    } catch {
      setState("Analysis unavailable — try again.");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button onClick={run} className={className}>Analyze now</button>
      {state && <span className="text-sm text-muted">{state}</span>}
    </div>
  );
}
