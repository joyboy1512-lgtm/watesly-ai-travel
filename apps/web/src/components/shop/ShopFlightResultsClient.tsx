"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShopFlightResults } from "@/components/shop/ShopFlightResults";
import { ShopFlightDetailModal } from "@/components/shop/ShopFlightDetailModal";
import {
  airlineLogo,
  cabinLabel,
  collectFlightFacets,
  defaultFlightFilters,
  filterAndSortFlights,
  formatClock,
  formatDay,
  getReturnSegments,
  getSegments,
  packagesMatchingOutbound,
  uniqueOutboundFlights,
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
import { saveFlightDraft } from "@/lib/booking-draft";
import { shopFetch } from "@/lib/shop-session";

type QuoteItem = { id: string; providerOfferRef: string; serviceType: string };
type PickStep = "outbound" | "return";

export function ShopFlightResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseFlightResultsSearch(searchParams),
    [searchParams],
  );

  const isRoundTrip = params.tripType === "roundtrip" && Boolean(params.returnDate);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [flightsRaw, setFlightsRaw] = useState<FlightOfferRow[]>([]);
  const [inquiryId, setInquiryId] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [filters, setFilters] = useState<FlightSearchFilters>(defaultFlightFilters());
  const [sortKey, setSortKey] = useState<FlightSortKey>("best");
  const [detailFlight, setDetailFlight] = useState<FlightOfferRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pickStep, setPickStep] = useState<PickStep>("outbound");
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOfferRow | null>(null);

  const [draft, setDraft] = useState<FlightResultsSearchParams>(params);

  useEffect(() => {
    setDraft(params);
  }, [params]);

  const stepPool = useMemo(() => {
    if (!isRoundTrip) return flightsRaw;
    if (pickStep === "outbound") return uniqueOutboundFlights(flightsRaw);
    if (!selectedOutbound) return [];
    return packagesMatchingOutbound(flightsRaw, selectedOutbound);
  }, [flightsRaw, isRoundTrip, pickStep, selectedOutbound]);

  const facets = useMemo(() => collectFlightFacets(stepPool), [stepPool]);
  const flights = useMemo(
    () => filterAndSortFlights(stepPool, filters, sortKey, params.directOnly),
    [stepPool, filters, sortKey, params.directOnly],
  );

  const summary = formatFlightSearchSummary(params);

  const runSearch = useCallback(async (search: FlightResultsSearchParams) => {
    setLoading(true);
    setError("");
    setMessage("");
    setFlightsRaw([]);
    setDetailFlight(null);
    setFilters(defaultFlightFilters());
    setSortKey("best");
    setPickStep("outbound");
    setSelectedOutbound(null);

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
        setMessage(`تم جلب ${combined.length} رحلة عبر ${search.legs.length} مسارات (${providerName})`);
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
        setMessage(
          search.tripType === "roundtrip" && hasReturns
            ? `تم جلب ${rows.length} عرض ذهاب وعودة عبر ${result.providerName || "المزوّد"} — اختر الذهاب أولاً ثم العودة`
            : search.directOnly
              ? `تم جلب ${rows.length} رحلة — ${rows.filter((f) => Number(f.details.stops || 0) === 0).length} مباشرة`
              : `تم جلب ${rows.length} رحلة عبر ${result.providerName || "المزوّد"}`,
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

  function applyEdit(e: FormEvent) {
    e.preventDefault();
    const href = buildFlightResultsHref(draft);
    setEditOpen(false);
    router.push(href);
  }

  function bookFlight(flight: FlightOfferRow) {
    const legOrigin = String(flight.details.legOrigin || params.origin);
    const legDestination = String(flight.details.legDestination || params.destination);
    const legDepartDate = String(flight.details.legDepartDate || params.departDate);
    const offerRef = String(flight.details.originalOfferId || flight.id);
    const quoteItemId = quoteItems.find(
      (item) => item.providerOfferRef === offerRef && item.serviceType === "flight",
    )?.id;
    saveFlightDraft({
      flight,
      origin: legOrigin,
      destination: legDestination,
      originLabel: params.originLabel || legOrigin,
      destinationLabel: params.destinationLabel || legDestination,
      departDate: legDepartDate,
      returnDate: params.tripType === "roundtrip" ? params.returnDate : undefined,
      tripType: params.tripType,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      cabinClass: params.cabinClass,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId,
    });
    router.push("/book");
  }

  function handleSelectFlight(flight: FlightOfferRow) {
    if (isRoundTrip && getReturnSegments(flight.details).length > 0) {
      if (pickStep === "outbound") {
        setSelectedOutbound(flight);
        setPickStep("return");
        setFilters(defaultFlightFilters());
        setSortKey("best");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setDetailFlight(flight);
      return;
    }
    setDetailFlight(flight);
  }

  function backToOutbound() {
    setPickStep("outbound");
    setSelectedOutbound(null);
    setFilters(defaultFlightFilters());
    setSortKey("best");
  }

  const outboundSummary = selectedOutbound
    ? (() => {
        const segs = getSegments(selectedOutbound.details);
        const first = segs[0];
        const last = segs[segs.length - 1];
        const code = String(selectedOutbound.details.airlineCode || "");
        return {
          airline: String(
            selectedOutbound.details.airlineAr || selectedOutbound.details.airline || code,
          ),
          logo: airlineLogo(code),
          dep: formatClock(
            first?.departAt || first?.departTime || String(selectedOutbound.details.departAt || ""),
          ),
          arr: formatClock(
            last?.arriveAt || last?.arriveTime || String(selectedOutbound.details.arriveAt || ""),
          ),
          from: String(first?.from || params.origin),
          to: String(last?.to || params.destination),
        };
      })()
    : null;

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
          {isRoundTrip ? (
            <div className="shop-flight-stepper" aria-label="خطوات الاختيار">
              <button
                type="button"
                className={`shop-flight-step${pickStep === "outbound" ? " on" : ""}${selectedOutbound ? " done" : ""}`}
                onClick={backToOutbound}
              >
                <span className="shop-flight-step-num">1</span>
                اختيار الذهاب
              </button>
              <span className="shop-flight-step-sep" aria-hidden />
              <button
                type="button"
                className={`shop-flight-step${pickStep === "return" ? " on" : ""}`}
                disabled={!selectedOutbound}
                onClick={() => selectedOutbound && setPickStep("return")}
              >
                <span className="shop-flight-step-num">2</span>
                اختيار العودة
              </button>
            </div>
          ) : null}

          {outboundSummary && pickStep === "return" ? (
            <div className="shop-flight-picked-outbound">
              <div className="shop-flight-picked-outbound-info">
                {outboundSummary.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={outboundSummary.logo} alt="" />
                ) : null}
                <div>
                  <strong>الذهاب المختار · {outboundSummary.airline}</strong>
                  <span>
                    {outboundSummary.dep} {outboundSummary.from} → {outboundSummary.arr}{" "}
                    {outboundSummary.to}
                  </span>
                </div>
              </div>
              <button type="button" className="shop-flight-change-outbound" onClick={backToOutbound}>
                تغيير الذهاب
              </button>
            </div>
          ) : null}

          {message ? <p className="shop-flight-results-status">{message}</p> : null}

          <ShopFlightResults
            flights={flights}
            totalCount={stepPool.length}
            filters={filters}
            facets={facets}
            sortKey={sortKey}
            origin={params.origin}
            destination={params.destination}
            originLabel={params.originLabel}
            destinationLabel={params.destinationLabel}
            onFiltersChange={setFilters}
            onSortChange={setSortKey}
            onResetFilters={() => setFilters(defaultFlightFilters())}
            onSelectFlight={handleSelectFlight}
            pickStep={isRoundTrip ? pickStep : "single"}
            stepTitle={
              isRoundTrip
                ? pickStep === "outbound"
                  ? "رحلات الذهاب"
                  : "رحلات العودة"
                : undefined
            }
          />
        </>
      ) : null}

      {detailFlight ? (
        <ShopFlightDetailModal
          flight={detailFlight}
          origin={params.origin}
          destination={params.destination}
          originLabel={params.originLabel}
          destinationLabel={params.destinationLabel}
          cabinClass={params.cabinClass}
          onClose={() => setDetailFlight(null)}
          onContinue={() => {
            const selected = detailFlight;
            setDetailFlight(null);
            bookFlight(selected);
          }}
        />
      ) : null}
    </div>
  );
}
