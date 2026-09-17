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
  pickLocalized,
} from "@watesly-travel/shared";
import { platformEnabled } from "@/lib/platform-flags";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

type Props = {
  onPickDestination: (dest: ShopDestination) => void;
  onPickOffer: (offer: ShopOffer) => void;
};

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
  const features = cmsFeatures.length ? cmsFeatures : shopFeaturesFor(locale);
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
  const destKicker = cmsCopy(cms, locale, "destKickerAr", "destKickerEn") || t("destKicker");
  const destTitle = cmsCopy(cms, locale, "destTitleAr", "destTitleEn") || t("destTitle");
  const destLead =
    cmsCopy(cms, locale, "destLeadAr", "destLeadEn") ||
    (platformOn ? t("destLeadPlatform") : t("destLead"));
  const offersKicker = cmsCopy(cms, locale, "offersKickerAr", "offersKickerEn") || t("offersKicker");
  const offersTitle = cmsCopy(cms, locale, "offersTitleAr", "offersTitleEn") || t("offersTitle");
  const whyKicker = cmsCopy(cms, locale, "whyKickerAr", "whyKickerEn") || t("whyKicker");
  const whyTitle = cmsCopy(cms, locale, "whyTitleAr", "whyTitleEn") || t("whyTitle");
  const reviewsKicker = cmsCopy(cms, locale, "reviewsKickerAr", "reviewsKickerEn") || t("reviewsKicker");
  const reviewsHeading = cmsCopy(cms, locale, "reviewsHeadingAr", "reviewsHeadingEn") || t("reviewsHeading");
  const reviewsDisclaimer =
    cmsCopy(cms, locale, "reviewsDisclaimerAr", "reviewsDisclaimerEn") || t("reviewsDisclaimer");
  const ctaKicker = cmsCopy(cms, locale, "ctaKickerAr", "ctaKickerEn") || t("ctaKicker");
  const ctaTitle =
    cmsCopy(cms, locale, "ctaTitleAr", "ctaTitleEn") || (platformOn ? t("ctaTitlePlatform") : t("ctaTitle"));
  const ctaLead =
    cmsCopy(cms, locale, "ctaLeadAr", "ctaLeadEn") || (platformOn ? t("ctaLeadPlatform") : t("ctaLead"));

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
      fromPrice: priceMatch
        ? t("fromPriceKwd", { n: priceMatch[1]! })
        : t("specialOffer"),
      rating: 4.9,
      reviews: 500,
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
          image: g.image,
          tag: pickLocalized(locale, g.bestTimeAr, g.bestTimeEn).slice(0, 28),
          fromPrice: priceMatch
            ? t("fromPriceKwd", { n: priceMatch[1]! })
            : t("specialOffer"),
          shop: guideToShopDest(g.slug),
        };
      })
    : null;

  return (
    <div className="shop-landing">
      {banners.length ? (
        <section className="shop-section shop-cms-banners" aria-label={locale === "en" ? "Promotions" : "عروض"}>
          <div className="shop-offer-grid">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.href || "/deals"}
                className="shop-offer-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.image} alt={pickLocalized(locale, banner.titleAr, banner.titleEn)} />
                <span className="shop-offer-badge">{locale === "en" ? "Promo" : "عرض"}</span>
                <div className="shop-offer-body">
                  <h3>{pickLocalized(locale, banner.titleAr, banner.titleEn)}</h3>
                </div>
              </Link>
            ))}
          </div>
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
                <div key={dest.slug} className="shop-dest-card" style={{ padding: 0, display: "grid" }}>
                  <Link
                    href={`/destinations/${dest.slug}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dest.image} alt={dest.name} loading="lazy" />
                    <span className="shop-dest-tag">
                      {dest.flag} {dest.name}
                    </span>
                    <div className="shop-dest-body">
                      <div>
                        <h3>
                          {dest.flag} {dest.name}
                        </h3>
                        <p>{dest.country}</p>
                      </div>
                      <div className="shop-dest-meta">
                        <Stars value={4.9} ofFive={t("ofFive", { n: 4.9 })} />
                        <small>{dest.tag}</small>
                        <strong>{dest.fromPrice}</strong>
                      </div>
                    </div>
                  </Link>
                  {dest.shop ? (
                    <button
                      type="button"
                      className="shop-btn-ghost"
                      style={{ margin: "0.5rem 0.75rem 0.75rem" }}
                      onClick={() => onPickDestination(dest.shop!)}
                    >
                      {t("fillSearch")}
                    </button>
                  ) : null}
                </div>
              ))
            : destinations.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  className="shop-dest-card"
                  onClick={() => onPickDestination(dest)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dest.image} alt={dest.name} loading="lazy" />
                  <span className="shop-dest-tag">{dest.tag}</span>
                  <div className="shop-dest-body">
                    <div>
                      <h3>{dest.name}</h3>
                      <p>{dest.country}</p>
                    </div>
                    <div className="shop-dest-meta">
                      <Stars value={dest.rating} ofFive={t("ofFive", { n: dest.rating })} />
                      <small>{t("reviewsCount", { n: dest.reviews })}</small>
                      <strong>{dest.fromPrice}</strong>
                    </div>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="offers">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">{platformOn ? "Weekend Deals" : offersKicker}</p>
            <h2>{platformOn ? t("weekendDealsFromKw") : offersTitle}</h2>
          </div>
          {platformOn ? (
            <Link href="/deals" className="shop-btn-ghost">
              {t("allOffers")}
            </Link>
          ) : null}
        </div>
        <div className="shop-offer-grid">
          {platformOn
            ? WEEKEND_DEALS.filter((d) => d.active)
                .slice(0, 4)
                .map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.slug}`}
                    className="shop-offer-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deal.image}
                      alt={pickLocalized(locale, deal.titleAr, deal.titleEn)}
                      loading="lazy"
                    />
                    <span className="shop-offer-badge">
                      {deal.countryFlag} {t("dealBadge")}
                    </span>
                    <div className="shop-offer-body">
                      <h3>{pickLocalized(locale, deal.titleAr, deal.titleEn)}</h3>
                      <p>{pickLocalized(locale, deal.descriptionAr, deal.descriptionEn)}</p>
                      <strong>
                        {(deal.salePriceMinor / 1000).toFixed(0)} {deal.currency}
                      </strong>
                    </div>
                  </Link>
                ))
            : offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className="shop-offer-card"
                  onClick={() => onPickOffer(offer)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={offer.image} alt={offer.title} loading="lazy" />
                  <span className="shop-offer-badge">{offer.badge}</span>
                  <div className="shop-offer-body">
                    <h3>{offer.title}</h3>
                    <p>{offer.subtitle}</p>
                    <strong>{offer.priceLabel}</strong>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <section className="shop-section">
        <div className="shop-section-head center">
          <p className="shop-kicker">{whyKicker}</p>
          <h2>{whyTitle}</h2>
        </div>
        <div className="shop-feature-grid">
          {features.map((f) => (
            <article key={f.title} className="shop-feature-card">
              <span className="shop-feature-icon" aria-hidden>
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
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
          <div className="shop-rating-summary">
            <strong>4.9</strong>
            <Stars value={5} ofFive={t("ofFive", { n: 5 })} />
            <span>{t("reviewsExamples")}</span>
          </div>
        </div>
        <p className="shop-muted" style={{ margin: "0 0 1rem", maxWidth: "40rem" }}>
          {reviewsDisclaimer}
        </p>
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

      <section className="shop-cta-banner">
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
        <section className="shop-stats-bar shop-stats-bar-footer" aria-label={t("statsAria")}>
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
