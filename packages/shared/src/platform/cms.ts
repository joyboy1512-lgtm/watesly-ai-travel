/** Lightweight CMS content store shapes (admin-editable; seeded defaults). */

export type CmsBanner = {
  id: string;
  titleAr: string;
  titleEn: string;
  image: string;
  href: string;
  active: boolean;
};

export type CmsFaq = {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
};

export type CmsArticle = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  published: boolean;
};

export type CmsHeroService = {
  key: string;
  labelAr: string;
  labelEn: string;
  hintAr?: string;
  hintEn?: string;
  enabled: boolean;
  href?: string;
  kind: "mode" | "myTrip" | "link";
};

export type CmsState = {
  banners: CmsBanner[];
  faqs: CmsFaq[];
  articles: CmsArticle[];
  heroServices: CmsHeroService[];
  updatedAt: string;
};

export const DEFAULT_CMS_HERO_SERVICES: CmsHeroService[] = [
  {
    key: "stays",
    labelAr: "فنادق",
    labelEn: "Hotels",
    hintAr: "إقامة مميزة",
    hintEn: "Find a stay",
    enabled: true,
    kind: "mode",
  },
  {
    key: "flights",
    labelAr: "رحلات",
    labelEn: "Flights",
    hintAr: "طيران",
    hintEn: "Book flights",
    enabled: true,
    kind: "mode",
  },
  {
    key: "cars",
    labelAr: "سيارات",
    labelEn: "Cars",
    hintAr: "نقل",
    hintEn: "Transfers",
    enabled: true,
    kind: "mode",
  },
  {
    key: "activities",
    labelAr: "أنشطة",
    labelEn: "Activities",
    hintAr: "تجارب",
    hintEn: "Experiences",
    enabled: true,
    kind: "mode",
  },
  {
    key: "myTrip",
    labelAr: "رحلتي",
    labelEn: "My trip",
    hintAr: "منشئ الرحلة",
    hintEn: "Trip builder",
    enabled: true,
    kind: "myTrip",
  },
];

export const DEFAULT_CMS: CmsState = {
  banners: [
    {
      id: "bn-1",
      titleAr: "عروض نهاية الأسبوع من الكويت",
      titleEn: "Weekend deals from Kuwait",
      image: "/media/destinations/dubai.jpg?v=1",
      href: "/deals",
      active: true,
    },
  ],
  faqs: [],
  articles: [],
  heroServices: DEFAULT_CMS_HERO_SERVICES,
  updatedAt: new Date(0).toISOString(),
};

export function normalizeCmsState(raw: unknown): CmsState {
  const src = raw && typeof raw === "object" ? (raw as Partial<CmsState>) : {};
  return {
    banners: Array.isArray(src.banners) ? src.banners : DEFAULT_CMS.banners,
    faqs: Array.isArray(src.faqs) ? src.faqs : [],
    articles: Array.isArray(src.articles) ? src.articles : [],
    heroServices:
      Array.isArray(src.heroServices) && src.heroServices.length
        ? src.heroServices
        : DEFAULT_CMS_HERO_SERVICES,
    updatedAt:
      typeof src.updatedAt === "string" && src.updatedAt
        ? src.updatedAt
        : new Date().toISOString(),
  };
}
