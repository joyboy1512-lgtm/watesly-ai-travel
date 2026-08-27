import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/flights/results", "/hotels/results", "/book", "/dashboard/", "/account/"],
    },
    sitemap: "https://www.weekendgate.com/sitemap.xml",
  };
}
