export type WeekendDeal = {
  id: string;
  slug: string;
  destinationSlug: string;
  titleAr: string;
  titleEn: string;
  countryFlag: string;
  city: string;
  image: string;
  includes: Array<"flight" | "hotel" | "transfer" | "activity">;
  originalPriceMinor: number;
  salePriceMinor: number;
  currency: string;
  nights: number;
  active: boolean;
  startAt?: string;
  endAt?: string;
  descriptionAr: string;
  descriptionEn: string;
};

export const WEEKEND_DEALS: WeekendDeal[] = [
  {
    id: "deal-dubai-weekend",
    slug: "dubai-weekend",
    destinationSlug: "dubai",
    titleAr: "عطلة دبي نهاية الأسبوع",
    titleEn: "Dubai Weekend",
    countryFlag: "🇦🇪",
    city: "دبي",
    image: "/media/destinations/dubai.jpg?v=1",
    includes: ["flight", "hotel", "transfer"],
    originalPriceMinor: 229_000,
    salePriceMinor: 199_000,
    currency: "KWD",
    nights: 3,
    active: true,
    descriptionAr: "طيران + فندق 4★ + نقل المطار — مغادرة من الكويت.",
    descriptionEn: "Flight + 4★ hotel + airport transfer from Kuwait.",
  },
  {
    id: "deal-bahrain-weekend",
    slug: "bahrain-weekend",
    destinationSlug: "bahrain",
    titleAr: "عطلة البحرين",
    titleEn: "Bahrain Weekend",
    countryFlag: "🇧🇭",
    city: "المنامة",
    image: "/media/destinations/doha.jpg?v=1",
    includes: ["flight", "hotel"],
    originalPriceMinor: 149_000,
    salePriceMinor: 129_000,
    currency: "KWD",
    nights: 2,
    active: true,
    descriptionAr: "رحلة قصيرة مثالية لنهاية الأسبوع.",
    descriptionEn: "A short perfect weekend getaway.",
  },
  {
    id: "deal-doha-weekend",
    slug: "doha-weekend",
    destinationSlug: "doha",
    titleAr: "عطلة الدوحة",
    titleEn: "Doha Weekend",
    countryFlag: "🇶🇦",
    city: "الدوحة",
    image: "/media/destinations/doha.jpg?v=1",
    includes: ["flight", "hotel", "transfer"],
    originalPriceMinor: 189_000,
    salePriceMinor: 165_000,
    currency: "KWD",
    nights: 3,
    active: true,
    descriptionAr: "طيران + فندق + نقل — استكشف كتارا والسوق.",
    descriptionEn: "Flight + hotel + transfer — explore Katara & Souq.",
  },
  {
    id: "deal-istanbul-weekend",
    slug: "istanbul-weekend",
    destinationSlug: "istanbul",
    titleAr: "عطلة إسطنبول",
    titleEn: "Istanbul Weekend",
    countryFlag: "🇹🇷",
    city: "إسطنبول",
    image: "/media/destinations/istanbul.jpg?v=1",
    includes: ["flight", "hotel", "activity"],
    originalPriceMinor: 219_000,
    salePriceMinor: 189_000,
    currency: "KWD",
    nights: 4,
    active: true,
    descriptionAr: "طيران + فندق + جولة البوسفور.",
    descriptionEn: "Flight + hotel + Bosphorus tour.",
  },
  {
    id: "deal-riyadh-weekend",
    slug: "riyadh-weekend",
    destinationSlug: "riyadh",
    titleAr: "عطلة الرياض",
    titleEn: "Riyadh Weekend",
    countryFlag: "🇸🇦",
    city: "الرياض",
    image: "/media/destinations/dubai.jpg?v=1",
    includes: ["flight", "hotel", "transfer"],
    originalPriceMinor: 175_000,
    salePriceMinor: 155_000,
    currency: "KWD",
    nights: 3,
    active: true,
    descriptionAr: "عاصمة الحيوية — طيران وفندق ونقل.",
    descriptionEn: "Flight + hotel + transfer to Riyadh.",
  },
  {
    id: "deal-muscat-weekend",
    slug: "muscat-weekend",
    destinationSlug: "muscat",
    titleAr: "عطلة مسقط",
    titleEn: "Muscat Weekend",
    countryFlag: "🇴🇲",
    city: "مسقط",
    image: "/media/destinations/maldives.jpg?v=1",
    includes: ["flight", "hotel"],
    originalPriceMinor: 169_000,
    salePriceMinor: 149_000,
    currency: "KWD",
    nights: 3,
    active: true,
    descriptionAr: "هدوء الخليج — طيران + فندق.",
    descriptionEn: "Gulf calm — flight + hotel.",
  },
];

export function dealSavingsMinor(deal: WeekendDeal): number {
  return Math.max(0, deal.originalPriceMinor - deal.salePriceMinor);
}

export function listActiveDeals(deals: WeekendDeal[] = WEEKEND_DEALS): WeekendDeal[] {
  return deals.filter((d) => d.active);
}

export function getDealBySlug(
  slug: string,
  deals: WeekendDeal[] = WEEKEND_DEALS,
): WeekendDeal | undefined {
  return deals.find((d) => d.slug === slug || d.id === slug);
}
