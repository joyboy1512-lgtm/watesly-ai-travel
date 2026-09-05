"use client";

import Link from "next/link";
import { DESTINATION_GUIDES, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export function DestinationsIndexClient() {
  const { t, locale } = useShopI18n();
  return (
    <div className="wg-platform">
      <h1>🌍 {t("navDestinations")}</h1>
      <p className="lead">{t("destinationsLead")}</p>
      <div className="wg-platform-grid">
        {DESTINATION_GUIDES.map((d) => {
          const name = pickLocalized(locale, d.nameAr, d.nameEn);
          const why = pickLocalized(locale, d.whyAr, d.whyEn);
          return (
            <article key={d.slug} className="wg-platform-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.image} alt={name} />
              <div className="body">
                <h2>
                  {d.flag} {name}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                  {why.slice(0, 90)}…
                </p>
                <Link className="wg-btn" href={`/destinations/${d.slug}`}>
                  {t("exploreName", { name })}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
