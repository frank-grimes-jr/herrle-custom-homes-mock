import "server-only";
import { NextResponse } from "next/server";
import { setSecret, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/secrets";

// One-time developer step: store the Google Cloud OAuth client id/secret in the
// vault. Runs over the loopback-only server, so the secret never leaves the box.
export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("clientId") ?? "").trim();
  const secret = String(form.get("clientSecret") ?? "").trim();
  if (id) setSecret(GOOGLE_CLIENT_ID, id);
  if (secret) setSecret(GOOGLE_CLIENT_SECRET, secret);
  return NextResponse.redirect(new URL("/admin?google=configured", request.url), { status: 303 });
}
