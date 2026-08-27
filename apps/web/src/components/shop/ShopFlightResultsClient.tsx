"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShopFlightResults } from "@/components/shop/ShopFlightResults";
import { ShopFlightExpandedPanel } from "@/components/shop/ShopFlightExpandedPanel";
import { ShopFlightSelectionBar } from "@/components/shop/ShopFlightSelectionBar";
import {
  composeFromLegs,
  composeFromPackage,
  tripReadyForSelection,
  type ComposedTrip,
} from "@/lib/flight-compose";
import { computePriceBreakdown } from "@/lib/flight-fare-mock";
import {
  extractLeg,
  findFlightForLeg,
  legKey,
} from "@/lib/flight-leg-selection";
import {
  cabinLabel,
  collectFlightFacets,
  defaultFlightFilters,
  filterAndSortFlights,
  formatDay,
  getReturnSegments,
  packageMaxStops,
  type FlightOfferRow,
  type FlightSearchFilters,
  type FlightSortKey,
} from "@/lib/flight-search";
import {
  buildFlightResultsHref,
  formatFlightSearchSummary,
  parseFlightResultsSearch,
  type FlightResultsSearchParams,
} from "@/lib/flight-results-url";
import {
  loadFlightResultsSession,
  saveFlightResultsSession,
  shouldRestoreResultsSession,
} from "@/lib/flight-results-session";
import { saveFlightDraft } from "@/lib/booking-draft";
import { shopFetch } from "@/lib/shop-session";

type QuoteItem = { id: string; providerOfferRef: string; serviceType: string };

export function ShopFlightResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseFlightResultsSearch(searchParams),
    [searchParams],
  );
  const resultsHref = useMemo(() => buildFlightResultsHref(params), [params]);

  const isRoundTrip = params.tripType === "roundtrip" && Boolean(params.returnDate);
  const passengers = params.adults + params.children;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [flightsRaw, setFlightsRaw] = useState<FlightOfferRow[]>([]);
  const [inquiryId, setInquiryId] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [filters, setFilters] = useState<FlightSearchFilters>(defaultFlightFilters());
  const [sortKey, setSortKey] = useState<FlightSortKey>("best");
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<FlightResultsSearchParams>(params);

  const [selectedOutboundKey, setSelectedOutboundKey] = useState<string | null>(null);
  const [selectedReturnKey, setSelectedReturnKey] = useState<string | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<ComposedTrip | null>(null);
  const [loadingFlightId, setLoadingFlightId] = useState<string | null>(null);
  const [panelBusy, setPanelBusy] = useState(false);

  const restoredRef = useRef(false);
  const sessionSaveRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(params);
  }, [params]);

  const facets = useMemo(() => collectFlightFacets(flightsRaw), [flightsRaw]);
  const flights = useMemo(
    () => filterAndSortFlights(flightsRaw, filters, sortKey, params.directOnly),
    [flightsRaw, filters, sortKey, params.directOnly],
  );

  const summary = formatFlightSearchSummary(params);

  const composedPreview = useMemo(() => {
    if (!selectedOutboundKey) return null;
    const outFlight = findFlightForLeg(flightsRaw, selectedOutboundKey, "outbound");
    if (!outFlight) return null;
    const outbound = extractLeg(outFlight, "outbound");
    if (!outbound) return null;
    let returnLeg = null;
    if (selectedReturnKey) {
      const retFlight = findFlightForLeg(flightsRaw, selectedReturnKey, "return");
      if (retFlight) returnLeg = extractLeg(retFlight, "return");
    }
    return composeFromLegs(outbound, returnLeg);
  }, [flightsRaw, selectedOutboundKey, selectedReturnKey]);

  const selectionBarTrip = composedPreview;
  const expandedTripId = expandedTrip?.sourcePackageId
    ? `pkg-${expandedTrip.sourcePackageId}`
    : expandedTrip?.id || null;

  const persistSession = useCallback(() => {
    saveFlightResultsSession({
      filters,
      sortKey,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      expandedTripId: expandedTrip?.id || null,
      selectedOutboundKey,
      selectedReturnKey,
      returnHref: resultsHref,
    });
  }, [filters, sortKey, expandedTrip, selectedOutboundKey, selectedReturnKey, resultsHref]);

  useEffect(() => {
    if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    sessionSaveRef.current = window.setTimeout(() => persistSession(), 300);
    return () => {
      if (sessionSaveRef.current) window.clearTimeout(sessionSaveRef.current);
    };
  }, [persistSession]);

  const runSearch = useCallback(async (search: FlightResultsSearchParams) => {
    setLoading(true);
    setError("");
    setMessage("");
    setFlightsRaw([]);
    setExpandedTrip(null);
    if (!shouldRestoreResultsSession(buildFlightResultsHref(search))) {
      setFilters(defaultFlightFilters());
      setSortKey("best");
      setSelectedOutboundKey(null);
      setSelectedReturnKey(null);
      restoredRef.current = false;
    }

    try {
      if (search.tripType === "multicity") {
        if (!search.legs.length) throw new Error("أدخل مسارات الرحلات المتعددة");
        const combined: FlightOfferRow[] = [];
        let providerName = "المزوّد";
        for (let i = 0; i < search.legs.length; i += 1) {
          const leg = search.legs[i]!;
          const result = await shopFetch<{
            inquiryId: string;
            quoteItems?: QuoteItem[];
            providerName?: string;
            flights: FlightOfferRow[];
          }>("/shop/search-flights", {
            method: "POST",
            timeoutMs: 60000,
            body: JSON.stringify({
              origin: leg.origin,
              destination: leg.destination,
              departDate: leg.departDate,
              adults: search.adults,
              children: search.children,
              infants: search.infants,
              cabinClass: search.cabinClass,
            }),
          });
          if (i === 0) {
            setInquiryId(result.inquiryId);
            setQuoteItems(result.quoteItems || []);
          }
          providerName = result.providerName || providerName;
          combined.push(
            ...(result.flights || []).map((row) => ({
              ...row,
              id: `leg-${i + 1}-${row.id}`,
              details: {
                ...row.details,
                originalOfferId: row.id,
                legIndex: i + 1,
                legLabel: `الرحلة ${i + 1}`,
                legOrigin: leg.origin,
                legDestination: leg.destination,
                legDepartDate: leg.departDate,
              },
            })),
          );
        }
        setFlightsRaw(combined);
        setMessage(`تم جلب ${combined.length} رحلة تجريبية عبر ${search.legs.length} مسارات (${providerName})`);
      } else {
        if (!search.origin || !search.destination || !search.departDate) {
          throw new Error("أدخل المغادرة والوجهة والتاريخ");
        }
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: QuoteItem[];
          providerName?: string;
          flights: FlightOfferRow[];
        }>("/shop/search-flights", {
          method: "POST",
          timeoutMs: 60000,
          body: JSON.stringify({
            origin: search.origin,
            destination: search.destination,
            departDate: search.departDate,
            returnDate: search.tripType === "roundtrip" ? search.returnDate : undefined,
            adults: search.adults,
            children: search.children,
            infants: search.infants,
            cabinClass: search.cabinClass,
          }),
        });
        setInquiryId(result.inquiryId);
        setQuoteItems(result.quoteItems || []);
        const rows = result.flights || [];
        setFlightsRaw(rows);
        const hasReturns = rows.some((f) => getReturnSegments(f.details).length > 0);
        const directCount = rows.filter((f) => packageMaxStops(f) === 0).length;
        setMessage(
          search.tripType === "roundtrip" && hasReturns
            ? `تم جلب ${rows.length} عروض تجريبية عبر ${result.providerName || "المزوّد"}`
            : search.directOnly
              ? `تم جلب ${rows.length} رحلة تجريبية — ${directCount} مباشرة`
              : `تم جلب ${rows.length} رحلة تجريبية عبر ${result.providerName || "المزوّد"}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل البحث");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(params);
  }, [params, runSearch]);

  useEffect(() => {
    if (loading || restoredRef.current || !flightsRaw.length) return;
    if (!shouldRestoreResultsSession(resultsHref)) return;
    const saved = loadFlightResultsSession();
    if (!saved) return;
    restoredRef.current = true;
    setFilters(saved.filters);
    setSortKey(saved.sortKey);
    setSelectedOutboundKey(saved.selectedOutboundKey);
    setSelectedReturnKey(saved.selectedReturnKey);
    if (saved.expandedTripId) {
      const outKey = saved.selectedOutboundKey;
      const retKey = saved.selectedReturnKey;
      if (outKey) {
        const outFlight = findFlightForLeg(flightsRaw, outKey, "outbound");
        const outbound = outFlight ? extractLeg(outFlight, "outbound") : null;
        let returnLeg = null;
        if (retKey) {
          const retFlight = findFlightForLeg(flightsRaw, retKey, "return");
          if (retFlight) returnLeg = extractLeg(retFlight, "return");
        }
        if (outbound) {
          const trip = composeFromLegs(outbound, returnLeg);
          if (trip.id === saved.expandedTripId || saved.expandedTripId.startsWith("mix-")) {
            setExpandedTrip(tripReadyForSelection(trip, isRoundTrip) ? trip : null);
          }
        }
      }
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: saved.scrollY, behavior: "auto" });
    });
  }, [loading, flightsRaw, resultsHref, isRoundTrip]);

  function applyEdit(e: FormEvent) {
    e.preventDefault();
    const href = buildFlightResultsHref(draft);
    setEditOpen(false);
    router.push(href);
  }

  function toggleOutbound(flight: FlightOfferRow) {
    const key = legKey(flight, "outbound");
    setExpandedTrip(null);
    setSelectedOutboundKey((prev) => (prev === key ? null : key));
  }

  function toggleReturn(flight: FlightOfferRow) {
    const key = legKey(flight, "return");
    if (!key) return;
    setExpandedTrip(null);
    setSelectedReturnKey((prev) => (prev === key ? null : key));
  }

  async function openTripPanel(trip: ComposedTrip, flightIdForLoading?: string) {
    if (panelBusy) return;
    if (expandedTrip?.id === trip.id) {
      setExpandedTrip(null);
      return;
    }
    if (flightIdForLoading) setLoadingFlightId(flightIdForLoading);
    setPanelBusy(true);
    await new Promise((r) => setTimeout(r, 200));
    setExpandedTrip(trip);
    setPanelBusy(false);
    setLoadingFlightId(null);
  }

  function handleViewDetails(flight: FlightOfferRow) {
    const trip = composeFromPackage(flight);
    if (!trip) return;

    if (expandedTrip?.sourcePackageId === flight.id) {
      setExpandedTrip(null);
      return;
    }

    // Open details only — do not auto-check mix-match legs
    void openTripPanel(trip, flight.id);
  }

  function handleBarSelect() {
    if (!composedPreview || !tripReadyForSelection(composedPreview, isRoundTrip)) return;
    void openTripPanel(composedPreview);
  }

  function buildDraftFlight(trip: ComposedTrip) {
    const pkg = trip.sourcePackage;
    if (pkg) return pkg;
    return {
      id: trip.id,
      description: `${trip.outbound.from} → ${trip.outbound.to}${
        trip.return ? ` · ${trip.return.from} → ${trip.return.to}` : ""
      }`,
      sellAmountMinor: trip.totalPriceMinor,
      currency: trip.currency,
      details: {
        segments: trip.outbound.segments,
        returnSegments: trip.return?.segments || [],
        airlineCode: trip.outbound.airlineCode,
        airline: trip.outbound.airlineName,
        airlineAr: trip.outbound.airlineName,
        stops: trip.outbound.stops,
        returnStops: trip.return?.stops || 0,
        duration: trip.outbound.durationLabel,
        returnDuration: trip.return?.durationLabel,
        baggage: trip.outbound.baggage,
        policies: trip.outbound.policies,
        cabin: trip.outbound.cabin,
        composed: true,
        isMixMatch: trip.isMixMatch,
      },
    };
  }

  function handleContinueReview(payload: {
    fare: import("@/lib/flight-fare-mock").MockFareOption;
    provider: import("@/lib/flight-fare-mock").MockProviderOffer;
  }) {
    if (!expandedTrip) return;
    persistSession();
    const flight = buildDraftFlight(expandedTrip);
    const breakdown = computePriceBreakdown(payload.provider.totalPriceMinor, expandedTrip.currency);
    const offerRef = String(flight.details.originalOfferId || flight.id);
    const quoteItemId = quoteItems.find(
      (item) => item.providerOfferRef === offerRef && item.serviceType === "flight",
    )?.id;

    saveFlightDraft({
      flight,
      origin: params.origin,
      destination: params.destination,
      originLabel: params.originLabel || params.origin,
      destinationLabel: params.destinationLabel || params.destination,
      departDate: params.departDate,
      returnDate: params.tripType === "roundtrip" ? params.returnDate : undefined,
      tripType: params.tripType,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      cabinClass: params.cabinClass,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId,
      composedTrip: expandedTrip,
      selectedOutbound: expandedTrip.outbound,
      selectedReturn: expandedTrip.return,
      selectedFare: payload.fare,
      selectedProvider: payload.provider,
      priceBreakdown: breakdown,
      validatedAt: new Date().toISOString(),
      resultsReturnHref: resultsHref,
    });
    setExpandedTrip(null);
    router.push("/book/review");
  }

  function clearSelection() {
    setSelectedOutboundKey(null);
    setSelectedReturnKey(null);
    setExpandedTrip(null);
  }

  return (
    <div className="shop-flight-results-page">
      <div className="shop-flight-results-topbar">
        <div className="shop-flight-results-topbar-inner">
          <div className="shop-flight-results-summary">
            <strong>{summary.route}</strong>
            <span>{summary.dates || "—"}</span>
            <span>
              {summary.travelers} مسافر · {cabinLabel(params.cabinClass)}
            </span>
            {params.directOnly ? <span className="shop-flight-chip">مباشر فقط</span> : null}
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
          <form className="shop-flight-edit-bar" onSubmit={applyEdit}>
            <label>
              من
              <input
                value={draft.origin}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    origin: e.target.value.toUpperCase(),
                    originLabel: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="KWI"
                required={draft.tripType !== "multicity"}
              />
            </label>
            <label>
              إلى
              <input
                value={draft.destination}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    destination: e.target.value.toUpperCase(),
                    destinationLabel: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="DXB"
                required={draft.tripType !== "multicity"}
              />
            </label>
            <label>
              المغادرة
              <input
                type="date"
                value={draft.departDate}
                onChange={(e) => setDraft((d) => ({ ...d, departDate: e.target.value }))}
                required={draft.tripType !== "multicity"}
              />
            </label>
            {draft.tripType === "roundtrip" ? (
              <label>
                العودة
                <input
                  type="date"
                  value={draft.returnDate}
                  onChange={(e) => setDraft((d) => ({ ...d, returnDate: e.target.value }))}
                />
              </label>
            ) : null}
            <label>
              بالغون
              <input
                type="number"
                min={1}
                value={draft.adults}
                onChange={(e) => setDraft((d) => ({ ...d, adults: Number(e.target.value) || 1 }))}
              />
            </label>
            <label className="shop-flight-edit-check">
              <input
                type="checkbox"
                checked={draft.directOnly}
                onChange={(e) => setDraft((d) => ({ ...d, directOnly: e.target.checked }))}
              />
              مباشر فقط
            </label>
            <button type="submit" className="shop-flight-search-again">
              بحث
            </button>
          </form>
        ) : null}
      </div>

      {loading ? (
        <div className="shop-flight-results-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>جاري البحث عن أفضل رحلات الطيران…</p>
          <small>
            {params.origin || "—"} → {params.destination || "—"}
            {params.departDate ? ` · ${formatDay(params.departDate)}` : ""}
            {isRoundTrip && params.returnDate ? ` – ${formatDay(params.returnDate)}` : ""}
          </small>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="shop-flight-results-error">
          <strong>تعذّر إكمال البحث</strong>
          <p>{error}</p>
          <button type="button" onClick={() => void runSearch(params)}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="shop-flight-mock-banner" role="status">
            <strong>نتائج تجريبية</strong>
            <span>
              الأسعار والرحلات المعروضة للاختبار فقط — سيتم استبدالها بعروض حية عند ربط
              مزوّد الطيران.
            </span>
          </div>
          {message ? <p className="shop-flight-results-status">{message}</p> : null}

          <ShopFlightResults
            flights={flights}
            totalCount={flightsRaw.length}
            filters={filters}
            facets={facets}
            sortKey={sortKey}
            origin={params.origin}
            destination={params.destination}
            originLabel={params.originLabel}
            destinationLabel={params.destinationLabel}
            passengers={passengers}
            onFiltersChange={setFilters}
            onSortChange={setSortKey}
            onResetFilters={() => setFilters(defaultFlightFilters())}
            onSelectFlight={handleViewDetails}
            onToggleOutbound={toggleOutbound}
            onToggleReturn={toggleReturn}
            selectedOutboundKey={selectedOutboundKey}
            selectedReturnKey={selectedReturnKey}
            expandedTripId={expandedTripId}
            loadingFlightId={loadingFlightId}
            pickStep="single"
            enableMixMatch={isRoundTrip}
            customTripSlot={
              isRoundTrip && selectionBarTrip && (selectedOutboundKey || selectedReturnKey) ? (
                <ShopFlightSelectionBar
                  trip={selectionBarTrip}
                  isRoundTrip={isRoundTrip}
                  canProceed={tripReadyForSelection(selectionBarTrip, isRoundTrip)}
                  loading={panelBusy}
                  onSelectTrip={handleBarSelect}
                  onClear={clearSelection}
                  onClearOutbound={() => {
                    setSelectedOutboundKey(null);
                    setExpandedTrip(null);
                  }}
                  onClearReturn={() => {
                    setSelectedReturnKey(null);
                    setExpandedTrip(null);
                  }}
                />
              ) : null
            }
          />
        </>
      ) : null}

      {expandedTrip ? (
        <ShopFlightExpandedPanel
          trip={expandedTrip}
          passengers={passengers}
          cabinClass={params.cabinClass}
          departDate={params.departDate}
          returnDate={params.returnDate}
          originLabel={params.originLabel}
          destinationLabel={params.destinationLabel}
          onClose={() => setExpandedTrip(null)}
          onContinueReview={handleContinueReview}
          onRefreshResults={() => {
            setExpandedTrip(null);
            void runSearch(params);
          }}
        />
      ) : null}
    </div>
  );
}
