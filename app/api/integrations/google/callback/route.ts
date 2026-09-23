import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { oauthClient, isGoogleConnected } from "@/lib/google";
import { setSecret, GOOGLE_REFRESH_TOKEN } from "@/lib/secrets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expected = jar.get("g_oauth_state")?.value;
  jar.delete("g_oauth_state");

  const back = (status: string) =>
    NextResponse.redirect(new URL(`/admin?google=${status}`, request.url));

  if (!code || !state || !expected || state !== expected) return back("error");

  const client = oauthClient();
  if (!client) return back("not_configured");

  try {
    const { tokens } = await client.getToken(code);
    // Refresh token only comes back with access_type=offline + prompt=consent;
    // if a re-consent omits it, keep the one already stored.
    if (tokens.refresh_token) setSecret(GOOGLE_REFRESH_TOKEN, tokens.refresh_token);
    return back(isGoogleConnected() ? "connected" : "error");
  } catch (err) {
    console.error("[google] token exchange failed:", err);
    return back("error");
  }
}
