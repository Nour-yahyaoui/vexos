import type { NextConfig } from "next";

// Static export: `npm run build` writes a plain site to `out/` that any
// static host (GitHub Pages, Netlify, Cloudflare Pages, nginx) can serve.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
