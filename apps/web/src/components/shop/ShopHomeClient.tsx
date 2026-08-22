"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HotelSearchCard } from "@/components/hotels/HotelSearchCard";
import { HotelDetailModal } from "@/components/hotels/HotelDetailModal";
import { TransferSearchCard } from "@/components/hotels/TransferSearchCard";
import { ActivitySearchCard } from "@/components/hotels/ActivitySearchCard";
import { type SuggestItem } from "@/components/shop/ShopAutocomplete";
import {
  defaultHotelFilters,
  filterHotelOffers,
  type HotelOfferRow,
} from "@/lib/hotel-search";
import {
  saveActivityDraft,
  saveFlightDraft,
  saveHotelDraft,
  saveTransferDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import { shopFetch } from "@/lib/shop-session";
import { ShopLanding } from "@/components/shop/ShopLanding";
import { ShopHeroBanner, type FlightLeg, type FlightTripType } from "@/components/shop/ShopHeroBanner";
import type { ShopDestination, ShopOffer } from "@/lib/shop-content";

type Mode = "flights" | "stays" | "cars" | "activities";

type Offer = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  expiresAt?: string;
  details: Record<string, unknown>;
};

type QuoteItem = { id: string; providerOfferRef: string; serviceType: string };

type TransferItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  details: string;
  extra?: Record<string, unknown>;
};

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return plusDays(days);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function airlineLogo(code?: string | null) {
  if (!code || code.length !== 2) return null;
  return `https://pics.avs.io/80/80/${code.toUpperCase()}.png`;
}

function newLegId(existing: FlightLeg[]) {
  let index = existing.length + 1;
  let id = `leg-${index}`;
  while (existing.some((leg) => leg.id === id)) {
    index += 1;
    id = `leg-${index}`;
  }
  return id;
}

function createFlightLeg(partial?: Partial<FlightLeg>): FlightLeg {
  return {
    id: partial?.id || "leg-new",
    origin: partial?.origin || "",
    originLabel: partial?.originLabel || "",
    destination: partial?.destination || "",
    destinationLabel: partial?.destinationLabel || "",
    departDate: partial?.departDate || plusDays(14),
  };
}

function nightsBetween(from: string, to: string) {
  if (!from || !to) return 1;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

export function ShopHomeClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("flights");
  const [tripType, setTripType] = useState<FlightTripType>("roundtrip");
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(() => [
    createFlightLeg({
      id: "leg-1",
      origin: "KWI",
      originLabel: "KWI · الكويت",
      destination: "DXB",
      destinationLabel: "DXB · دبي",
      departDate: plusDays(14),
    }),
    createFlightLeg({
      id: "leg-2",
      origin: "DXB",
      originLabel: "DXB · دبي",
      destination: "",
      destinationLabel: "",
      departDate: plusDays(18),
    }),
  ]);
  const [transferRoundtrip, setTransferRoundtrip] = useState(false);
  const [transferAirport, setTransferAirport] = useState(true);
  const [transferCarRental, setTransferCarRental] = useState(false);
  const [transferDropoff, setTransferDropoff] = useState("الكويت");
  const [transferDropoffLabel, setTransferDropoffLabel] = useState("الكويت");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("KWI");
  const [originLabel, setOriginLabel] = useState("KWI · الكويت");
  const [destination, setDestination] = useState("DXB");
  const [destinationLabel, setDestinationLabel] = useState("DXB · دبي");
  const [stayQuery, setStayQuery] = useState("دبي");
  const [activityDest, setActivityDest] = useState("DXB");
  const [activityLabel, setActivityLabel] = useState("دبي");
  const [departDate, setDepartDate] = useState(plusDays(14));
  const [returnDate, setReturnDate] = useState(plusDays(21));
  const [pickupTime, setPickupTime] = useState("14:00");
  const [dropoffTime, setDropoffTime] = useState("12:00");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [cabinClass, setCabinClass] = useState("economy");
  const [directOnly, setDirectOnly] = useState(false);
  const [flightResults, setFlightResults] = useState<Offer[]>([]);
  const [hotels, setHotels] = useState<HotelOfferRow[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [activities, setActivities] = useState<TransferItem[]>([]);
  const [inquiryId, setInquiryId] = useState<string>();
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [hotelOpen, setHotelOpen] = useState<HotelOfferRow | null>(null);

  const nights = nightsBetween(departDate, returnDate);

  const flights = useMemo(() => {
    if (!directOnly) return flightResults;
    return flightResults.filter((f) => Number(f.details.stops || 0) === 0);
  }, [flightResults, directOnly]);

  const hasResults =
    flightResults.length > 0 ||
    hotels.length > 0 ||
    transfers.length > 0 ||
    activities.length > 0;

  const showDirectFlightsEmpty =
    mode === "flights" && directOnly && flightResults.length > 0 && flights.length === 0;

  const hotelRows = useMemo(
    () => filterHotelOffers(hotels, defaultHotelFilters(), "price_asc"),
    [hotels],
  );

  async function searchAirports(q: string): Promise<SuggestItem[]> {
    const rows = await shopFetch<
      Array<{
        id: string;
        iataCode?: string | null;
        name: string;
        city?: string | null;
        country?: string | null;
      }>
    >(`/shop/airports?q=${encodeURIComponent(q)}&limit=40`);
    return rows.map((a) => ({
      id: a.id,
      code: (a.iataCode || "").toUpperCase(),
      title: `${a.iataCode || "—"} · ${a.city || a.name}`,
      subtitle: `${a.name}${a.country ? ` — ${a.country}` : ""}`,
    }));
  }

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

  function handleTripTypeChange(next: FlightTripType) {
    if (next === "multicity" && tripType !== "multicity") {
      setFlightLegs([
        createFlightLeg({
          id: "leg-1",
          origin,
          originLabel,
          destination,
          destinationLabel,
          departDate,
        }),
        createFlightLeg({
          id: "leg-2",
          origin: destination,
          originLabel: destinationLabel,
          destination: "",
          destinationLabel: "",
          departDate: returnDate || plusDays(18),
        }),
      ]);
    }
    if (next !== "multicity" && tripType === "multicity") {
      const first = flightLegs[0];
      if (first) {
        setOrigin(first.origin);
        setOriginLabel(first.originLabel);
        setDestination(first.destination);
        setDestinationLabel(first.destinationLabel);
        setDepartDate(first.departDate);
      }
    }
    setTripType(next);
  }

  function updateFlightLeg(id: string, patch: Partial<FlightLeg>) {
    setFlightLegs((prev) => {
      const next = prev.map((leg) =>
        leg.id === id ? ({ ...leg, ...patch } as FlightLeg) : leg,
      );
      const index = prev.findIndex((leg) => leg.id === id);
      if (index >= 0 && (patch.destination !== undefined || patch.destinationLabel !== undefined)) {
        const updated = next[index];
        const chained = next[index + 1];
        if (updated && chained) {
          next[index + 1] = {
            ...chained,
            origin: updated.destination,
            originLabel: updated.destinationLabel,
          };
        }
      }
      return next;
    });
  }

  function addFlightLeg() {
    setFlightLegs((prev) => {
      if (prev.length >= 5) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev,
        createFlightLeg({
          id: newLegId(prev),
          origin: last?.destination || "",
          originLabel: last?.destinationLabel || "",
          departDate: addDaysToIso(last?.departDate || plusDays(14), 4),
        }),
      ];
    });
  }

  function removeFlightLeg(id: string) {
    setFlightLegs((prev) => (prev.length <= 2 ? prev : prev.filter((leg) => leg.id !== id)));
  }

  async function runSearch() {
    setLoading(true);
    setError("");
    setMessage("");
    setFlightResults([]);
    setHotels([]);
    setTransfers([]);
    setActivities([]);
    try {
      if (mode === "flights") {
        if (tripType === "multicity") {
          flightLegs.forEach((leg, i) => {
            if (!leg?.origin || !leg.destination || !leg.departDate) {
              throw new Error(`أكمل بيانات الرحلة ${i + 1}`);
            }
          });
          const combined: Offer[] = [];
          let providerName = "المزوّد";
          for (let i = 0; i < flightLegs.length; i += 1) {
            const leg = flightLegs[i];
            if (!leg) continue;
            const result = await shopFetch<{
              inquiryId: string;
              quoteItems?: QuoteItem[];
              providerName?: string;
              flights: Offer[];
            }>("/shop/search-flights", {
              method: "POST",
              timeoutMs: 60000,
              body: JSON.stringify({
                origin: leg.origin,
                destination: leg.destination,
                departDate: leg.departDate,
                adults,
                children,
                infants,
                cabinClass,
              }),
            });
            if (i === 0) {
              setInquiryId(result.inquiryId);
              setQuoteItems(result.quoteItems || []);
            }
            providerName = result.providerName || providerName;
            const tagged = (result.flights || []).map((row) => ({
              ...row,
              id: `${leg.id}-${row.id}`,
              details: {
                ...row.details,
                originalOfferId: row.id,
                legIndex: i + 1,
                legLabel: `الرحلة ${i + 1}`,
                legOrigin: leg.origin,
                legDestination: leg.destination,
                legDepartDate: leg.departDate,
              },
            }));
            combined.push(...tagged);
          }
          setFlightResults(combined);
          const directCount = combined.filter((f) => Number(f.details.stops || 0) === 0).length;
          setMessage(
            directOnly
              ? `تم جلب ${combined.length} رحلة عبر ${flightLegs.length} مسارات — ${directCount} مباشرة`
              : `تم جلب ${combined.length} رحلة عبر ${flightLegs.length} مسارات (${providerName})`,
          );
        } else {
        if (!origin || !destination || !departDate) {
          throw new Error("أدخل المغادرة والوجهة والتاريخ");
        }
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: QuoteItem[];
          providerName?: string;
          flights: Offer[];
        }>("/shop/search-flights", {
          method: "POST",
          timeoutMs: 60000,
          body: JSON.stringify({
            origin,
            destination,
            departDate,
            returnDate: tripType === "roundtrip" ? returnDate : undefined,
            adults,
            children,
            infants,
            cabinClass,
          }),
        });
        setInquiryId(result.inquiryId);
        setQuoteItems(result.quoteItems || []);
        const rows = result.flights || [];
        setFlightResults(rows);
        setMessage(
          directOnly
            ? `تم جلب ${rows.length} رحلة — ${rows.filter((f) => Number(f.details.stops || 0) === 0).length} مباشرة`
            : `تم جلب ${rows.length} رحلة عبر ${result.providerName || "المزوّد"}`,
        );
        }
      } else if (mode === "stays") {
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: QuoteItem[];
          providerName?: string;
          hotels: Offer[];
        }>("/shop/search-hotels", {
          method: "POST",
          timeoutMs: 60000,
          body: JSON.stringify({
            destination: stayQuery,
            checkIn: departDate,
            checkOut: returnDate,
            rooms,
            adults,
            children,
            infants,
          }),
        });
        setInquiryId(result.inquiryId);
        setQuoteItems(result.quoteItems || []);
        setHotels(result.hotels || []);
        setMessage(
          `تم جلب ${result.hotels?.length || 0} إقامة عبر ${result.providerName || "المزوّد"}`,
        );
      } else if (mode === "cars") {
        if (!transferAirport && !transferCarRental) {
          throw new Error("اختر نوع النقل: نقل المطار أو تأجير سيارة");
        }
        if (transferCarRental && !transferAirport) {
          throw new Error("تأجير السيارات قريباً — فعّل نقل المطار حالياً");
        }
        if (!origin) {
          throw new Error("اختر مطار الوصول");
        }
        if (!transferDropoff.trim()) {
          throw new Error("أدخل الفندق أو العنوان");
        }
        const dropoffText = transferDropoffLabel.trim() || transferDropoff.trim();
        const result = await shopFetch<{
          providerName?: string;
          items: Array<{
            id: string;
            name: string;
            description: string;
            sellAmountMinor: number;
            currency: string;
            details?: Record<string, unknown>;
          }>;
        }>("/shop/search-transfers", {
          method: "POST",
          timeoutMs: 45000,
          body: JSON.stringify({
            city: dropoffText,
            from: origin || "KWI",
            to: dropoffText,
            fromKind: "IATA",
            toKind: "GPS",
            toLabel: dropoffText,
            outboundDate: departDate,
            outboundTime: pickupTime,
            inboundDate: transferRoundtrip ? returnDate : undefined,
            inboundTime: transferRoundtrip ? dropoffTime : undefined,
            adults,
            children,
            infants,
          }),
        });
        setTransfers(
          (result.items || []).map((row) => ({
            id: row.id,
            name: row.name,
            price: row.sellAmountMinor,
            currency: row.currency,
            details: row.description,
            extra: row.details,
          })),
        );
        setMessage(
          result.items?.length
            ? `تم جلب ${result.items.length} خيار نقل عبر ${result.providerName}`
            : "لا توجد رحلات نقل متاحة لهذا المطار والوجهة.",
        );
      } else {
        const result = await shopFetch<{
          providerName?: string;
          items: Array<{
            id: string;
            name: string;
            description: string;
            sellAmountMinor: number;
            currency: string;
            details?: Record<string, unknown>;
          }>;
        }>("/shop/search-activities", {
          method: "POST",
          timeoutMs: 45000,
          body: JSON.stringify({
            destination: activityDest || stayQuery,
            fromDate: departDate,
            toDate: returnDate,
            adults,
            children,
          }),
        });
        setActivities(
          (result.items || []).map((row) => ({
            id: row.id,
            name: row.name,
            price: row.sellAmountMinor,
            currency: row.currency,
            details: row.description,
            extra: row.details,
          })),
        );
        setMessage(
          result.items?.length
            ? `تم جلب ${result.items.length} نشاط عبر ${result.providerName}`
            : "لا توجد أنشطة متاحة لهذه الوجهة والتواريخ.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل البحث");
    } finally {
      setLoading(false);
    }
  }

  function quoteItemIdFor(offerId: string, serviceType: string) {
    return quoteItems.find(
      (item) => item.providerOfferRef === offerId && item.serviceType === serviceType,
    )?.id;
  }

  function bookFlight(flight: Offer) {
    const legOrigin = String(flight.details.legOrigin || origin);
    const legDestination = String(flight.details.legDestination || destination);
    const legDepartDate = String(flight.details.legDepartDate || departDate);
    const offerRef = String(flight.details.originalOfferId || flight.id);
    saveFlightDraft({
      flight,
      origin: legOrigin,
      destination: legDestination,
      originLabel: legOrigin,
      destinationLabel: legDestination,
      departDate: legDepartDate,
      returnDate: tripType === "roundtrip" ? returnDate : undefined,
      tripType,
      adults,
      children,
      infants,
      cabinClass,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId: quoteItemIdFor(offerRef, "flight"),
    });
    router.push("/book");
  }

  function bookHotel(hotel: HotelOfferRow, rate?: { rateKey: string; net: number; currency: string; boardName: string; roomName: string; rateType: string; roomCode: string; boardCode: string; freeCancellation: boolean }) {
    saveHotelDraft({
      hotel,
      selectedRate: rate,
      checkIn: departDate,
      checkOut: returnDate,
      rooms,
      adults,
      children,
      infants,
      location: stayQuery,
      locationLabel: stayQuery,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId: quoteItemIdFor(hotel.id, "hotel"),
    });
    router.push("/book");
  }

  function bookTransfer(item: TransferItem) {
    saveTransferDraft({
      transfer: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: item.extra || {},
      },
      from: origin || "KWI",
      to: transferDropoffLabel || transferDropoff || "الكويت",
      outboundDate: departDate,
      outboundTime: pickupTime,
      inboundDate: transferRoundtrip ? returnDate : undefined,
      inboundTime: transferRoundtrip ? dropoffTime : undefined,
      adults,
      children,
      infants,
      createdAt: new Date().toISOString(),
    });
    router.push("/book");
  }

  function bookActivity(item: TransferItem) {
    saveActivityDraft({
      activity: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: item.extra || {},
      },
      destination: activityDest,
      destinationLabel: activityLabel,
      fromDate: departDate,
      toDate: returnDate,
      adults,
      children,
      createdAt: new Date().toISOString(),
    });
    router.push("/book");
  }

  function scrollToSearch() {
    document.getElementById("search")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyDestination(dest: ShopDestination) {
    setMode("flights");
    setOrigin("KWI");
    setOriginLabel("KWI · الكويت");
    setDestination(dest.code);
    setDestinationLabel(`${dest.code} · ${dest.name}`);
    setStayQuery(dest.name);
    setActivityDest(dest.code);
    setActivityLabel(dest.name);
    setError("");
    setMessage("");
    scrollToSearch();
  }

  function applyOffer(offer: ShopOffer) {
    setMode(offer.mode);
    setError("");
    setMessage("");
    if (offer.mode === "flights") {
      setOrigin("KWI");
      setOriginLabel("KWI · الكويت");
      setDestination(offer.code || "DXB");
      setDestinationLabel(`${offer.code || "DXB"} · ${offer.destination || ""}`);
    }
    if (offer.mode === "stays" || offer.mode === "cars") {
      setStayQuery(offer.destination || "دبي");
    }
    if (offer.mode === "cars") {
      setTransferDropoff(offer.destination || "الكويت");
      setTransferDropoffLabel(offer.destination || "الكويت");
    }
    if (offer.mode === "activities") {
      setActivityDest(offer.code || "DXB");
      setActivityLabel(offer.destination || "دبي");
    }
    scrollToSearch();
  }

  return (
    <>
      <ShopHeroBanner
        mode={mode}
        onModeChange={setMode}
        tripType={tripType}
        onTripTypeChange={handleTripTypeChange}
        flightLegs={flightLegs}
        onFlightLegChange={updateFlightLeg}
        onAddFlightLeg={addFlightLeg}
        onRemoveFlightLeg={removeFlightLeg}
        transferRoundtrip={transferRoundtrip}
        onTransferRoundtripChange={setTransferRoundtrip}
        transferAirport={transferAirport}
        onTransferAirportChange={setTransferAirport}
        transferCarRental={transferCarRental}
        onTransferCarRentalChange={setTransferCarRental}
        transferDropoff={transferDropoff}
        transferDropoffLabel={transferDropoffLabel}
        onTransferDropoffClear={(text) => {
          setTransferDropoff(text);
          setTransferDropoffLabel(text);
        }}
        onTransferDropoffPick={(item) => {
          setTransferDropoff(item.title);
          setTransferDropoffLabel(item.title);
        }}
        cabinClass={cabinClass}
        onCabinClassChange={setCabinClass}
        directOnly={directOnly}
        onDirectOnlyChange={setDirectOnly}
        origin={origin}
        originLabel={originLabel}
        destination={destination}
        destinationLabel={destinationLabel}
        stayQuery={stayQuery}
        activityDest={activityDest}
        activityLabel={activityLabel}
        departDate={departDate}
        returnDate={returnDate}
        pickupTime={pickupTime}
        dropoffTime={dropoffTime}
        adults={adults}
        children={children}
        rooms={rooms}
        onOriginClear={(text) => {
          setOrigin("");
          setOriginLabel(text);
        }}
        onOriginPick={(item) => {
          setOrigin(item.code);
          setOriginLabel(item.title);
        }}
        onDestinationClear={(text) => {
          setDestination("");
          setDestinationLabel(text);
        }}
        onDestinationPick={(item) => {
          setDestination(item.code);
          setDestinationLabel(item.title);
        }}
        onStayQueryChange={setStayQuery}
        onStayPick={(item) => setStayQuery(item.title)}
        onActivityClear={(text) => {
          setActivityDest(text);
          setActivityLabel(text);
        }}
        onActivityPick={(item) => {
          setActivityDest(item.code || item.title);
          setActivityLabel(item.title);
        }}
        onDepartDateChange={setDepartDate}
        onReturnDateChange={setReturnDate}
        onPickupTimeChange={setPickupTime}
        onDropoffTimeChange={setDropoffTime}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onRoomsChange={setRooms}
        onSearch={() => void runSearch()}
        loading={loading}
        error={error}
        message={message}
        searchAirports={searchAirports}
        searchCities={searchCities}
      />

      {hasResults ? (
        <section className="shop-results shop-results-block">
          <div className="shop-section-head">
            <div>
              <p className="shop-kicker">نتائج البحث</p>
              <h2>اختر العرض المناسب لك</h2>
            </div>
          </div>
        {showDirectFlightsEmpty ? (
          <p className="shop-status">لا توجد رحلات مباشرة ضمن النتائج. أزل التصفية أو جرّب تواريخاً أخرى.</p>
        ) : null}
        {flights.map((flight) => {
          const code = String(flight.details.airlineCode || "");
          const logo = airlineLogo(code);
          const fromCode = String(flight.details.legOrigin || flight.details.from || origin);
          const toCode = String(flight.details.legDestination || flight.details.to || destination);
          const legLabel = String(flight.details.legLabel || "");
          const departTime = String(flight.details.departureTime || flight.details.departTime || "—");
          const arriveTime = String(flight.details.arrivalTime || flight.details.arriveTime || "—");
          const duration = String(flight.details.duration || "");
          const stops = String(flight.details.stops ?? flight.details.stopCount ?? "مباشر");
          return (
            <article key={flight.id} className="exp-flight-card">
              {legLabel ? <span className="exp-flight-leg-tag">{legLabel}</span> : null}
              <div className="exp-flight-airline">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" />
                ) : (
                  <div className="exp-flight-logo-fallback">✈</div>
                )}
                <div>
                  <strong>{code || "—"}</strong>
                  <span>{flight.description}</span>
                </div>
              </div>
              <div className="exp-flight-leg">
                <strong>{departTime}</strong>
                <span>{fromCode}</span>
              </div>
              <div className="exp-flight-mid">
                <span>{duration}</span>
                <em>{stops}</em>
              </div>
              <div className="exp-flight-leg">
                <strong>{arriveTime}</strong>
                <span>{toCode}</span>
              </div>
              <div className="exp-flight-price">
                <strong>{formatMoneyMinor(flight.sellAmountMinor, flight.currency)}</strong>
                <small>للمسافر</small>
                <button type="button" className="exp-select-btn" onClick={() => bookFlight(flight)}>
                  اختر
                </button>
              </div>
            </article>
          );
        })}

        {hotelRows.map((hotel) => (
          <HotelSearchCard
            key={hotel.id}
            hotel={hotel}
            nights={nights}
            onOpen={() => setHotelOpen(hotel)}
          />
        ))}

        {transfers.map((item) => (
          <TransferSearchCard
            key={item.id}
            item={item}
            from={originLabel}
            to={stayQuery}
            onBook={() => bookTransfer(item)}
          />
        ))}

        {activities.map((item) => (
          <ActivitySearchCard
            key={item.id}
            item={item}
            destination={activityLabel}
            onBook={() => bookActivity(item)}
          />
        ))}
        </section>
      ) : null}

      <ShopLanding
        onPickDestination={applyDestination}
        onPickOffer={applyOffer}
      />

      {hotelOpen ? (
        <HotelDetailModal
          hotel={{
            ...hotelOpen,
            matchingRates: hotelRows.find((h) => h.id === hotelOpen.id)?.matchingRates || [],
            displayFromMinor:
              hotelRows.find((h) => h.id === hotelOpen.id)?.displayFromMinor ||
              hotelOpen.sellAmountMinor,
          }}
          nights={nights}
          meta={{
            stayQuery,
            departDate,
            returnDate,
            rooms,
            adults,
            children,
            infants,
          }}
          checkRatePath="/shop/checkrate-hotel"
          fetchJson={shopFetch}
          onClose={() => setHotelOpen(null)}
          onEnterGuestData={(rate) => bookHotel(hotelOpen, rate)}
        />
      ) : null}
    </>
  );
}
