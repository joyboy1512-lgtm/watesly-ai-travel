"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay } from "@/lib/flight-search";
import {
  flexibleDateCells,
  nightsBetweenIso,
  shiftIsoDate,
  type FlexibleDateCell,
} from "@/lib/flexible-dates";
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
  const { t, locale, currency, formatMoneyCompact } = useShopI18n();
  /** Shifts the visible ±3 day window without changing the active search until a day is picked. */
  const [windowShift, setWindowShift] = useState(0);

  useEffect(() => {
    setWindowShift(0);
  }, [search.departDate, search.returnDate]);

  const tripNights = useMemo(() => {
    if (search.tripType !== "roundtrip" || !search.returnDate) return 0;
    return nightsBetweenIso(search.departDate, search.returnDate);
  }, [search.departDate, search.returnDate, search.tripType]);

  const cells = useMemo(() => {
    const centerDepart = shiftIsoDate(search.departDate, windowShift);
    return flexibleDateCells({
      departDate: centerDepart,
      returnDate: tripNights ? shiftIsoDate(centerDepart, tripNights) : undefined,
      span: 3,
    });
  }, [search.departDate, tripNights, windowShift]);

  const [prices, setPrices] = useState<Record<string, CellState>>({});

  useEffect(() => {
    if (!search.origin || !search.destination || !search.departDate) return;
    if (search.tripType === "multicity") return;

    let cancelled = false;
    const next: Record<string, CellState> = {};
    for (const cell of cells) {
      const isSelected = cell.departDate === search.departDate;
      next[cell.departDate] = {
        ...cell,
        loading: !isSelected,
        priceMinor: isSelected ? currentCheapestMinor : undefined,
        currency: isSelected ? currentCurrency : undefined,
      };
    }
    setPrices(next);

    const neighbors = cells.filter((c) => c.departDate !== search.departDate);
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
      const row = prev[search.departDate];
      if (!row) return prev;
      return {
        ...prev,
        [search.departDate]: {
          ...row,
          priceMinor: currentCheapestMinor,
          currency: currentCurrency,
          loading: false,
        },
      };
    });
  }, [search.departDate, currentCheapestMinor, currentCurrency]);

  if (search.tripType === "multicity" || !search.departDate) return null;

  const priced = Object.values(prices).filter((c) => c.priceMinor && c.priceMinor > 0);
  const minPrice = priced.reduce(
    (m, c) => Math.min(m, c.priceMinor || Number.MAX_SAFE_INTEGER),
    Number.MAX_SAFE_INTEGER,
  );

  return (
    <section className="shop-price-calendar" aria-label={t("priceCalendar")}>
      <div className="shop-price-calendar-head" data-display-currency={currency}>
        <strong>{t("priceCalendar")}</strong>
        <span>{t("flexibleDates")}</span>
      </div>
      <div className="shop-price-calendar-nav">
        <button
          type="button"
          className="shop-price-calendar-arrow"
          aria-label="تواريخ سابقة"
          onClick={() => setWindowShift((s) => s - 3)}
        >
          ‹
        </button>
        <div className="shop-price-calendar-row" role="list">
          {cells.map((cell) => {
            const state: CellState = prices[cell.departDate] ?? {
              ...cell,
              loading: false,
            };
            const selected = cell.departDate === search.departDate;
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
                <span className="shop-price-calendar-day">{formatDay(cell.departDate, locale)}</span>
                <strong>
                  {state.loading
                    ? "…"
                    : state.priceMinor
                      ? formatMoneyCompact(state.priceMinor, state.currency)
                      : "—"}
                </strong>
                {selected ? <em>{t("selectedDay")}</em> : cheapest ? <em>{t("cheapestDay")}</em> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="shop-price-calendar-arrow"
          aria-label="تواريخ لاحقة"
          onClick={() => setWindowShift((s) => s + 3)}
        >
          ›
        </button>
      </div>
    </section>
  );
}
