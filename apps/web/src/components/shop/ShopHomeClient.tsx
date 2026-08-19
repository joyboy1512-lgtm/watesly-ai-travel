"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HotelSearchCard } from "@/components/hotels/HotelSearchCard";
import { HotelDetailModal } from "@/components/hotels/HotelDetailModal";
import { TransferSearchCard } from "@/components/hotels/TransferSearchCard";
import { ActivitySearchCard } from "@/components/hotels/ActivitySearchCard";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
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

function airlineLogo(code?: string | null) {
  if (!code || code.length !== 2) return null;
  return `https://pics.avs.io/80/80/${code.toUpperCase()}.png`;
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
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [transferRoundtrip, setTransferRoundtrip] = useState(false);
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
  const [flights, setFlights] = useState<Offer[]>([]);
  const [hotels, setHotels] = useState<HotelOfferRow[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [activities, setActivities] = useState<TransferItem[]>([]);
  const [inquiryId, setInquiryId] = useState<string>();
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [hotelOpen, setHotelOpen] = useState<HotelOfferRow | null>(null);

  const nights = nightsBetween(departDate, returnDate);

  const hasResults =
    flights.length > 0 ||
    hotels.length > 0 ||
    transfers.length > 0 ||
    activities.length > 0;

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

  async function runSearch() {
    setLoading(true);
    setError("");
    setMessage("");
    setFlights([]);
    setHotels([]);
    setTransfers([]);
    setActivities([]);
    try {
      if (mode === "flights") {
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
        setFlights(result.flights || []);
        setMessage(
          `تم جلب ${result.flights?.length || 0} رحلة عبر ${result.providerName || "المزوّد"}`,
        );
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
            city: stayQuery || "الكويت",
            from: origin || "KWI",
            to: stayQuery || "الكويت",
            fromKind: "IATA",
            toKind: "GPS",
            toLabel: stayQuery || "الكويت",
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
    saveFlightDraft({
      flight,
      origin,
      destination,
      originLabel,
      destinationLabel,
      departDate,
      returnDate: tripType === "roundtrip" ? returnDate : undefined,
      tripType,
      adults,
      children,
      infants,
      cabinClass,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId: quoteItemIdFor(flight.id, "flight"),
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
      to: stayQuery || "الكويت",
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
    if (offer.mode === "activities") {
      setActivityDest(offer.code || "DXB");
      setActivityLabel(offer.destination || "دبي");
    }
    scrollToSearch();
  }

  return (
    <>
      <div className="shop-hero-wrap">
        <div
          className="shop-hero-bg"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1505118380757-91f5daf2b46f?auto=format&fit=crop&w=1600&q=80)",
          }}
        />
        <section className="shop-hero" id="search">
          <div className="shop-hero-copy">
            <p className="shop-kicker light">مرحباً بك في WeekendGate</p>
            <h1>رحلتك تبدأ من ماء البحر</h1>
            <p>
              احجز طيراناً، إقامة، نقلاً، أو نشاطاً — بأسعار حية وتجربة هادئة
              بلون البحر الفاتح.
            </p>
          </div>

          <div className="shop-search-shell">
            <div className="shop-tabs" role="tablist" aria-label="نوع البحث">
          {(
            [
              ["flights", "الطيران"],
              ["stays", "الفنادق"],
              ["cars", "نقل"],
              ["activities", "أنشطة"],
            ] as Array<[Mode, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={mode === key ? "on" : undefined}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
            </div>
            <h2 className="shop-search-title">
              {mode === "flights"
                ? "قارن واحجز أرخص الرحلات"
                : mode === "stays"
                  ? "اكتشف أفضل الإقامات"
                  : mode === "cars"
                    ? "نقل من المطار إلى الفندق"
                    : "اكتشف الأنشطة والمعالم"}
            </h2>

            <div className="shop-search">
          {mode === "flights" ? (
            <div className="shop-chips">
              <button
                type="button"
                className={tripType === "roundtrip" ? "on" : undefined}
                onClick={() => setTripType("roundtrip")}
              >
                ذهاب وعودة
              </button>
              <button
                type="button"
                className={tripType === "oneway" ? "on" : undefined}
                onClick={() => setTripType("oneway")}
              >
                ذهاب فقط
              </button>
              <label className="opt-chip opt-select">
                <span>الدرجة</span>
                <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
                  <option value="economy">اقتصادية</option>
                  <option value="premium_economy">اقتصادية مميزة</option>
                  <option value="business">رجال أعمال</option>
                  <option value="first">أولى</option>
                </select>
              </label>
            </div>
          ) : null}
          {mode === "cars" ? (
            <div className="shop-chips">
              <button
                type="button"
                className={!transferRoundtrip ? "on" : undefined}
                onClick={() => setTransferRoundtrip(false)}
              >
                وصول فقط
              </button>
              <button
                type="button"
                className={transferRoundtrip ? "on" : undefined}
                onClick={() => setTransferRoundtrip(true)}
              >
                وصول وعودة
              </button>
            </div>
          ) : null}

          <div className={`fs-grid ${mode === "stays" ? "stays" : ""}`}>
            {mode === "flights" || mode === "cars" ? (
              <ShopAutocomplete
                label={mode === "cars" ? "المطار" : "من"}
                value={origin}
                display={originLabel}
                placeholder="مطار المغادرة"
                onQuery={searchAirports}
                onClearText={(text) => {
                  setOrigin("");
                  setOriginLabel(text);
                }}
                onPick={(item) => {
                  setOrigin(item.code);
                  setOriginLabel(item.title);
                }}
              />
            ) : null}
            {mode === "flights" ? (
              <ShopAutocomplete
                label="إلى"
                value={destination}
                display={destinationLabel}
                placeholder="الوجهة"
                onQuery={searchAirports}
                onClearText={(text) => {
                  setDestination("");
                  setDestinationLabel(text);
                }}
                onPick={(item) => {
                  setDestination(item.code);
                  setDestinationLabel(item.title);
                }}
              />
            ) : null}
            {mode === "stays" || mode === "cars" ? (
              <ShopAutocomplete
                label={mode === "cars" ? "المدينة أو الفندق" : "الوجهة"}
                value={stayQuery}
                display={stayQuery}
                placeholder="مدينة أو اسم فندق"
                onQuery={searchCities}
                onClearText={setStayQuery}
                onPick={(item) => setStayQuery(item.title)}
              />
            ) : null}
            {mode === "activities" ? (
              <ShopAutocomplete
                label="الوجهة"
                value={activityDest}
                display={activityLabel}
                placeholder="مدينة النشاط"
                onQuery={searchCities}
                onClearText={(text) => {
                  setActivityDest(text);
                  setActivityLabel(text);
                }}
                onPick={(item) => {
                  setActivityDest(item.code || item.title);
                  setActivityLabel(item.title);
                }}
              />
            ) : null}
            <label className="fs-cell">
              <span>{mode === "stays" ? "الوصول" : "التاريخ"}</span>
              <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
            </label>
            {(mode === "flights" && tripType === "roundtrip") ||
            mode === "stays" ||
            mode === "activities" ||
            (mode === "cars" && transferRoundtrip) ? (
              <label className="fs-cell">
                <span>{mode === "stays" ? "المغادرة" : "العودة"}</span>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </label>
            ) : null}
            {mode === "cars" ? (
              <label className="fs-cell">
                <span>وقت الاستلام</span>
                <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </label>
            ) : null}
            <label className="fs-cell">
              <span>المسافرون</span>
              <select
                value={`${adults}-${children}-${infants}-${rooms}`}
                onChange={() => undefined}
              >
                <option>
                  {adults} بالغ
                  {children ? ` · ${children} طفل` : ""}
                  {infants ? ` · ${infants} رضيع` : ""}
                  {mode === "stays" ? ` · ${rooms} غرفة` : ""}
                </option>
              </select>
              <div className="shop-chips" style={{ marginTop: "0.35rem" }}>
                <button type="button" onClick={() => setAdults((n) => Math.max(1, n - 1))}>
                  بالغ -
                </button>
                <button type="button" onClick={() => setAdults((n) => n + 1)}>
                  بالغ +
                </button>
                <button type="button" onClick={() => setChildren((n) => Math.max(0, n - 1))}>
                  طفل -
                </button>
                <button type="button" onClick={() => setChildren((n) => n + 1)}>
                  طفل +
                </button>
              </div>
            </label>
            <button type="button" className="flight-explore" disabled={loading} onClick={() => void runSearch()}>
              {loading ? "جارٍ البحث..." : "بحث"}
            </button>
          </div>
              {error ? <p className="shop-error">{error}</p> : null}
              {message ? <p className="shop-status">{message}</p> : null}
            </div>
          </div>
        </section>
      </div>

      {hasResults ? (
        <section className="shop-results shop-results-block">
          <div className="shop-section-head">
            <div>
              <p className="shop-kicker">نتائج البحث</p>
              <h2>اختر العرض المناسب لك</h2>
            </div>
          </div>
        {flights.map((flight) => {
          const code = String(flight.details.airlineCode || "");
          const logo = airlineLogo(code);
          return (
            <article key={flight.id} className="shop-flight">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" />
              ) : (
                <div className="shop-mark">✈</div>
              )}
              <div>
                <h3>{flight.description}</h3>
                <p>
                  {String(flight.details.from || origin)} → {String(flight.details.to || destination)} ·{" "}
                  {String(flight.details.duration || "")}
                </p>
              </div>
              <div className="shop-price">
                <strong>{formatMoneyMinor(flight.sellAmountMinor, flight.currency)}</strong>
                <button type="button" className="shop-btn" onClick={() => bookFlight(flight)}>
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
