import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from
// https://frank-grimes-jr.github.io/herrle-custom-homes-mock/, so it needs a
// basePath in production; local dev stays at the root.
const repo = "herrle-custom-homes-mock";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? `/${repo}` : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
