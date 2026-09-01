import type { Metadata } from "next";
import Link from "next/link";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { dealSavingsMinor } from "@watesly-travel/shared";
import { fetchShopDeals } from "@/lib/shop-server";

export const metadata: Metadata = {
  title: "Weekend Deals | عروض نهاية الأسبوع — WeekendGate",
  description: "عروض طيران + فندق + نقل من الكويت: دبي، البحرين، الدوحة، إسطنبول والمزيد.",
  alternates: { canonical: "https://www.weekendgate.com/deals" },
};

function formatMinor(minor: number, currency: string) {
  return `${(minor / 1000).toFixed(3)} ${currency}`;
}

export default async function DealsPage() {
  const deals = await fetchShopDeals();
  return (
    <StoreFront wide>
      <div className="wg-platform">
        <h1>🔥 Weekend Deals</h1>
        <p className="lead">عروض نهاية الأسبوع من الكويت — طيران وفندق ونقل بأسعار مُجمّعة.</p>
        <div className="wg-platform-grid">
          {deals.map((deal) => (
            <article key={deal.id} className="wg-platform-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.image} alt={deal.titleAr} />
              <div className="body">
                <h2>
                  {deal.countryFlag} {deal.titleAr}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>{deal.descriptionAr}</p>
                <div className="wg-price-row">
                  <span className="old">{formatMinor(deal.originalPriceMinor, deal.currency)}</span>
                  <span className="now">{formatMinor(deal.salePriceMinor, deal.currency)}</span>
                  <span className="save">وفر {formatMinor(dealSavingsMinor(deal), deal.currency)}</span>
                </div>
                <Link className="wg-btn" href={`/deals/${deal.slug}`}>
                  احجز العرض
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </StoreFront>
  );
}
