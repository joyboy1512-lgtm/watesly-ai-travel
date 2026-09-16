import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@watesly-travel/shared"],
};

export default nextConfig;
