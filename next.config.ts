import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` harus tetap external di server (jangan di-bundle) — wajib untuk Vercel/Node.
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
