"use client";

import Link from "next/link";
import {
  WEEKEND_DEALS,
  pickLocalized,
  type DestinationGuide,
} from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";
import { cmsGuideBySlug } from "@/lib/shop-cms";

export function DestinationGuideClient({
  slug,
  fallback,
  d,
}: {
  slug?: string;
  fallback?: DestinationGuide | null;
  d?: DestinationGuide;
}) {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const resolved = d || cmsGuideBySlug(cms, slug || fallback?.slug || "", fallback);
  if (!resolved) {
    return <p className="shop-legal-body">{locale === "en" ? "Destination not found." : "الوجهة غير موجودة."}</p>;
  }
  const dest = resolved;
  const name = pickLocalized(locale, dest.nameAr, dest.nameEn);
  const country = pickLocalized(locale, dest.countryAr, dest.countryEn);
  const deals = WEEKEND_DEALS.filter((x) => x.destinationSlug === dest.slug && x.active);
  const hotels = locale === "en" ? dest.hotelsEn : dest.hotelsAr;
  const activities = locale === "en" ? dest.activitiesEn : dest.activitiesAr;

  return (
    <div className="wg-platform">
      <nav aria-label="breadcrumb" style={{ fontSize: "0.85rem", marginBottom: "0.75rem", color: "#64748b" }}>
        <Link href="/">{t("navHome")}</Link> / <Link href="/destinations">{t("navDestinations")}</Link> /{" "}
        <span>{name}</span>
      </nav>
      <div className="wg-dest-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dest.image} alt={name} />
        <div className="caption">
          <h1 style={{ color: "#fff", margin: 0 }}>
            {dest.flag} {name}
          </h1>
          <p style={{ margin: "0.25rem 0 0" }}>
            {country} · {dest.airportCode}
          </p>
        </div>
      </div>

      <div className="wg-dest-sections">
        <section>
          <h2>{t("whyVisit", { name })}</h2>
          <p style={{ margin: 0 }}>{pickLocalized(locale, dest.whyAr, dest.whyEn)}</p>
        </section>
        <section>
          <h2>{t("bestTimeVisit")}</h2>
          <p style={{ margin: 0 }}>{pickLocalized(locale, dest.bestTimeAr, dest.bestTimeEn)}</p>
        </section>
        <section>
          <h2>{t("tripCost")}</h2>
          <p style={{ margin: 0 }}>{pickLocalized(locale, dest.costHintAr, dest.costHintEn)}</p>
        </section>
        <section>
          <h2>{t("bestHotels")}</h2>
          <ul>
            {hotels.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t("bestActivities")}</h2>
          <ul>
            {activities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t("flightsSection")}</h2>
          <p style={{ margin: 0 }}>{pickLocalized(locale, dest.flightHintAr, dest.flightHintEn)}</p>
          <p>
            <Link
              className="wg-btn secondary"
              href={`/flights/results?origin=KWI&destination=${dest.airportCode}&tripType=roundtrip&adults=1`}
            >
              {t("searchFlightsTo", { name })}
            </Link>
          </p>
        </section>
        {deals.length ? (
          <section>
            <h2>Weekend Deals</h2>
            <ul>
              {deals.map((deal) => (
                <li key={deal.id}>
                  <Link href={`/deals/${deal.slug}`}>
                    {pickLocalized(locale, deal.titleAr, deal.titleEn)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section>
          <h2>{t("suggestedPrograms")}</h2>
          <p style={{ margin: 0 }}>{t("suggestedProgramsLead")}</p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <Link className="wg-btn" href={`/trip-builder?destination=${dest.slug}`}>
              ✨ {t("planTripTo", { name })}
            </Link>
            <Link className="wg-btn secondary" href="/deals">
              {t("allOffers")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
