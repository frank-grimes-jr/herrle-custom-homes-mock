import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { oauthClient, GOOGLE_SCOPES } from "@/lib/google";

// Kick off the OAuth consent flow. A random `state` in an httpOnly cookie guards
// against a local page forging the callback (CSRF).
export async function GET(request: Request) {
  const client = oauthClient();
  if (!client) {
    return NextResponse.redirect(new URL("/admin?google=not_configured", request.url));
  }
  const state = randomUUID();
  (await cookies()).set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const authUrl = client.generateAuthUrl({
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // force a refresh token even on re-consent
    scope: GOOGLE_SCOPES,
    state,
  });
  return NextResponse.redirect(authUrl);
}
