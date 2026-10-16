"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDay } from "@/lib/flight-search";
import {
  flexibleDateCells,
  nightsBetweenIso,
  shiftIsoDate,
  weekdayIndex,
  type FlexibleDateCell,
} from "@/lib/flexible-dates";
import { shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import type { FlightOfferRow } from "@/lib/flight-search";
import type { FlightResultsSearchParams } from "@/lib/flight-results-url";
import { airportPlaceLabel } from "@/lib/airport-cities";

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

const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m: (m || 1) - 1, d: d || 1 };
}

function compactDay(iso: string, locale: "ar" | "en") {
  const p = parts(iso);
  return locale === "en" ? `${EN_MONTHS[p.m]} ${p.d}` : `${p.d} ${AR_MONTHS[p.m]}`;
}

function compactRange(depart: string, ret: string | undefined, locale: "ar" | "en") {
  if (!ret) return compactDay(depart, locale);
  const a = parts(depart);
  const b = parts(ret);
  if (locale === "en") {
    return a.m === b.m
      ? `${EN_MONTHS[a.m]} ${a.d}–${b.d}`
      : `${EN_MONTHS[a.m]} ${a.d}–${EN_MONTHS[b.m]} ${b.d}`;
  }
  return a.m === b.m
    ? `${a.d}–${b.d} ${AR_MONTHS[a.m]}`
    : `${a.d} ${AR_MONTHS[a.m]} – ${b.d} ${AR_MONTHS[b.m]}`;
}

function weekdayName(iso: string, locale: "ar" | "en") {
  const i = weekdayIndex(iso);
  return locale === "en" ? EN_WEEKDAYS[i] : AR_WEEKDAYS[i];
}

function quoteKey(depart: string, ret?: string) {
  return `${depart}|${ret || ""}`;
}

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

  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const row = rowRef.current;
      if (!row || row.scrollWidth <= row.clientWidth + 1) return;
      const selected = row.querySelector<HTMLElement>(".shop-price-calendar-cell.on");
      if (!selected) return;
      const rowBox = row.getBoundingClientRect();
      const cellBox = selected.getBoundingClientRect();
      row.scrollBy({
        left: cellBox.left + cellBox.width / 2 - (rowBox.left + rowBox.width / 2),
        behavior: "auto",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [cells, search.departDate]);

  const [tableOpen, setTableOpen] = useState(false);
  const [departShift, setDepartShift] = useState(0);
  const [returnShift, setReturnShift] = useState(0);
  const [tablePick, setTablePick] = useState<FlexibleDateCell | null>(null);
  const [matrix, setMatrix] = useState<Record<string, { priceMinor?: number; currency?: string; loading?: boolean }>>({});
  const quoted = useRef<Set<string>>(new Set());

  const roundTrip = search.tripType === "roundtrip" && Boolean(search.returnDate);
  const departCols = useMemo(
    () => [-3, -2, -1, 0, 1, 2, 3].map((i) => shiftIsoDate(search.departDate, departShift + i)),
    [search.departDate, departShift],
  );
  const returnRows = useMemo(() => {
    if (!roundTrip) return [undefined as string | undefined];
    return [-1, 0, 1].map((i) => shiftIsoDate(search.returnDate, returnShift + i));
  }, [roundTrip, search.returnDate, returnShift]);

  useEffect(() => {
    for (const cell of cells) {
      const known = prices[cell.departDate];
      if (!known?.priceMinor) continue;
      const key = quoteKey(cell.departDate, cell.returnDate);
      if (quoted.current.has(key)) continue;
      quoted.current.add(key);
      setMatrix((prev) => ({
        ...prev,
        [key]: { priceMinor: known.priceMinor, currency: known.currency, loading: false },
      }));
    }
  }, [cells, prices]);

  useEffect(() => {
    if (!tableOpen || !search.origin || !search.destination || search.tripType === "multicity") return;
    let cancelled = false;
    const pairs: FlexibleDateCell[] = [];
    for (const departDate of departCols) {
      for (const returnDate of returnRows) {
        if (returnDate && returnDate <= departDate) continue;
        pairs.push({ offset: 0, departDate, returnDate });
      }
    }
    const todo = pairs.filter((pair) => {
      const key = quoteKey(pair.departDate, pair.returnDate);
      if (quoted.current.has(key)) return false;
      quoted.current.add(key);
      return true;
    });
    if (todo.length) {
      setMatrix((prev) => {
        const next = { ...prev };
        for (const pair of todo) next[quoteKey(pair.departDate, pair.returnDate)] = { loading: true };
        return next;
      });
    }
    async function run() {
      for (let i = 0; i < todo.length; i += 2) {
        const batch = todo.slice(i, i + 2);
        await Promise.all(
          batch.map(async (pair) => {
            const key = quoteKey(pair.departDate, pair.returnDate);
            try {
              const result = await shopFetch<{ flights?: FlightOfferRow[] }>("/shop/search-flights", {
                method: "POST",
                timeoutMs: 45000,
                body: JSON.stringify({
                  origin: search.origin,
                  destination: search.destination,
                  departDate: pair.departDate,
                  returnDate: search.tripType === "roundtrip" ? pair.returnDate : undefined,
                  adults: search.adults,
                  children: search.children,
                  infants: search.infants,
                  cabinClass: search.cabinClass,
                }),
              });
              if (cancelled) {
                quoted.current.delete(key);
                return;
              }
              const cheap = cheapestOf(result.flights);
              setMatrix((prev) => ({
                ...prev,
                [key]: { loading: false, priceMinor: cheap?.priceMinor, currency: cheap?.currency },
              }));
            } catch {
              if (cancelled) {
                quoted.current.delete(key);
                return;
              }
              setMatrix((prev) => ({ ...prev, [key]: { loading: false } }));
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
  }, [
    tableOpen,
    departCols,
    returnRows,
    search.origin,
    search.destination,
    search.tripType,
    search.adults,
    search.children,
    search.infants,
    search.cabinClass,
  ]);

  function openTable() {
    setDepartShift(0);
    setReturnShift(0);
    setTablePick({
      offset: 0,
      departDate: search.departDate,
      returnDate: roundTrip ? search.returnDate : undefined,
    });
    setTableOpen(true);
  }

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
          aria-label={locale === "en" ? "Previous dates" : "تواريخ سابقة"}
          onClick={() => setWindowShift((s) => s - 3)}
        >
          ‹
        </button>
        <div className="shop-price-calendar-row" role="list" ref={rowRef}>
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
                <span className="shop-price-calendar-day">
                  {compactRange(cell.departDate, cell.returnDate, locale)}
                </span>
                <strong>
                  {state.loading
                    ? "…"
                    : state.priceMinor
                      ? formatMoneyCompact(state.priceMinor, state.currency)
                      : "—"}
                </strong>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="shop-price-calendar-arrow"
          aria-label={locale === "en" ? "Next dates" : "تواريخ لاحقة"}
          onClick={() => setWindowShift((s) => s + 3)}
        >
          ›
        </button>
        <button type="button" className="shop-price-calendar-table" onClick={openTable}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm12 8H5v9h14z"
            />
          </svg>
          <span>{locale === "en" ? "Price table" : "جدول الأسعار"}</span>
        </button>
      </div>
      {tableOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="shop-price-table-back" onClick={() => setTableOpen(false)}>
              <div
                className="shop-price-table"
                role="dialog"
                aria-modal="true"
                aria-label={locale === "en" ? "Price table" : "جدول الأسعار"}
                onClick={(e) => e.stopPropagation()}
              >
                <header className="shop-price-table-head">
                  <h2>
                    <span>
                      {locale === "en"
                        ? airportPlaceLabel(search.origin, "en")
                        : search.originLabel || search.origin}
                    </span>
                    <b aria-hidden="true">⇄</b>
                    <span>
                      {locale === "en"
                        ? airportPlaceLabel(search.destination, "en")
                        : search.destinationLabel || search.destination}
                    </span>
                  </h2>
                  <button
                    type="button"
                    className="shop-price-table-x"
                    aria-label={locale === "en" ? "Close" : "إغلاق"}
                    onClick={() => setTableOpen(false)}
                  >
                    ×
                  </button>
                </header>
                <div className="shop-price-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="shop-price-table-corner">
                          <span>
                            {roundTrip
                              ? locale === "en"
                                ? "Departure"
                                : "المغادرة"
                              : locale === "en"
                                ? "Date"
                                : "التاريخ"}
                          </span>
                          <span className="shop-price-table-shift">
                            <button
                              type="button"
                              aria-label={locale === "en" ? "Earlier departure" : "مغادرة أسبق"}
                              onClick={() => setDepartShift((s) => s - 1)}
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              aria-label={locale === "en" ? "Later departure" : "مغادرة لاحقة"}
                              onClick={() => setDepartShift((s) => s + 1)}
                            >
                              ›
                            </button>
                          </span>
                        </th>
                        {departCols.map((day) => (
                          <th key={day} className={tablePick?.departDate === day ? "on" : undefined}>
                            <b>{compactDay(day, locale)}</b>
                            <i>{weekdayName(day, locale)}</i>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {returnRows.map((ret) => {
                        const visiblePrices = returnRows.flatMap((row) =>
                          departCols
                            .map((day) => matrix[quoteKey(day, row)]?.priceMinor)
                            .filter((n): n is number => n != null && n > 0),
                        );
                        const gridMin = visiblePrices.length ? Math.min(...visiblePrices) : 0;
                        return (
                          <tr key={ret || "oneway"}>
                            <th className={ret && tablePick?.returnDate === ret ? "on" : undefined}>
                              {ret ? (
                                <>
                                  <b>{compactDay(ret, locale)}</b>
                                  <i>{weekdayName(ret, locale)}</i>
                                </>
                              ) : (
                                <b>{locale === "en" ? "One way" : "ذهاب"}</b>
                              )}
                            </th>
                            {departCols.map((day) => {
                              const invalid = Boolean(ret && ret <= day);
                              const quote = matrix[quoteKey(day, ret)];
                              const selected =
                                tablePick?.departDate === day && (tablePick.returnDate || "") === (ret || "");
                              const lowest = Boolean(quote?.priceMinor && quote.priceMinor === gridMin);
                              return (
                                <td key={day}>
                                  {invalid ? null : (
                                    <button
                                      type="button"
                                      className={selected ? "on" : undefined}
                                      onClick={() =>
                                        setTablePick({ offset: 0, departDate: day, returnDate: ret })
                                      }
                                    >
                                      {quote?.loading
                                        ? "…"
                                        : quote?.priceMinor
                                          ? formatMoneyCompact(quote.priceMinor, quote.currency)
                                          : "—"}
                                      {selected && lowest ? (
                                        <small>{locale === "en" ? "Lowest fare" : "أقل سعر"}</small>
                                      ) : null}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {roundTrip ? (
                  <div className="shop-price-table-return-nav">
                    <span>{locale === "en" ? "Return" : "العودة"}</span>
                    <button
                      type="button"
                      aria-label={locale === "en" ? "Earlier return" : "عودة أسبق"}
                      onClick={() => setReturnShift((s) => s - 1)}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label={locale === "en" ? "Later return" : "عودة لاحقة"}
                      onClick={() => setReturnShift((s) => s + 1)}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
                <footer className="shop-price-table-foot">
                  <p>
                    {locale === "en"
                      ? "Fares change frequently. The price shown at checkout is final."
                      : "الأسعار تتغير باستمرار. يُعتمد السعر الظاهر عند إتمام الحجز."}
                  </p>
                  <div>
                    {tablePick ? (
                      <span>
                        {locale === "en" ? "Departure" : "المغادرة"}:{" "}
                        {formatDay(tablePick.departDate, locale)}
                        {tablePick.returnDate
                          ? ` · ${locale === "en" ? "Return" : "العودة"}: ${formatDay(
                              tablePick.returnDate,
                              locale,
                            )}`
                          : ""}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="shop-price-table-go"
                      disabled={!tablePick}
                      onClick={() => {
                        if (!tablePick) return;
                        onPick(tablePick);
                        setTableOpen(false);
                      }}
                    >
                      {locale === "en" ? "Search flights" : "بحث عن الرحلات"}
                    </button>
                  </div>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
