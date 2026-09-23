import "server-only";
import { NextResponse } from "next/server";
import { setSecret, PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV } from "@/lib/secrets";

// One-time developer step: store the Plaid app's client id/secret + environment.
export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("clientId") ?? "").trim();
  const secret = String(form.get("secret") ?? "").trim();
  const env = String(form.get("environment") ?? "sandbox").trim();
  if (id) setSecret(PLAID_CLIENT_ID, id);
  if (secret) setSecret(PLAID_SECRET, secret);
  setSecret(PLAID_ENV, env === "production" ? "production" : "sandbox");
  return NextResponse.redirect(new URL("/admin?plaid=configured", request.url), { status: 303 });
}
