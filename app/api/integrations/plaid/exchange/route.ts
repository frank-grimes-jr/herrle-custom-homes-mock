import "server-only";
import { NextResponse } from "next/server";
import { exchangePublicToken } from "@/lib/plaid";

export async function POST(request: Request) {
  try {
    const { public_token } = await request.json();
    if (!public_token || typeof public_token !== "string") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const ok = await exchangePublicToken(public_token);
    return NextResponse.json({ ok });
  } catch (err) {
    console.error("[plaid] public token exchange failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
