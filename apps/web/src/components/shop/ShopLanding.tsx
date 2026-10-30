"use client";

import Link from "next/link";
import {
  shopDestinationsFor,
  shopFeaturesFor,
  shopOffersFor,
  shopReviewsFor,
  shopStatsFor,
  type ShopDestination,
  type ShopOffer,
} from "@/lib/shop-content";
import {
  cmsCopy,
  cmsFeaturesFor,
  cmsHomeDestinationsFor,
  cmsHomeOffersFor,
  cmsReviewsFor,
  cmsStatsFor,
} from "@/lib/shop-cms";
import {
  DESTINATION_GUIDES,
  WEEKEND_DEALS,
  dealSavingsMinor,
  listActiveDeals,
  pickLocalized,
  shopNightCount,
  type ShopUiKey,
  type WeekendDeal,
} from "@watesly-travel/shared";
import { platformEnabled } from "@/lib/platform-flags";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

type Props = {
  onPickDestination: (dest: ShopDestination) => void;
  onPickOffer: (offer: ShopOffer) => void;
};

type FeatureCard = {
  id?: string;
  icon: string;
  title: string;
  text: string;
};

const INCLUDE_KEYS: Record<WeekendDeal["includes"][number], ShopUiKey> = {
  flight: "showIncFlight",
  hotel: "showIncHotel",
  transfer: "showIncTransfer",
  activity: "showIncActivity",
};

/** Sentences still stored in the live content desk. The showcase replaces them until they are edited there. */
const STALE_DEST_LEADS = new Set([
  "وجهات مختارة بصور حقيقية وتقييمات مسافرين — اضغط على أي وجهة لملء البحث فوراً.",
  "Hand-picked destinations with real photos — tap any destination to fill the search.",
]);
const STALE_WHY_TITLES = new Set([
  "تجربة حجز كاملة بلمسة بحرية هادئة",
  "A complete booking experience",
]);
const STALE_CTA_LEADS = new Set([
  "أدخل جوالك وابدأ محادثة ذكية — أو ابحث مباشرة من الأعلى.",
  "Enter your mobile number to chat — or search from the top.",
]);
const STALE_OFFER_KICKERS = new Set([
  "Weekend Deals",
  "عروض الأسبوع",
  "This week's offers",
  "This week’s offers",
]);
const STALE_SEARCH_TEXT = new Set([
  "طيران وفنادق ونقل وأنشطة في تجربة واحدة — مع نتائج تجريبية حتى اكتمال الربط الحي.",
  "Flights, hotels, transfers, and activities in one experience.",
]);
const STALE_AI_TEXT = new Set([
  "خطط رحلتك بالمحادثة بعد إدخال جوالك — بدون ازدحام.",
  "Plan by chat after entering your mobile — without the clutter.",
  "Plan your trip by chat after entering your mobile number.",
]);

function replaceIfStale(value: string, stale: Set<string>, next: string): string {
  return stale.has(value.trim()) ? next : value;
}

function showcaseImage(src: string): string {
  return src.includes("muscat.jpg") ? "/media/destinations/muscat.jpg?v=3" : src;
}

function kwdFromMinor(minor: number): string {
  const major = minor / 1000;
  return Number.isInteger(major) ? String(major) : major.toFixed(3);
}

function Stars({ value, ofFive }: { value: number; ofFive: string }) {
  return (
    <span className="shop-stars" aria-label={ofFive}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < Math.round(value) ? "on" : undefined}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ShopLanding({ onPickDestination, onPickOffer }: Props) {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const cmsDestinations = cmsHomeDestinationsFor(cms, locale);
  const destinations = cmsDestinations.length ? cmsDestinations : shopDestinationsFor(locale);
  const cmsOffers = cmsHomeOffersFor(cms, locale);
  const offers = cmsOffers.length ? cmsOffers : shopOffersFor(locale);
  const cmsReviews = cmsReviewsFor(cms, locale);
  const reviews = cmsReviews.length ? cmsReviews : shopReviewsFor(locale);
  const cmsFeatures = cmsFeaturesFor(cms, locale);
  const features = (cmsFeatures.length ? cmsFeatures : shopFeaturesFor(locale)).map((row) => {
    const feature: FeatureCard = {
      id: "id" in row && typeof row.id === "string" ? row.id : undefined,
      icon: row.icon,
      title: row.title,
      text: row.text,
    };
    if (STALE_SEARCH_TEXT.has(feature.text)) {
      feature.text = t("featureSearchFresh");
      if (feature.icon === "🌊") feature.icon = "🧭";
    }
    if (STALE_AI_TEXT.has(feature.text)) feature.text = t("featureAiFresh");
    return feature;
  });
  const cmsStats = cmsStatsFor(cms, locale);
  const stats = cmsStats.length ? cmsStats : shopStatsFor(locale);
  const footerStats = stats.filter((row) => {
    const id = "id" in row ? row.id : "";
    if (id) return id !== "stat-happy" && id !== "stat-rating";
    return row.label !== t("statHappy") && row.label !== t("statRating");
  });
  const platformOn = platformEnabled();
  const guides = cms.destinationGuides.length ? cms.destinationGuides : DESTINATION_GUIDES;
  const banners = cms.banners.filter((row) => row.active);
  const deals = listActiveDeals(WEEKEND_DEALS);
  const destKicker = cmsCopy(cms, locale, "destKickerAr", "destKickerEn") || t("destKicker");
  const destTitle = cmsCopy(cms, locale, "destTitleAr", "destTitleEn") || t("destTitle");
  const destLead = replaceIfStale(
    cmsCopy(cms, locale, "destLeadAr", "destLeadEn") ||
      (platformOn ? t("destLeadPlatform") : t("destLead")),
    platformOn ? STALE_DEST_LEADS : new Set<string>(),
    t("destLeadFresh"),
  );
  const offersKicker = replaceIfStale(
    cmsCopy(cms, locale, "offersKickerAr", "offersKickerEn") || t("offersKicker"),
    platformOn ? STALE_OFFER_KICKERS : new Set<string>(),
    t("weekendDealsKicker"),
  );
  const offersTitle = cmsCopy(cms, locale, "offersTitleAr", "offersTitleEn") || t("offersTitle");
  const whyKicker = cmsCopy(cms, locale, "whyKickerAr", "whyKickerEn") || t("whyKicker");
  const whyTitle = replaceIfStale(
    cmsCopy(cms, locale, "whyTitleAr", "whyTitleEn") || t("whyTitle"),
    STALE_WHY_TITLES,
    t("whyTitleFresh"),
  );
  const reviewsKicker = cmsCopy(cms, locale, "reviewsKickerAr", "reviewsKickerEn") || t("reviewsKicker");
  const reviewsHeading = cmsCopy(cms, locale, "reviewsHeadingAr", "reviewsHeadingEn") || t("reviewsHeading");
  const reviewsDisclaimer =
    cmsCopy(cms, locale, "reviewsDisclaimerAr", "reviewsDisclaimerEn") || t("reviewsDisclaimer");
  const ctaKicker = cmsCopy(cms, locale, "ctaKickerAr", "ctaKickerEn") || t("ctaKicker");
  const ctaTitle =
    cmsCopy(cms, locale, "ctaTitleAr", "ctaTitleEn") || (platformOn ? t("ctaTitlePlatform") : t("ctaTitle"));
  const ctaLead = replaceIfStale(
    cmsCopy(cms, locale, "ctaLeadAr", "ctaLeadEn") ||
      (platformOn ? t("ctaLeadPlatform") : t("ctaLead")),
    platformOn ? STALE_CTA_LEADS : new Set<string>(),
    t("ctaLeadPlatform"),
  );

  function guideToShopDest(slug: string): ShopDestination | null {
    const g = guides.find((d) => d.slug === slug);
    if (!g) return null;
    const cost = pickLocalized(locale, g.costHintAr, g.costHintEn);
    const priceMatch = cost.match(/~\s*(\d+)/);
    return {
      id: g.slug,
      name: pickLocalized(locale, g.nameAr, g.nameEn),
      country: pickLocalized(locale, g.countryAr, g.countryEn),
      code: g.airportCode,
      tag: g.flag,
      image: g.image,
      fromPrice: priceMatch ? t("fromPriceKwd", { n: priceMatch[1]! }) : t("specialOffer"),
      rating: 0,
      reviews: 0,
    };
  }

  const destCards = platformOn
    ? guides.map((g) => {
        const cost = pickLocalized(locale, g.costHintAr, g.costHintEn);
        const priceMatch = cost.match(/~\s*(\d+)/);
        return {
          slug: g.slug,
          name: pickLocalized(locale, g.nameAr, g.nameEn),
          country: pickLocalized(locale, g.countryAr, g.countryEn),
          flag: g.flag,
          code: g.airportCode,
          image: showcaseImage(g.image),
          why: pickLocalized(locale, g.whyAr, g.whyEn),
          bestTime: pickLocalized(locale, g.bestTimeAr, g.bestTimeEn),
          activities: (locale === "en" ? g.activitiesEn : g.activitiesAr).slice(0, 3),
          fromPrice: priceMatch ? t("fromPriceKwd", { n: priceMatch[1]! }) : t("specialOffer"),
          shop: guideToShopDest(g.slug),
        };
      })
    : null;

  return (
    <div className="shop-landing">
      {banners.length ? (
        <section className="shop-section wg-show-banners" aria-label={locale === "en" ? "Promotions" : "عروض"}>
          {banners.map((banner) => (
            <Link key={banner.id} href={banner.href || "/deals"} className="wg-show-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.image} alt="" />
              <span>
                <small>{locale === "en" ? "Promo" : "عرض"}</small>
                <strong>{pickLocalized(locale, banner.titleAr, banner.titleEn)}</strong>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="shop-section" id="destinations">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">{destKicker}</p>
            <h2>{destTitle}</h2>
            <p className="shop-lead">{destLead}</p>
          </div>
          {platformOn ? (
            <Link href="/destinations" className="shop-btn-ghost">
              {t("allDestinations")}
            </Link>
          ) : (
            <Link href="/#search" className="shop-btn-ghost">
              {t("searchNow")}
            </Link>
          )}
        </div>
        <div className="shop-dest-grid">
          {platformOn && destCards
            ? destCards.map((dest) => (
                <article key={dest.slug} className="shop-dest-card wg-show-card">
                  <Link href={`/destinations/${dest.slug}`} className="wg-show-link">
                    <div className="wg-show-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dest.image} alt={dest.name} loading="lazy" />
                      <span className="shop-dest-tag">
                        {dest.flag} {dest.country}
                      </span>
                      <span className="wg-show-code">{dest.code}</span>
                    </div>
                    <div className="shop-dest-body wg-show-body">
                      <h3>{dest.name}</h3>
                      <p className="wg-show-why">{dest.why}</p>
                      <p className="wg-show-when">
                        <span>{t("bestTimeVisit")}</span>
                        {dest.bestTime}
                      </p>
                      {dest.activities.length ? (
                        <ul className="wg-show-chips">
                          {dest.activities.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      <strong className="wg-show-price">{dest.fromPrice}</strong>
                    </div>
                  </Link>
                  {dest.shop ? (
                    <div className="wg-show-actions">
                      <button type="button" className="shop-btn" onClick={() => onPickDestination(dest.shop!)}>
                        {t("fillSearch")}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            : destinations.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  className="shop-dest-card wg-show-card"
                  onClick={() => onPickDestination(dest)}
                >
                  <div className="wg-show-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dest.image} alt={dest.name} loading="lazy" />
                    <span className="shop-dest-tag">{dest.tag}</span>
                  </div>
                  <div className="shop-dest-body wg-show-body">
                    <h3>{dest.name}</h3>
                    <p>{dest.country}</p>
                    <span className="shop-dest-meta">
                      <Stars value={dest.rating} ofFive={t("ofFive", { n: dest.rating })} />
                      <small>{t("reviewsCount", { n: dest.reviews })}</small>
                      <strong>{dest.fromPrice}</strong>
                    </span>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="offers">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">{offersKicker}</p>
            <h2>{platformOn ? t("weekendDealsFromKw") : offersTitle}</h2>
            {platformOn ? <p className="shop-lead">{t("dealsLead")}</p> : null}
          </div>
          {platformOn ? (
            <Link href="/deals" className="shop-btn-ghost">
              {t("allOffers")}
            </Link>
          ) : null}
        </div>
        <div className={platformOn ? "shop-offer-grid wg-show-deals" : "shop-offer-grid"}>
          {platformOn
            ? deals.map((deal) => {
                const savings = dealSavingsMinor(deal);
                const title = pickLocalized(locale, deal.titleAr, deal.titleEn);
                return (
                  <Link key={deal.id} href={`/deals/${deal.slug}`} className="shop-offer-card wg-show-card">
                    <div className="wg-show-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={showcaseImage(deal.image)} alt={title} loading="lazy" />
                      <span className="shop-offer-badge">
                        {deal.countryFlag} {t("dealBadge")}
                      </span>
                      {savings > 0 ? (
                        <span className="wg-show-save">
                          {t("saveAmount", { amount: `${kwdFromMinor(savings)} KWD` })}
                        </span>
                      ) : null}
                    </div>
                    <div className="shop-offer-body wg-show-body">
                      <h3>{title}</h3>
                      <p>{pickLocalized(locale, deal.descriptionAr, deal.descriptionEn)}</p>
                      <ul className="wg-show-chips">
                        <li>{shopNightCount(locale, deal.nights)}</li>
                        {deal.includes.map((item) => (
                          <li key={item}>{t(INCLUDE_KEYS[item])}</li>
                        ))}
                      </ul>
                      <div className="wg-show-price-row">
                        <strong>
                          {kwdFromMinor(deal.salePriceMinor)} {deal.currency}
                        </strong>
                        {savings > 0 ? (
                          <s>
                            {kwdFromMinor(deal.originalPriceMinor)} {deal.currency}
                          </s>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })
            : offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className="shop-offer-card wg-show-card"
                  onClick={() => onPickOffer(offer)}
                >
                  <div className="wg-show-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={offer.image} alt={offer.title} loading="lazy" />
                    <span className="shop-offer-badge">{offer.badge}</span>
                  </div>
                  <div className="shop-offer-body wg-show-body">
                    <h3>{offer.title}</h3>
                    <p>{offer.subtitle}</p>
                    <strong className="wg-show-price">{offer.priceLabel}</strong>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <section className="shop-section" id="why-weekendgate">
        <div className="shop-section-head center">
          <p className="shop-kicker">{whyKicker}</p>
          <h2>{whyTitle}</h2>
        </div>
        <div className="shop-feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="shop-feature-card wg-show-feature">
              <span className="shop-feature-icon" aria-hidden>
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="reviews">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">{reviewsKicker}</p>
            <h2>{reviewsHeading}</h2>
          </div>
        </div>
        <p className="wg-show-note">{reviewsDisclaimer}</p>
        <div className="shop-review-grid">
          {reviews.map((review) => (
            <article key={review.id} className="shop-review-card">
              <div className="shop-review-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={review.avatar} alt="" />
                <div>
                  <strong>{review.name}</strong>
                  <span>{review.city}</span>
                </div>
                <Stars value={review.rating} ofFive={t("ofFive", { n: review.rating })} />
              </div>
              <p>&ldquo;{review.text}&rdquo;</p>
              <small>{review.trip}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="shop-cta-banner wg-show-cta">
        <div>
          <p className="shop-kicker light">{ctaKicker}</p>
          <h2>{ctaTitle}</h2>
          <p>{ctaLead}</p>
        </div>
        <div className="shop-cta-actions">
          {platformOn ? (
            <>
              <Link href="/#search" className="shop-btn shop-btn-light">
                {t("searchEngine")}
              </Link>
              <Link href="/destinations" className="shop-btn-ghost shop-btn-ghost-light">
                {t("navDestinations")}
              </Link>
            </>
          ) : (
            <>
              <Link href="/chat" className="shop-btn shop-btn-light">
                {t("talkAssistant")}
              </Link>
              <Link href="/#search" className="shop-btn-ghost shop-btn-ghost-light">
                {t("findTrip")}
              </Link>
            </>
          )}
        </div>
      </section>

      {footerStats.length > 0 ? (
        <section className="shop-stats-bar shop-stats-bar-footer wg-show-stats" aria-label={t("statsAria")}>
          {footerStats.map((row) => (
            <div key={row.label} className="shop-stat">
              <strong>{row.value}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
