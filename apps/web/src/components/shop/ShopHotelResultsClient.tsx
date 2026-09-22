"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import "@/app/tvlk-hotel.css";
import { ShopHotelResults } from "@/components/shop/ShopHotelResults";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { type SuggestItem } from "@/components/shop/ShopAutocomplete";
import {
  TvlkHotelResultsSearch,
  type StayTypeTab,
} from "@/components/shop/TvlkHotelResultsSearch";
import { hotelSuggestBadge } from "@/lib/hotel-suggest";
import {
  collectFilterFacets,
  defaultHotelFilters,
  filterHotelOffers,
  type HotelOfferRow,
  type HotelSearchFilters,
} from "@/lib/hotel-search";
import {
  buildHotelDetailHref,
  buildHotelResultsHref,
  clampHotelSearchParams,
  encodeRoomOccupancies,
  hotelSearchPreferencesJson,
  isHotelSuggestItem,
  nightsBetween,
  occupancyFromSearchParams,
  parseHotelResultsSearch,
  syncHotelSearchParams,
  type HotelResultsSearchParams,
} from "@/lib/hotel-results-url";
import {
  loadHotelResultsSession,
  saveHotelResultsSession,
  shouldRestoreHotelResultsSession,
  type HotelSortKey,
} from "@/lib/hotel-results-session";
import { trackFunnel } from "@/lib/funnel-analytics";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import {
  getHotelSearchSession,
  saveHotelSearchSession,
} from "@/lib/hotel-search-session";
import { shopFetch } from "@/lib/shop-session";
import { humanizeHotelSearchError } from "@/lib/hotel-search-errors";

function inferHotelDestinationCode(destination: string): string {
  const q = destination.trim().toLowerCase();
  if (!q) return "";
  if (/^dxb$/i.test(q) || q.includes("دبي") || q.includes("dubai")) return "DXB";
  if (/^shj$/i.test(q) || q.includes("شارقة") || q.includes("sharjah")) return "SHJ";
  if (/^auh$/i.test(q) || q.includes("أبوظبي") || q.includes("abu dhabi")) return "AUH";
  if (/^[a-z]{3}$/i.test(destination.trim())) return destination.trim().toUpperCase();
  return "";
}

type QuoteItem = { id: string; providerOfferRef: string; serviceType: string };

type HotelRow = HotelOfferRow & {
  matchingRates: import("@/lib/hotel-search").HotelRateOption[];
  displayFromMinor: number;
};

export function ShopHotelResultsClient() {
  const { t } = useShopI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseHotelResultsSearch(searchParams), [searchParams]);
  const resultsHref = useMemo(() => buildHotelResultsHref(params), [params]);
  const nights = nightsBetween(params.checkIn, params.checkOut);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [hotelsRaw, setHotelsRaw] = useState<HotelOfferRow[]>([]);
  const [inquiryId, setInquiryId] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [filters, setFilters] = useState<HotelSearchFilters>(defaultHotelFilters());
  const [sortKey, setSortKey] = useState<HotelSortKey>("best");
  const [stayType, setStayType] = useState<StayTypeTab>("all");
  const [draft, setDraft] = useState<HotelResultsSearchParams>(params);
  const [hotelOpen, setHotelOpen] = useState<HotelRow | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  const restoredRef = useRef(false);
  const sessionSaveRef = useRef<number | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchGenRef = useRef(0);

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
      visibleCount,
    });
  }, [filters, sortKey, hotelOpen, resultsHref, visibleCount]);

  useEffect(() => {
    if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    sessionSaveRef.current = window.setTimeout(() => persistSession(), 300);
    return () => {
      if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    };
  }, [persistSession]);

  const runSearch = useCallback(
    async (search: HotelResultsSearchParams) => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const gen = ++searchGenRef.current;

      setLoading(true);
      setError("");
      setMessage("");
      setHotelsRaw([]);
      setHotelOpen(null);
      trackFunnel({ event: "search_submit", service: "hotel" });

      const href = buildHotelResultsHref(search);
      if (!shouldRestoreHotelResultsSession(href)) {
        setFilters(defaultHotelFilters());
        setSortKey("best");
        setStayType("all");
        restoredRef.current = false;
      }

      // Reuse short-lived cached results for same stay (avoids burning sandbox quota)
      const cached = getHotelSearchSession();
      const cacheAgeMs = cached
        ? Date.now() - new Date(cached.savedAt).getTime()
        : Number.POSITIVE_INFINITY;
      const cacheMatches =
        !!cached &&
        cached.meta.stayQuery === search.destination &&
        cached.meta.departDate === search.checkIn &&
        cached.meta.returnDate === search.checkOut &&
        cached.meta.adults === search.adults &&
        cached.meta.children === search.children &&
        cached.meta.rooms === search.rooms &&
        Array.isArray(cached.hotels) &&
        cached.hotels.length > 0;
      const cacheFresh = cacheMatches && cacheAgeMs < 12 * 60 * 1000;

      if (cacheFresh) {
        setInquiryId(cached!.inquiryId || "");
        setQuoteItems(
          (cached!.quote?.items || []).map((item) => ({
            id: item.id,
            providerOfferRef: item.providerOfferRef,
            serviceType: item.serviceType,
          })),
        );
        setHotelsRaw(cached!.hotels as HotelOfferRow[]);
        setMessage(`عرض ${cached!.hotels.length} نتيجة محفوظة مؤقتًا`);
        setLoading(false);
        return;
      }

      try {
        if (!search.destination.trim() || !search.checkIn || !search.checkOut) {
          throw new Error("أدخل الوجهة وتواريخ الإقامة");
        }
        if (search.children > 0) {
          const occ = occupancyFromSearchParams(search);
          const agesCsv =
            String(search.childrenAges || "").trim() ||
            occ.flatMap((r) => r.childAges).join(",");
          const ages = agesCsv
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          if (ages.length < search.children) {
            throw new Error("حدد عمر كل طفل قبل البحث");
          }
          // Ensure ages flow into preferences even if URL omitted childrenAges
          search = {
            ...search,
            childrenAges: ages.slice(0, search.children).join(","),
            occ: search.occ || encodeRoomOccupancies(occ),
          };
        }
        setMessage(t("comparingHotels"));
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: QuoteItem[];
          providerName?: string;
          hotels: HotelOfferRow[];
        }>("/shop/search-hotels", {
          method: "POST",
          timeoutMs: 60000,
          signal: controller.signal,
          body: JSON.stringify({
            destination: search.destination,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
            infants: search.infants,
            childrenAges: search.childrenAges || undefined,
            preferences: hotelSearchPreferencesJson(search),
          }),
        });
        if (gen !== searchGenRef.current) return;
        setInquiryId(result.inquiryId);
        setQuoteItems(result.quoteItems || []);
        setHotelsRaw(result.hotels || []);
        saveHotelSearchSession({
          hotels: (result.hotels || []).map((h) => ({
            id: h.id,
            description: h.description,
            sellAmountMinor: h.sellAmountMinor,
            costAmountMinor: h.costAmountMinor,
            currency: h.currency,
            details: h.details,
          })),
          filters: defaultHotelFilters(),
          sortKey: "best",
          meta: {
            stayQuery: search.destination,
            departDate: search.checkIn,
            returnDate: search.checkOut,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
            infants: search.infants,
            destination: search.destinationLabel || search.destination,
            nights: nightsBetween(search.checkIn, search.checkOut),
          },
          inquiryId: result.inquiryId,
          quote: {
            id: result.inquiryId,
            items: result.quoteItems || [],
          },
          providerName: result.providerName,
        });
        setMessage(
          `تم جلب ${result.hotels?.length || 0} إقامة عبر ${result.providerName || "المزوّد"}`,
        );
        trackFunnel({
          event: "results_loaded",
          service: "hotel",
          provider: result.providerName,
          meta: { count: result.hotels?.length || 0 },
        });
      } catch (err) {
        if (gen !== searchGenRef.current) return;
        if (controller.signal.aborted) return;
        const raw = err instanceof Error ? err.message : "فشل البحث";
        trackFunnel({ event: "search_failed", service: "hotel", errorCode: "SEARCH" });
        // Prefer stale session results when provider quota is exhausted
        if (
          cacheMatches &&
          cacheAgeMs < 12 * 60 * 60 * 1000 &&
          /quota|403|تجاوز حد طلبات/i.test(raw)
        ) {
          setInquiryId(cached!.inquiryId || "");
          setQuoteItems(
            (cached!.quote?.items || []).map((item) => ({
              id: item.id,
              providerOfferRef: item.providerOfferRef,
              serviceType: item.serviceType,
            })),
          );
          setHotelsRaw(cached!.hotels as HotelOfferRow[]);
          setMessage(
            `عرض ${cached!.hotels.length} نتيجة محفوظة (مزود الفنادق بلغ حد الطلبات مؤقتًا)`,
          );
          setError("");
        } else {
          setError(humanizeHotelSearchError(raw));
          setMessage("");
        }
      } finally {
        if (gen === searchGenRef.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runSearch(params);
    return () => {
      searchAbortRef.current?.abort();
    };
  }, [params, runSearch]);

  useEffect(() => {
    if (restoredRef.current || loading || !hotelsRaw.length) return;
    if (!shouldRestoreHotelResultsSession(resultsHref)) return;
    const saved = loadHotelResultsSession();
    if (!saved) return;
    restoredRef.current = true;
    setFilters(saved.filters);
    setSortKey(saved.sortKey);
    if (saved.visibleCount && saved.visibleCount > 0) {
      setVisibleCount(saved.visibleCount);
    }
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
      Array<{
        city: string | null;
        country: string | null;
        iataCode?: string | null;
        kind?: string;
        label?: string;
        subtitle?: string;
      }>
    >(`/shop/cities?q=${encodeURIComponent(q)}`);
    const items: SuggestItem[] = rows.map((c, idx) => {
      const kind = c.kind || "city";
      return {
        id: `${kind}-${c.city}-${c.iataCode || idx}`,
        code: c.iataCode || c.city || q,
        title: c.label || c.city || q,
        subtitle:
          c.subtitle ||
          (kind === "hotel" ? `فندق · ${c.country || ""}` : c.country || undefined),
        kind,
        badge: hotelSuggestBadge(c.label || c.city || q, kind),
      };
    });
    const trimmed = q.trim();
    if (trimmed.length >= 3) {
      try {
        const hotelRes = await shopFetch<{
          items?: Array<{ code: string; name: string; city: string }>;
        }>("/shop/suggest-hotels", {
          method: "POST",
          body: JSON.stringify({
            query: trimmed,
            checkIn: draft.checkIn,
            checkOut: draft.checkOut,
          }),
        });
        const seen = new Set(items.map((i) => i.title.toLowerCase()));
        for (const h of (hotelRes.items || []).slice(0, 6)) {
          if (seen.has(h.name.toLowerCase())) continue;
          items.push({
            id: `hotel-${h.code}`,
            code: h.code,
            title: h.name,
            subtitle: h.city ? `فندق · ${h.city}` : "فندق",
            kind: "hotel",
            badge: hotelSuggestBadge(h.name, "hotel"),
          });
        }
      } catch {
        /* optional */
      }
    }
    return items.slice(0, 14);
  }

  function applyStayType(tab: StayTypeTab) {
    setStayType(tab);
    const propertyTypes =
      tab === "hotel"
        ? ["hotel"]
        : tab === "apartment"
          ? ["apartment"]
          : tab === "villa"
            ? ["guest_house"]
            : [];
    setFilters((prev) => ({ ...prev, propertyTypes }));
  }

  function onFiltersChange(next: HotelSearchFilters) {
    setFilters(next);
    const pts = next.propertyTypes;
    if (pts.length === 1 && pts[0] === "hotel") setStayType("hotel");
    else if (pts.length === 1 && pts[0] === "apartment") setStayType("apartment");
    else if (pts.length === 1 && pts[0] === "guest_house") setStayType("villa");
    else setStayType("all");
  }

  function applySearch() {
    let next = { ...draft };
    if (next.children > 0) {
      const ages = String(next.childrenAges || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      while (ages.length < next.children) ages.push("8");
      next = {
        ...next,
        childrenAges: ages.slice(0, next.children).join(","),
      };
    }
    const synced = clampHotelSearchParams(
      syncHotelSearchParams(
        { ...params, ...next },
        {
          adults: next.adults,
          children: next.children,
          rooms: next.rooms,
          childrenAges: next.childrenAges,
        },
      ),
    );
    router.push(buildHotelResultsHref(synced));
  }

  function pickSuggestHotel(item: SuggestItem) {
    if (isHotelSuggestItem(item) && /^\d+$/.test(item.code)) {
      const city =
        String(item.subtitle || "")
          .replace(/^فندق(?:\s*·\s*)?/, "")
          .replace(/^Hotel(?:\s*·\s*)?/i, "")
          .trim() || item.title;
      router.push(
        buildHotelDetailHref(item.code, {
          ...draft,
          destination: city,
          destinationLabel: item.title,
        }),
      );
      return;
    }
    setDraft((d) => ({
      ...d,
      destination: item.title,
      destinationLabel: item.title,
    }));
  }

  function openHotel(hotel: HotelRow) {
    persistSession();
    saveHotelSearchSession({
      hotels: hotelsRaw.map((h) => ({
        id: h.id,
        description: h.description,
        sellAmountMinor: h.sellAmountMinor,
        costAmountMinor: h.costAmountMinor,
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
    router.push(buildHotelDetailHref(hotel.id, params));
  }

  return (
    <div className="shop-hotel-results-page tvlk-hotel">
      <h1 className="shop-flight-results-h1">{t("hotelResultsTitle")}</h1>
      <ShopMockBanner kind="hotel" />

      <TvlkHotelResultsSearch
        draft={draft}
        loading={loading}
        stayType={stayType}
        onDraftChange={setDraft}
        onStayTypeChange={applyStayType}
        onSearch={applySearch}
        onPickHotel={pickSuggestHotel}
        searchCities={searchCities}
      />

      <div className="tvlk-hotel-results-body">
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
            onFiltersChange={onFiltersChange}
            onSortChange={setSortKey}
            searchDestinationCode={inferHotelDestinationCode(params.destination)}
            hideSearchBar
            initialVisibleCount={visibleCount}
            onVisibleCountChange={setVisibleCount}
            onStayQueryChange={(text) =>
              router.push(buildHotelResultsHref({ ...params, destination: text, destinationLabel: text }))
            }
            onStayPick={(item) => {
              if (isHotelSuggestItem(item) && /^\d+$/.test(item.code)) {
                const city =
                  String(item.subtitle || "")
                    .replace(/^فندق(?:\s*·\s*)?/, "")
                    .replace(/^Hotel(?:\s*·\s*)?/i, "")
                    .trim() || item.title;
                router.push(
                  buildHotelDetailHref(item.code, {
                    ...params,
                    destination: city,
                    destinationLabel: item.title,
                  }),
                );
                return;
              }
              router.push(
                buildHotelResultsHref({
                  ...params,
                  destination: item.title,
                  destinationLabel: item.title,
                }),
              );
            }}
            onDepartDateChange={(v) =>
              router.push(buildHotelResultsHref({ ...params, checkIn: v }))
            }
            onReturnDateChange={(v) =>
              router.push(buildHotelResultsHref({ ...params, checkOut: v }))
            }
            onAdultsChange={(n) =>
              router.push(
                buildHotelResultsHref(syncHotelSearchParams(params, { adults: n })),
              )
            }
            onChildrenChange={(n) =>
              router.push(
                buildHotelResultsHref(syncHotelSearchParams(params, { children: n })),
              )
            }
            onRoomsChange={(n) =>
              router.push(
                buildHotelResultsHref(syncHotelSearchParams(params, { rooms: n })),
              )
            }
            onSearch={() => router.push(buildHotelResultsHref(params))}
            onOpenHotel={(hotel) => openHotel(hotel)}
            searchCities={searchCities}
          />
        </>
      )}
      </div>

      {/* hotel detail opens on /hotels/[hotelId] */}
    </div>
  );
}
