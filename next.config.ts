import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Optimize for Vercel deployment
  poweredByHeader: false,
};

export default nextConfig;
