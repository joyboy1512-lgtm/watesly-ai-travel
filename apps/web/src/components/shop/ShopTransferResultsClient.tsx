"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TransferSearchCard, type TransferRow } from "@/components/hotels/TransferSearchCard";
import { saveTransferDraft } from "@/lib/booking-draft";
import { shopFetch } from "@/lib/shop-session";
import {
  buildTransferResultsHref,
  parseTransferResultsSearch,
} from "@/lib/transfer-results-url";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { ShopWishlistButton } from "@/components/shop/ShopWishlistButton";
import { formatDay } from "@/lib/flight-search";

export function ShopTransferResultsClient() {
  const { t, locale } = useShopI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseTransferResultsSearch(searchParams),
    [searchParams],
  );
  const resultsHref = useMemo(() => buildTransferResultsHref(params), [params]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<TransferRow[]>([]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setItems([]);
    try {
      if (!params.origin || !params.dropoff || !params.outboundDate) {
        throw new Error(t("pickAirport"));
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
      }>("/shop/search-transfers", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({
          city: params.dropoffLabel || params.dropoff,
          from: params.origin,
          to: params.dropoffLabel || params.dropoff,
          fromKind: "IATA",
          toKind: "GPS",
          toLabel: params.dropoffLabel || params.dropoff,
          outboundDate: params.outboundDate,
          outboundTime: params.outboundTime,
          inboundDate: params.roundtrip ? params.inboundDate : undefined,
          inboundTime: params.roundtrip ? params.inboundTime : undefined,
          adults: params.adults,
          children: params.children,
          infants: params.infants,
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
          ? t("fetchedTransfers", { n: rows.length })
          : t("noTransfers"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("noTransfers"));
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  function book(item: TransferRow) {
    saveTransferDraft({
      transfer: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: item.extra || {},
      },
      from: params.origin,
      to: params.dropoffLabel || params.dropoff,
      outboundDate: params.outboundDate,
      outboundTime: params.outboundTime,
      inboundDate: params.roundtrip ? params.inboundDate : undefined,
      inboundTime: params.roundtrip ? params.inboundTime : undefined,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      createdAt: new Date().toISOString(),
      resultsReturnHref: resultsHref,
    });
    router.push("/transfers/book/review");
  }

  return (
    <div className="shop-hotel-results-page">
      <div className="shop-flight-results-topbar">
        <div className="shop-flight-results-topbar-inner">
          <div className="shop-flight-results-summary">
            <strong>{t("transferResultsTitle")}</strong>
            <span>
              {params.originLabel || params.origin} → {params.dropoffLabel || params.dropoff}
            </span>
            <span>
              {formatDay(params.outboundDate, locale)}
              {params.outboundTime ? ` · ${params.outboundTime}` : ""}
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
          <p>{t("searchingTransfers")}</p>
        </div>
      ) : null}
      {error ? (
        <div className="shop-flight-results-error">
          <strong>{error}</strong>
          <button type="button" onClick={() => void runSearch()}>
            {t("searchCars")}
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
                  id: `transfer:${item.id}`,
                  kind: "transfer",
                  title: item.name,
                  href: resultsHref,
                  imageUrl: typeof item.extra?.imageUrl === "string" ? item.extra.imageUrl : "",
                  priceMinor: item.price,
                  currency: item.currency,
                  subtitle: `${params.origin} → ${params.dropoffLabel || params.dropoff}`,
                }}
              />
              <TransferSearchCard
                item={item}
                from={params.originLabel || params.origin}
                to={params.dropoffLabel || params.dropoff}
                onBook={() => book(item)}
              />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
