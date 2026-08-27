"use client";

import { useMemo, useState } from "react";
import { ShopFlightCard, type FlightCardDisplayLeg } from "@/components/shop/ShopFlightCard";
import { ShopFlightFilters } from "@/components/shop/ShopFlightFilters";
import { formatMoneyMinorCompact } from "@/lib/format";
import {
  flightFiltersActive,
  formatMinutesLabel,
  outboundLegKey,
  returnLegKey,
  summarizeFlightSortTabs,
  type FlightOfferRow,
  type FlightSearchFilters,
  type FlightSortKey,
} from "@/lib/flight-search";

type Facets = Parameters<typeof ShopFlightFilters>[0]["facets"];

export type FlightPickStep = "outbound" | "return" | "single";

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
  passengers?: number;
  onFiltersChange: (next: FlightSearchFilters) => void;
  onSortChange: (key: FlightSortKey) => void;
  onResetFilters: () => void;
  enableMixMatch?: boolean;
  onSelectFlight: (flight: FlightOfferRow) => void;
  onToggleOutbound?: (flight: FlightOfferRow) => void;
  onToggleReturn?: (flight: FlightOfferRow) => void;
  selectedOutboundKey?: string | null;
  selectedReturnKey?: string | null;
  expandedTripId?: string | null;
  loadingFlightId?: string | null;
  pickStep?: FlightPickStep;
  stepTitle?: string;
};

export function ShopFlightResults(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const active = flightFiltersActive(props.filters);
  const pickStep = props.pickStep || "single";
  const sortTabs = useMemo(
    () =>
      summarizeFlightSortTabs(
        props.flights,
        pickStep === "outbound" ? "outbound" : pickStep === "return" ? "return" : "full",
      ),
    [props.flights, pickStep],
  );
  const displayLeg: FlightCardDisplayLeg =
    pickStep === "outbound" ? "outbound" : pickStep === "return" ? "return" : "both";
  const enableMix = props.enableMixMatch !== false;

  const bestId = sortTabs.find((t) => t.key === "best")?.flightId;
  const cheapId = sortTabs.find((t) => t.key === "price_asc")?.flightId;
  const fastId = sortTabs.find((t) => t.key === "duration_asc")?.flightId;

  return (
    <section className="shop-flight-results kayak">
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

      <div className="shop-flight-results-count">
        {props.stepTitle ? <strong>{props.stepTitle} · </strong> : null}
        عرض {props.flights.length} من {props.totalCount}
        {active ? " · فلاتر مفعّلة" : ""}
        {enableMix ? " · يمكنك مزج الذهاب والعودة" : ""}
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
        <aside className={`shop-flight-filters-desktop${filtersOpen ? " open" : ""}`}>
          <ShopFlightFilters
            filters={props.filters}
            facets={props.facets}
            originLabel={props.originLabel || props.origin}
            destinationLabel={props.destinationLabel || props.destination}
            onChange={props.onFiltersChange}
          />
        </aside>

        <div className="shop-flight-results-main">
          <div className="shop-ticket-list">
            {props.flights.map((flight) => {
              const badges: Array<"best" | "cheapest" | "fastest"> = [];
              if (flight.id === bestId) badges.push("best");
              if (flight.id === cheapId) badges.push("cheapest");
              if (flight.id === fastId) badges.push("fastest");

              const outKey = outboundLegKey(flight);
              const retKey = returnLegKey(flight);
              const pkgTripId = `pkg-${flight.id}`;
              const isExpanded = props.expandedTripId === pkgTripId;

              return (
                <ShopFlightCard
                  key={flight.id}
                  flight={flight}
                  originFallback={props.origin}
                  destinationFallback={props.destination}
                  badges={badges}
                  displayLeg={displayLeg}
                  priceFrom={pickStep === "outbound"}
                  passengers={props.passengers}
                  enableMixMatch={enableMix && props.enableMixMatch !== false}
                  outboundKey={outKey}
                  returnKey={retKey}
                  selectedOutboundKey={props.selectedOutboundKey}
                  selectedReturnKey={props.selectedReturnKey}
                  onToggleOutbound={() => props.onToggleOutbound?.(flight)}
                  onToggleReturn={() => props.onToggleReturn?.(flight)}
                  isExpanded={isExpanded}
                  selectLoading={props.loadingFlightId === flight.id}
                  isHighlighted={
                    props.selectedOutboundKey === outKey || props.selectedReturnKey === retKey
                  }
                  onSelectFlight={() => props.onSelectFlight(flight)}
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
