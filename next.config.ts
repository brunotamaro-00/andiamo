import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    // Client router cache: re-visiting a tab/page within 30s skips the server
    // round-trip. Server Actions purge this cache on mutation, so it never
    // serves stale data after an edit.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
