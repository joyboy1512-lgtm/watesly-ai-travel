"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { dealSavingsMinor, type WeekendDeal } from "@watesly-travel/shared";
import { bookDeal, fetchDeal, formatKwdMinor } from "@/lib/platform-api";

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || "");
  const [deal, setDeal] = useState<WeekendDeal | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchDeal(slug)
      .then((row) => {
        if (!cancelled) setDeal(row);
      })
      .catch(() => {
        if (!cancelled) setDeal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function book() {
    if (!deal) return;
    setBusy(true);
    setError("");
    try {
      const res = await bookDeal(deal.slug);
      router.push(`/book/checkout?tripId=${encodeURIComponent(res.trip.id)}`);
    } catch {
      router.push(`/trip-builder?deal=${encodeURIComponent(deal.slug)}`);
    } finally {
      setBusy(false);
    }
  }

  if (deal === undefined) {
    return (
      <StoreFront wide>
        <div className="wg-platform">
          <p className="lead">جاري تحميل العرض…</p>
        </div>
      </StoreFront>
    );
  }

  if (!deal) {
    return (
      <StoreFront>
        <div className="wg-platform">
          <h1>العرض غير موجود</h1>
          <Link href="/deals">العودة للعروض</Link>
        </div>
      </StoreFront>
    );
  }

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <div className="wg-dest-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={deal.image} alt={deal.titleAr} />
          <div className="caption">
            <h1 style={{ color: "#fff", margin: 0 }}>
              {deal.countryFlag} {deal.titleAr}
            </h1>
            <p style={{ margin: "0.25rem 0 0" }}>{deal.descriptionAr}</p>
          </div>
        </div>
        <div className="wg-price-row" style={{ marginBottom: "1rem" }}>
          <span className="old">{formatKwdMinor(deal.originalPriceMinor, deal.currency)}</span>
          <span className="now">{formatKwdMinor(deal.salePriceMinor, deal.currency)}</span>
          <span className="save">وفر {formatKwdMinor(dealSavingsMinor(deal), deal.currency)}</span>
        </div>
        <p>يشمل: {deal.includes.join(" · ")} · {deal.nights} ليالٍ</p>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" className="wg-btn" disabled={busy} onClick={book}>
            احجز العرض
          </button>
          <Link className="wg-btn secondary" href={`/destinations/${deal.destinationSlug}`}>
            صفحة الوجهة
          </Link>
        </div>
      </div>
    </StoreFront>
  );
}
