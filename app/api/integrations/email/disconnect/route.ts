import "server-only";
import { NextResponse } from "next/server";
import { deleteSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "@/lib/secrets";

export async function POST(request: Request) {
  deleteSecret(IMAP_USER);
  deleteSecret(IMAP_PASSWORD);
  deleteSecret(IMAP_HOST);
  return NextResponse.redirect(new URL("/admin?email=disconnected", request.url), { status: 303 });
}
