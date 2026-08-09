import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls native/wasm bits; keep it external on the server bundle
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
