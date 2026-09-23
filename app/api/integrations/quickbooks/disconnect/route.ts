import "server-only";
import { NextResponse } from "next/server";
import { disconnectQuickBooks } from "@/lib/quickbooks";

export async function POST(request: Request) {
  disconnectQuickBooks();
  return NextResponse.redirect(new URL("/admin?quickbooks=disconnected", request.url), { status: 303 });
}
