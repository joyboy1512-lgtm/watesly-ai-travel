"use client";

import "../../hotel-rich.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HotelSearchCard } from "@/components/hotels/HotelSearchCard";
import { HotelDetailModal } from "@/components/hotels/HotelDetailModal";
import { HotelLiveBadge } from "@/components/hotels/HotelLiveBadge";
import { TransferSearchCard } from "@/components/hotels/TransferSearchCard";
import { apiFetch } from "@/lib/api";
import { saveFlightDraft, saveHotelDraft, saveTransferDraft } from "@/lib/booking-draft";
import { transferPointKindToEndpoint } from "@watesly-travel/shared";
import { getPreferredCurrency } from "@/lib/currency";
import { formatDate, formatMoneyMinor, formatMoneyMinorCompact } from "@/lib/format";
import {
  BOARD_LABELS_AR,
  collectFilterFacets,
  filterHotelOffers,
  rateDisplayMinor,
  type HotelRateOption,
} from "@/lib/hotel-search";
import { saveHotelSearchSession } from "@/lib/hotel-search-session";

type TransferPointKind = "airport" | "hotel" | "address";

const TRANSFER_KIND_OPTIONS: Array<{ value: TransferPointKind; label: string; hint: string }> = [
  { value: "airport", label: "مطار", hint: "رمز IATA مثل KWI" },
  { value: "hotel", label: "فندق", hint: "اسم الفندق (Hotelbeds ATLAS)" },
  { value: "address", label: "عنوان", hint: "حي أو عنوان داخل المدينة" },
];

type Inquiry = {
  id: string;
  status: string;
  origin?: string | null;
  destination?: string | null;
  departDate?: string | null;
  adults: number;
  source: string;
  createdAt: string;
};

type OfferResult = {
  id: string;
  serviceType: "flight" | "hotel";
  description: string;
  sellAmountMinor: number;
  costAmountMinor?: number;
  profitAmountMinor?: number;
  currency: string;
  pricingRuleId?: string;
  pricingRuleName?: string;
  expiresAt: string;
  details: Record<string, unknown>;
};

type SearchResponse = {
  providerKey: string;
  providerName: string;
  liveMode: boolean;
  flightProviderKey?: string;
  flightProviderName?: string;
  hotelProviderKey?: string;
  hotelProviderName?: string;
  hotelError?: string | null;
  flights: OfferResult[];
  hotels: OfferResult[];
  quote?: {
    id: string;
    items?: Array<{ id: string; providerOfferRef: string; serviceType: string }>;
  } | null;
};

type AncillaryResult = {
  id: string;
  serviceType: string;
  name: string;
  price: number;
  currency: string;
  details: string;
  extra?: Record<string, unknown>;
};

type Airport = {
  id: string;
  iataCode?: string | null;
  name: string;
  city?: string | null;
  country?: string | null;
};

type Airline = {
  id: string;
  iataCode?: string | null;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
};

type SortKey =
  | "best"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "duration_desc"
  | "stops_asc"
  | "cheapest_direct"
  | "rating_desc";

type FlightSeg = {
  from?: string;
  to?: string;
  departAt?: string;
  arriveAt?: string;
  departTime?: string;
  arriveTime?: string;
  date?: string;
  airline?: string;
  flightNumber?: string;
};

function formatClock(value?: string | null) {
  if (!value) return "—";
  // ISO-like: 2026-09-20 08:40 or 2026-09-20T08:40
  const m = value.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return value;
}

function formatDay(value?: string | null) {
  if (!value) return "";
  const d = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function airlineLogo(code?: string | null) {
  if (!code || code.length !== 2) return null;
  return `https://pics.avs.io/80/80/${code.toUpperCase()}.png`;
}

const CABIN_LABELS: Record<string, string> = {
  economy: "اقتصادية",
  premium_economy: "اقتصادية مميزة",
  business: "رجال أعمال",
  first: "الدرجة الأولى",
};

function cabinLabel(cabin?: string | null) {
  if (!cabin) return "اقتصادية";
  return CABIN_LABELS[cabin] || cabin;
}

function layoverMinutes(arriveAt?: string, departAt?: string) {
  if (!arriveAt || !departAt) return null;
  const a = new Date(arriveAt).getTime();
  const b = new Date(departAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

function formatMinutesLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}س` : "", m ? `${m}د` : ""].filter(Boolean).join(" ") || "0د";
}

function scoreBest(a: OfferResult) {
  const stops = Number(a.details.stops || 0);
  const mins = durationMinutes(a.details.duration);
  return a.sellAmountMinor / 100 + stops * 120 + mins * 0.8;
}

function defaultDepartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function defaultReturnDate() {
  const d = new Date();
  d.setDate(d.getDate() + 37);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(from: string, to: string) {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function durationMinutes(raw: unknown) {
  if (typeof raw !== "string") return Number.MAX_SAFE_INTEGER;
  const iso = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso) return Number(iso[1] || 0) * 60 + Number(iso[2] || 0);
  const ar = raw.match(/(\d+)\s*س(?:\s*(\d+)\s*د)?/);
  if (ar) return Number(ar[1] || 0) * 60 + Number(ar[2] || 0);
  const colon = raw.match(/^(\d+):(\d+)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  return Number.MAX_SAFE_INTEGER;
}

type DepartureBucket = "morning" | "afternoon" | "evening";

const DEPARTURE_BUCKETS: Array<{
  key: DepartureBucket;
  label: string;
  hint: string;
}> = [
  { key: "morning", label: "صباحًا", hint: "05:00 – 11:59" },
  { key: "afternoon", label: "بعد الظهر", hint: "12:00 – 17:59" },
  { key: "evening", label: "مساءً", hint: "18:00 – 04:59" },
];

function departureHourFromValue(value?: string | null) {
  if (!value) return null;
  const m = value.match(/(\d{2}):(\d{2})/);
  if (!m) return null;
  const hour = Number(m[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function flightDepartureHour(f: OfferResult) {
  const segs = (Array.isArray(f.details.segments)
    ? f.details.segments
    : []) as FlightSeg[];
  const first = segs[0];
  return (
    departureHourFromValue(first?.departAt) ??
    departureHourFromValue(first?.departTime) ??
    departureHourFromValue(String(f.details.departAt || "")) ??
    departureHourFromValue(String(f.details.departTime || ""))
  );
}

function flightHasDepartureTime(f: OfferResult) {
  return flightDepartureHour(f) !== null;
}

function departureBucket(hour: number): DepartureBucket {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  return "evening";
}

function stopsLabel(stops: number) {
  if (stops === 0) return "مباشر";
  if (stops === 1) return "توقف واحد";
  return `${stops} توقف`;
}

function hotelRatingLabel(rating: number) {
  if (rating >= 9) return "ممتاز";
  if (rating >= 8) return "رائع";
  if (rating >= 7) return "جيد جدًا";
  if (rating >= 6) return "جيد";
  return "مقبول";
}

function formatHotelRating(raw: unknown) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

function AutocompleteField({
  label,
  value,
  display,
  placeholder,
  onQuery,
  onPick,
  onClearText,
}: {
  label: string;
  value: string;
  display: string;
  placeholder: string;
  onQuery: (q: string) => Promise<Array<{ id: string; title: string; subtitle?: string; code?: string }>>;
  onPick: (item: { id: string; title: string; subtitle?: string; code?: string }) => void;
  onClearText: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(display || value || "");
  const [items, setItems] = useState<
    Array<{ id: string; title: string; subtitle?: string; code?: string }>
  >([]);
  const boxRef = useRef<HTMLLabelElement>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    setText(display || value || "");
  }, [display, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function runQuery(q: string) {
    const reqId = ++reqRef.current;
    setLoading(true);
    setOpen(true);
    try {
      const rows = await onQuery(q);
      if (reqId === reqRef.current) setItems(rows);
    } catch {
      if (reqId === reqRef.current) setItems([]);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }

  function handleChange(next: string) {
    setText(next);
    onClearText(next);
    void runQuery(next);
  }

  return (
    <label className="fs-cell" ref={boxRef}>
      <span>{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => {
          setOpen(true);
          void runQuery(text.trim().length >= 1 ? text : "");
        }}
        onChange={(e) => handleChange(e.target.value)}
      />
      <small>{value ? `رمز المطار: ${value}` : "اختر من القائمة"}</small>
      {open ? (
        <div className="fs-suggest">
          {loading ? <div className="fs-suggest-loading">جاري البحث عن المطارات…</div> : null}
          {!loading && items.length === 0 ? (
            <div className="fs-suggest-empty">لا توجد مطارات مطابقة — جرّب اسم المدينة أو رمز IATA</div>
          ) : null}
          {!loading
            ? items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(item);
                    setText(item.title);
                    setOpen(false);
                  }}
                >
                  <strong>{item.title}</strong>
                  {item.subtitle ? <span>{item.subtitle}</span> : null}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </label>
  );
}

export default function InquiriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [mode, setMode] = useState<"flights" | "stays" | "cars">("flights");
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [form, setForm] = useState({
    origin: "KWI",
    originLabel: "KWI · الكويت",
    destination: "DXB",
    destinationLabel: "DXB · دبي",
    departDate: defaultDepartDate(),
    returnDate: defaultReturnDate(),
    adults: 1,
    children: 0,
    rooms: 1,
    cabinClass: "economy",
    directOnly: false,
    preferredAirline: "",
    preferredAirlineName: "",
    stayQuery: "دبي",
    transferCity: "الكويت",
    transferCityLabel: "الكويت",
    pickupKind: "airport" as TransferPointKind,
    dropoffKind: "address" as TransferPointKind,
    pickupLocation: "KWI",
    pickupLocationLabel: "KWI · الكويت",
    dropoffLocation: "الكويت",
    dropoffLocationLabel: "الكويت",
    pickupTime: "10:00",
    dropoffTime: "18:00",
    childrenAges: [] as number[],
    shiftDays: false,
    minRate: "",
    maxRate: "",
  });
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [currentInquiryId, setCurrentInquiryId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [detailFlightId, setDetailFlightId] = useState<string | null>(null);
  const [detailHotelId, setDetailHotelId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    maxPrice: "",
    stops: "any" as "any" | "0" | "1",
    airline: "",
    airlines: [] as string[],
    departureTimes: [] as DepartureBucket[],
    minStars: "any",
    board: "",
    boardCode: "",
    zone: "",
    paymentType: "",
    rateType: "",
    refundableOnly: false,
    bookableOnly: false,
    maxDurationHours: "",
    freeCancellation: false,
    breakfast: false,
    noPrepayment: false,
    minReviewScore: "any" as "any" | "7" | "8" | "9",
    propertyTypes: [] as string[],
    facilities: [] as string[],
    hotelQuery: "",
  });

  const defaultFlightFilters = {
    maxPrice: "",
    stops: "any" as "any" | "0" | "1",
    airline: "",
    airlines: [] as string[],
    departureTimes: [] as DepartureBucket[],
    minStars: "any",
    board: "",
    boardCode: "",
    zone: "",
    paymentType: "",
    rateType: "",
    refundableOnly: false,
    bookableOnly: false,
    maxDurationHours: "",
    freeCancellation: false,
    breakfast: false,
    noPrepayment: false,
    minReviewScore: "any" as "any" | "7" | "8" | "9",
    propertyTypes: [] as string[],
    facilities: [] as string[],
    hotelQuery: "",
  };

  const flightFiltersActive = useMemo(() => {
    return (
      form.directOnly ||
      filters.stops !== "any" ||
      filters.airlines.length > 0 ||
      Boolean(filters.airline) ||
      filters.departureTimes.length > 0 ||
      Boolean(filters.maxPrice) ||
      Boolean(filters.maxDurationHours)
    );
  }, [filters, form.directOnly]);

  const nights = nightsBetween(form.departDate, form.returnDate);

  useEffect(() => {
    if (!detailFlightId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailFlightId(null);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [detailFlightId]);

  useEffect(() => {
    if (!detailHotelId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailHotelId(null);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!detailFlightId) document.body.style.overflow = "";
    };
  }, [detailHotelId, detailFlightId]);

  async function load() {
    setRows(await apiFetch<Inquiry[]>("/inquiries"));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    apiFetch<Airline[]>("/travel-meta/airlines?limit=40")
      .then(setAirlines)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!guestsRef.current?.contains(e.target as Node)) setGuestsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function searchAirports(q: string) {
    const rows = await apiFetch<Airport[]>(
      `/travel-meta/airports?q=${encodeURIComponent(q)}&limit=50`,
    );
    return rows.map((a) => ({
      id: a.id,
      code: a.iataCode || "",
      title: `${a.iataCode || "—"} · ${a.city || a.name}`,
      subtitle: `${a.name}${a.country ? ` — ${a.country}` : ""}`,
    }));
  }

  async function searchCities(q: string) {
    const rows = await apiFetch<
      Array<{ city: string | null; country: string | null; iataCode?: string | null }>
    >(`/travel-meta/cities?q=${encodeURIComponent(q)}`);
    return rows.map((c, idx) => ({
      id: `${c.city}-${c.country}-${idx}`,
      code: c.iataCode || c.city || "",
      title: c.city || "مدينة",
      subtitle: c.country || undefined,
    }));
  }

  const providerBadge = useMemo(() => {
    if (!search) return null;
    const flight =
      search.flightProviderName ||
      search.flightProviderKey ||
      (mode === "flights" ? search.providerName : null);
    const hotel =
      search.hotelProviderName ||
      search.hotelProviderKey ||
      (mode === "stays" ? search.providerName : null);
    if (mode === "flights" && flight) return `طيران: ${flight}`;
    if (mode === "stays" && hotel) return `فنادق: ${hotel}`;
    if (mode === "cars") return `مواصلات: ${search.providerName || search.providerKey}`;
    if (flight && hotel && flight !== hotel) {
      return `طيران: ${flight} · فنادق: ${hotel}`;
    }
    return search.providerName || search.providerKey || "مزود البحث";
  }, [search, mode]);

  const flightAirlineFacets = useMemo(() => {
    if (!search) return [] as Array<{ code: string; name: string; count: number; minPrice: number; currency: string }>;
    const map = new Map<
      string,
      { code: string; name: string; count: number; minPrice: number; currency: string }
    >();
    for (const f of search.flights) {
      const code = String(f.details.airlineCode || "XX").toUpperCase();
      const name = String(f.details.airline || code);
      const prev = map.get(code);
      if (!prev) {
        map.set(code, {
          code,
          name,
          count: 1,
          minPrice: f.sellAmountMinor,
          currency: f.currency,
        });
      } else {
        prev.count += 1;
        prev.minPrice = Math.min(prev.minPrice, f.sellAmountMinor);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [search]);

  const stopCounts = useMemo(() => {
    const all = search?.flights || [];
    return {
      any: all.length,
      direct: all.filter((f) => Number(f.details.stops || 0) === 0).length,
      one: all.filter((f) => Number(f.details.stops || 0) <= 1).length,
      minAny: all.reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
      minDirect: all
        .filter((f) => Number(f.details.stops || 0) === 0)
        .reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
      minOne: all
        .filter((f) => Number(f.details.stops || 0) <= 1)
        .reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
      currency: all[0]?.currency || getPreferredCurrency(),
    };
  }, [search]);

  const departureTimeFacets = useMemo(() => {
    const all = (search?.flights || []).filter(flightHasDepartureTime);
    const counts: Record<DepartureBucket, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    for (const f of all) {
      const hour = flightDepartureHour(f);
      if (hour === null) continue;
      counts[departureBucket(hour)] += 1;
    }
    return { counts, total: all.length };
  }, [search]);

  const filteredFlights = useMemo(() => {
    if (!search) return [];
    let list = [...search.flights];
    if (form.directOnly || filters.stops === "0") {
      list = list.filter((f) => Number(f.details.stops || 0) === 0);
    } else if (filters.stops === "1") {
      list = list.filter((f) => Number(f.details.stops || 0) <= 1);
    }
    const selectedAirlines = [
      ...filters.airlines,
      ...(filters.airline ? [filters.airline] : []),
      ...(form.preferredAirline ? [form.preferredAirline] : []),
    ]
      .map((c) => c.toUpperCase())
      .filter(Boolean);
    if (selectedAirlines.length) {
      list = list.filter((f) =>
        selectedAirlines.includes(
          String(f.details.airlineCode || "").toUpperCase(),
        ),
      );
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice) * 100;
      if (Number.isFinite(max)) {
        list = list.filter((f) => f.sellAmountMinor <= max);
      }
    }
    if (filters.maxDurationHours) {
      const maxMins = Number(filters.maxDurationHours) * 60;
      if (Number.isFinite(maxMins)) {
        list = list.filter(
          (f) => durationMinutes(f.details.duration) <= maxMins,
        );
      }
    }
    if (filters.departureTimes.length) {
      list = list.filter((f) => {
        if (!flightHasDepartureTime(f)) return false;
        const hour = flightDepartureHour(f);
        if (hour === null) return false;
        return filters.departureTimes.includes(departureBucket(hour));
      });
    }
    if (sortKey === "cheapest_direct") {
      list = list.filter((f) => Number(f.details.stops || 0) === 0);
    }
    list.sort((a, b) => {
      if (sortKey === "best") return scoreBest(a) - scoreBest(b);
      if (sortKey === "price_desc") return b.sellAmountMinor - a.sellAmountMinor;
      if (sortKey === "duration_asc" || sortKey === "cheapest_direct") {
        if (sortKey === "cheapest_direct") {
          return a.sellAmountMinor - b.sellAmountMinor;
        }
        return (
          durationMinutes(a.details.duration) -
          durationMinutes(b.details.duration)
        );
      }
      if (sortKey === "duration_desc") {
        return (
          durationMinutes(b.details.duration) -
          durationMinutes(a.details.duration)
        );
      }
      if (sortKey === "stops_asc") {
        return Number(a.details.stops || 0) - Number(b.details.stops || 0);
      }
      return a.sellAmountMinor - b.sellAmountMinor;
    });
    return list;
  }, [
    search,
    form.directOnly,
    form.preferredAirline,
    filters,
    sortKey,
  ]);

  const detailFlight = useMemo(
    () =>
      (search?.flights || []).find((f) => f.id === detailFlightId) ||
      filteredFlights.find((f) => f.id === detailFlightId) ||
      null,
    [search, filteredFlights, detailFlightId],
  );

  function resolveQuoteItemId(offerId: string, serviceType: "flight" | "hotel") {
    return search?.quote?.items?.find(
      (item) => item.providerOfferRef === offerId && item.serviceType === serviceType,
    )?.id;
  }

  const filteredHotels = useMemo(() => {
    if (!search) return [];
    const sort =
      sortKey === "price_desc"
        ? "price_desc"
        : sortKey === "rating_desc"
          ? "rating_desc"
          : "price_asc";
    return filterHotelOffers(search.hotels, filters, sort);
  }, [search, filters, sortKey]);

  const detailHotel = useMemo(
    () => filteredHotels.find((h) => h.id === detailHotelId) || null,
    [filteredHotels, detailHotelId],
  );

  const hotelFacets = useMemo(
    () => collectFilterFacets(search?.hotels || []),
    [search?.hotels],
  );

  const hotelSortKey = useMemo(
    () =>
      sortKey === "price_desc"
        ? "price_desc"
        : sortKey === "rating_desc"
          ? "rating_desc"
          : "price_asc",
    [sortKey],
  );

  useEffect(() => {
    if (mode !== "stays" || !search?.hotels?.length) return;
    saveHotelSearchSession({
      hotels: search.hotels,
      filters,
      sortKey: hotelSortKey,
      meta: {
        stayQuery: form.stayQuery,
        departDate: form.departDate,
        returnDate: form.returnDate,
        rooms: form.rooms,
        adults: form.adults,
        children: form.children,
        destination: form.destination || form.stayQuery,
        nights,
      },
      inquiryId: currentInquiryId || undefined,
      quote: search.quote || undefined,
      providerName: search.hotelProviderName || search.providerName,
      liveMode: search.liveMode,
    });
  }, [
    search,
    filters,
    hotelSortKey,
    mode,
    form.stayQuery,
    form.departDate,
    form.returnDate,
    form.rooms,
    form.adults,
    form.children,
    form.destination,
    nights,
    currentInquiryId,
  ]);

  function openHotelDetail(offerId: string) {
    if (search?.hotels?.length) {
      saveHotelSearchSession({
        hotels: search.hotels,
        filters,
        sortKey: hotelSortKey,
        meta: {
          stayQuery: form.stayQuery,
          departDate: form.departDate,
          returnDate: form.returnDate,
          rooms: form.rooms,
          adults: form.adults,
          children: form.children,
          destination: form.destination || form.stayQuery,
          nights,
        },
        inquiryId: currentInquiryId || undefined,
        quote: search.quote || undefined,
        providerName: search.hotelProviderName || search.providerName,
        liveMode: search.liveMode,
      });
    }
    setDetailHotelId(offerId);
  }

  function confirmHotelBooking(rate: HotelRateOption) {
    if (!detailHotel) return;
    const hotelNights = Number(detailHotel.details.nights || 0) || nights || 1;
    const sellMinor = rateDisplayMinor(rate, detailHotel, hotelNights);
    saveHotelDraft({
      hotel: {
        id: detailHotel.id,
        description: [
          String(detailHotel.details.name || "فندق"),
          rate.roomName,
          rate.boardName,
          `${hotelNights} ليلة`,
        ]
          .filter(Boolean)
          .join(" · "),
        sellAmountMinor: sellMinor,
        currency: detailHotel.currency,
        details: {
          ...detailHotel.details,
          roomType: rate.roomName,
          board: rate.boardName,
          boardCode: rate.boardCode,
          selectedRateKey: rate.rateKey,
        },
      },
      selectedRate: {
        rateKey: rate.rateKey,
        rateType: rate.rateType,
        roomCode: rate.roomCode,
        roomName: rate.roomName,
        boardCode: rate.boardCode,
        boardName: rate.boardName,
        net: rate.net,
        currency: rate.currency,
        paymentType: rate.paymentType,
        freeCancellation: rate.freeCancellation,
        allotment: rate.allotment,
        rateComments: rate.rateComments,
      },
      checkIn: form.departDate,
      checkOut: form.returnDate,
      rooms: form.rooms,
      adults: form.adults,
      children: form.children,
      location: form.destination || form.stayQuery,
      locationLabel: form.stayQuery,
      createdAt: new Date().toISOString(),
      inquiryId: currentInquiryId || undefined,
      quoteId: search?.quote?.id,
      quoteItemId: search?.quote?.items?.find(
        (item) => item.providerOfferRef === detailHotel.id && item.serviceType === "hotel",
      )?.id,
    });
    setDetailHotelId(null);
    router.push("/dashboard/inquiries/book/hotel");
  }

  function confirmTransferBooking(item: AncillaryResult) {
    const extra = item.extra || {};
    saveTransferDraft({
      transfer: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: extra,
      },
      city: form.transferCity,
      pickupKind: form.pickupKind,
      dropoffKind: form.dropoffKind,
      from: String(extra.fromLabel || form.pickupLocationLabel || form.pickupLocation),
      to: String(extra.toLabel || form.dropoffLocationLabel || form.dropoffLocation),
      outboundDate: form.departDate,
      outboundTime: form.pickupTime,
      inboundDate: form.returnDate || undefined,
      inboundTime: form.returnDate ? form.dropoffTime : undefined,
      adults: form.adults,
      children: form.children,
      createdAt: new Date().toISOString(),
      inquiryId: currentInquiryId || undefined,
    });
    router.push("/dashboard/inquiries/book/transfer");
  }

  const [carResults, setCarResults] = useState<AncillaryResult[]>([]);

  async function createAndSearch() {
    setError("");
    setMessage("");
    setSearch(null);
    setCarResults([]);
    setLoading(true);

    try {
      if (mode === "cars") {
        const result = await apiFetch<{
          providerKey: string;
          providerName: string;
          liveMode: boolean;
          items: Array<{
            id: string;
            serviceType: string;
            name: string;
            description: string;
            sellAmountMinor: number;
            currency: string;
            details?: Record<string, unknown>;
          }>;
        }>("/bookings/search-transfers", {
          method: "POST",
          timeoutMs: 45000,
          body: JSON.stringify({
            city: form.transferCity,
            from: form.pickupLocation,
            to: form.dropoffLocation,
            fromKind: transferPointKindToEndpoint(form.pickupKind),
            toKind: transferPointKindToEndpoint(form.dropoffKind),
            outboundDate: form.departDate,
            outboundTime: form.pickupTime,
            inboundDate: form.returnDate || undefined,
            inboundTime: form.returnDate ? form.dropoffTime : undefined,
            adults: form.adults,
            children: form.children,
          }),
        });
        setCarResults(
          (result.items || []).map((row) => ({
            id: row.id,
            serviceType: row.serviceType || "transfer",
            name: row.name,
            price: row.sellAmountMinor,
            currency: row.currency,
            details: row.description,
            extra: row.details,
          })),
        );
        setSearch({
          providerKey: result.providerKey || "hotelbeds",
          providerName: result.providerName || "Hotelbeds Transfers",
          liveMode: result.liveMode,
          flights: [],
          hotels: [],
        });
        setMessage(
          result.items?.length
            ? `تم جلب ${result.items.length} خيار نقل عبر ${result.providerName}`
            : "لا توجد رحلات نقل متاحة لهذا المسار والتوقيت",
        );
        setLoading(false);
        return;
      }

      const includeHotels = mode === "stays" ? true : false;
      const serviceTypes = mode === "stays" ? ["hotel"] : ["flight"];
      const stayLocation = form.stayQuery.trim() || form.destination;

      const inquiry = await apiFetch<Inquiry>("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          origin: mode === "stays" ? form.destination || "DXB" : form.origin,
          destination: mode === "stays" ? stayLocation : form.destination,
          departDate: form.departDate,
          returnDate:
            tripType === "roundtrip" || mode === "stays"
              ? form.returnDate
              : undefined,
          adults: form.adults,
          children: form.children,
          cabinClass: form.cabinClass,
          includeHotels,
          serviceTypes,
          budgetCurrency: getPreferredCurrency(),
          preferences:
            mode === "stays"
              ? JSON.stringify({
                  query: stayLocation,
                  rooms: form.rooms,
                  childrenAges:
                    form.children > 0
                      ? (form.childrenAges.length
                          ? form.childrenAges
                          : Array.from({ length: form.children }, () => 6)
                        )
                          .slice(0, form.children)
                          .join(",")
                      : undefined,
                  shiftDays: form.shiftDays ? 1 : undefined,
                  minRate: form.minRate ? Number(form.minRate) : undefined,
                  maxRate: form.maxRate
                    ? Number(form.maxRate)
                    : filters.maxPrice
                      ? Number(filters.maxPrice)
                      : undefined,
                  boardCode: filters.boardCode || undefined,
                  paymentType: filters.paymentType || undefined,
                })
              : form.preferredAirline
                ? JSON.stringify({ preferredAirline: form.preferredAirline })
                : undefined,
        }),
      });

      const result = await apiFetch<SearchResponse>(
        `/inquiries/${inquiry.id}/search`,
        {
          method: "POST",
          timeoutMs: 60000,
          body: JSON.stringify({ includeHotels: mode === "stays" }),
        },
      );
      setCurrentInquiryId(inquiry.id);
      setSearch(result);
      setMessage(
        mode === "stays"
          ? `تم جلب ${result.hotels.length} إقامة عبر ${result.providerName}`
          : `تم جلب ${result.flights.length} رحلة عبر ${result.providerName}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل العملية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="الاستعلامات المباشرة">
      <section className="flight-hero">
        <div className="flight-hero-tabs">
          <button
            type="button"
            className={mode === "flights" ? "active" : undefined}
            onClick={() => setMode("flights")}
          >
            الطيران
          </button>
          <button
            type="button"
            className={mode === "stays" ? "active" : undefined}
            onClick={() => setMode("stays")}
          >
            الفنادق
          </button>
          <button
            type="button"
            className={mode === "cars" ? "active" : undefined}
            onClick={() => setMode("cars")}
          >
            نقل
          </button>
        </div>

        <h2>
          {mode === "flights"
            ? "قارن واحجز أرخص الرحلات بسهولة"
            : mode === "stays"
              ? "اكتشف أفضل الإقامات حول العالم"
              : "انقل من المطار إلى وجهتك بسهولة"}
        </h2>
        <p>محرك بحث سفر متكامل مع كتالوج المطارات وشركات الطيران</p>

        <div className="flight-search">
          {mode === "flights" ? (
            <div className="flight-search-options">
              <button
                type="button"
                className={`opt-chip${tripType === "roundtrip" ? " on" : ""}`}
                onClick={() => setTripType("roundtrip")}
              >
                ذهاب وعودة
              </button>
              <button
                type="button"
                className={`opt-chip${tripType === "oneway" ? " on" : ""}`}
                onClick={() => setTripType("oneway")}
              >
                ذهاب فقط
              </button>
              <label className="opt-chip opt-select">
                <span>درجة السفر</span>
                <select
                  value={form.cabinClass}
                  onChange={(e) =>
                    setForm({ ...form, cabinClass: e.target.value })
                  }
                >
                  <option value="economy">اقتصادية</option>
                  <option value="premium_economy">اقتصادية مميزة</option>
                  <option value="business">رجال أعمال</option>
                  <option value="first">أولى</option>
                </select>
              </label>
              <button
                type="button"
                className={`opt-chip${form.directOnly ? " on" : ""}`}
                onClick={() =>
                  setForm((f) => ({ ...f, directOnly: !f.directOnly }))
                }
              >
                رحلات مباشرة فقط
              </button>
              <label className="opt-chip opt-select">
                <span>الطيران المفضل</span>
                <select
                  value={form.preferredAirline}
                  onChange={(e) => {
                    const code = e.target.value;
                    const airline = airlines.find((a) => a.iataCode === code);
                    setForm({
                      ...form,
                      preferredAirline: code,
                      preferredAirlineName: airline?.name || "",
                    });
                  }}
                >
                  <option value="">الكل</option>
                  {airlines.map((a) => (
                    <option key={a.id} value={a.iataCode || ""}>
                      {a.iataCode} — {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {mode === "flights" ? (
            <div className="fs-grid">
              <AutocompleteField
                label="المغادرة من"
                value={form.origin}
                display={form.originLabel}
                placeholder="مدينة أو رمز مطار"
                onClearText={(text) =>
                  setForm((f) => ({
                    ...f,
                    origin: "",
                    originLabel: text,
                  }))
                }
                onQuery={searchAirports}
                onPick={(item) =>
                  setForm((f) => ({
                    ...f,
                    origin: (item.code || "").toUpperCase(),
                    originLabel: item.title,
                  }))
                }
              />
              <button
                type="button"
                className="flight-swap"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    origin: f.destination,
                    originLabel: f.destinationLabel,
                    destination: f.origin,
                    destinationLabel: f.originLabel,
                  }))
                }
              >
                ⇄
              </button>
              <AutocompleteField
                label="الوجهة"
                value={form.destination}
                display={form.destinationLabel}
                placeholder="مدينة أو رمز مطار"
                onClearText={(text) =>
                  setForm((f) => ({
                    ...f,
                    destination: "",
                    destinationLabel: text,
                  }))
                }
                onQuery={searchAirports}
                onPick={(item) =>
                  setForm((f) => ({
                    ...f,
                    destination: (item.code || "").toUpperCase(),
                    destinationLabel: item.title,
                  }))
                }
              />
              <label className="fs-cell">
                <span>تاريخ الذهاب</span>
                <input
                  type="date"
                  value={form.departDate}
                  onChange={(e) =>
                    setForm({ ...form, departDate: e.target.value })
                  }
                />
                <small>المغادرة</small>
              </label>
              {tripType === "roundtrip" ? (
                <label className="fs-cell">
                  <span>تاريخ العودة</span>
                  <input
                    type="date"
                    value={form.returnDate}
                    onChange={(e) =>
                      setForm({ ...form, returnDate: e.target.value })
                    }
                  />
                  <small>{nights ? `${nights} ليلة` : "العودة"}</small>
                </label>
              ) : (
                <div className="fs-cell fs-cell-empty" />
              )}
              <label className="fs-cell fs-cell-center">
                <span>بالغون</span>
                <input
                  type="number"
                  min={1}
                  value={form.adults}
                  onChange={(e) =>
                    setForm({ ...form, adults: Number(e.target.value) || 1 })
                  }
                />
                <small>مسافر</small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>أطفال</span>
                <input
                  type="number"
                  min={0}
                  value={form.children}
                  onChange={(e) =>
                    setForm({ ...form, children: Number(e.target.value) || 0 })
                  }
                />
                <small>اختياري</small>
              </label>
              <button
                type="button"
                className="flight-explore"
                disabled={loading}
                onClick={createAndSearch}
              >
                {loading ? "..." : "استكشاف"}
              </button>
            </div>
          ) : null}

          {mode === "stays" ? (
            <div className="fs-grid stays">
              <AutocompleteField
                label="الدولة / المدينة / اسم الفندق"
                value={form.stayQuery}
                display={form.stayQuery}
                placeholder="مثال: دبي أو الإمارات أو Hilton"
                onClearText={(text) => setForm((f) => ({ ...f, stayQuery: text }))}
                onQuery={async (q) => {
                  const cities = await searchCities(q);
                  if (cities.length) return cities;
                  return [
                    {
                      id: q,
                      title: q,
                      subtitle: "بحث حر بالاسم",
                      code: q,
                    },
                  ];
                }}
                onPick={(item) =>
                  setForm((f) => ({
                    ...f,
                    stayQuery: item.title,
                    destination: item.code || item.title,
                  }))
                }
              />
              <label className="fs-cell">
                <span>من تاريخ</span>
                <input
                  type="date"
                  value={form.departDate}
                  onChange={(e) =>
                    setForm({ ...form, departDate: e.target.value })
                  }
                />
                <small>تسجيل الوصول</small>
              </label>
              <label className="fs-cell">
                <span>إلى تاريخ</span>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) =>
                    setForm({ ...form, returnDate: e.target.value })
                  }
                />
                <small className="nights-pill">
                  {nights ? `${nights} ليلة` : "اختر المدة"}
                </small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>الغرف</span>
                <select
                  value={form.rooms}
                  onChange={(e) =>
                    setForm({ ...form, rooms: Number(e.target.value) || 1 })
                  }
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <small>غرفة</small>
              </label>
              <div className="fs-cell fs-cell-center guests-cell" ref={guestsRef}>
                <span>المسافرون</span>
                <button
                  type="button"
                  className="guests-trigger"
                  onClick={() => setGuestsOpen((v) => !v)}
                >
                  {form.adults} كبار
                  {form.children > 0 ? ` · ${form.children} أطفال` : ""}
                </button>
                <small>من القائمة</small>
                {guestsOpen ? (
                  <div className="guests-menu">
                    <label>
                      <span>عدد الكبار</span>
                      <select
                        value={form.adults}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            adults: Number(e.target.value) || 1,
                          })
                        }
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>عدد الأطفال</span>
                      <select
                        value={form.children}
                        onChange={(e) => {
                          const children = Number(e.target.value) || 0;
                          const childrenAges = [
                            ...form.childrenAges,
                          ].slice(0, children);
                          while (childrenAges.length < children) childrenAges.push(6);
                          setForm({ ...form, children, childrenAges });
                        }}
                      >
                        {Array.from({ length: 9 }, (_, i) => i).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    {form.children > 0
                      ? Array.from({ length: form.children }, (_, i) => (
                          <label key={i}>
                            <span>عمر الطفل {i + 1}</span>
                            <select
                              value={form.childrenAges[i] ?? 6}
                              onChange={(e) => {
                                const childrenAges = [...form.childrenAges];
                                while (childrenAges.length < form.children) {
                                  childrenAges.push(6);
                                }
                                childrenAges[i] = Number(e.target.value) || 6;
                                setForm({ ...form, childrenAges });
                              }}
                            >
                              {Array.from({ length: 18 }, (_, age) => (
                                <option key={age} value={age}>
                                  {age} سنة
                                </option>
                              ))}
                            </select>
                          </label>
                        ))
                      : null}
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setGuestsOpen(false)}
                    >
                      تم
                    </button>
                  </div>
                ) : null}
              </div>
              <label className="fs-cell fs-cell-center">
                <span>تواريخ مرنة</span>
                <button
                  type="button"
                  className={`guests-trigger${form.shiftDays ? " on" : ""}`}
                  onClick={() => setForm({ ...form, shiftDays: !form.shiftDays })}
                >
                  {form.shiftDays ? "±1 يوم مفعّل" : "التواريخ كما هي"}
                </button>
                <small>± يوم واحد</small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>سعر من</span>
                <input
                  type="number"
                  min={0}
                  value={form.minRate}
                  onChange={(e) => setForm({ ...form, minRate: e.target.value })}
                  placeholder="—"
                />
                <small>اختياري</small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>سعر إلى</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxRate}
                  onChange={(e) => setForm({ ...form, maxRate: e.target.value })}
                  placeholder="—"
                />
                <small>يُرسل لـ Hotelbeds</small>
              </label>
              <button
                type="button"
                className="flight-explore"
                disabled={loading}
                onClick={createAndSearch}
              >
                {loading ? "..." : "استكشاف"}
              </button>
            </div>
          ) : null}

          {mode === "cars" ? (
            <div className="fs-grid cars transfer-search-grid">
              <AutocompleteField
                label="المدينة / الوجهة"
                value={form.transferCity}
                display={form.transferCityLabel}
                placeholder="مثال: الكويت أو دبي"
                onClearText={(text) =>
                  setForm((f) => ({
                    ...f,
                    transferCity: text,
                    transferCityLabel: text,
                  }))
                }
                onQuery={searchCities}
                onPick={(item) => {
                  const iata = String(item.code || "").toUpperCase();
                  setForm((f) => ({
                    ...f,
                    transferCity: item.title,
                    transferCityLabel: item.title,
                    ...(f.pickupKind === "airport" && iata
                      ? {
                          pickupLocation: iata,
                          pickupLocationLabel: item.code
                            ? `${iata} · ${item.title}`
                            : item.title,
                        }
                      : {}),
                    ...(f.dropoffKind === "address"
                      ? {
                          dropoffLocation: item.title,
                          dropoffLocationLabel: item.title,
                        }
                      : {}),
                  }));
                }}
              />
              <label className="fs-cell">
                <span>نوع الاستلام</span>
                <select
                  value={form.pickupKind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pickupKind: e.target.value as TransferPointKind,
                    })
                  }
                >
                  {TRANSFER_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small>
                  {TRANSFER_KIND_OPTIONS.find((o) => o.value === form.pickupKind)?.hint}
                </small>
              </label>
              {form.pickupKind === "airport" ? (
                <AutocompleteField
                  label="مكان الاستلام"
                  value={form.pickupLocation}
                  display={form.pickupLocationLabel}
                  placeholder="KWI أو اسم المطار"
                  onClearText={(text) =>
                    setForm((f) => ({
                      ...f,
                      pickupLocation: text.toUpperCase(),
                      pickupLocationLabel: text,
                    }))
                  }
                  onQuery={searchAirports}
                  onPick={(item) =>
                    setForm((f) => ({
                      ...f,
                      pickupLocation: String(item.code || item.id).toUpperCase(),
                      pickupLocationLabel: item.title,
                    }))
                  }
                />
              ) : (
                <label className="fs-cell">
                  <span>مكان الاستلام</span>
                  <input
                    value={form.pickupLocation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pickupLocation: e.target.value,
                        pickupLocationLabel: e.target.value,
                      })
                    }
                    placeholder={
                      form.pickupKind === "hotel"
                        ? "اسم الفندق"
                        : "الحي أو العنوان"
                    }
                  />
                  <small>
                    {form.pickupKind === "hotel"
                      ? "يُحوَّل إلى ATLAS عبر بحث الفنادق"
                      : "GPS داخل المدينة"}
                  </small>
                </label>
              )}
              <label className="fs-cell">
                <span>نوع التسليم</span>
                <select
                  value={form.dropoffKind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dropoffKind: e.target.value as TransferPointKind,
                    })
                  }
                >
                  {TRANSFER_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small>
                  {TRANSFER_KIND_OPTIONS.find((o) => o.value === form.dropoffKind)?.hint}
                </small>
              </label>
              {form.dropoffKind === "airport" ? (
                <AutocompleteField
                  label="مكان التسليم"
                  value={form.dropoffLocation}
                  display={form.dropoffLocationLabel}
                  placeholder="DXB أو اسم المطار"
                  onClearText={(text) =>
                    setForm((f) => ({
                      ...f,
                      dropoffLocation: text.toUpperCase(),
                      dropoffLocationLabel: text,
                    }))
                  }
                  onQuery={searchAirports}
                  onPick={(item) =>
                    setForm((f) => ({
                      ...f,
                      dropoffLocation: String(item.code || item.id).toUpperCase(),
                      dropoffLocationLabel: item.title,
                    }))
                  }
                />
              ) : (
                <label className="fs-cell">
                  <span>مكان التسليم</span>
                  <input
                    value={form.dropoffLocation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dropoffLocation: e.target.value,
                        dropoffLocationLabel: e.target.value,
                      })
                    }
                    placeholder={
                      form.dropoffKind === "hotel"
                        ? "اسم الفندق"
                        : "الحي أو العنوان"
                    }
                  />
                  <small>
                    {form.dropoffKind === "hotel"
                      ? "يُحوَّل إلى ATLAS عبر بحث الفنادق"
                      : "GPS داخل المدينة"}
                  </small>
                </label>
              )}
              <label className="fs-cell">
                <span>الذهاب</span>
                <input
                  type="date"
                  value={form.departDate}
                  onChange={(e) =>
                    setForm({ ...form, departDate: e.target.value })
                  }
                />
                <small>تاريخ الوصول</small>
              </label>
              <label className="fs-cell">
                <span>وقت الذهاب</span>
                <input
                  type="time"
                  value={form.pickupTime}
                  onChange={(e) =>
                    setForm({ ...form, pickupTime: e.target.value })
                  }
                />
                <small>الاستلام</small>
              </label>
              <label className="fs-cell">
                <span>العودة</span>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) =>
                    setForm({ ...form, returnDate: e.target.value })
                  }
                />
                <small>اختياري</small>
              </label>
              <label className="fs-cell">
                <span>وقت العودة</span>
                <input
                  type="time"
                  value={form.dropoffTime}
                  onChange={(e) =>
                    setForm({ ...form, dropoffTime: e.target.value })
                  }
                />
                <small>التسليم</small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>بالغون</span>
                <input
                  type="number"
                  min={1}
                  value={form.adults}
                  onChange={(e) =>
                    setForm({ ...form, adults: Number(e.target.value) || 1 })
                  }
                />
                <small>ركاب</small>
              </label>
              <label className="fs-cell fs-cell-center">
                <span>أطفال</span>
                <input
                  type="number"
                  min={0}
                  value={form.children}
                  onChange={(e) =>
                    setForm({ ...form, children: Number(e.target.value) || 0 })
                  }
                />
                <small>3–12 سنة</small>
              </label>
              <button
                type="button"
                className="flight-explore"
                disabled={loading}
                onClick={createAndSearch}
              >
                {loading ? "..." : "استكشاف"}
              </button>
            </div>
          ) : null}
        </div>

        {message ? <p className="flight-status">{message}</p> : null}
        {providerBadge ? (
          <p className="flight-status soft">{providerBadge}</p>
        ) : null}
        {error ? <p className="flight-status error">{error}</p> : null}
      </section>

      {search ? (
        <div className="results-layout">
          <div className="results-main">
            {mode === "flights" ? (
              <>
                <div className="ticket-head">
                  <h3>وجدنا {filteredFlights.length} خيار رحلة</h3>
                  <div className="results-sort ticket-sort">
                    <button
                      type="button"
                      className={sortKey === "best" ? "on" : undefined}
                      onClick={() => setSortKey("best")}
                    >
                      الأفضل
                    </button>
                    <button
                      type="button"
                      className={sortKey === "price_asc" ? "on" : undefined}
                      onClick={() => setSortKey("price_asc")}
                    >
                      الأرخص
                    </button>
                    <button
                      type="button"
                      className={
                        sortKey === "cheapest_direct" ? "on" : undefined
                      }
                      onClick={() => setSortKey("cheapest_direct")}
                    >
                      أرخص مباشر
                    </button>
                    <button
                      type="button"
                      className={sortKey === "duration_asc" ? "on" : undefined}
                      onClick={() => setSortKey("duration_asc")}
                    >
                      الأسرع
                    </button>
                  </div>
                </div>

                <div className="ticket-list">
                  {filteredFlights.map((f) => {
                    const segs = (Array.isArray(f.details.segments)
                      ? f.details.segments
                      : []) as FlightSeg[];
                    const returnSegs = (Array.isArray(f.details.returnSegments)
                      ? f.details.returnSegments
                      : []) as FlightSeg[];
                    const first = segs[0];
                    const last = segs[segs.length - 1];
                    const retFirst = returnSegs[0];
                    const retLast = returnSegs[returnSegs.length - 1];
                    const stops = Number(f.details.stops || 0);
                    const returnStops = Math.max(0, returnSegs.length - 1);
                    const code = String(f.details.airlineCode || "");
                    const logo = airlineLogo(code);
                    const duration = String(f.details.duration || "—");
                    const returnDurationMins = layoverMinutes(
                      retFirst?.departAt || retFirst?.departTime,
                      retLast?.arriveAt || retLast?.arriveTime,
                    );
                    const returnDuration =
                      String(f.details.returnDuration || "") ||
                      (returnDurationMins != null
                        ? formatMinutesLabel(returnDurationMins)
                        : returnSegs.length
                          ? "—"
                          : "");
                    const isFlexible = Boolean(f.details.flexible);
                    const hasReturn = returnSegs.length > 0;
                    const dep =
                      formatClock(
                        first?.departAt ||
                          first?.departTime ||
                          String(f.details.departAt || ""),
                      );
                    const arr =
                      formatClock(
                        last?.arriveAt ||
                          last?.arriveTime ||
                          String(f.details.arriveAt || ""),
                      );
                    const depDay = formatDay(
                      first?.departAt ||
                        first?.date ||
                        form.departDate ||
                        String(f.details.departAt || ""),
                    );
                    const arrDay = formatDay(
                      last?.arriveAt ||
                        last?.date ||
                        form.departDate ||
                        String(f.details.arriveAt || ""),
                    );
                    const from = String(
                      first?.from || f.details.from || form.origin,
                    );
                    const to = String(
                      last?.to || f.details.to || form.destination,
                    );
                    const retDep = formatClock(
                      retFirst?.departAt || retFirst?.departTime || "",
                    );
                    const retArr = formatClock(
                      retLast?.arriveAt || retLast?.arriveTime || "",
                    );
                    const retDepDay = formatDay(
                      retFirst?.departAt ||
                        retFirst?.date ||
                        form.returnDate ||
                        "",
                    );
                    const retArrDay = formatDay(
                      retLast?.arriveAt ||
                        retLast?.date ||
                        form.returnDate ||
                        "",
                    );
                    const retFrom = String(
                      retFirst?.from || to || form.destination,
                    );
                    const retTo = String(retLast?.to || from || form.origin);
                    return (
                      <article key={f.id} className="ticket-card">
                        <div className="ticket-body">
                          <div className="ticket-legs">
                            <div className="ticket-leg">
                              <div className="ticket-carrier">
                                {logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={logo} alt={code} />
                                ) : (
                                  <div className="ticket-logo-fallback">
                                    {code || "✈"}
                                  </div>
                                )}
                                {hasReturn ? (
                                  <span className="ticket-leg-label">الذهاب</span>
                                ) : null}
                              </div>

                              <div className="ticket-time">
                                <strong>{dep}</strong>
                                <span>
                                  {from}
                                  {depDay ? ` · ${depDay}` : ""}
                                </span>
                              </div>

                              <div className="ticket-path">
                                <div className="ticket-path-line">
                                  <i className="ticket-path-bar" />
                                </div>
                                <div className="ticket-meta">
                                  <span
                                    className={`ticket-meta-stops${stops === 0 ? " direct" : ""}`}
                                  >
                                    {stopsLabel(stops)}
                                  </span>
                                  <span className="ticket-meta-duration">{duration}</span>
                                </div>
                              </div>

                              <div className="ticket-time end">
                                <strong>{arr}</strong>
                                <span>
                                  {to}
                                  {arrDay ? ` · ${arrDay}` : ""}
                                </span>
                              </div>
                            </div>

                            {hasReturn ? (
                              <div className="ticket-leg ticket-leg-return">
                                <div className="ticket-carrier">
                                  {logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logo} alt={code} />
                                  ) : (
                                    <div className="ticket-logo-fallback">
                                      {code || "✈"}
                                    </div>
                                  )}
                                  <span className="ticket-leg-label return">العودة</span>
                                </div>

                                <div className="ticket-time">
                                  <strong>{retDep}</strong>
                                  <span>
                                    {retFrom}
                                    {retDepDay ? ` · ${retDepDay}` : ""}
                                  </span>
                                </div>

                                <div className="ticket-path">
                                  <div className="ticket-path-line">
                                    <i className="ticket-path-bar" />
                                  </div>
                                  <div className="ticket-meta">
                                    <span
                                      className={`ticket-meta-stops${returnStops === 0 ? " direct" : ""}`}
                                    >
                                      {stopsLabel(returnStops)}
                                    </span>
                                    <span className="ticket-meta-duration">
                                      {returnDuration || "—"}
                                    </span>
                                  </div>
                                </div>

                                <div className="ticket-time end">
                                  <strong>{retArr}</strong>
                                  <span>
                                    {retTo}
                                    {retArrDay ? ` · ${retArrDay}` : ""}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="ticket-footer-row">
                            <div className="ticket-airline-name">
                              {String(f.details.airline || "شركة طيران")}
                              {code ? ` (${code})` : ""}
                              {hasReturn ? " · ذهاب وعودة" : ""}
                            </div>
                            {isFlexible ? (
                              <span className="ticket-badge flexible">تذكرة مرنة</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="ticket-side">
                          <div className="ticket-bags">
                            <span>✓ حقيبة يد</span>
                            <span>✓ وزن مسجّل*</span>
                          </div>
                          <strong className="ticket-price">
                            {formatMoneyMinorCompact(f.sellAmountMinor, f.currency)}
                          </strong>
                          <small className="ticket-price-note">
                            يشمل الضرائب والرسوم
                            {f.pricingRuleName
                              ? ` · ${f.pricingRuleName}`
                              : ""}
                          </small>
                          <button
                            type="button"
                            className="ticket-details-btn"
                            onClick={() => setDetailFlightId(f.id)}
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {filteredFlights.length === 0 ? (
                    <div className="ticket-empty-state">
                      <strong>لا توجد رحلات مطابقة للفلاتر الحالية</strong>
                      <p>
                        {flightFiltersActive
                          ? "جرّب إزالة بعض الفلاتر أو توسيع نطاق السعر والمدة."
                          : "لا توجد نتائج متاحة لهذا البحث. غيّر التواريخ أو المسار وحاول مرة أخرى."}
                      </p>
                      {flightFiltersActive ? (
                        <button
                          type="button"
                          className="ticket-empty-reset"
                          onClick={() => {
                            setFilters(defaultFlightFilters);
                            setForm((f) => ({ ...f, directOnly: false }));
                          }}
                        >
                          إعادة ضبط الفلاتر
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : mode === "cars" ? (
              <div className="results-sort">
                <button
                  type="button"
                  className={sortKey === "price_asc" ? "on" : undefined}
                  onClick={() => setSortKey("price_asc")}
                >
                  الأقل سعرًا
                </button>
                <button
                  type="button"
                  className={sortKey === "price_desc" ? "on" : undefined}
                  onClick={() => setSortKey("price_desc")}
                >
                  الأعلى سعرًا
                </button>
              </div>
            ) : null}

            {mode === "stays" ? (
              <div className="panel hotel-results-panel">
                <div className="hotel-results-head">
                  <h3>
                    {form.stayQuery || "الإقامات"}:{" "}
                    {filteredHotels.length} عقارًا موجودًا
                  </h3>
                  {search?.hotels?.[0] ? (
                    <HotelLiveBadge
                      liveMode={Boolean(
                        search.liveMode || search.hotels[0].details.liveMode,
                      )}
                      sourceLabel={
                        typeof search.hotels[0].details.sourceLabel === "string"
                          ? search.hotels[0].details.sourceLabel
                          : search.hotelProviderName || search.providerName
                      }
                      fetchedAt={
                        typeof search.hotels[0].details.fetchedAt === "string"
                          ? search.hotels[0].details.fetchedAt
                          : undefined
                      }
                      expiresAt={search.hotels[0].expiresAt}
                    />
                  ) : null}
                  <div className="results-sort">
                    <button
                      type="button"
                      className={sortKey === "price_asc" ? "on" : undefined}
                      onClick={() => setSortKey("price_asc")}
                    >
                      الأقل سعرًا
                    </button>
                    <button
                      type="button"
                      className={sortKey === "rating_desc" ? "on" : undefined}
                      onClick={() => setSortKey("rating_desc")}
                    >
                      الأعلى تقييمًا
                    </button>
                    <button
                      type="button"
                      className={sortKey === "price_desc" ? "on" : undefined}
                      onClick={() => setSortKey("price_desc")}
                    >
                      الأعلى سعرًا
                    </button>
                  </div>
                </div>
                <div className="hotel-search-list">
                  {filteredHotels.map((h) => (
                    <HotelSearchCard
                      key={h.id}
                      hotel={h}
                      nights={Number(h.details.nights || 0) || nights}
                      onOpen={() => openHotelDetail(h.id)}
                    />
                  ))}
                  {filteredHotels.length === 0 ? (
                    <p className="hint">
                      لا توجد فنادق مطابقة للفلاتر الحالية.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {mode === "cars" ? (
              <div className="panel hotel-results-panel">
                <div className="hotel-results-head">
                  <h3>نقل: {carResults.length} خياراً</h3>
                  {search ? (
                    <HotelLiveBadge
                      liveMode={Boolean(search.liveMode)}
                      sourceLabel={search.providerName}
                    />
                  ) : null}
                </div>
                <div className="hotel-search-list">
                  {carResults.map((c) => (
                    <TransferSearchCard
                      key={c.id}
                      item={c}
                      from={form.pickupLocationLabel || form.pickupLocation}
                      to={form.dropoffLocationLabel || form.dropoffLocation}
                      onBook={() => confirmTransferBooking(c)}
                    />
                  ))}
                  {carResults.length === 0 ? (
                    <p className="hint">
                      لا توجد رحلات نقل مطابقة. جرّب مدينة + مطار → عنوان، مثل الكويت + KWI → حي السالمية.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="results-filters ticket-filters">
            <h3>تصفية النتائج</h3>
            {mode === "flights" ? (
              <>
                <div className="filter-block">
                  <strong>التوقفات</strong>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="stops"
                      checked={filters.stops === "any"}
                      onChange={() => setFilters({ ...filters, stops: "any" })}
                    />
                    <span>الكل ({stopCounts.any})</span>
                    <em>
                      {stopCounts.minAny < Number.MAX_SAFE_INTEGER
                        ? `من ${formatMoneyMinor(stopCounts.minAny, stopCounts.currency)}`
                        : ""}
                    </em>
                  </label>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="stops"
                      checked={filters.stops === "0"}
                      onChange={() => setFilters({ ...filters, stops: "0" })}
                    />
                    <span>مباشر فقط ({stopCounts.direct})</span>
                    <em>
                      {stopCounts.direct
                        ? `من ${formatMoneyMinor(stopCounts.minDirect, stopCounts.currency)}`
                        : ""}
                    </em>
                  </label>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="stops"
                      checked={filters.stops === "1"}
                      onChange={() => setFilters({ ...filters, stops: "1" })}
                    />
                    <span>توقف واحد كحد أقصى ({stopCounts.one})</span>
                    <em>
                      {stopCounts.one
                        ? `من ${formatMoneyMinor(stopCounts.minOne, stopCounts.currency)}`
                        : ""}
                    </em>
                  </label>
                </div>

                {departureTimeFacets.total > 0 ? (
                  <div className="filter-block">
                    <strong>وقت المغادرة</strong>
                    {DEPARTURE_BUCKETS.map((bucket) => {
                      const checked = filters.departureTimes.includes(bucket.key);
                      const count = departureTimeFacets.counts[bucket.key];
                      return (
                        <label key={bucket.key} className="filter-check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setFilters((prev) => ({
                                ...prev,
                                departureTimes: checked
                                  ? prev.departureTimes.filter((k) => k !== bucket.key)
                                  : [...prev.departureTimes, bucket.key],
                              }))
                            }
                          />
                          <span>
                            {bucket.label} ({count})
                          </span>
                          <em>{bucket.hint}</em>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                <div className="filter-block">
                  <strong>شركات الطيران</strong>
                  {flightAirlineFacets.map((a) => {
                    const checked = filters.airlines.includes(a.code);
                    return (
                      <label key={a.code} className="filter-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFilters((prev) => ({
                              ...prev,
                              airlines: checked
                                ? prev.airlines.filter((c) => c !== a.code)
                                : [...prev.airlines, a.code],
                            }))
                          }
                        />
                        <span>
                          {a.name} ({a.count})
                        </span>
                        <em>
                          من {formatMoneyMinor(a.minPrice, a.currency)}
                        </em>
                      </label>
                    );
                  })}
                </div>

                <div className="filter-block">
                  <strong>المدة القصوى (ساعات)</strong>
                  <input
                    type="range"
                    min={2}
                    max={24}
                    value={filters.maxDurationHours || 24}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxDurationHours: e.target.value,
                      })
                    }
                  />
                  <small>
                    حتى {filters.maxDurationHours || 24} ساعة
                  </small>
                </div>

                <div className="filter-block">
                  <strong>أعلى سعر</strong>
                  <input
                    type="number"
                    min={0}
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                    placeholder="مثال: 2500"
                  />
                </div>
              </>
            ) : mode === "stays" ? (
              <>
                <div className="filter-block">
                  <strong>ابحث في النتائج</strong>
                  <input
                    type="search"
                    value={filters.hotelQuery}
                    onChange={(e) =>
                      setFilters({ ...filters, hotelQuery: e.target.value })
                    }
                    placeholder="ماذا تبحث عنه؟"
                  />
                </div>

                <div className="filter-block">
                  <strong>الوجبات</strong>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={filters.breakfast}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          breakfast: e.target.checked,
                        })
                      }
                    />
                    <span>يشمل الإفطار</span>
                  </label>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="boardCode"
                      checked={!filters.boardCode}
                      onChange={() =>
                        setFilters({ ...filters, boardCode: "", board: "" })
                      }
                    />
                    <span>كل أنواع الوجبات</span>
                  </label>
                  {hotelFacets.boardCodes.map((code) => (
                    <label key={code} className="filter-radio">
                      <input
                        type="radio"
                        name="boardCode"
                        checked={filters.boardCode === code}
                        onChange={() =>
                          setFilters({
                            ...filters,
                            boardCode: code,
                            board: BOARD_LABELS_AR[code] || code,
                          })
                        }
                      />
                      <span>{BOARD_LABELS_AR[code] || code}</span>
                    </label>
                  ))}
                </div>

                {hotelFacets.zones.length ? (
                  <div className="filter-block">
                    <strong>المنطقة</strong>
                    <label className="filter-radio">
                      <input
                        type="radio"
                        name="hotelZone"
                        checked={!filters.zone}
                        onChange={() => setFilters({ ...filters, zone: "" })}
                      />
                      <span>الكل</span>
                    </label>
                    {hotelFacets.zones.slice(0, 8).map((z) => (
                      <label key={z} className="filter-radio">
                        <input
                          type="radio"
                          name="hotelZone"
                          checked={filters.zone === z}
                          onChange={() => setFilters({ ...filters, zone: z })}
                        />
                        <span>{z}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {hotelFacets.paymentTypes.length ? (
                  <div className="filter-block">
                    <strong>طريقة الدفع</strong>
                    <label className="filter-radio">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={!filters.paymentType}
                        onChange={() =>
                          setFilters({ ...filters, paymentType: "" })
                        }
                      />
                      <span>الكل</span>
                    </label>
                    {hotelFacets.paymentTypes.map((p) => (
                      <label key={p} className="filter-radio">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={filters.paymentType === p}
                          onChange={() =>
                            setFilters({ ...filters, paymentType: p })
                          }
                        />
                        <span>
                          {p === "AT_HOTEL" ? "في الفندق" : "أونلاين"}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="filter-block">
                  <strong>نوع التعرفة</strong>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={filters.bookableOnly}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          bookableOnly: e.target.checked,
                        })
                      }
                    />
                    <span>BOOKABLE فقط (بدون إعادة تحقق)</span>
                  </label>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={filters.refundableOnly}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          refundableOnly: e.target.checked,
                        })
                      }
                    />
                    <span>إلغاء مجاني متاح</span>
                  </label>
                </div>

                <div className="filter-block">
                  <strong>نوع العقار</strong>
                  {[
                    { id: "hotel", label: "فنادق" },
                    { id: "apartment", label: "شقق" },
                    { id: "resort", label: "منتجعات" },
                  ].map((p) => {
                    const checked = filters.propertyTypes.includes(p.id);
                    return (
                      <label key={p.id} className="filter-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFilters((prev) => ({
                              ...prev,
                              propertyTypes: checked
                                ? prev.propertyTypes.filter((x) => x !== p.id)
                                : [...prev.propertyTypes, p.id],
                            }))
                          }
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="filter-block">
                  <strong>تقييم العقار</strong>
                  <label className="filter-radio">
                    <input
                      type="radio"
                      name="minStars"
                      checked={filters.minStars === "any"}
                      onChange={() =>
                        setFilters({ ...filters, minStars: "any" })
                      }
                    />
                    <span>الكل</span>
                  </label>
                  {["5", "4", "3"].map((s) => (
                    <label key={s} className="filter-radio">
                      <input
                        type="radio"
                        name="minStars"
                        checked={filters.minStars === s}
                        onChange={() =>
                          setFilters({ ...filters, minStars: s })
                        }
                      />
                      <span>
                        {s === "5" ? "5 نجوم" : `${s} نجوم فأكثر`}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="filter-block">
                  <strong>سياسة الحجز</strong>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={filters.freeCancellation}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          freeCancellation: e.target.checked,
                        })
                      }
                    />
                    <span>إلغاء مجاني</span>
                  </label>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={filters.noPrepayment}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          noPrepayment: e.target.checked,
                        })
                      }
                    />
                    <span>بدون دفع مسبق</span>
                  </label>
                </div>

                <div className="filter-block">
                  <strong>المرافق</strong>
                  {[
                    { id: "wifi", label: "واي فاي مجاني" },
                    { id: "parking", label: "موقف سيارات" },
                    { id: "pool", label: "مسبح" },
                    { id: "spa", label: "سبا" },
                    { id: "gym", label: "نادي رياضي" },
                  ].map((f) => {
                    const checked = filters.facilities.includes(f.id);
                    return (
                      <label key={f.id} className="filter-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFilters((prev) => ({
                              ...prev,
                              facilities: checked
                                ? prev.facilities.filter((x) => x !== f.id)
                                : [...prev.facilities, f.id],
                            }))
                          }
                        />
                        <span>{f.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="filter-block">
                  <strong>درجة التقييم</strong>
                  {[
                    { id: "any", label: "الكل" },
                    { id: "9", label: "ممتاز: 9+" },
                    { id: "8", label: "رائع: 8+" },
                    { id: "7", label: "جيد: 7+" },
                  ].map((r) => (
                    <label key={r.id} className="filter-radio">
                      <input
                        type="radio"
                        name="minReviewScore"
                        checked={filters.minReviewScore === r.id}
                        onChange={() =>
                          setFilters({
                            ...filters,
                            minReviewScore: r.id as "any" | "7" | "8" | "9",
                          })
                        }
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                <div className="filter-block">
                  <strong>أعلى سعر للإقامة</strong>
                  <input
                    type="number"
                    min={0}
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                    placeholder="مثال: 250"
                  />
                </div>
              </>
            ) : (
              <label>
                أعلى سعر
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  placeholder="مثال: 2500"
                />
              </label>
            )}
          </aside>
        </div>
      ) : null}

      <div className="panel">
        <h3>آخر 3 استعلامات</h3>
        <table className="table">
          <thead>
            <tr>
              <th>المسار</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>المصدر</th>
              <th>أُنشئ</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 3).map((row) => (
              <tr key={row.id}>
                <td>
                  {row.origin || "؟"} → {row.destination || "؟"}
                </td>
                <td>{row.departDate?.slice(0, 10) || "—"}</td>
                <td>{row.status}</td>
                <td>{row.source}</td>
                <td>{formatDate(row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>لا توجد استعلامات بعد</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detailFlight ? (
        <div
          className="flight-modal-backdrop"
          onClick={() => setDetailFlightId(null)}
          role="presentation"
        >
          <div
            className="flight-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flight-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const f = detailFlight;
              const segs = (Array.isArray(f.details.segments)
                ? f.details.segments
                : []) as FlightSeg[];
              const first = segs[0];
              const last = segs[segs.length - 1] || first;
              const stops = Number(f.details.stops || 0);
              const code = String(f.details.airlineCode || "");
              const logo = airlineLogo(code);
              const to = String(last?.to || f.details.to || form.destination);
              const from = String(first?.from || f.details.from || form.origin);
              const cabin = String(f.details.cabin || form.cabinClass || "economy");
              const duration = String(f.details.duration || "—");
              const flightNo = String(
                first?.flightNumber || segs.map((s) => s.flightNumber).filter(Boolean).join(" / ") || "—",
              );

              return (
                <>
                  <header className="flight-modal-head">
                    <div>
                      <h2 id="flight-modal-title">رحلتك إلى {to}</h2>
                      <button type="button" className="flight-modal-share">
                        مشاركة هذه الرحلة
                      </button>
                    </div>
                    <button
                      type="button"
                      className="flight-modal-close"
                      aria-label="إغلاق"
                      onClick={() => setDetailFlightId(null)}
                    >
                      ×
                    </button>
                  </header>

                  <section className="flight-modal-section">
                    <h3>
                      الرحلة إلى {to}
                      <span>
                        {stops === 0 ? "مباشر" : `${stops} توقف`} · {duration}
                      </span>
                    </h3>
                    <div className="flight-modal-itinerary">
                      <div className="flight-timeline">
                        {segs.length > 1
                          ? segs.map((seg, idx) => {
                              const segFrom = String(seg.from || (idx === 0 ? from : ""));
                              const segTo = String(
                                seg.to || (idx === segs.length - 1 ? to : ""),
                              );
                              const segDepAt =
                                seg.departAt || seg.departTime || "";
                              const segArrAt =
                                seg.arriveAt || seg.arriveTime || "";
                              const nextSeg = segs[idx + 1];
                              const layover = nextSeg
                                ? layoverMinutes(segArrAt, nextSeg.departAt)
                                : null;
                              return (
                                <div key={idx} className="flight-timeline-segment">
                                  <div className="flight-timeline-point">
                                    <i />
                                    <div>
                                      <strong>
                                        {formatDay(
                                          segDepAt || seg.date || form.departDate,
                                        )}{" "}
                                        · {formatClock(segDepAt)}
                                      </strong>
                                      <p>
                                        {segFrom} · مغادرة
                                        {seg.flightNumber
                                          ? ` · رحلة ${seg.flightNumber}`
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flight-timeline-line" />
                                  <div className="flight-timeline-point">
                                    <i />
                                    <div>
                                      <strong>{formatClock(segArrAt)}</strong>
                                      <p>{segTo} · وصول</p>
                                    </div>
                                  </div>
                                  {nextSeg ? (
                                    <div className="flight-timeline-layover">
                                      توقف في {segTo}
                                      {layover
                                        ? ` · ${formatMinutesLabel(layover)}`
                                        : ""}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          : (
                            <>
                              <div className="flight-timeline-point">
                                <i />
                                <div>
                                  <strong>
                                    {formatDay(
                                      first?.departAt ||
                                        first?.date ||
                                        form.departDate,
                                    )}{" "}
                                    ·{" "}
                                    {formatClock(
                                      first?.departAt ||
                                        first?.departTime ||
                                        String(f.details.departAt || ""),
                                    )}
                                  </strong>
                                  <p>
                                    {from}
                                    {form.originLabel
                                      ? ` · ${form.originLabel}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flight-timeline-line" />
                              <div className="flight-timeline-point">
                                <i />
                                <div>
                                  <strong>
                                    {formatDay(
                                      last?.arriveAt || last?.date || form.departDate,
                                    )}{" "}
                                    ·{" "}
                                    {formatClock(
                                      last?.arriveAt ||
                                        last?.arriveTime ||
                                        String(f.details.arriveAt || ""),
                                    )}
                                  </strong>
                                  <p>
                                    {to}
                                    {form.destinationLabel
                                      ? ` · ${form.destinationLabel}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                      <div className="flight-modal-carrier">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt={code} />
                        ) : (
                          <div className="ticket-logo-fallback">{code || "✈"}</div>
                        )}
                        <strong>{String(f.details.airline || "شركة طيران")}</strong>
                        <span>
                          {flightNo} · الدرجة: {cabinLabel(cabin)}
                        </span>
                        <span>مدة الرحلة {duration}</span>
                      </div>
                    </div>
                  </section>

                  {tripType === "roundtrip" ? (
                    <section className="flight-modal-section">
                      <h3>
                        رحلة العودة إلى {from}
                        <span>حسب تاريخ {form.returnDate}</span>
                      </h3>
                      {Array.isArray(f.details.returnSegments) &&
                      (f.details.returnSegments as unknown[]).length > 0 ? (
                        <ul className="flight-modal-list">
                          {(
                            f.details.returnSegments as Array<{
                              from?: string;
                              to?: string;
                              departTime?: string;
                              arriveTime?: string;
                              flightNumber?: string;
                              airline?: string;
                            }>
                          ).map((seg, i) => (
                            <li key={`ret-${i}`}>
                              <span>
                                {seg.from} → {seg.to} · {seg.flightNumber} ·{" "}
                                {seg.airline}
                              </span>
                              <em>
                                {seg.departTime} → {seg.arriveTime}
                              </em>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="hint" style={{ margin: 0 }}>
                          التاريخ المحدد للعودة: {form.returnDate}.
                        </p>
                      )}
                    </section>
                  ) : null}

                  <section className="flight-modal-section split">
                    <div>
                      <h3>الأمتعة</h3>
                      <p>
                        المشمولة مع تذكرة {cabinLabel(cabin)}
                      </p>
                    </div>
                    <ul className="flight-modal-list">
                      {(() => {
                        const bag = (f.details.baggage || {}) as {
                          personal?: string;
                          cabin?: string;
                          checked?: string;
                        };
                        return (
                          <>
                            <li>
                              <span>{bag.personal || "حقيبة شخصية"}</span>
                              <em>مشمولة</em>
                            </li>
                            <li>
                              <span>
                                {bag.cabin || "حقيبة يد 23×40×55 سم · حتى 7 كجم"}
                              </span>
                              <em>مشمولة</em>
                            </li>
                            <li>
                              <span>
                                {bag.checked || "وزن مسجّل حتى 30 كجم"}
                              </span>
                              <em>مشمولة</em>
                            </li>
                          </>
                        );
                      })()}
                    </ul>
                  </section>

                  <section className="flight-modal-section split">
                    <div>
                      <h3>قواعد الأجرة</h3>
                      <p>معلومات مفيدة عن السياسة</p>
                    </div>
                    <div>
                      {(() => {
                        const policies = (f.details.policies || {}) as {
                          changeable?: boolean;
                          refundable?: boolean;
                          changeFeeKwd?: number | null;
                          cancelFeeKwd?: number | null;
                          noteAr?: string;
                        };
                        const fare = (f.details.fare || {}) as {
                          baseAmountMinor?: number;
                          taxesAmountMinor?: number;
                          currency?: string;
                        };
                        return (
                          <>
                            <p className="flight-modal-fare-note">
                              {policies.noteAr ||
                                `تذكرة قياسية حسب سياسة ${String(f.details.airline || "شركة الطيران")}.`}
                            </p>
                            {typeof fare.taxesAmountMinor === "number" ? (
                              <p className="hint" style={{ margin: "0.35rem 0" }}>
                                الضرائب والرسوم:{" "}
                                {formatMoneyMinor(
                                  fare.taxesAmountMinor,
                                  fare.currency || f.currency,
                                )}
                              </p>
                            ) : null}
                            <ul className="flight-modal-list soft">
                              <li>
                                <span>
                                  {policies.changeable
                                    ? `يمكن تغيير الرحلة${
                                        policies.changeFeeKwd === 0
                                          ? " مجانًا"
                                          : policies.changeFeeKwd
                                            ? ` · رسوم تقريبية ${policies.changeFeeKwd} د.ك`
                                            : " برسوم"
                                      }`
                                    : "لا يمكن تغيير هذه التذكرة"}
                                </span>
                              </li>
                              <li>
                                <span>
                                  {policies.refundable
                                    ? `قابلة للاسترداد${
                                        policies.cancelFeeKwd
                                          ? ` · رسوم إلغاء تقريبية ${policies.cancelFeeKwd} د.ك`
                                          : ""
                                      }`
                                    : policies.cancelFeeKwd
                                      ? `إلغاء برسوم تقريبية ${policies.cancelFeeKwd} د.ك`
                                      : "غير قابلة للاسترداد"}
                                </span>
                              </li>
                              {f.details.scenario &&
                              f.details.scenario !== "normal" ? (
                                <li>
                                  <span>
                                    سيناريو اختبار: {String(f.details.scenario)}
                                  </span>
                                </li>
                              ) : null}
                            </ul>
                          </>
                        );
                      })()}
                    </div>
                  </section>

                  <section className="flight-modal-section split">
                    <div>
                      <h3>إضافات قد تعجبك</h3>
                      <p>يمكن إضافتها مقابل رسوم</p>
                    </div>
                    <ul className="flight-modal-list soft">
                      <li>
                        <span>
                          تذكرة مرنة — إمكانية تغيير التاريخ (+ رسوم إضافية)
                        </span>
                        <em>متاح لاحقًا</em>
                      </li>
                    </ul>
                  </section>

                  <footer className="flight-modal-foot">
                    <strong>
                      {formatMoneyMinor(f.sellAmountMinor, f.currency)}
                    </strong>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        saveFlightDraft({
                          flight: {
                            id: f.id,
                            description: f.description,
                            sellAmountMinor: f.sellAmountMinor,
                            currency: f.currency,
                            details: f.details,
                          },
                          origin: form.origin,
                          destination: form.destination,
                          originLabel: form.originLabel,
                          destinationLabel: form.destinationLabel,
                          departDate: form.departDate,
                          returnDate:
                            tripType === "roundtrip"
                              ? form.returnDate
                              : undefined,
                          tripType,
                          adults: form.adults,
                          children: form.children,
                          cabinClass: form.cabinClass,
                          createdAt: new Date().toISOString(),
                          inquiryId: currentInquiryId || undefined,
                          quoteId: search?.quote?.id,
                          quoteItemId: resolveQuoteItemId(f.id, "flight"),
                        });
                        setDetailFlightId(null);
                        router.push("/dashboard/inquiries/book");
                      }}
                    >
                      متابعة
                    </button>
                  </footer>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {detailHotel ? (
        <HotelDetailModal
          hotel={detailHotel}
          nights={Number(detailHotel.details.nights || 0) || nights}
          meta={{
            stayQuery: form.stayQuery,
            departDate: form.departDate,
            returnDate: form.returnDate,
            rooms: form.rooms,
            adults: form.adults,
            children: form.children,
          }}
          onClose={() => setDetailHotelId(null)}
          onEnterGuestData={confirmHotelBooking}
        />
      ) : null}

    </AppShell>
  );
}
