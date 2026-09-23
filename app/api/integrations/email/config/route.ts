import "server-only";
import { NextResponse } from "next/server";
import { setSecret, IMAP_USER, IMAP_PASSWORD } from "@/lib/secrets";
import { verifyLogin } from "@/lib/email";

// Dave enters his Gmail address + a 16-char App Password. We verify the login
// before saving so a wrong password fails loudly instead of silently.
export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("email") ?? "").trim();
  const pass = String(form.get("appPassword") ?? "").replace(/\s+/g, ""); // Google shows app passwords with spaces
  const back = (s: string) => NextResponse.redirect(new URL(`/admin?email=${s}`, request.url), { status: 303 });

  if (!user || !pass) return back("error");
  if (!(await verifyLogin(user, pass))) return back("error");

  setSecret(IMAP_USER, user);
  setSecret(IMAP_PASSWORD, pass);
  return back("connected");
}
