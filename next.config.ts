import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/targets", destination: "/pipeline", permanent: true }];
  },
};

export default nextConfig;
