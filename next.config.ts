import type { NextConfig } from "next";

// Two build targets from one repo:
//   • BUILD_TARGET=pages → static export of the PUBLIC MOCK DEMO for GitHub Pages
//     (unchanged behavior). Static export can't carry the OAuth/admin route
//     handlers, and the demo must not expose real connections anyway — so the
//     demo is intentionally the mock-only build.
//   • default (unset)   → SERVER mode for Dave's LOCAL app: real API routes,
//     runtime secret access, live data. Run with `next start`.
const repo = "herrle-custom-homes-mock";
const isPages = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = isPages
  ? { output: "export", basePath: `/${repo}`, trailingSlash: true, images: { unoptimized: true } }
  : { images: { unoptimized: true }, serverExternalPackages: ["@napi-rs/keyring", "googleapis", "plaid"] };

export default nextConfig;
