/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@watesly-travel/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.hotelbeds.com" },
      { protocol: "https", hostname: "photos.hotelbeds.com" },
      { protocol: "http", hostname: "photos.hotelbeds.com" },
    ],
  },
};

module.exports = nextConfig;
