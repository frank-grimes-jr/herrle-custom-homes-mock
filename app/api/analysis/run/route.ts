import "server-only";
import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { runAnalysis } from "@/lib/analysis/run";
import { SIGN_IN_HINT } from "@/lib/claude";

export async function POST() {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Connect email first." }, { status: 400 });
  }
  try {
    const result = await runAnalysis();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[analysis] run failed:", err);
    const signIn = err instanceof Error && err.message === SIGN_IN_HINT; // Dave can fix this one himself
    return NextResponse.json({ error: signIn ? SIGN_IN_HINT : "Analysis unavailable — try again." }, { status: 500 });
  }
}
