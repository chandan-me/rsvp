import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent exposed production source maps (Required Action 18)
  productionBrowserSourceMaps: false,

  // Restrict allowed development origin domains
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "localhost:8025",
  ],

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
