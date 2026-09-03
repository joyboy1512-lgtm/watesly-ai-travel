"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay } from "@/lib/flight-search";
import { formatMoneyMinorCompact } from "@/lib/format";
import { flexibleDateCells, type FlexibleDateCell } from "@/lib/flexible-dates";
import { shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import type { FlightOfferRow } from "@/lib/flight-search";
import type { FlightResultsSearchParams } from "@/lib/flight-results-url";

type CellState = FlexibleDateCell & {
  priceMinor?: number;
  currency?: string;
  loading?: boolean;
};

type Props = {
  search: FlightResultsSearchParams;
  currentCheapestMinor?: number;
  currentCurrency?: string;
  onPick: (cell: FlexibleDateCell) => void;
};

function cheapestOf(rows: FlightOfferRow[] | undefined) {
  if (!rows?.length) return null;
  let min = rows[0]!;
  for (const row of rows) {
    if (row.sellAmountMinor > 0 && row.sellAmountMinor < min.sellAmountMinor) min = row;
  }
  return min.sellAmountMinor > 0
    ? { priceMinor: min.sellAmountMinor, currency: min.currency }
    : null;
}

export function ShopPriceCalendar({
  search,
  currentCheapestMinor,
  currentCurrency,
  onPick,
}: Props) {
  const { t, locale } = useShopI18n();
  const cells = useMemo(
    () =>
      flexibleDateCells({
        departDate: search.departDate,
        returnDate: search.tripType === "roundtrip" ? search.returnDate : undefined,
        span: 3,
      }),
    [search.departDate, search.returnDate, search.tripType],
  );
  const [prices, setPrices] = useState<Record<string, CellState>>({});

  useEffect(() => {
    if (!search.origin || !search.destination || !search.departDate) return;
    if (search.tripType === "multicity") return;

    let cancelled = false;
    const next: Record<string, CellState> = {};
    for (const cell of cells) {
      next[cell.departDate] = {
        ...cell,
        loading: cell.offset !== 0,
        priceMinor: cell.offset === 0 ? currentCheapestMinor : undefined,
        currency: cell.offset === 0 ? currentCurrency : undefined,
      };
    }
    setPrices(next);

    const neighbors = cells.filter((c) => c.offset !== 0);
    async function run() {
      for (let i = 0; i < neighbors.length; i += 2) {
        const batch = neighbors.slice(i, i + 2);
        await Promise.all(
          batch.map(async (cell) => {
            try {
              const result = await shopFetch<{ flights?: FlightOfferRow[] }>(
                "/shop/search-flights",
                {
                  method: "POST",
                  timeoutMs: 45000,
                  body: JSON.stringify({
                    origin: search.origin,
                    destination: search.destination,
                    departDate: cell.departDate,
                    returnDate:
                      search.tripType === "roundtrip" ? cell.returnDate : undefined,
                    adults: search.adults,
                    children: search.children,
                    infants: search.infants,
                    cabinClass: search.cabinClass,
                  }),
                },
              );
              if (cancelled) return;
              const cheap = cheapestOf(result.flights);
              setPrices((prev) => ({
                ...prev,
                [cell.departDate]: {
                  ...cell,
                  loading: false,
                  priceMinor: cheap?.priceMinor,
                  currency: cheap?.currency,
                },
              }));
            } catch {
              if (cancelled) return;
              setPrices((prev) => ({
                ...prev,
                [cell.departDate]: { ...cell, loading: false },
              }));
            }
          }),
        );
        if (cancelled) return;
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // Cheapest for the selected day is filled from the open results, not this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid refetch when only current price arrives
  }, [
    cells,
    search.origin,
    search.destination,
    search.departDate,
    search.returnDate,
    search.tripType,
    search.adults,
    search.children,
    search.infants,
    search.cabinClass,
  ]);

  useEffect(() => {
    if (currentCheapestMinor == null) return;
    setPrices((prev) => {
      const selected = cells.find((c) => c.offset === 0);
      if (!selected) return prev;
      const row = prev[selected.departDate];
      if (!row) return prev;
      return {
        ...prev,
        [selected.departDate]: {
          ...row,
          priceMinor: currentCheapestMinor,
          currency: currentCurrency,
          loading: false,
        },
      };
    });
  }, [cells, currentCheapestMinor, currentCurrency]);

  if (search.tripType === "multicity" || !search.departDate) return null;

  const priced = Object.values(prices).filter((c) => c.priceMinor && c.priceMinor > 0);
  const minPrice = priced.reduce(
    (m, c) => Math.min(m, c.priceMinor || Number.MAX_SAFE_INTEGER),
    Number.MAX_SAFE_INTEGER,
  );

  return (
    <section className="shop-price-calendar" aria-label={t("priceCalendar")}>
      <div className="shop-price-calendar-head">
        <strong>{t("priceCalendar")}</strong>
        <span>{t("flexibleDates")}</span>
      </div>
      <p className="shop-hint">{t("priceCalendarHint")}</p>
      <div className="shop-price-calendar-row" role="list">
        {cells.map((cell) => {
          const state: CellState = prices[cell.departDate] ?? {
            ...cell,
            loading: false,
          };
          const selected = cell.offset === 0;
          const cheapest =
            state.priceMinor != null &&
            state.priceMinor === minPrice &&
            minPrice < Number.MAX_SAFE_INTEGER;
          return (
            <button
              key={cell.departDate}
              type="button"
              role="listitem"
              className={`shop-price-calendar-cell${selected ? " on" : ""}${
                cheapest ? " cheap" : ""
              }`}
              onClick={() => onPick(cell)}
            >
              <span className="shop-price-calendar-day">
                {formatDay(cell.departDate, locale).split(" ").slice(0, 2).join(" ")}
              </span>
              <strong>
                {state.loading
                  ? "…"
                  : state.priceMinor
                    ? formatMoneyMinorCompact(state.priceMinor, state.currency)
                    : "—"}
              </strong>
              {selected ? <em>{t("selectedDay")}</em> : cheapest ? <em>{t("cheapestDay")}</em> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
