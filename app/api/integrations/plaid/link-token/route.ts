import "server-only";
import { NextResponse } from "next/server";
import { createLinkToken } from "@/lib/plaid";

export async function POST() {
  try {
    const link_token = await createLinkToken();
    if (!link_token) return NextResponse.json({ error: "not_configured" }, { status: 400 });
    return NextResponse.json({ link_token });
  } catch (err) {
    console.error("[plaid] link token create failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
