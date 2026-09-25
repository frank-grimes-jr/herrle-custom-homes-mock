import { NextResponse, type NextRequest } from "next/server";

// Dave only ever lands on localhost:3000 via the QuickBooks OAuth round trip,
// and after that the browser autocompletes to it. Send any page visit on a
// loopback host back to his everyday address (same default as lib/quickbooks.ts).
// /api is excluded by the matcher, so the OAuth start/callback stay on localhost.
const APP_URL = process.env.APP_URL ?? "http://herrle.internal";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function proxy(request: NextRequest) {
  // Dev (and the preview pane) run on whatever port is free; leave them alone.
  if (process.env.NODE_ENV !== "production") return;
  // request.url carries Next's listen address, not the Host header the browser sent.
  if (!LOOPBACK.test(request.headers.get("host") ?? "")) return;
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(pathname + search, APP_URL));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
