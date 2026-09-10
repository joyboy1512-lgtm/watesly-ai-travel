"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ActivitySearchCard, type ActivityRow } from "@/components/hotels/ActivitySearchCard";
import { saveActivityDraft } from "@/lib/booking-draft";
import { shopFetch } from "@/lib/shop-session";
import {
  buildActivityResultsHref,
  parseActivityResultsSearch,
} from "@/lib/transfer-results-url";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { ShopWishlistButton } from "@/components/shop/ShopWishlistButton";
import { formatDay } from "@/lib/flight-search";

export function ShopActivityResultsClient() {
  const { t, locale } = useShopI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseActivityResultsSearch(searchParams),
    [searchParams],
  );
  const resultsHref = useMemo(() => buildActivityResultsHref(params), [params]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ActivityRow[]>([]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setItems([]);
    try {
      if (!params.destination || !params.fromDate) {
        throw new Error(t("pickDate"));
      }
      const result = await shopFetch<{
        providerName?: string;
        items: Array<{
          id: string;
          name: string;
          description: string;
          sellAmountMinor: number;
          currency: string;
          details?: Record<string, unknown>;
        }>;
      }>("/shop/search-activities", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({
          destination: params.destination,
          fromDate: params.fromDate,
          toDate: params.toDate,
          adults: params.adults,
          children: params.children,
        }),
      });
      const rows = (result.items || []).map((row) => ({
        id: row.id,
        name: row.name,
        price: row.sellAmountMinor,
        currency: row.currency,
        details: row.description,
        extra: row.details,
      }));
      setItems(rows);
      setMessage(
        rows.length
          ? t("fetchedActivities", { n: rows.length })
          : t("noActivities"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("noActivities"));
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  function book(item: ActivityRow) {
    saveActivityDraft({
      activity: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: item.extra || {},
      },
      destination: params.destination,
      destinationLabel: params.destinationLabel || params.destination,
      fromDate: params.fromDate,
      toDate: params.toDate,
      adults: params.adults,
      children: params.children,
      createdAt: new Date().toISOString(),
      resultsReturnHref: resultsHref,
    });
    router.push("/activities/book/review");
  }

  return (
    <div className="shop-hotel-results-page">
      <div className="shop-flight-results-topbar">
        <div className="shop-flight-results-topbar-inner">
          <div className="shop-flight-results-summary">
            <strong>{t("activityResultsTitle")}</strong>
            <span>{params.destinationLabel || params.destination}</span>
            <span>
              {formatDay(params.fromDate, locale)}
              {params.toDate ? ` – ${formatDay(params.toDate, locale)}` : ""}
            </span>
          </div>
          <Link href="/#search" className="shop-flight-home-link">
            {t("navHome")}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="shop-flight-results-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>{t("searchingActivities")}</p>
        </div>
      ) : null}
      {error ? (
        <div className="shop-flight-results-error">
          <strong>{error}</strong>
          <button type="button" onClick={() => void runSearch()}>
            {t("searchActivities")}
          </button>
        </div>
      ) : null}
      {!loading && !error ? (
        <section className="shop-results shop-results-block">
          {message ? <p className="shop-flight-results-status">{message}</p> : null}
          {items.map((item) => (
            <div key={item.id} className="shop-ancillary-result-row">
              <ShopWishlistButton
                compact
                item={{
                  id: `activity:${item.id}`,
                  kind: "activity",
                  title: String(item.extra?.activityName || item.name),
                  href: resultsHref,
                  imageUrl: typeof item.extra?.imageUrl === "string" ? item.extra.imageUrl : "",
                  priceMinor: item.price,
                  currency: item.currency,
                  subtitle: params.destinationLabel || params.destination,
                }}
              />
              <ActivitySearchCard
                item={item}
                destination={params.destinationLabel || params.destination}
                onBook={() => book(item)}
              />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
