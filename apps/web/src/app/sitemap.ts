import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.weekendgate.com";
  const paths = [
    "",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/booking-policy",
    "/payment-policy",
    "/flights/results",
    "/hotels/results",
  ];
  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
