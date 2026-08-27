"use client";

import { useMemo, useState } from "react";
import "@/app/hotel-rich.css";
import { HotelSearchCard } from "@/components/hotels/HotelSearchCard";
import { ShopHotelFilters } from "@/components/shop/ShopHotelFilters";
import { ShopHotelResultsBar } from "@/components/shop/ShopHotelResultsBar";
import type { SuggestItem } from "@/components/shop/ShopAutocomplete";
import {
  computeHotelHighlights,
  type HotelOfferRow,
  type HotelFilterFacets,
  type HotelSearchFilters,
  type HotelHighlightBadge,
} from "@/lib/hotel-search";

type HotelRow = HotelOfferRow & {
  matchingRates: import("@/lib/hotel-search").HotelRateOption[];
  displayFromMinor: number;
};

type Facets = HotelFilterFacets;

type SortKey = "best" | "price_asc" | "price_desc" | "rating_desc" | "distance";

type Props = {
  destination: string;
  stayQuery: string;
  departDate: string;
  returnDate: string;
  adults: number;
  children: number;
  rooms: number;
  nights: number;
  loading: boolean;
  hotels: HotelRow[];
  filters: HotelSearchFilters;
  facets: Facets;
  sortKey: SortKey;
  onFiltersChange: (next: HotelSearchFilters) => void;
  onSortChange: (key: SortKey) => void;
  onStayQueryChange: (text: string) => void;
  onStayPick: (item: SuggestItem) => void;
  onDepartDateChange: (v: string) => void;
  onReturnDateChange: (v: string) => void;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onRoomsChange: (n: number) => void;
  onSearch: () => void;
  onOpenHotel: (hotel: HotelRow) => void;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

export function ShopHotelResults(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const title = props.destination || props.stayQuery || "الإقامات";
  const guests = props.adults + props.children;

  const highlights = useMemo(() => computeHotelHighlights(props.hotels), [props.hotels]);

  const badgeLabel = (badge: HotelHighlightBadge) => {
    if (badge === "cheapest") return "الأقل سعرًا";
    if (badge === "top_rated") return "الأعلى تقييمًا";
    return "الأقرب للمركز";
  };

  return (
    <section className="shop-hotel-results">
      <ShopHotelResultsBar
        stayQuery={props.stayQuery}
        departDate={props.departDate}
        returnDate={props.returnDate}
        adults={props.adults}
        children={props.children}
        rooms={props.rooms}
        loading={props.loading}
        onStayQueryChange={props.onStayQueryChange}
        onStayPick={props.onStayPick}
        onDepartDateChange={props.onDepartDateChange}
        onReturnDateChange={props.onReturnDateChange}
        onAdultsChange={props.onAdultsChange}
        onChildrenChange={props.onChildrenChange}
        onRoomsChange={props.onRoomsChange}
        onSearch={props.onSearch}
        searchCities={props.searchCities}
      />

      <div className="shop-hotel-results-head">
        <h2>
          {title}: {props.hotels.length} عقار
        </h2>
        <div className="shop-hotel-results-sort">
          <button
            type="button"
            className={props.sortKey === "best" ? "on" : undefined}
            onClick={() => props.onSortChange("best")}
          >
            الأفضل
          </button>
          <button
            type="button"
            className={props.sortKey === "price_asc" ? "on" : undefined}
            onClick={() => props.onSortChange("price_asc")}
          >
            الأقل سعراً
          </button>
          {props.hotels.some((h) => Number(h.details.guestRatingScore || 0) > 0) ? (
            <button
              type="button"
              className={props.sortKey === "rating_desc" ? "on" : undefined}
              onClick={() => props.onSortChange("rating_desc")}
            >
              الأعلى تقييماً
            </button>
          ) : null}
          <button
            type="button"
            className={props.sortKey === "distance" ? "on" : undefined}
            onClick={() => props.onSortChange("distance")}
          >
            الأقرب
          </button>
        </div>
      </div>

      <div className="shop-hotel-results-layout">
        <ShopHotelFilters
          filters={props.filters}
          facets={props.facets}
          onChange={props.onFiltersChange}
          mobileOpen={filtersOpen}
          onMobileToggle={() => setFiltersOpen((v) => !v)}
        />

        <div className="shop-hotel-results-list">
          {props.hotels.map((hotel) => (
            <HotelSearchCard
              key={hotel.id}
              hotel={hotel}
              nights={props.nights}
              guests={guests}
              rooms={props.rooms}
              variant="shop"
              highlight={highlights.get(hotel.id)}
              highlightLabel={highlights.get(hotel.id) ? badgeLabel(highlights.get(hotel.id)!) : undefined}
              onOpen={() => props.onOpenHotel(hotel)}
            />
          ))}
          {props.hotels.length === 0 ? (
            <p className="shop-hotel-results-empty">لا توجد فنادق مطابقة للفلاتر الحالية.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
