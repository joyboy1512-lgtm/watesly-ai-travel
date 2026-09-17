"use client";

import "../../hotel-rich.css";
import "../../shop.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DashDateCell, DashPortalMenu, todayIsoDate } from "@/components/dashboard/DashDateCell";
import { HotelDetailModal } from "@/components/hotels/HotelDetailModal";
import { HotelLiveBadge } from "@/components/hotels/HotelLiveBadge";
import { TransferSearchCard } from "@/components/hotels/TransferSearchCard";
import { ActivitySearchCard } from "@/components/hotels/ActivitySearchCard";
import { ShopFlightResults } from "@/components/shop/ShopFlightResults";
import { ShopHotelResults } from "@/components/shop/ShopHotelResults";
import { ShopI18nProvider } from "@/components/shop/ShopI18nProvider";
import { apiFetch } from "@/lib/api";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { saveFlightDraft, saveHotelDraft, saveTransferDraft, saveActivityDraft } from "@/lib/booking-draft";
import { getPreferredCurrency } from "@/lib/currency";
import { formatDate, formatMoneyMinor } from "@/lib/format";
import {
  collectFlightFacets,
  defaultFlightFilters as shopDefaultFlightFilters,
  filterAndSortFlights,
  type FlightOfferRow,
  type FlightSearchFilters,
  type FlightSortKey,
} from "@/lib/flight-search";
import {
  collectFilterFacets,
  defaultHotelFilters,
  filterHotelOffers,
  rateDisplayMinor,
  type HotelRateOption,
  type HotelSearchFilters,
} from "@/lib/hotel-search";
import { saveHotelSearchSession } from "@/lib/hotel-search-session";

type TransferPointKind = "airport" | "hotel" | "address";

type CarSeatFilter = "" | "2-4" | "5" | "6+";
type CarAddon = "extra_driver" | "child_seat" | "infant_seat" | "booster";

type CarQuickFilters = {
  seats: CarSeatFilter;
  addons: CarAddon[];
  automaticOnly: boolean;
  unlimitedKm: boolean;
};

const EMPTY_CAR_QUICK_FILTERS: CarQuickFilters = {
  seats: "",
  addons: [],
  automaticOnly: false,
  unlimitedKm: false,
};

const CAR_SEAT_OPTIONS: Array<{ value: Exclude<CarSeatFilter, "">; label: string }> = [
  { value: "2-4", label: "مقعدان إلى 4 مقاعد" },
  { value: "5", label: "5 مقاعد" },
  { value: "6+", label: "6 مقاعد أو أكثر" },
];

const CAR_ADDON_OPTIONS: Array<{ value: CarAddon; label: string }> = [
  { value: "extra_driver", label: "سائق إضافي" },
  { value: "child_seat", label: "مقعد أطفال" },
  { value: "infant_seat", label: "مقعد للرضع" },
  { value: "booster", label: "مقعد سيارة داعم للأطفال" },
];

function carQuickFiltersCount(filters: CarQuickFilters) {
  return (
    (filters.seats ? 1 : 0) +
    filters.addons.length +
    Number(filters.automaticOnly) +
    Number(filters.unlimitedKm)
  );
}

function placeKindFromSuggest(item: { id: string; subtitle?: string }): TransferPointKind {
  if (item.id.startsWith("airport:") || String(item.subtitle || "").startsWith("مطار")) {
    return "airport";
  }
  if (item.id.startsWith("hotel:") || String(item.subtitle || "").startsWith("فندق")) {
    return "hotel";
  }
  return "address";
}

function matchesCarSeatFilter(maxPax: number | null, seats: CarSeatFilter) {
  if (!seats || maxPax == null || !Number.isFinite(maxPax)) return true;
  if (seats === "2-4") return maxPax >= 2 && maxPax <= 4;
  if (seats === "5") return maxPax >= 5 && maxPax < 6;
  if (seats === "6+") return maxPax >= 6;
  return true;
}

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
  hint,
  emptyHint,
  loadingHint,
  emptyListHint,
  onQuery,
  onPick,
  onClearText,
}: {
  label: string;
  value: string;
  display: string;
  placeholder: string;
  hint?: string;
  emptyHint?: string;
  loadingHint?: string;
  emptyListHint?: string;
  onQuery: (q: string) => Promise<Array<{ id: string; title: string; subtitle?: string; code?: string }>>;
  onPick: (item: { id: string; title: string; subtitle?: string; code?: string }) => void;
  onClearText: (text: string) => void;
}) {
  const i18n = useDashI18n();
  const en = i18n.lang === "en";
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
      <small>
        {value
          ? hint || (en ? `Airport code: ${value}` : `رمز المطار: ${value}`)
          : emptyHint || (en ? "Pick from the list" : "اختر من القائمة")}
      </small>
      <DashPortalMenu
        open={open}
        anchorRef={boxRef}
        onClose={() => setOpen(false)}
        className="fs-suggest fs-suggest-portal"
      >
        {loading ? (
          <div className="fs-suggest-loading">
            {loadingHint || (en ? "Searching airports…" : "جاري البحث عن المطارات…")}
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <div className="fs-suggest-empty">
            {emptyListHint ||
              (en
                ? "No matching airports — try a city name or IATA code"
                : "لا توجد مطارات مطابقة — جرّب اسم المدينة أو رمز IATA")}
          </div>
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
      </DashPortalMenu>
    </label>
  );
}

function PassengerCountRow({
  adults,
  childrenCount,
  infants,
  onAdults,
  onChildren,
  onInfants,
}: {
  adults: number;
  childrenCount: number;
  infants: number;
  onAdults: (n: number) => void;
  onChildren: (n: number) => void;
  onInfants: (n: number) => void;
}) {
  return (
    <div className="guests-inline-row">
      <label className="guests-inline">
        <span>بالغ</span>
        <input
          type="number"
          min={1}
          max={9}
          value={adults}
          onChange={(e) => onAdults(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      <label className="guests-inline">
        <span>طفل</span>
        <input
          type="number"
          min={0}
          max={8}
          value={childrenCount}
          onChange={(e) => onChildren(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <label className="guests-inline">
        <span>رضيع</span>
        <input
          type="number"
          min={0}
          max={adults}
          value={infants}
          onChange={(e) =>
            onInfants(Math.min(Math.max(0, Number(e.target.value) || 0), adults))
          }
        />
      </label>
    </div>
  );
}

export default function InquiriesPage() {
  const router = useRouter();
  const i18n = useDashI18n();
  const en = i18n.lang === "en";
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [mode, setMode] = useState<"flights" | "stays" | "cars" | "activities">(
    "flights",
  );
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
    infants: 0,
    rooms: 1,
    cabinClass: "economy",
    directOnly: false,
    preferredAirline: "",
    preferredAirlineName: "",
    stayQuery: "دبي",
    activityQuery: "دبي",
    transferCity: "الكويت",
    transferCityLabel: "الكويت",
    pickupKind: "airport" as TransferPointKind,
    dropoffKind: "address" as TransferPointKind,
    pickupLocation: "KWI",
    pickupLocationLabel: "KWI · الكويت",
    dropoffLocation: "الكويت",
    dropoffLocationLabel: "الكويت",
    pickupTime: "10:00",
    dropoffTime: "10:00",
    differentDropoff: true,
    transferRoundtrip: false,
    driverAgeStandard: true,
    driverAge: 30,
    childrenAges: [] as number[],
    shiftDays: false,
    minRate: "",
    maxRate: "",
  });
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  const [quickFiltersOpen, setQuickFiltersOpen] = useState(false);
  const [carFilters, setCarFilters] = useState<CarQuickFilters>(
    EMPTY_CAR_QUICK_FILTERS,
  );
  const [carFiltersDraft, setCarFiltersDraft] = useState<CarQuickFilters>(
    EMPTY_CAR_QUICK_FILTERS,
  );
  const [carResults, setCarResults] = useState<AncillaryResult[]>([]);
  const [activityResults, setActivityResults] = useState<AncillaryResult[]>([]);
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
  const [shopFlightFilters, setShopFlightFilters] = useState<FlightSearchFilters>(
    shopDefaultFlightFilters(),
  );
  const [shopFlightSort, setShopFlightSort] = useState<FlightSortKey>("best");

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

  const nights = nightsBetween(form.departDate, form.returnDate);

  const filteredCarResults = useMemo(() => {
    return carResults.filter((item) => {
      const extra = item.extra || {};
      const maxPax =
        extra.maxPax != null && Number.isFinite(Number(extra.maxPax))
          ? Number(extra.maxPax)
          : null;
      if (!matchesCarSeatFilter(maxPax, carFilters.seats)) return false;
      const hay = `${item.name} ${item.details} ${extra.vehicleName || ""} ${extra.categoryName || ""}`.toLowerCase();
      if (carFilters.automaticOnly) {
        const mentionsManual = /manual|يدوي|مانيوال/.test(hay);
        const mentionsAuto = /auto|أوتو|اتومات|automatic/.test(hay);
        if (mentionsManual && !mentionsAuto) return false;
      }
      if (carFilters.unlimitedKm) {
        const mentionsLimited = /limited km|كيلومتر محدود|محدود الكيل/.test(hay);
        const mentionsUnlimited = /unlimited|غير محدود/.test(hay);
        if (mentionsLimited && !mentionsUnlimited) return false;
      }
      return true;
    });
  }, [carResults, carFilters]);

  const appliedCarFilterCount = carQuickFiltersCount(carFilters);
  const draftCarFilterCount = carQuickFiltersCount(carFiltersDraft);

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
    if (!quickFiltersOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setQuickFiltersOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [quickFiltersOpen]);

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

  async function searchTransportPlaces(q: string) {
    const query = q.trim();
    if (!query) {
      return [
        {
          id: "airport:KWI",
          code: "KWI",
          title: "KWI · الكويت",
          subtitle: "مطار · الكويت الدولية",
        },
        {
          id: "airport:DXB",
          code: "DXB",
          title: "DXB · دبي",
          subtitle: "مطار · دبي الدولية",
        },
      ];
    }
    const airports = await searchAirports(query);
    return airports
      .map((a) => ({
        ...a,
        id: `airport:${a.id}`,
        subtitle: a.subtitle ? `مطار · ${a.subtitle}` : "مطار",
      }))
      .slice(0, 20);
  }

  async function searchTransferHotels(q: string) {
    const query = q.trim();
    if (query.length < 2) return [];
    const result = await apiFetch<{
      items: Array<{ code: string; name: string; city: string }>;
    }>("/bookings/suggest-hotels", {
      method: "POST",
      timeoutMs: 25000,
      body: JSON.stringify({
        query,
        checkIn: form.departDate,
        checkOut: form.returnDate,
      }),
    });
    return (result.items || []).map((row) => ({
      id: `hotel:${row.code}`,
      code: row.code,
      title: row.name,
      subtitle: row.city ? `فندق · ${row.city}` : "فندق",
    }));
  }

  async function searchTransferDestinations(q: string) {
    const query = q.trim();
    if (!query) {
      return [
        {
          id: "city:الكويت",
          code: "الكويت",
          title: "الكويت",
          subtitle: "مدينة",
        },
        {
          id: "city:دبي",
          code: "دبي",
          title: "دبي",
          subtitle: "مدينة",
        },
      ];
    }
    const cities = (await searchCities(query)).map((c) => ({
      ...c,
      id: `city:${c.id}`,
      subtitle: c.subtitle ? `مدينة · ${c.subtitle}` : "مدينة",
    }));
    const looksLikeHotel = /[A-Za-z]{3,}/.test(query) || query.length >= 5;
    if (!looksLikeHotel) return cities.slice(0, 12);
    try {
      const hotels = await searchTransferHotels(query);
      return [...hotels, ...cities].slice(0, 20);
    } catch {
      return cities.slice(0, 12);
    }
  }

  function applyTransportPlace(
    which: "pickup" | "dropoff",
    item: { id: string; title: string; subtitle?: string; code?: string },
  ) {
    const kind = placeKindFromSuggest(item);
    const code = String(item.code || "").toUpperCase();
    const location =
      kind === "airport" && /^[A-Z]{3}$/.test(code)
        ? code
        : kind === "hotel"
          ? String(item.code || "").replace(/^hb-/i, "")
          : item.title;
    const city =
      kind === "airport"
        ? item.title.split("·")[1]?.trim() || form.transferCity
        : kind === "hotel"
          ? item.subtitle?.replace(/^فندق(?: · )?/u, "") || form.transferCity
          : item.title;

    setForm((f) => {
      if (which === "pickup") {
        const nextCity = city || f.transferCity;
        const keepHotel = f.dropoffKind === "hotel" && /^\d+$/.test(f.dropoffLocation);
        return {
          ...f,
          pickupKind: kind,
          pickupLocation: location,
          pickupLocationLabel: item.title,
          transferCity: nextCity,
          transferCityLabel: nextCity,
          ...(!keepHotel && kind === "airport"
            ? {
                dropoffKind: "address" as TransferPointKind,
                dropoffLocation: nextCity,
                dropoffLocationLabel: nextCity,
              }
            : {}),
        };
      }
      return {
        ...f,
        dropoffKind: kind,
        dropoffLocation: location,
        dropoffLocationLabel: item.title,
        transferCity: city || f.transferCity,
        transferCityLabel: city || f.transferCityLabel,
      };
    });
  }

  function openQuickFilters() {
    setCarFiltersDraft(carFilters);
    setQuickFiltersOpen(true);
  }

  function applyQuickFilters() {
    setCarFilters(carFiltersDraft);
    setQuickFiltersOpen(false);
  }

  function clearQuickFiltersDraft() {
    setCarFiltersDraft(EMPTY_CAR_QUICK_FILTERS);
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
    if (mode === "activities") return `أنشطة: ${search.providerName || search.providerKey}`;
    if (flight && hotel && flight !== hotel) {
      return `طيران: ${flight} · فنادق: ${hotel}`;
    }
    return search.providerName || search.providerKey || "مزود البحث";
  }, [search, mode]);

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

  const shopFlightsRaw = (search?.flights || []) as FlightOfferRow[];
  const shopFlightFacets = useMemo(
    () => collectFlightFacets(shopFlightsRaw),
    [search?.flights],
  );
  const shopFilteredFlights = useMemo(
    () =>
      filterAndSortFlights(
        shopFlightsRaw,
        shopFlightFilters,
        shopFlightSort,
        form.directOnly,
      ),
    [shopFlightsRaw, shopFlightFilters, shopFlightSort, form.directOnly],
  );

  const hotelShopFilters: HotelSearchFilters = useMemo(
    () => ({
      ...defaultHotelFilters(),
      hotelQuery: filters.hotelQuery,
      minStars: filters.minStars,
      minReviewScore: filters.minReviewScore,
      board: filters.board,
      boardCode: filters.boardCode,
      zone: filters.zone,
      paymentType: filters.paymentType,
      rateType: filters.rateType,
      freeCancellation: filters.freeCancellation,
      breakfast: filters.breakfast,
      noPrepayment: filters.noPrepayment,
      propertyTypes: filters.propertyTypes,
      facilities: filters.facilities,
      maxPrice: filters.maxPrice,
      refundableOnly: filters.refundableOnly,
      bookableOnly: filters.bookableOnly,
    }),
    [filters],
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
        infants: form.infants,
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
    form.infants,
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
          infants: form.infants,
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
      infants: form.infants,
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
      pickupKind: "airport",
      dropoffKind: "hotel",
      from: String(extra.fromLabel || form.pickupLocationLabel),
      to: String(extra.toLabel || form.dropoffLocationLabel),
      outboundDate: form.departDate,
      outboundTime: form.pickupTime,
      inboundDate: form.transferRoundtrip ? form.returnDate : undefined,
      inboundTime: form.transferRoundtrip ? form.dropoffTime : undefined,
      adults: form.adults,
      children: form.children,
      infants: form.infants,
      createdAt: new Date().toISOString(),
      inquiryId: currentInquiryId || undefined,
    });
    router.push("/dashboard/inquiries/book/transfer");
  }

  function confirmActivityBooking(item: AncillaryResult) {
    const extra = item.extra || {};
    saveActivityDraft({
      activity: {
        id: item.id,
        description: item.name,
        sellAmountMinor: item.price,
        currency: item.currency,
        details: extra,
      },
      destination: String(extra.destinationCode || form.activityQuery),
      destinationLabel: String(extra.destinationName || form.activityQuery),
      fromDate: form.departDate,
      toDate: form.returnDate,
      adults: form.adults,
      children: form.children,
      createdAt: new Date().toISOString(),
      inquiryId: currentInquiryId || undefined,
    });
    router.push("/dashboard/inquiries/book/activity");
  }

  async function createAndSearch() {
    setError("");
    setMessage("");
    setSearch(null);
    setCarResults([]);
    setActivityResults([]);
    setLoading(true);

    try {
      if (mode === "cars") {
        const airport = form.pickupLocation.trim().toUpperCase();
        const destRaw = (
          form.dropoffLocation.trim() ||
          form.dropoffLocationLabel.trim() ||
          form.transferCity.trim()
        );
        if (!/^[A-Z]{3}$/.test(airport)) {
          setError("اختر المطار من القائمة");
          setLoading(false);
          return;
        }
        if (!destRaw) {
          setError("اختر مدينة أو فندقاً للوجهة");
          setLoading(false);
          return;
        }
        const hotelCode = destRaw.replace(/^hb-/i, "");
        const isHotel =
          form.dropoffKind === "hotel" && /^\d+$/.test(hotelCode);
        const cityName =
          form.transferCity.trim() ||
          form.pickupLocationLabel.split("·")[1]?.trim() ||
          destRaw;
        const destCode = isHotel ? hotelCode : destRaw;
        const destKind = isHotel ? "ATLAS" : "GPS";
        if (form.transferRoundtrip && !form.returnDate) {
          setError("حدد تاريخ العودة");
          setLoading(false);
          return;
        }
        const children = carFilters.addons.some(
          (a) => a === "child_seat" || a === "booster",
        )
          ? Math.max(form.children, 1)
          : form.children;
        const infants = carFilters.addons.includes("infant_seat")
          ? Math.max(form.infants, 1)
          : form.infants;
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
            city: cityName,
            from: airport,
            to: destCode,
            fromKind: "IATA",
            toKind: destKind,
            toLabel: form.dropoffLocationLabel || destRaw,
            outboundDate: form.departDate,
            outboundTime: form.pickupTime,
            inboundDate: form.transferRoundtrip ? form.returnDate : undefined,
            inboundTime: form.transferRoundtrip ? form.dropoffTime : undefined,
            adults: form.adults,
            children,
            infants,
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
          providerKey: result.providerKey || "hotelbeds-transfers",
          providerName: result.providerName || "Hotelbeds Transfers",
          liveMode: result.liveMode,
          flights: [],
          hotels: [],
        });
        setMessage(
          result.items?.length
            ? `تم جلب ${result.items.length} خيار نقل عبر ${result.providerName}`
            : "لا توجد رحلات نقل متاحة لهذا المطار والوجهة. جرّب مدينة أو فندقاً آخر مع تاريخ لاحق.",
        );
        setLoading(false);
        return;
      }

      if (mode === "activities") {
        const destination = form.activityQuery.trim();
        if (!destination) {
          setError("أدخل وجهة النشاط");
          setLoading(false);
          return;
        }
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
        }>("/bookings/search-activities", {
          method: "POST",
          timeoutMs: 45000,
          body: JSON.stringify({
            destination,
            fromDate: form.departDate,
            toDate: form.returnDate,
            adults: form.adults,
            children: form.children,
          }),
        });
        setActivityResults(
          (result.items || []).map((row) => ({
            id: row.id,
            serviceType: row.serviceType || "activity",
            name: row.name,
            price: row.sellAmountMinor,
            currency: row.currency,
            details: row.description,
            extra: row.details,
          })),
        );
        setSearch({
          providerKey: result.providerKey || "hotelbeds-activities",
          providerName: result.providerName || "Hotelbeds Activities",
          liveMode: result.liveMode,
          flights: [],
          hotels: [],
        });
        setMessage(
          result.items?.length
            ? `تم جلب ${result.items.length} نشاط عبر ${result.providerName}`
            : "لا توجد أنشطة متاحة لهذه الوجهة والتواريخ.",
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
          infants: form.infants,
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
    <ShopI18nProvider manageDocument={false}>
    <AppShell title="الاستعلامات المباشرة">
      <section className="flight-hero">
        <div className="flight-hero-tabs">
          <button
            type="button"
            className={mode === "flights" ? "active" : undefined}
            onClick={() => {
              setMode("flights");
              setGuestsOpen(false);
            }}
          >
            {en ? "Flights" : "الطيران"}
          </button>
          <button
            type="button"
            className={mode === "stays" ? "active" : undefined}
            onClick={() => {
              setMode("stays");
              setGuestsOpen(false);
            }}
          >
            {en ? "Hotels" : "الفنادق"}
          </button>
          <button
            type="button"
            className={mode === "cars" ? "active" : undefined}
            onClick={() => {
              setMode("cars");
              setGuestsOpen(false);
            }}
          >
            {en ? "Transfers" : "نقل"}
          </button>
          <button
            type="button"
            className={mode === "activities" ? "active" : undefined}
            onClick={() => {
              setMode("activities");
              setGuestsOpen(false);
            }}
          >
            {en ? "Activities" : "أنشطة"}
          </button>
        </div>

        <h2>
          {mode === "flights"
            ? en
              ? "Compare and book cheaper flights easily"
              : "قارن واحجز أرخص الرحلات بسهولة"
            : mode === "stays"
              ? en
                ? "Discover the best stays around the world"
                : "اكتشف أفضل الإقامات حول العالم"
              : mode === "cars"
                ? en
                  ? "Airport to hotel transfers"
                  : "نقل من المطار إلى الفندق"
                : en
                  ? "Discover the best activities and attractions"
                  : "اكتشف أفضل الأنشطة والمعالم"}
        </h2>
        <p>
          {mode === "cars"
            ? en
              ? "Arrival only, or arrival and return with pickup and drop-off times"
              : "وصول فقط بتاريخ ووقت الاستلام، أو وصول وعودة بتاريخ ووقت من وإلى"
            : mode === "activities"
              ? en
                ? "Search tours and tickets by destination and date"
                : "ابحث عن جولات وتذاكر حسب الوجهة والتاريخ"
              : en
                ? "A complete travel search with airport and airline catalogs"
                : "محرك بحث سفر متكامل مع كتالوج المطارات وشركات الطيران"}
        </p>

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

        {mode === "cars" ? (
          <div className="flight-search-options transfer-trip-options">
            <button
              type="button"
              className={`opt-chip${
                !form.transferRoundtrip ? " on" : ""
              }`}
              onClick={() =>
                setForm((f) => ({ ...f, transferRoundtrip: false }))
              }
            >
              وصول فقط
            </button>
            <button
              type="button"
              className={`opt-chip${form.transferRoundtrip ? " on" : ""}`}
              onClick={() =>
                setForm((f) => ({ ...f, transferRoundtrip: true }))
              }
            >
              وصول وعودة
            </button>
          </div>
        ) : null}

        <div className="flight-search">
          {mode === "flights" ? (
            <div className="fs-grid">
              <AutocompleteField
                label={en ? "From" : "المغادرة من"}
                value={form.origin}
                display={form.originLabel}
                placeholder={en ? "City or airport code" : "مدينة أو رمز مطار"}
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
                label={en ? "To" : "الوجهة"}
                value={form.destination}
                display={form.destinationLabel}
                placeholder={en ? "City or airport code" : "مدينة أو رمز مطار"}
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
              <DashDateCell
                label={en ? "Depart" : "تاريخ الذهاب"}
                value={form.departDate}
                hint="المغادرة"
                min={todayIsoDate()}
                onChange={(departDate) =>
                  setForm((f) => ({
                    ...f,
                    departDate,
                    returnDate:
                      f.returnDate && f.returnDate < departDate
                        ? departDate
                        : f.returnDate,
                  }))
                }
              />
              {tripType === "roundtrip" ? (
                <DashDateCell
                  label={en ? "Return" : "تاريخ العودة"}
                  value={form.returnDate}
                  hint={nights ? `${nights} ليلة` : "العودة"}
                  min={form.departDate || todayIsoDate()}
                  onChange={(returnDate) =>
                    setForm((f) => ({ ...f, returnDate }))
                  }
                />
              ) : (
                <div className="fs-cell fs-cell-empty">
                  <span>تاريخ العودة</span>
                  <strong className="fs-oneway">ذهاب فقط</strong>
                  <small>بدون عودة</small>
                </div>
              )}
              <div className="fs-cell fs-cell-center guests-cell" ref={guestsRef}>
                <span>المسافرون</span>
                <button
                  type="button"
                  className="guests-trigger"
                  onClick={() => setGuestsOpen((v) => !v)}
                >
                  {form.adults} بالغ
                  {form.children > 0 ? ` · ${form.children} طفل` : ""}
                  {form.infants > 0 ? ` · ${form.infants} رضيع` : ""}
                </button>
                <small>بالغ · طفل · رضيع</small>
                <DashPortalMenu
                  open={guestsOpen}
                  anchorRef={guestsRef}
                  onClose={() => setGuestsOpen(false)}
                  className="guests-menu guests-menu-pop guests-menu-portal"
                  matchWidth={false}
                >
                    <PassengerCountRow
                      adults={form.adults}
                      childrenCount={form.children}
                      infants={form.infants}
                      onAdults={(adults) =>
                        setForm({
                          ...form,
                          adults,
                          infants: Math.min(form.infants, adults),
                        })
                      }
                      onChildren={(children) =>
                        setForm({ ...form, children })
                      }
                      onInfants={(infants) => setForm({ ...form, infants })}
                    />
                    <p className="guests-hint">طفل 2–11 سنة · رضيع أقل من سنتين</p>
                </DashPortalMenu>
              </div>
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
                label="الوجهة أو اسم الفندق"
                value={form.stayQuery}
                display={form.stayQuery}
                placeholder="مدينة أو دولة أو اسم فندق"
                hint="اختر مدينة من القائمة"
                emptyHint="اكتب ثم اختر المدينة"
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
              <DashDateCell
                label="تاريخ الدخول"
                value={form.departDate}
                hint="تسجيل الوصول"
                min={todayIsoDate()}
                onChange={(departDate) =>
                  setForm((f) => ({
                    ...f,
                    departDate,
                    returnDate:
                      f.returnDate && f.returnDate < departDate
                        ? departDate
                        : f.returnDate,
                  }))
                }
              />
              <DashDateCell
                label="تاريخ الخروج"
                value={form.returnDate}
                hint={nights ? `${nights} ليلة` : "تسجيل المغادرة"}
                min={form.departDate || todayIsoDate()}
                onChange={(returnDate) =>
                  setForm((f) => ({ ...f, returnDate }))
                }
              />
              <div className="fs-cell fs-cell-center guests-cell" ref={guestsRef}>
                <span>المسافرون والغرف</span>
                <button
                  type="button"
                  className="guests-trigger"
                  onClick={() => setGuestsOpen((v) => !v)}
                >
                  {form.adults} بالغ
                  {form.children > 0 ? ` · ${form.children} طفل` : ""}
                  {form.infants > 0 ? ` · ${form.infants} رضيع` : ""}
                  {` · ${form.rooms} غرفة`}
                </button>
                <small>اختر العدد</small>
                <DashPortalMenu
                  open={guestsOpen}
                  anchorRef={guestsRef}
                  onClose={() => setGuestsOpen(false)}
                  className="guests-menu guests-menu-pop guests-menu-portal"
                  matchWidth={false}
                >
                    <div className="guests-inline-row">
                      <label className="guests-inline">
                        <span>غرف</span>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={form.rooms}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              rooms: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </label>
                    </div>
                    <PassengerCountRow
                      adults={form.adults}
                      childrenCount={form.children}
                      infants={form.infants}
                      onAdults={(adults) =>
                        setForm({
                          ...form,
                          adults,
                          infants: Math.min(form.infants, adults),
                        })
                      }
                      onChildren={(children) => {
                        const childrenAges = [...form.childrenAges].slice(
                          0,
                          children,
                        );
                        while (childrenAges.length < children) childrenAges.push(6);
                        setForm({ ...form, children, childrenAges });
                      }}
                      onInfants={(infants) => setForm({ ...form, infants })}
                    />
                    <p className="guests-hint">طفل 2–11 سنة · رضيع أقل من سنتين</p>
                    {form.children > 0
                      ? Array.from({ length: form.children }, (_, i) => (
                          <label key={i} className="guests-age">
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
                </DashPortalMenu>
              </div>
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
            <>
              <div
                className={`fs-grid cars car-hire-grid airport-dest${
                  form.transferRoundtrip ? " two-locs" : ""
                }`}
              >
                <AutocompleteField
                  label="المطار"
                  value={form.pickupLocation}
                  display={form.pickupLocationLabel}
                  placeholder="اختر المطار"
                  hint={
                    form.pickupLocation
                      ? `مطار ${form.pickupLocation}`
                      : "مطار الوصول"
                  }
                  emptyHint="اكتب رمز أو اسم المطار"
                  loadingHint="جاري البحث عن المطارات…"
                  emptyListHint="لا توجد مطارات مطابقة"
                  onClearText={(text) => {
                    const code = text.trim().toUpperCase();
                    setForm((f) => ({
                      ...f,
                      pickupKind: "airport",
                      pickupLocation: /^[A-Z]{3}$/.test(code) ? code : "",
                      pickupLocationLabel: text,
                    }));
                  }}
                  onQuery={searchTransportPlaces}
                  onPick={(item) => applyTransportPlace("pickup", item)}
                />
                <AutocompleteField
                  label="الفندق"
                  value={form.dropoffLocation}
                  display={form.dropoffLocationLabel}
                  placeholder="اسم الفندق أو المدينة"
                  hint={
                    form.dropoffKind === "hotel"
                      ? form.dropoffLocationLabel
                      : form.dropoffLocationLabel || "فندق أو مدينة"
                  }
                  emptyHint="اكتب اسم الفندق أو المدينة"
                  loadingHint="جاري البحث عن الفنادق…"
                  emptyListHint="لا توجد فنادق مطابقة"
                  onClearText={(text) =>
                    setForm((f) => ({
                      ...f,
                      dropoffKind: "address",
                      dropoffLocation: text,
                      dropoffLocationLabel: text,
                    }))
                  }
                  onQuery={searchTransferDestinations}
                  onPick={(item) => applyTransportPlace("dropoff", item)}
                />
                {form.transferRoundtrip ? (
                  <>
                    <DashDateCell
                      label="من تاريخ"
                      value={form.departDate}
                      min={todayIsoDate()}
                      onChange={(departDate) =>
                        setForm((f) => ({
                          ...f,
                          departDate,
                          returnDate:
                            f.returnDate && f.returnDate < departDate
                              ? departDate
                              : f.returnDate,
                        }))
                      }
                    />
                    <label className="fs-cell">
                      <span>من وقت</span>
                      <input
                        type="time"
                        value={form.pickupTime}
                        onChange={(e) =>
                          setForm({ ...form, pickupTime: e.target.value })
                        }
                      />
                    </label>
                    <DashDateCell
                      label="إلى تاريخ"
                      value={form.returnDate}
                      min={form.departDate || todayIsoDate()}
                      onChange={(returnDate) =>
                        setForm((f) => ({ ...f, returnDate }))
                      }
                    />
                    <label className="fs-cell">
                      <span>إلى وقت</span>
                      <input
                        type="time"
                        value={form.dropoffTime}
                        onChange={(e) =>
                          setForm({ ...form, dropoffTime: e.target.value })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <DashDateCell
                      label="تاريخ الاستلام"
                      value={form.departDate}
                      min={todayIsoDate()}
                      onChange={(departDate) =>
                        setForm((f) => ({ ...f, departDate }))
                      }
                    />
                    <label className="fs-cell">
                      <span>الساعة</span>
                      <input
                        type="time"
                        value={form.pickupTime}
                        onChange={(e) =>
                          setForm({ ...form, pickupTime: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  className="flight-explore"
                  disabled={loading}
                  onClick={createAndSearch}
                >
                  {loading ? "..." : "استكشاف"}
                </button>
              </div>
            </>
          ) : null}

          {mode === "activities" ? (
            <div className="fs-grid stays activities">
              <AutocompleteField
                label="الوجهة"
                value={form.activityQuery}
                display={form.activityQuery}
                placeholder="مدينة أو رمز مثل دبي أو DXB"
                hint="اختر مدينة من القائمة"
                emptyHint="اكتب ثم اختر المدينة"
                loadingHint="جاري البحث عن الوجهات…"
                emptyListHint="لا توجد وجهات مطابقة"
                onClearText={(text) =>
                  setForm((f) => ({ ...f, activityQuery: text }))
                }
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
                    activityQuery: item.code || item.title,
                  }))
                }
              />
              <DashDateCell
                label="من تاريخ"
                value={form.departDate}
                hint="بداية النشاط"
                min={todayIsoDate()}
                onChange={(departDate) =>
                  setForm((f) => ({
                    ...f,
                    departDate,
                    returnDate:
                      f.returnDate && f.returnDate < departDate
                        ? departDate
                        : f.returnDate,
                  }))
                }
              />
              <DashDateCell
                label="إلى تاريخ"
                value={form.returnDate}
                hint="نهاية الفترة"
                min={form.departDate || todayIsoDate()}
                onChange={(returnDate) =>
                  setForm((f) => ({ ...f, returnDate }))
                }
              />
              <div className="fs-cell fs-cell-center guests-cell" ref={guestsRef}>
                <span>المشاركون</span>
                <button
                  type="button"
                  className="guests-trigger"
                  onClick={() => setGuestsOpen((v) => !v)}
                >
                  {form.adults} بالغ
                  {form.children > 0 ? ` · ${form.children} طفل` : ""}
                </button>
                <small>بالغ · طفل</small>
                <DashPortalMenu
                  open={guestsOpen}
                  anchorRef={guestsRef}
                  onClose={() => setGuestsOpen(false)}
                  className="guests-menu guests-menu-pop guests-menu-portal"
                  matchWidth={false}
                >
                    <PassengerCountRow
                      adults={form.adults}
                      childrenCount={form.children}
                      infants={0}
                      onAdults={(adults) => setForm({ ...form, adults })}
                      onChildren={(children) => setForm({ ...form, children })}
                      onInfants={() => undefined}
                    />
                </DashPortalMenu>
              </div>
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

        {mode === "cars" ? (
          <div className="car-hire-options">
            <button
              type="button"
              className={`quick-filters-link${
                appliedCarFilterCount ? " on" : ""
              }`}
              onClick={openQuickFilters}
            >
              <span className="quick-filters-ico" aria-hidden />
              مصفيات سريعة
              {appliedCarFilterCount ? (
                <em>{appliedCarFilterCount}</em>
              ) : null}
            </button>
          </div>
        ) : null}

        {message ? <p className="flight-status">{message}</p> : null}
        {providerBadge ? (
          <p className="flight-status soft">{providerBadge}</p>
        ) : null}
        {error ? <p className="flight-status error">{error}</p> : null}
      </section>

      {search ? (
        <div className="results-layout results-layout-solo">
          <div className="results-main">
            {mode === "flights" ? (
              <div className="dash-shop-results">
                <ShopFlightResults
                  flights={shopFilteredFlights}
                  totalCount={shopFlightsRaw.length}
                  filters={shopFlightFilters}
                  facets={shopFlightFacets}
                  sortKey={shopFlightSort}
                  origin={form.origin}
                  destination={form.destination}
                  originLabel={form.originLabel}
                  destinationLabel={form.destinationLabel}
                  passengers={form.adults + form.children + form.infants}
                  onFiltersChange={setShopFlightFilters}
                  onSortChange={setShopFlightSort}
                  onResetFilters={() => {
                    setShopFlightFilters(shopDefaultFlightFilters());
                    setForm((f) => ({ ...f, directOnly: false }));
                  }}
                  onSelectFlight={(flight) => setDetailFlightId(flight.id)}
                  onViewDetails={(flight) => setDetailFlightId(flight.id)}
                />
              </div>
            ) : mode === "cars" || mode === "activities" ? (

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
              <div className="dash-shop-results">
                <ShopHotelResults
                  hideSearchBar
                  destination={form.destination || form.stayQuery}
                  stayQuery={form.stayQuery}
                  departDate={form.departDate}
                  returnDate={form.returnDate}
                  adults={form.adults}
                  children={form.children}
                  rooms={form.rooms}
                  nights={nights}
                  loading={loading}
                  hotels={filteredHotels}
                  filters={hotelShopFilters}
                  facets={hotelFacets}
                  sortKey={
                    sortKey === "price_desc"
                      ? "price_desc"
                      : sortKey === "rating_desc"
                        ? "rating_desc"
                        : sortKey === "best"
                          ? "best"
                          : "price_asc"
                  }
                  onFiltersChange={(next) =>
                    setFilters((prev) => ({
                      ...prev,
                      hotelQuery: next.hotelQuery,
                      minStars: next.minStars,
                      minReviewScore:
                        next.minReviewScore === "6" ? "any" : next.minReviewScore,
                      board: next.board,
                      boardCode: next.boardCode,
                      zone: next.zone,
                      paymentType: next.paymentType,
                      rateType: next.rateType,
                      freeCancellation: next.freeCancellation,
                      breakfast: next.breakfast,
                      noPrepayment: next.noPrepayment,
                      propertyTypes: next.propertyTypes,
                      facilities: next.facilities,
                      maxPrice: next.maxPrice,
                      refundableOnly: next.refundableOnly,
                      bookableOnly: next.bookableOnly,
                    }))
                  }
                  onSortChange={(key) =>
                    setSortKey(key === "distance" ? "best" : key)
                  }
                  onStayQueryChange={(text) =>
                    setForm((f) => ({ ...f, stayQuery: text }))
                  }
                  onStayPick={(item) =>
                    setForm((f) => ({
                      ...f,
                      stayQuery: item.title,
                      destination: item.code || item.title,
                    }))
                  }
                  onDepartDateChange={(departDate) =>
                    setForm((f) => ({ ...f, departDate }))
                  }
                  onReturnDateChange={(returnDate) =>
                    setForm((f) => ({ ...f, returnDate }))
                  }
                  onAdultsChange={(adults) => setForm((f) => ({ ...f, adults }))}
                  onChildrenChange={(children) =>
                    setForm((f) => ({ ...f, children }))
                  }
                  onRoomsChange={(rooms) => setForm((f) => ({ ...f, rooms }))}
                  onSearch={() => void createAndSearch()}
                  onOpenHotel={(hotel) => openHotelDetail(hotel.id)}
                  searchCities={searchCities}
                  searchDestinationCode={form.destination || undefined}
                />
              </div>
            ) : null}

            {mode === "cars" ? (
              <div className="panel hotel-results-panel">
                <div className="hotel-results-head">
                  <h3>
                    {form.transferRoundtrip ? "وصول وعودة" : "وصول فقط"}:{" "}
                    {filteredCarResults.length} خياراً
                    {appliedCarFilterCount && carResults.length !== filteredCarResults.length
                      ? ` من ${carResults.length}`
                      : ""}
                  </h3>
                  {search ? (
                    <HotelLiveBadge
                      liveMode={Boolean(search.liveMode)}
                      sourceLabel={search.providerName}
                    />
                  ) : null}
                </div>
                {appliedCarFilterCount ? (
                  <div className="car-applied-filters">
                    {carFilters.seats ? (
                      <span>
                        {CAR_SEAT_OPTIONS.find((o) => o.value === carFilters.seats)?.label}
                      </span>
                    ) : null}
                    {carFilters.addons.map((addon) => (
                      <span key={addon}>
                        {CAR_ADDON_OPTIONS.find((o) => o.value === addon)?.label}
                      </span>
                    ))}
                    {carFilters.automaticOnly ? <span>ناقل أوتوماتيكي</span> : null}
                    {carFilters.unlimitedKm ? <span>كيلومترات غير محدودة</span> : null}
                  </div>
                ) : null}
                <div className="hotel-search-list">
                  {filteredCarResults.map((c) => (
                    <TransferSearchCard
                      key={c.id}
                      item={c}
                      from={form.pickupLocationLabel || form.pickupLocation}
                      to={form.dropoffLocationLabel || form.dropoffLocation}
                      onBook={() => confirmTransferBooking(c)}
                    />
                  ))}
                  {filteredCarResults.length === 0 ? (
                    <p className="hint">
                      {carResults.length
                        ? "لا توجد مركبات مطابقة للمصفيات السريعة. امسح المصفيات أو غيّر المتطلبات."
                        : "لا توجد نتائج. ابحث بمطار ومدينة مثل KWI والكويت، أو اختر فندقاً من القائمة."}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {mode === "activities" ? (
              <div className="panel hotel-results-panel">
                <div className="hotel-results-head">
                  <h3>
                    أنشطة {form.activityQuery}: {activityResults.length} خياراً
                  </h3>
                  {search ? (
                    <HotelLiveBadge
                      liveMode={Boolean(search.liveMode)}
                      sourceLabel={search.providerName}
                    />
                  ) : null}
                </div>
                <div className="hotel-search-list">
                  {[...activityResults]
                    .sort((a, b) =>
                      sortKey === "price_desc" ? b.price - a.price : a.price - b.price,
                    )
                    .map((row) => (
                      <ActivitySearchCard
                        key={row.id}
                        item={row}
                        destination={form.activityQuery}
                        onBook={() => confirmActivityBooking(row)}
                      />
                    ))}
                  {activityResults.length === 0 ? (
                    <p className="hint">
                      لا توجد أنشطة مطابقة. جرّب وجهة مثل دبي أو برشلونة مع تواريخ لاحقة.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

        </div>
      ) : null}

      <div className="panel">
        <h3>{en ? "Latest 3 inquiries" : "آخر 3 استعلامات"}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.c("route")}</th>
              <th>{i18n.c("date")}</th>
              <th>{i18n.c("status")}</th>
              <th>{i18n.c("source")}</th>
              <th>{i18n.c("created")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 3).map((row) => (
              <tr key={row.id}>
                <td>
                  <DashLtr>
                    {row.origin || "؟"} → {row.destination || "؟"}
                  </DashLtr>
                </td>
                <td>
                  <DashLtr>{row.departDate?.slice(0, 10) || "—"}</DashLtr>
                </td>
                <td>{i18n.status(row.status)}</td>
                <td>{i18n.source(row.source)}</td>
                <td>{formatDate(row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>{en ? "No inquiries yet" : "لا توجد استعلامات بعد"}</td>
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
                          infants: form.infants,
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
            infants: form.infants,
          }}
          onClose={() => setDetailHotelId(null)}
          onEnterGuestData={confirmHotelBooking}
        />
      ) : null}

      {quickFiltersOpen ? (
        <div
          className="car-qf-overlay"
          onClick={() => setQuickFiltersOpen(false)}
        >
          <div
            className="car-qf-modal"
            role="dialog"
            aria-labelledby="car-qf-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="car-qf-head">
              <div>
                <h3 id="car-qf-title">مصفيات سريعة</h3>
                <p>وفر الوقت وحسّن من نتائجك</p>
              </div>
              <button
                type="button"
                className="car-qf-close"
                aria-label="إغلاق"
                onClick={() => setQuickFiltersOpen(false)}
              >
                ×
              </button>
            </header>

            <section className="car-qf-section">
              <h4>عدد المقاعد</h4>
              <div className="car-qf-pills">
                {CAR_SEAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={carFiltersDraft.seats === opt.value ? "on" : undefined}
                    onClick={() =>
                      setCarFiltersDraft((f) => ({
                        ...f,
                        seats: f.seats === opt.value ? "" : opt.value,
                      }))
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="car-qf-section">
              <h4>إضافات رائجة</h4>
              <p className="car-qf-hint">
                إظهار شركات تأجير السيارات التي لديها هذه الإضافات متاحة فقط
              </p>
              <div className="car-qf-tags">
                {CAR_ADDON_OPTIONS.map((opt) => {
                  const on = carFiltersDraft.addons.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={on ? "on" : undefined}
                      onClick={() =>
                        setCarFiltersDraft((f) => ({
                          ...f,
                          addons: on
                            ? f.addons.filter((a) => a !== opt.value)
                            : [...f.addons, opt.value],
                        }))
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="car-qf-toggles">
              <label>
                <span>ناقل حركة أوتوماتيكي</span>
                <input
                  type="checkbox"
                  className="car-qf-switch"
                  checked={carFiltersDraft.automaticOnly}
                  onChange={() =>
                    setCarFiltersDraft((f) => ({
                      ...f,
                      automaticOnly: !f.automaticOnly,
                    }))
                  }
                />
              </label>
              <label>
                <span>كيلومترات غير محدودة</span>
                <input
                  type="checkbox"
                  className="car-qf-switch"
                  checked={carFiltersDraft.unlimitedKm}
                  onChange={() =>
                    setCarFiltersDraft((f) => ({
                      ...f,
                      unlimitedKm: !f.unlimitedKm,
                    }))
                  }
                />
              </label>
            </section>

            <footer className="car-qf-foot">
              <button
                type="button"
                className="car-qf-clear"
                onClick={clearQuickFiltersDraft}
              >
                حذف
              </button>
              <button
                type="button"
                className={`car-qf-apply${draftCarFilterCount ? "" : " is-muted"}`}
                onClick={applyQuickFilters}
              >
                تطبيق
              </button>
            </footer>
          </div>
        </div>
      ) : null}

    </AppShell>
    </ShopI18nProvider>
  );
}
