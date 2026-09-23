import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/quickbooks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId") ?? ""; // the QuickBooks company id

  const jar = await cookies();
  const expected = jar.get("qbo_oauth_state")?.value;
  jar.delete("qbo_oauth_state");

  const back = (s: string) => NextResponse.redirect(new URL(`/admin?quickbooks=${s}`, request.url));

  if (!code || !state || !expected || state !== expected) return back("error");

  try {
    const ok = await exchangeCode(code, realmId);
    return back(ok ? "connected" : "error");
  } catch (err) {
    console.error("[quickbooks] token exchange failed:", err);
    return back("error");
  }
}
