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

export type CmsState = {
  banners: CmsBanner[];
  faqs: CmsFaq[];
  articles: CmsArticle[];
  updatedAt: string;
};

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
  updatedAt: new Date(0).toISOString(),
};
