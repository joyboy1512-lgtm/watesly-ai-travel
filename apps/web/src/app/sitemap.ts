import type { MetadataRoute } from "next";

const BASE = "https://www.weekendgate.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/about",
    "/booking-policy",
    "/faq",
    "/contact",
    "/terms",
    "/privacy",
    "/chat",
    "/account/login",
  ];
  return pages.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
