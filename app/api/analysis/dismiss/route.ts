import "server-only";
import { NextResponse } from "next/server";
import { dismiss } from "@/lib/signals";

export async function POST(request: Request) {
  const form = await request.formData();
  const sig = String(form.get("signature") ?? "");
  if (sig) dismiss(sig);
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
