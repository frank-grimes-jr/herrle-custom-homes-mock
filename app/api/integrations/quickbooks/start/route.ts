import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authorizeUrl } from "@/lib/quickbooks";

export async function GET(request: Request) {
  const state = randomUUID();
  const url = authorizeUrl(state);
  if (!url) {
    return NextResponse.redirect(new URL("/admin?quickbooks=not_configured", request.url));
  }
  (await cookies()).set("qbo_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
