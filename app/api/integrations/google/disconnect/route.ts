import "server-only";
import { NextResponse } from "next/server";
import { deleteSecret, GOOGLE_REFRESH_TOKEN } from "@/lib/secrets";

export async function POST(request: Request) {
  deleteSecret(GOOGLE_REFRESH_TOKEN);
  // 303 → turn the POST into a GET of /admin
  return NextResponse.redirect(new URL("/admin?google=disconnected", request.url), { status: 303 });
}
