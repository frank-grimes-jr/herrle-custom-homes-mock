import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authorizeUrl, APP_URL } from "@/lib/quickbooks";

// Reached on QBO_START_URL (localhost), so the state cookie lands on the callback's origin.
export async function GET() {
  const state = randomUUID();
  const url = authorizeUrl(state);
  if (!url) {
    return NextResponse.redirect(new URL("/admin?quickbooks=not_configured", APP_URL));
  }
  (await cookies()).set("qbo_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
