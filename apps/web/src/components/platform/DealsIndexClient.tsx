"use client";

import Link from "next/link";
import { dealSavingsMinor, pickLocalized, type WeekendDeal } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

function formatMinor(minor: number, currency: string) {
  return `${(minor / 1000).toFixed(3)} ${currency}`;
}

export function DealsIndexClient({ deals }: { deals: WeekendDeal[] }) {
  const { t, locale } = useShopI18n();
  return (
    <div className="wg-platform">
      <h1>🔥 Weekend Deals</h1>
      <p className="lead">{t("dealsLead")}</p>
      <div className="wg-platform-grid">
        {deals.map((deal) => {
          const title = pickLocalized(locale, deal.titleAr, deal.titleEn);
          return (
            <article key={deal.id} className="wg-platform-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.image} alt={title} />
              <div className="body">
                <h2>
                  {deal.countryFlag} {title}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                  {pickLocalized(locale, deal.descriptionAr, deal.descriptionEn)}
                </p>
                <div className="wg-price-row">
                  <span className="old">{formatMinor(deal.originalPriceMinor, deal.currency)}</span>
                  <span className="now">{formatMinor(deal.salePriceMinor, deal.currency)}</span>
                  <span className="save">
                    {t("saveAmount", { amount: formatMinor(dealSavingsMinor(deal), deal.currency) })}
                  </span>
                </div>
                <Link className="wg-btn" href={`/deals/${deal.slug}`}>
                  {t("bookDeal")}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
