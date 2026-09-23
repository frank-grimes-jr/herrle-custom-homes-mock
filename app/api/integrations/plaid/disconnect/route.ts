import "server-only";
import { NextResponse } from "next/server";
import { disconnectPlaid } from "@/lib/plaid";

export async function POST(request: Request) {
  disconnectPlaid();
  return NextResponse.redirect(new URL("/admin?plaid=disconnected", request.url), { status: 303 });
}
