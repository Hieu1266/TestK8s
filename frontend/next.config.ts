import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  // Bỏ qua lỗi TypeScript khi build Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  // Bỏ qua lỗi ESLint khi build Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;