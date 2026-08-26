"use client";

import { useMemo, useState } from "react";
import { ShopFlightCard } from "@/components/shop/ShopFlightCard";
import { ShopFlightFilters } from "@/components/shop/ShopFlightFilters";
import { formatMoneyMinorCompact } from "@/lib/format";
import {
  flightFiltersActive,
  formatMinutesLabel,
  summarizeFlightSortTabs,
  type FlightOfferRow,
  type FlightSearchFilters,
  type FlightSortKey,
} from "@/lib/flight-search";

type Facets = Parameters<typeof ShopFlightFilters>[0]["facets"];

type Props = {
  flights: FlightOfferRow[];
  totalCount: number;
  filters: FlightSearchFilters;
  facets: Facets;
  sortKey: FlightSortKey;
  origin: string;
  destination: string;
  originLabel: string;
  destinationLabel: string;
  onFiltersChange: (next: FlightSearchFilters) => void;
  onSortChange: (key: FlightSortKey) => void;
  onResetFilters: () => void;
  onViewDetails: (flight: FlightOfferRow) => void;
  /** Kayak-style Best / Cheapest / Quickest tabs with price + duration */
  kayakStyle?: boolean;
};

const SORT_CHIPS: Array<{ key: FlightSortKey; label: string }> = [
  { key: "best", label: "الأفضل" },
  { key: "price_asc", label: "الأرخص" },
  { key: "cheapest_direct", label: "أرخص مباشر" },
  { key: "duration_asc", label: "الأسرع" },
];

export function ShopFlightResults(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const active = flightFiltersActive(props.filters);
  const sortTabs = useMemo(() => summarizeFlightSortTabs(props.flights), [props.flights]);

  const bestId = sortTabs.find((t) => t.key === "best")?.flightId;
  const cheapId = sortTabs.find((t) => t.key === "price_asc")?.flightId;
  const fastId = sortTabs.find((t) => t.key === "duration_asc")?.flightId;

  return (
    <section className={`shop-flight-results${props.kayakStyle ? " kayak" : ""}`}>
      {props.kayakStyle ? (
        <div className="shop-flight-sort-tabs" role="tablist" aria-label="ترتيب النتائج">
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={props.sortKey === tab.key}
              className={`shop-flight-sort-tab${props.sortKey === tab.key ? " on" : ""}`}
              onClick={() => props.onSortChange(tab.key)}
            >
              <span className="shop-flight-sort-tab-label">{tab.label}</span>
              <strong className="shop-flight-sort-tab-price">
                {tab.priceMinor != null
                  ? formatMoneyMinorCompact(tab.priceMinor, tab.currency)
                  : "—"}
              </strong>
              <span className="shop-flight-sort-tab-meta">
                {tab.durationMins != null && tab.durationMins < Number.MAX_SAFE_INTEGER
                  ? formatMinutesLabel(tab.durationMins)
                  : "—"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="shop-flight-results-head">
          <h2>وجدنا {props.flights.length} خيار رحلة</h2>
          <div className="shop-flight-results-sort">
            <span>ترتيب حسب:</span>
            {SORT_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={props.sortKey === chip.key ? "on" : undefined}
                onClick={() => props.onSortChange(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shop-flight-results-count">
        عرض {props.flights.length} من {props.totalCount} رحلة
        {active ? " · فلاتر مفعّلة" : ""}
      </div>

      <button
        type="button"
        className="shop-flight-filters-mobile-toggle"
        onClick={() => setFiltersOpen((v) => !v)}
      >
        {filtersOpen ? "إخفاء الفلاتر" : "الفلاتر"}
        {active ? " · مفعّلة" : ""}
      </button>

      <div className="shop-flight-results-layout">
        <div className={`shop-flight-filters-desktop${filtersOpen ? " open" : ""}`}>
          <ShopFlightFilters
            filters={props.filters}
            facets={props.facets}
            originLabel={props.originLabel || props.origin}
            destinationLabel={props.destinationLabel || props.destination}
            onChange={props.onFiltersChange}
          />
        </div>

        <div className="shop-flight-results-main">
          {!props.kayakStyle ? (
            <div className="shop-flight-quick-chips">
              {SORT_CHIPS.slice(0, 3).map((chip) => (
                <button
                  key={`chip-${chip.key}`}
                  type="button"
                  className={props.sortKey === chip.key ? "on" : undefined}
                  onClick={() => props.onSortChange(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="shop-ticket-list">
            {props.flights.map((flight) => {
              const badges: Array<"best" | "cheapest" | "fastest"> = [];
              if (flight.id === bestId) badges.push("best");
              if (flight.id === cheapId) badges.push("cheapest");
              if (flight.id === fastId) badges.push("fastest");
              return (
                <ShopFlightCard
                  key={flight.id}
                  flight={flight}
                  originFallback={props.origin}
                  destinationFallback={props.destination}
                  badges={badges}
                  selectLabel={props.kayakStyle ? "اختر" : undefined}
                  onViewDetails={() => props.onViewDetails(flight)}
                />
              );
            })}
            {props.flights.length === 0 ? (
              <div className="shop-ticket-empty">
                <strong>لا توجد رحلات مطابقة للفلاتر الحالية</strong>
                <p>
                  {active
                    ? "جرّب إزالة بعض الفلاتر أو توسيع نطاق السعر والمدة."
                    : "لا توجد نتائج متاحة لهذا البحث. غيّر التواريخ أو المسار وحاول مرة أخرى."}
                </p>
                {active ? (
                  <button type="button" onClick={props.onResetFilters}>
                    إعادة ضبط الفلاتر
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
