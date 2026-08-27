"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/hotel-rich.css";
import { HotelSearchCard } from "@/components/hotels/HotelSearchCard";
import { HotelResultsMap } from "@/components/hotels/HotelResultsMap";
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

const PAGE_SIZE = 12;

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
  searchDestinationCode?: string;
  initialVisibleCount?: number;
  onVisibleCountChange?: (n: number) => void;
};

export function ShopHotelResults(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapHotelId, setMapHotelId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(props.initialVisibleCount || PAGE_SIZE);
  const title = props.destination || props.stayQuery || "الإقامات";
  const guests = props.adults + props.children;

  useEffect(() => {
    setVisibleCount(props.initialVisibleCount || PAGE_SIZE);
  }, [props.hotels, props.sortKey, props.filters, props.initialVisibleCount]);

  useEffect(() => {
    props.onVisibleCountChange?.(visibleCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify parent of page size only
  }, [visibleCount]);

  const highlights = useMemo(() => computeHotelHighlights(props.hotels), [props.hotels]);
  const visibleHotels = props.hotels.slice(0, visibleCount);
  const mapPins = useMemo(
    () =>
      props.hotels
        .map((h) => {
          const lat = Number(h.details.latitude);
          const lng = Number(h.details.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return {
            id: h.id,
            name: String(h.details.name || h.description || "فندق"),
            lat,
            lng,
            priceMinor: h.displayFromMinor,
            currency: h.currency,
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        name: string;
        lat: number;
        lng: number;
        priceMinor: number;
        currency: string;
      }>,
    [props.hotels],
  );

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
          <button
            type="button"
            className={props.sortKey === "price_desc" ? "on" : undefined}
            onClick={() => props.onSortChange("price_desc")}
          >
            الأعلى سعراً
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
          {mapPins.length ? (
            <button
              type="button"
              className={mapOpen ? "on" : undefined}
              onClick={() => setMapOpen((v) => !v)}
            >
              {mapOpen ? "إخفاء الخريطة" : "الخريطة"}
            </button>
          ) : null}
        </div>
      </div>

      {mapOpen && mapPins.length ? (
        <HotelResultsMap
          pins={mapPins}
          selectedId={mapHotelId || visibleHotels[0]?.id}
          onSelect={(id) => {
            setMapHotelId(id);
            const row = props.hotels.find((h) => h.id === id);
            if (row) {
              const el = document.getElementById(`hotel-card-${id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
        />
      ) : null}

      <div className="shop-hotel-results-layout">
        <ShopHotelFilters
          filters={props.filters}
          facets={props.facets}
          onChange={props.onFiltersChange}
          mobileOpen={filtersOpen}
          onMobileToggle={() => setFiltersOpen((v) => !v)}
          searchDestinationCode={props.searchDestinationCode}
          searchDestinationLabel={props.destination}
        />

        <div className="shop-hotel-results-list">
          {props.loading ? (
            <div className="shop-hotel-skeleton-grid" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="shop-hotel-skeleton-card" />
              ))}
              <p className="shop-hotel-loading-msg">نقارن الأسعار من مزودي الفنادق…</p>
            </div>
          ) : null}
          {!props.loading
            ? visibleHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  id={`hotel-card-${hotel.id}`}
                  onMouseEnter={() => setMapHotelId(hotel.id)}
                >
                  <HotelSearchCard
                    hotel={hotel}
                    nights={props.nights}
                    guests={guests}
                    rooms={props.rooms}
                    variant="shop"
                    highlight={highlights.get(hotel.id)}
                    highlightLabel={
                      highlights.get(hotel.id) ? badgeLabel(highlights.get(hotel.id)!) : undefined
                    }
                    onOpen={() => props.onOpenHotel(hotel)}
                  />
                </div>
              ))
            : null}
          {!props.loading && visibleCount < props.hotels.length ? (
            <button
              type="button"
              className="shop-hotel-load-more"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              عرض المزيد ({props.hotels.length - visibleCount} متبقي)
            </button>
          ) : null}
          {!props.loading && props.hotels.length === 0 ? (
            <p className="shop-hotel-results-empty">لا توجد فنادق مطابقة للفلاتر الحالية.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
