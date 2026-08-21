import type { NextConfig } from "next";

// URL nội bộ trong cluster tới config_service (Service "config-service", port 8005).
// Có thể override bằng biến môi trường CONFIG_SERVICE_INTERNAL_URL khi chạy ngoài k8s.
const CONFIG_SERVICE_INTERNAL_URL =
  process.env.CONFIG_SERVICE_INTERNAL_URL || "http://config-service:8005";

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
  // Proxy các request từ trang /admin/settings (gọi "/api/config-service/...")
  // sang config_service trong cluster, tránh lộ Service nội bộ ra ngoài trình duyệt
  // và tránh vấn đề CORS.
  async rewrites() {
    return [
      {
        source: "/api/config-service/:path*",
        destination: `${CONFIG_SERVICE_INTERNAL_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;