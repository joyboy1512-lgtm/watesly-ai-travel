import {
  pickLocalized,
  type CmsState,
  type DestinationGuide,
  type ShopLocale,
} from "@watesly-travel/shared";
import type { ShopDestination, ShopOffer, ShopReview } from "@/lib/shop-content";

export function cmsSlidesFor(cms: CmsState, locale: ShopLocale) {
  return cms.heroSlides
    .filter((slide) => slide.active !== false)
    .map((slide) => ({
      id: slide.id,
      image: slide.image,
      kicker: pickLocalized(locale, slide.kickerAr, slide.kickerEn),
      title: pickLocalized(locale, slide.titleAr, slide.titleEn),
      subtitle: pickLocalized(locale, slide.subtitleAr, slide.subtitleEn),
      description: pickLocalized(locale, slide.descriptionAr, slide.descriptionEn),
    }));
}

export function cmsHomeDestinationsFor(cms: CmsState, locale: ShopLocale): ShopDestination[] {
  return cms.homeDestinations
    .filter((row) => row.active !== false)
    .map((row) => ({
      id: row.id,
      name: pickLocalized(locale, row.nameAr, row.nameEn),
      country: pickLocalized(locale, row.countryAr, row.countryEn),
      code: row.code,
      tag: pickLocalized(locale, row.tagAr, row.tagEn),
      image: row.image,
      fromPrice: pickLocalized(locale, row.fromPriceAr, row.fromPriceEn),
      rating: row.rating,
      reviews: row.reviews,
    }));
}

export function cmsHomeOffersFor(cms: CmsState, locale: ShopLocale): ShopOffer[] {
  return cms.homeOffers
    .filter((row) => row.active !== false)
    .map((row) => ({
      id: row.id,
      title: pickLocalized(locale, row.titleAr, row.titleEn),
      subtitle: pickLocalized(locale, row.subtitleAr, row.subtitleEn),
      badge: pickLocalized(locale, row.badgeAr, row.badgeEn),
      image: row.image,
      priceLabel: pickLocalized(locale, row.priceLabelAr, row.priceLabelEn),
      mode: row.mode,
      destination: pickLocalized(locale, row.destinationAr || "", row.destinationEn || ""),
      code: row.code,
    }));
}

export function cmsReviewsFor(cms: CmsState, locale: ShopLocale): ShopReview[] {
  return cms.reviews
    .filter((row) => row.active !== false)
    .map((row) => ({
      id: row.id,
      name: row.name,
      city: pickLocalized(locale, row.cityAr, row.cityEn),
      rating: row.rating,
      text: pickLocalized(locale, row.textAr, row.textEn),
      trip: pickLocalized(locale, row.tripAr, row.tripEn),
      avatar: row.avatar,
    }));
}

export function cmsFeaturesFor(cms: CmsState, locale: ShopLocale) {
  return cms.features.map((row) => ({
    id: row.id,
    icon: row.icon,
    title: pickLocalized(locale, row.titleAr, row.titleEn),
    text: pickLocalized(locale, row.textAr, row.textEn),
  }));
}

export function cmsStatsFor(cms: CmsState, locale: ShopLocale) {
  return cms.stats.map((row) => ({
    id: row.id,
    value: row.value,
    label: pickLocalized(locale, row.labelAr, row.labelEn),
  }));
}

export function cmsCopy(cms: CmsState, locale: ShopLocale, ar: keyof CmsState["homeCopy"], en: keyof CmsState["homeCopy"]) {
  return pickLocalized(locale, cms.homeCopy[ar], cms.homeCopy[en]);
}

export function cmsGuides(cms: CmsState): DestinationGuide[] {
  return cms.destinationGuides.length ? cms.destinationGuides : [];
}

export function cmsGuideBySlug(cms: CmsState, slug: string, fallback?: DestinationGuide | null) {
  return cms.destinationGuides.find((row) => row.slug === slug) || fallback || null;
}
