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
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
