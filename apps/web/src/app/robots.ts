import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NEXT_PUBLIC_SITE_ENV === "production";
  if (!isProd && process.env.VERCEL_ENV === "preview") {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/account/",
        "/book",
        "/book/",
        "/hotels/book/",
        "/bookings/manage",
        "/*?*",
      ],
    },
    sitemap: "https://www.weekendgate.com/sitemap.xml",
  };
}
