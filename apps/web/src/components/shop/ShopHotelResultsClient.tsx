"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ShopHotelResults } from "@/components/shop/ShopHotelResults";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { type SuggestItem } from "@/components/shop/ShopAutocomplete";
import {
  collectFilterFacets,
  defaultHotelFilters,
  filterHotelOffers,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelSearchFilters,
} from "@/lib/hotel-search";
import {
  buildHotelResultsHref,
  formatHotelSearchSummary,
  nightsBetween,
  parseHotelResultsSearch,
  type HotelResultsSearchParams,
} from "@/lib/hotel-results-url";
import {
  loadHotelResultsSession,
  saveHotelResultsSession,
  shouldRestoreHotelResultsSession,
  type HotelSortKey,
} from "@/lib/hotel-results-session";
import { saveHotelDraft } from "@/lib/booking-draft";
import { saveHotelSearchSession } from "@/lib/hotel-search-session";
import { shopFetch } from "@/lib/shop-session";

const HotelDetailModal = dynamic(
  () => import("@/components/hotels/HotelDetailModal").then((m) => m.HotelDetailModal),
  { ssr: false },
);

type QuoteItem = { id: string; providerOfferRef: string; serviceType: string };

type HotelRow = HotelOfferRow & {
  matchingRates: import("@/lib/hotel-search").HotelRateOption[];
  displayFromMinor: number;
};

export function ShopHotelResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseHotelResultsSearch(searchParams), [searchParams]);
  const resultsHref = useMemo(() => buildHotelResultsHref(params), [params]);
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const summary = formatHotelSearchSummary(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [hotelsRaw, setHotelsRaw] = useState<HotelOfferRow[]>([]);
  const [inquiryId, setInquiryId] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [filters, setFilters] = useState<HotelSearchFilters>(defaultHotelFilters());
  const [sortKey, setSortKey] = useState<HotelSortKey>("best");
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<HotelResultsSearchParams>(params);
  const [hotelOpen, setHotelOpen] = useState<HotelRow | null>(null);

  const restoredRef = useRef(false);
  const sessionSaveRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(params);
  }, [params]);

  const facets = useMemo(() => collectFilterFacets(hotelsRaw), [hotelsRaw]);
  const hotels = useMemo(
    () => filterHotelOffers(hotelsRaw, filters, sortKey),
    [hotelsRaw, filters, sortKey],
  );

  const persistSession = useCallback(() => {
    saveHotelResultsSession({
      filters,
      sortKey,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      openHotelId: hotelOpen?.id || null,
      returnHref: resultsHref,
    });
  }, [filters, sortKey, hotelOpen, resultsHref]);

  useEffect(() => {
    if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    sessionSaveRef.current = window.setTimeout(() => persistSession(), 300);
    return () => {
      if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    };
  }, [persistSession]);

  const runSearch = useCallback(
    async (search: HotelResultsSearchParams) => {
      setLoading(true);
      setError("");
      setMessage("");
      setHotelsRaw([]);
      setHotelOpen(null);

      if (!shouldRestoreHotelResultsSession(buildHotelResultsHref(search))) {
        setFilters(defaultHotelFilters());
        setSortKey("price_asc");
        restoredRef.current = false;
      }

      try {
        if (!search.destination.trim() || !search.checkIn || !search.checkOut) {
          throw new Error("أدخل الوجهة وتواريخ الإقامة");
        }
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: QuoteItem[];
          providerName?: string;
          hotels: HotelOfferRow[];
        }>("/shop/search-hotels", {
          method: "POST",
          timeoutMs: 60000,
          body: JSON.stringify({
            destination: search.destination,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
            infants: search.infants,
          }),
        });
        setInquiryId(result.inquiryId);
        setQuoteItems(result.quoteItems || []);
        setHotelsRaw(result.hotels || []);
        setMessage(
          `تم جلب ${result.hotels?.length || 0} إقامة تجريبية عبر ${result.providerName || "المزوّد"}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل البحث");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runSearch(params);
  }, [params, runSearch]);

  useEffect(() => {
    if (restoredRef.current || loading || !hotelsRaw.length) return;
    if (!shouldRestoreHotelResultsSession(resultsHref)) return;
    const saved = loadHotelResultsSession();
    if (!saved) return;
    restoredRef.current = true;
    setFilters(saved.filters);
    setSortKey(saved.sortKey);
    if (saved.openHotelId) {
      const row = filterHotelOffers(hotelsRaw, saved.filters, saved.sortKey).find(
        (h) => h.id === saved.openHotelId,
      );
      if (row) setHotelOpen(row);
    }
    requestAnimationFrame(() => {
      window.scrollTo(0, saved.scrollY);
    });
  }, [loading, hotelsRaw, resultsHref]);

  async function searchCities(q: string): Promise<SuggestItem[]> {
    const rows = await shopFetch<
      Array<{ city: string | null; country: string | null; iataCode?: string | null }>
    >(`/shop/cities?q=${encodeURIComponent(q)}`);
    return rows.map((c, idx) => ({
      id: `${c.city}-${idx}`,
      code: c.iataCode || c.city || q,
      title: c.city || q,
      subtitle: c.country || undefined,
    }));
  }

  function applyEdit(e: FormEvent) {
    e.preventDefault();
    const href = buildHotelResultsHref(draft);
    router.push(href);
    setEditOpen(false);
  }

  function quoteItemIdFor(offerId: string) {
    return quoteItems.find(
      (item) => item.providerOfferRef === offerId && item.serviceType === "hotel",
    )?.id;
  }

  function continueToReview(
    hotel: HotelOfferRow,
    rate: import("@/lib/hotel-search").HotelRateOption,
    extras?: {
      priceChanged?: boolean;
      previousTotalMinor?: number;
    },
  ) {
    persistSession();
    const totalMinor = rateDisplayMinor(rate, hotel, nights);
    saveHotelDraft({
      hotel: {
        id: hotel.id,
        description: hotel.description,
        sellAmountMinor: totalMinor,
        currency: hotel.currency,
        details: hotel.details,
      },
      selectedRate: rate,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: params.rooms,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      location: params.destination,
      locationLabel: params.destinationLabel || params.destination,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId: quoteItemIdFor(hotel.id),
      nights,
      totalMinor,
      validatedAt: new Date().toISOString(),
      priceChanged: extras?.priceChanged,
      previousTotalMinor: extras?.previousTotalMinor,
      resultsReturnHref: resultsHref,
    });
    setHotelOpen(null);
    router.push("/hotels/book/review");
  }




  function openHotel(hotel: HotelRow) {
    persistSession();
    saveHotelSearchSession({
      hotels: hotelsRaw.map((h) => ({
        id: h.id,
        description: h.description,
        sellAmountMinor: h.sellAmountMinor,
        currency: h.currency,
        details: h.details,
      })),
      filters: filters,
      sortKey:
        sortKey === "price_asc" ||
        sortKey === "price_desc" ||
        sortKey === "rating_desc" ||
        sortKey === "best" ||
        sortKey === "distance"
          ? sortKey
          : "price_asc",
      meta: {
        stayQuery: params.destination,
        departDate: params.checkIn,
        returnDate: params.checkOut,
        rooms: params.rooms,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        destination: params.destinationLabel || params.destination,
        nights: nights,
      },
      inquiryId: inquiryId || undefined,
      quote: quoteItems.length
        ? {
            id: inquiryId || "quote",
            items: quoteItems.map((item) => ({
              id: item.id,
              providerOfferRef: item.providerOfferRef,
              serviceType: item.serviceType,
            })),
          }
        : undefined,
    });
    const q = searchParams.toString();
    router.push(`/hotels/${encodeURIComponent(hotel.id)}${q ? `?${q}` : ""}`);
  }

  return (
    <div className="shop-hotel-results-page">
      <ShopMockBanner kind="hotel" />

      <div className="shop-flight-results-topbar shop-hotel-results-topbar">
        <div className="shop-flight-results-topbar-inner">
          <div className="shop-flight-results-summary">
            <strong>{summary.destination}</strong>
            <span>{summary.dates}</span>
            <span>
              {summary.nights} {summary.nights === 1 ? "ليلة" : "ليالي"} · {summary.guests}{" "}
              {summary.guests === 1 ? "ضيف" : "ضيوف"} · {summary.rooms}{" "}
              {summary.rooms === 1 ? "غرفة" : "غرف"}
            </span>
          </div>
          <div className="shop-flight-results-topbar-actions">
            <button
              type="button"
              className="shop-flight-change-btn"
              onClick={() => setEditOpen((v) => !v)}
            >
              {editOpen ? "إغلاق" : "تعديل البحث"}
            </button>
            <Link href="/#search" className="shop-flight-home-link">
              الصفحة الرئيسية
            </Link>
          </div>
        </div>

        {editOpen ? (
          <form className="shop-flight-edit-bar shop-hotel-edit-bar" onSubmit={applyEdit}>
            <label>
              الوجهة
              <input
                value={draft.destination}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    destination: e.target.value,
                    destinationLabel: e.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              الوصول
              <input
                type="date"
                value={draft.checkIn}
                onChange={(e) => setDraft((d) => ({ ...d, checkIn: e.target.value }))}
                required
              />
            </label>
            <label>
              المغادرة
              <input
                type="date"
                value={draft.checkOut}
                onChange={(e) => setDraft((d) => ({ ...d, checkOut: e.target.value }))}
                required
              />
            </label>
            <label>
              بالغون
              <input
                type="number"
                min={1}
                value={draft.adults}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, adults: Math.max(1, Number(e.target.value) || 1) }))
                }
              />
            </label>
            <label>
              أطفال
              <input
                type="number"
                min={0}
                value={draft.children}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, children: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
            </label>
            <label>
              غرف
              <input
                type="number"
                min={1}
                value={draft.rooms}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, rooms: Math.max(1, Number(e.target.value) || 1) }))
                }
              />
            </label>
            <button type="submit" className="shop-flight-edit-submit">
              بحث
            </button>
          </form>
        ) : null}
      </div>

      {loading ? (
        <div className="shop-flight-results-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>جاري البحث عن الإقامات…</p>
        </div>
      ) : error ? (
        <div className="shop-flight-results-error">
          <p>{error}</p>
          <Link href="/#search" className="shop-btn">
            العودة للبحث
          </Link>
        </div>
      ) : (
        <>
          {message ? <p className="shop-flight-results-msg">{message}</p> : null}
          <ShopHotelResults
            destination={params.destinationLabel || params.destination}
            stayQuery={params.destination}
            departDate={params.checkIn}
            returnDate={params.checkOut}
            adults={params.adults}
            children={params.children}
            rooms={params.rooms}
            nights={nights}
            loading={loading}
            hotels={hotels}
            filters={filters}
            facets={facets}
            sortKey={sortKey}
            onFiltersChange={setFilters}
            onSortChange={setSortKey}
            onStayQueryChange={(text) =>
              router.push(buildHotelResultsHref({ ...params, destination: text, destinationLabel: text }))
            }
            onStayPick={(item) =>
              router.push(
                buildHotelResultsHref({
                  ...params,
                  destination: item.title,
                  destinationLabel: item.title,
                }),
              )
            }
            onDepartDateChange={(v) =>
              router.push(buildHotelResultsHref({ ...params, checkIn: v }))
            }
            onReturnDateChange={(v) =>
              router.push(buildHotelResultsHref({ ...params, checkOut: v }))
            }
            onAdultsChange={(n) =>
              router.push(buildHotelResultsHref({ ...params, adults: n }))
            }
            onChildrenChange={(n) =>
              router.push(buildHotelResultsHref({ ...params, children: n }))
            }
            onRoomsChange={(n) =>
              router.push(buildHotelResultsHref({ ...params, rooms: n }))
            }
            onSearch={() => router.push(buildHotelResultsHref(params))}
            onOpenHotel={(hotel) => openHotel(hotel)}
            searchCities={searchCities}
          />
        </>
      )}

      {/* hotel detail opens on /hotels/[hotelId] */}
    </div>
  );
}
