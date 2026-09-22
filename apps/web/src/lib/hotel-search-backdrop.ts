export const HOTEL_SEARCH_DEFAULT_BACKDROP = "/media/hero/night-city-gold.jpg";

const BACKDROPS: Array<{ test: RegExp; src: string }> = [
  { test: /دبي|dubai|\bdxb\b/i, src: "/media/destinations/dubai.jpg?v=1" },
  { test: /إسطنبول|اسطنبول|istanbul|\bist\b/i, src: "/media/destinations/istanbul.jpg?v=1" },
  { test: /مالديف|maldives|\bmle\b/i, src: "/media/destinations/maldives.jpg?v=1" },
  { test: /لندن|london|\blhr\b|\blgw\b/i, src: "/media/destinations/london.jpg?v=1" },
  { test: /باريس|paris|\bcdg\b/i, src: "/media/destinations/paris.jpg?v=1" },
  { test: /دوحة|doha|\bdoh\b/i, src: "/media/destinations/doha.jpg?v=1" },
  { test: /بحرين|bahrain|\bbah\b/i, src: "/media/destinations/bahrain.jpg?v=2" },
  { test: /رياض|riyadh|\bruh\b/i, src: "/media/destinations/riyadh.jpg?v=2" },
  { test: /مسقط|muscat|\bmct\b/i, src: "/media/destinations/muscat.jpg?v=2" },
];

/** City or vista photo behind the hotel results search engine. */
export function hotelSearchBackdrop(destination: string): string {
  const q = destination.trim();
  if (!q) return HOTEL_SEARCH_DEFAULT_BACKDROP;
  const hit = BACKDROPS.find((row) => row.test.test(q));
  return hit?.src || HOTEL_SEARCH_DEFAULT_BACKDROP;
}
