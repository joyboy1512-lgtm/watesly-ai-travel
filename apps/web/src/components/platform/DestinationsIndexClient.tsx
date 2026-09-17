"use client";

import Link from "next/link";
import { DESTINATION_GUIDES, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function DestinationsIndexClient() {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const guides = cms.destinationGuides.length ? cms.destinationGuides : DESTINATION_GUIDES;
  const lead =
    pickLocalized(locale, cms.sitePages.destinationsLeadAr, cms.sitePages.destinationsLeadEn) ||
    t("destinationsLead");

  return (
    <>
      <header className="shop-inner-hero">
        <div className="shop-inner-hero-inner">
          <h1>{t("navDestinations")}</h1>
          <p>{lead}</p>
        </div>
      </header>
      <div className="wg-platform">
        <div className="wg-platform-grid">
        {guides.map((d) => {
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
    </>
  );
}
