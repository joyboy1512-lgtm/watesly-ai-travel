import type { MetadataRoute } from "next";
import { DESTINATION_GUIDES, WEEKEND_DEALS, isPlatformEnabled } from "@watesly-travel/shared";

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

  if (isPlatformEnabled()) {
    paths.push("/deals", "/destinations", "/trip-builder", "/book/checkout");
    for (const d of DESTINATION_GUIDES) paths.push(`/destinations/${d.slug}`);
    for (const deal of WEEKEND_DEALS.filter((x) => x.active)) {
      paths.push(`/deals/${deal.slug}`);
    }
  }

  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/destinations") ? 0.85 : 0.7,
  }));
}
