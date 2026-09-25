import "server-only";
import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runAnalysis } from "@/lib/analysis/run";

export async function POST() {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Connect email first." }, { status: 400 });
  }
  try {
    const result = await runAnalysis();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[analysis] run failed:", err);
    return NextResponse.json({ error: "Analysis unavailable — try again." }, { status: 500 });
  }
}
