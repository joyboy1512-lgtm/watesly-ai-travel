"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  dealSavingsMinor,
  pickLocalized,
  shopNightCount,
  type WeekendDeal,
} from "@watesly-travel/shared";
import { bookDeal, fetchDeal, formatKwdMinor } from "@/lib/platform-api";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

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

  return (
    <StoreFront wide>
      <DealDetailBody deal={deal} busy={busy} error={error} onBook={book} />
    </StoreFront>
  );
}

function DealDetailBody({
  deal,
  busy,
  error,
  onBook,
}: {
  deal: WeekendDeal | null | undefined;
  busy: boolean;
  error: string;
  onBook: () => void;
}) {
  const { t, locale } = useShopI18n();
  if (deal === undefined) {
    return (
      <div className="wg-platform">
        <p className="lead">{t("loading")}</p>
      </div>
    );
  }
  if (!deal) {
    return (
      <div className="wg-platform">
        <h1>{t("offerNotFound")}</h1>
        <Link href="/deals">{t("backToDeals")}</Link>
      </div>
    );
  }
  const title = pickLocalized(locale, deal.titleAr, deal.titleEn);
  return (
    <div className="wg-platform">
      <div className="wg-dest-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={deal.image} alt={title} />
        <div className="caption">
          <h1 style={{ color: "#fff", margin: 0 }}>
            {deal.countryFlag} {title}
          </h1>
          <p style={{ margin: "0.25rem 0 0" }}>
            {pickLocalized(locale, deal.descriptionAr, deal.descriptionEn)}
          </p>
        </div>
      </div>
      <div className="wg-price-row" style={{ marginBottom: "1rem" }}>
        <span className="old">{formatKwdMinor(deal.originalPriceMinor, deal.currency)}</span>
        <span className="now">{formatKwdMinor(deal.salePriceMinor, deal.currency)}</span>
        <span className="save">
          {t("saveAmount", { amount: formatKwdMinor(dealSavingsMinor(deal), deal.currency) })}
        </span>
      </div>
      <p>
        {t("includes")}: {deal.includes.join(" · ")} · {shopNightCount(locale, deal.nights)}
      </p>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button type="button" className="wg-btn" disabled={busy} onClick={onBook}>
          {t("bookDeal")}
        </button>
        <Link className="wg-btn secondary" href={`/destinations/${deal.destinationSlug}`}>
          {t("destinationPage")}
        </Link>
      </div>
    </div>
  );
}
