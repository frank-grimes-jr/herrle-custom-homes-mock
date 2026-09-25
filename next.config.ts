import type { NextConfig } from "next";

// Server build for Dave's local app: real API routes, runtime secret access,
// live data. `standalone` so CI can ship a self-contained release
// (scripts/package-release.mjs) — the laptop never runs npm or next build.
const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  serverExternalPackages: ["@napi-rs/keyring", "plaid", "imapflow", "mailparser", "email-reply-parser"],
};

export default nextConfig;
