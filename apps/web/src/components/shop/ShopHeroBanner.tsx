"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { heroSlidesFor } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { readHeroServices } from "@/lib/hero-services";
import {
  emptyRoom,
  occupancyTotals,
  setRoomCount,
  shopRoomCount,
  shopTravelerCount,
  type HotelOccupancyState,
  validateOccupancyMessage,
} from "@/lib/hotel-occupancy";
import { FamilyTravelerPicker } from "@/components/shop/FamilyTravelerPicker";
import { countsFromMembers } from "@/lib/family-travelers";

type Mode = "flights" | "stays" | "cars" | "activities";
export type FlightTripType = "roundtrip" | "oneway" | "multicity";

export type FlightLeg = {
  id: string;
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departDate: string;
};

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  tripType: FlightTripType;
  onTripTypeChange: (v: FlightTripType) => void;
  flightLegs: FlightLeg[];
  onFlightLegChange: (id: string, patch: Partial<FlightLeg>) => void;
  onAddFlightLeg: () => void;
  onRemoveFlightLeg: (id: string) => void;
  transferRoundtrip: boolean;
  onTransferRoundtripChange: (v: boolean) => void;
  transferAirport: boolean;
  onTransferAirportChange: (v: boolean) => void;
  transferCarRental: boolean;
  onTransferCarRentalChange: (v: boolean) => void;
  transferDropoff: string;
  transferDropoffLabel: string;
  onTransferDropoffClear: (text: string) => void;
  onTransferDropoffPick: (item: SuggestItem) => void;
  cabinClass: string;
  onCabinClassChange: (v: string) => void;
  directOnly: boolean;
  onDirectOnlyChange: (v: boolean) => void;
  flexibleDates: boolean;
  onFlexibleDatesChange: (v: boolean) => void;
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  stayQuery: string;
  activityDest: string;
  activityLabel: string;
  departDate: string;
  returnDate: string;
  pickupTime: string;
  dropoffTime: string;
  adults: number;
  children: number;
  infants?: number;
  rooms: number;
  /** Per-room occupancy for hotel search (required for children ages). */
  stayOccupancy?: HotelOccupancyState;
  onStayOccupancyChange?: (next: HotelOccupancyState) => void;
  onOriginClear: (text: string) => void;
  onOriginPick: (item: SuggestItem) => void;
  onDestinationClear: (text: string) => void;
  onDestinationPick: (item: SuggestItem) => void;
  onStayQueryChange: (text: string) => void;
  onStayPick: (item: SuggestItem) => void;
  onActivityClear: (text: string) => void;
  onActivityPick: (item: SuggestItem) => void;
  onDepartDateChange: (v: string) => void;
  onReturnDateChange: (v: string) => void;
  onPickupTimeChange: (v: string) => void;
  onDropoffTimeChange: (v: string) => void;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onInfantsChange?: (n: number) => void;
  onRoomsChange: (n: number) => void;
  onSearch: () => void;
  loading: boolean;
  error: string;
  message: string;
  searchAirports: (q: string) => Promise<SuggestItem[]>;
  searchCities: (q: string) => Promise<SuggestItem[]>;
  /** When set, shows Trip Builder CTA under the search box */
  tripBuilderHref?: string;
  /** Opens رحلتي boarding pass modal (preferred over tripBuilderHref) */
  onRuheltiClick?: () => void;
};

const PRODUCT_KEYS: Array<{
  key: Mode;
  label: "searchFlightsTab" | "searchHotelsTab" | "searchCarsTab" | "searchActivitiesTab";
  hint: "searchFlightsHint" | "searchHotelsHint" | "searchCarsHint" | "searchActivitiesHint";
}> = [
  { key: "stays", label: "searchHotelsTab", hint: "searchHotelsHint" },
  { key: "flights", label: "searchFlightsTab", hint: "searchFlightsHint" },
  { key: "cars", label: "searchCarsTab", hint: "searchCarsHint" },
  { key: "activities", label: "searchActivitiesTab", hint: "searchActivitiesHint" },
];

function ModeGlyph({ mode }: { mode: Mode }) {
  if (mode === "stays") {
    return (
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
        <path
          fill="currentColor"
          d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-4-6h2v2h-2v-2zm0 4h2v2h-2v-2z"
        />
      </svg>
    );
  }
  if (mode === "flights") {
    return (
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    );
  }
  if (mode === "cars") {
    return (
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm1.5 3.5-5 2-2 5 5-2 2-5zm-2.2 3.3 1.4 1.4-2.5 1-1-2.5 2.1-0.9z"
      />
    </svg>
  );
}

function TabGlyph({ mode }: { mode: Mode | "trip" }) {
  if (mode === "stays") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path
          fill="currentColor"
          d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"
        />
      </svg>
    );
  }
  if (mode === "flights") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    );
  }
  if (mode === "cars") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    );
  }
  if (mode === "trip") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z"
      />
    </svg>
  );
}

function AccordionChevron({ open }: { open?: boolean }) {
  return (
    <svg
      className={`wg-hero-acc-chevron${open ? " open" : ""}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3 5 6.99h3V14h2V6.99h3L9 3z"
      />
    </svg>
  );
}

function FieldIcon({
  name,
}: {
  name: "takeoff" | "landing" | "location" | "dates" | "travelers";
}) {
  const common = { viewBox: "0 0 24 24", width: 22, height: 22, "aria-hidden": true } as const;
  if (name === "takeoff" || name === "landing") {
    return (
      <img
        src="/shop/plane-badge.png"
        alt=""
        width={26}
        height={26}
        className={name === "landing" ? "wg-plane-land" : "wg-plane-off"}
        draggable={false}
      />
    );
  }
  if (name === "location") {
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
        />
      </svg>
    );
  }
  if (name === "dates") {
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H5V8h14v13zM7 10h5v5H7v-5z"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  );
}

const WEEKDAY_SHORT_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatFieldDate(iso: string, locale = "ar") {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = (locale === "en" ? WEEKDAY_SHORT_EN : WEEKDAY_SHORT_AR)[d.getDay()];
  const rest = d.toLocaleDateString(locale === "en" ? "en-GB" : "ar-KW", {
    day: "numeric",
    month: "short",
  });
  return `${weekday} ${rest}`;
}

function nightsBetweenIso(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function formatTimeShort(t: string, en = false) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return t;
  const suffix = en ? (hour >= 12 ? "PM" : "AM") : hour >= 12 ? "م" : "ص";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function DatePick({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const { t, locale } = useShopI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* fallback */
      }
    }
    el.focus();
    el.click();
  }

  return (
    <div className="exp-date-pick">
      <button type="button" className="exp-date-btn" onClick={openPicker} aria-label={label}>
        <span className="wg-num" dir="ltr">
          {mounted ? (value ? formatFieldDate(value, locale) : label) : value || label}
        </span>
      </button>
      <input
        ref={inputRef}
        type="date"
        className="exp-date-native"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

export function ShopHeroBanner(props: Props) {
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [occError, setOccError] = useState("");
  const [slideIdx, setSlideIdx] = useState(0);
  /** Accordion panel open — visual only; search handlers unchanged. Hidden until chevron/tab opens it. */
  const [dockOpen, setDockOpen] = useState(true);
  const [enabledModes, setEnabledModes] = useState<Mode[]>(["stays", "flights", "cars", "activities"]);
  const [showMyTrip, setShowMyTrip] = useState(true);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("wg-header-services"));
  }, []);
  useEffect(() => {
    const services = readHeroServices();
    const modes = services
      .filter((s) => s.enabled && s.kind === "mode")
      .map((s) => s.key)
      .filter((k): k is Mode => ["stays", "flights", "cars", "activities"].includes(k));
    if (modes.length) setEnabledModes(modes);
    setShowMyTrip(services.some((s) => s.key === "myTrip" && s.enabled));
    const onChange = () => {
      const next = readHeroServices();
      const m = next
        .filter((s) => s.enabled && s.kind === "mode")
        .map((s) => s.key)
        .filter((k): k is Mode => ["stays", "flights", "cars", "activities"].includes(k));
      if (m.length) setEnabledModes(m);
      setShowMyTrip(next.some((s) => s.key === "myTrip" && s.enabled));
    };
    window.addEventListener("wg-hero-services-changed", onChange);
    return () => window.removeEventListener("wg-hero-services-changed", onChange);
  }, []);
  const travelersWrapRef = useRef<HTMLDivElement | null>(null);
  const infants = props.infants ?? 0;
  const { locale, t } = useShopI18n();
  const slides = heroSlidesFor(locale);
  /* Flight hero labels match approved v2 reference (من / إلى); other modes keep existing copy */
  const fromLabel = props.mode === "flights" ? t("fromShort") : t("from");
  const fromPlaceholder = t("fromPlaceholder");
  const toLabel = props.mode === "flights" ? t("toShort") : t("destination");
  const toPlaceholder = t("whereTo");
  const datesLabel = t("dates");
  const dateLabel = t("date");

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIdx((idx) => (idx + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (!travelersOpen) return;
    function onDoc(e: MouseEvent) {
      if (!travelersWrapRef.current?.contains(e.target as Node)) {
        setTravelersOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTravelersOpen(false);
    }
    // Use bubble-phase click (not mousedown) so the opening click finishes first.
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [travelersOpen]);

  function prevSlide() {
    setSlideIdx((idx) => (idx - 1 + slides.length) % slides.length);
  }

  function nextSlide() {
    setSlideIdx((idx) => (idx + 1) % slides.length);
  }

  const stayTotals = props.stayOccupancy
    ? occupancyTotals(props.stayOccupancy)
    : null;

  const stayAdults = stayTotals?.adults ?? props.adults;
  const stayChildren = stayTotals?.children ?? props.children;
  const cabinLabel =
    props.cabinClass === "premium_economy"
      ? t("cabinPremium")
      : props.cabinClass === "business"
        ? t("cabinBusiness")
        : props.cabinClass === "first"
          ? t("cabinFirst")
          : t("cabinEconomy");
  const travelerCount = props.adults + props.children + infants;
  const travelerWord =
    locale === "en" ? (travelerCount === 1 ? "traveler" : "travelers") : "مسافر";
  const travelerSummary =
    props.mode === "stays"
      ? t("guestsAdultsChildren", { adults: stayAdults, children: stayChildren })
      : props.mode === "flights"
        ? `${travelerCount} ${travelerWord}${locale === "en" ? "," : "،"} ${cabinLabel}`
        : shopTravelerCount(locale, travelerCount);

  function updateStayOccupancy(next: HotelOccupancyState) {
    props.onStayOccupancyChange?.(next);
    const totals = occupancyTotals(next);
    props.onAdultsChange(totals.adults);
    props.onChildrenChange(totals.children);
    props.onRoomsChange(totals.rooms);
    setOccError(validateOccupancyMessage(next, locale) || "");
  }

  function renderFlightTravelersPanel() {
    return (
      <div className="exp-travelers-panel" role="dialog" aria-label={t("travelersAria")}>
        <div className="exp-travelers-row">
          <span>
            {t("adults")}
            <small className="exp-traveler-hint">{t("adultsAgeHint")}</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label={t("adults")}
              onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}
            >
              −
            </button>
            <strong className="wg-num">{props.adults}</strong>
            <button
              type="button"
              aria-label={t("adults")}
              onClick={() => props.onAdultsChange(Math.min(9, props.adults + 1))}
            >
              +
            </button>
          </div>
        </div>
        <div className="exp-travelers-row">
          <span>
            {t("children")}
            <small className="exp-traveler-hint">{t("childrenAgeHint")}</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label={t("children")}
              onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}
            >
              −
            </button>
            <strong className="wg-num">{props.children}</strong>
            <button
              type="button"
              aria-label={t("children")}
              onClick={() => props.onChildrenChange(Math.min(8, props.children + 1))}
            >
              +
            </button>
          </div>
        </div>
        <div className="exp-travelers-row">
          <span>
            {t("infants")}
            <small className="exp-traveler-hint">{t("infantsAgeHint")}</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label={t("infants")}
              onClick={() => props.onInfantsChange?.(Math.max(0, infants - 1))}
            >
              −
            </button>
            <strong className="wg-num">{infants}</strong>
            <button
              type="button"
              aria-label={t("infants")}
              onClick={() =>
                props.onInfantsChange?.(Math.min(props.adults, infants + 1))
              }
            >
              +
            </button>
          </div>
        </div>
        <label className="wg-cabin-row">
          <span>{t("cabinClass")}</span>
          <select
            value={props.cabinClass}
            onChange={(e) => props.onCabinClassChange(e.target.value)}
            aria-label={t("cabinClass")}
          >
            <option value="economy">{t("cabinEconomy")}</option>
            <option value="premium_economy">{t("cabinPremium")}</option>
            <option value="business">{t("cabinBusiness")}</option>
            <option value="first">{t("cabinFirst")}</option>
          </select>
        </label>

        <FamilyTravelerPicker
          mode="multi"
          onSelectionChange={(members) => {
            if (!members.length) return;
            const counts = countsFromMembers(members);
            props.onAdultsChange(counts.adults);
            props.onChildrenChange(counts.children);
            props.onInfantsChange?.(counts.infants);
          }}
        />
        <button
          type="button"
          className="exp-pop-done"
          onClick={() => setTravelersOpen(false)}
        >
          {t("done")}
        </button>
      </div>
    );
  }

  function renderStayOccupancyPanel() {
    const state = props.stayOccupancy || {
      rooms: [{ adults: props.adults, childAges: Array.from({ length: props.children }, () => 8) }],
    };
    return (
        <div
          className="exp-travelers-panel exp-occupancy-panel"
          role="dialog"
          aria-label={t("roomsAndTravelers")}
        >
        <div className="exp-travelers-row">
          <span>{t("roomCountLabel")}</span>
          <div className="exp-stepper">
            <button
              type="button"
              onClick={() => updateStayOccupancy(setRoomCount(state, state.rooms.length - 1))}
            >
              −
            </button>
            <strong className="wg-num">{state.rooms.length}</strong>
            <button
              type="button"
              onClick={() => updateStayOccupancy(setRoomCount(state, state.rooms.length + 1))}
            >
              +
            </button>
          </div>
        </div>
        {state.rooms.map((room, roomIdx) => (
          <div key={roomIdx} className="exp-room-occ-block">
            <strong className="exp-room-occ-title">{t("roomN", { n: roomIdx + 1 })}</strong>
            <div className="exp-travelers-row">
              <span>{t("adults")}</span>
              <div className="exp-stepper">
                <button
                  type="button"
                  onClick={() => {
                    const rooms = state.rooms.map((r, i) =>
                      i === roomIdx ? { ...r, adults: Math.max(1, r.adults - 1) } : r,
                    );
                    updateStayOccupancy({ rooms });
                  }}
                >
                  −
                </button>
                <strong className="wg-num">{room.adults}</strong>
                <button
                  type="button"
                  onClick={() => {
                    const rooms = state.rooms.map((r, i) =>
                      i === roomIdx ? { ...r, adults: Math.min(6, r.adults + 1) } : r,
                    );
                    updateStayOccupancy({ rooms });
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="exp-travelers-row">
              <span>{t("children")}</span>
              <div className="exp-stepper">
                <button
                  type="button"
                  onClick={() => {
                    const rooms = state.rooms.map((r, i) =>
                      i === roomIdx
                        ? { ...r, childAges: r.childAges.slice(0, -1) }
                        : r,
                    );
                    updateStayOccupancy({ rooms });
                  }}
                >
                  −
                </button>
                <strong className="wg-num">{room.childAges.length}</strong>
                <button
                  type="button"
                  onClick={() => {
                    const rooms = state.rooms.map((r, i) =>
                      i === roomIdx
                        ? { ...r, childAges: [...r.childAges, 8].slice(0, 4) }
                        : r,
                    );
                    updateStayOccupancy({ rooms });
                  }}
                >
                  +
                </button>
              </div>
            </div>
            {room.childAges.map((age, childIdx) => (
              <div key={childIdx} className="exp-travelers-row">
                <span>{t("childAgeN", { n: childIdx + 1 })}</span>
                <select
                  value={age}
                  onChange={(e) => {
                    const nextAge = Number(e.target.value);
                    const rooms = state.rooms.map((r, i) => {
                      if (i !== roomIdx) return r;
                      const childAges = [...r.childAges];
                      childAges[childIdx] = nextAge;
                      return { ...r, childAges };
                    });
                    updateStayOccupancy({ rooms });
                  }}
                >
                  {Array.from({ length: 18 }, (_, ageOpt) => (
                    <option key={ageOpt} value={ageOpt}>
                      {t("yearsOld", { n: ageOpt })}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {state.rooms.length > 1 ? (
              <button
                type="button"
                className="exp-room-remove"
                onClick={() => {
                  const rooms = state.rooms.filter((_, i) => i !== roomIdx);
                  updateStayOccupancy({ rooms: rooms.length ? rooms : [emptyRoom(1)] });
                }}
              >
                {t("removeRoom")}
              </button>
            ) : null}
          </div>
        ))}
        {occError ? <p className="shop-error exp-occ-error">{occError}</p> : null}
        <FamilyTravelerPicker
          mode="multi"
          onSelectionChange={(members) => {
            if (!members.length) return;
            const counts = countsFromMembers(members);
            updateStayOccupancy({
              rooms: [
                {
                  adults: counts.adults,
                  childAges: Array.from({ length: counts.children }, () => 8),
                },
              ],
            });
          }}
        />

        <button
          type="button"
          className="exp-pop-done"
          onClick={() => {
            const err = validateOccupancyMessage(state, locale);
            if (err) {
              setOccError(err);
              return;
            }
            setTravelersOpen(false);
          }}
        >
          {t("done")}
        </button>
      </div>
    );
  }

  function renderTravelersPanel() {
    if (!travelersOpen) return null;
    return props.mode === "stays"
      ? renderStayOccupancyPanel()
      : renderFlightTravelersPanel();
  }

  function renderTravelersCell() {
    return (
      <div
        className="wg-simple-cell wg-cell-travelers"
        data-field={props.mode === "stays" ? "guests" : "travelers"}
        ref={travelersWrapRef}
      >
        <span className="wg-field-ico">
          <FieldIcon name="travelers" />
        </span>
        <button
          type="button"
          className={`exp-travelers-trigger${travelersOpen ? " open" : ""}`}
          aria-expanded={travelersOpen}
          onClick={(e) => {
            e.stopPropagation();
            setTravelersOpen((v) => !v);
          }}
        >
          <strong className="wg-traveler-line">
            {props.mode === "flights" ? (
              <>
                <span className="wg-traveler-count">
                  <span className="wg-num" dir="ltr">
                    {travelerCount}
                  </span>
                  <span>{travelerWord}</span>
                </span>
                <span className="wg-traveler-sep">{locale === "en" ? "," : "،"}</span>
                <span className="wg-cabin-chip">{cabinLabel}</span>
              </>
            ) : (
              travelerSummary
            )}
          </strong>
        </button>
        {renderTravelersPanel()}
      </div>
    );
  }

  function searchCtaLabel() {
    if (props.mode === "stays") return t("searchHotelsCta");
    if (props.mode === "cars") return t("searchCarsCta");
    if (props.mode === "activities") return t("searchActivitiesCta");
    return t("searchFlightsCta");
  }

  function renderSearchButton(_extraClass = "") {
    return (
      <button
        type="button"
        className="wg-search-btn"
        disabled={props.loading}
        onClick={props.onSearch}
      >
        <span>{props.loading ? "..." : locale === "en" ? "Search" : "ابحث"}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      </button>
    );
  }

  function swapLegAirports(legId: string) {
    const leg = props.flightLegs.find((row) => row.id === legId);
    if (!leg) return;
    props.onFlightLegChange(legId, {
      origin: leg.destination,
      originLabel: leg.destinationLabel,
      destination: leg.origin,
      destinationLabel: leg.originLabel,
    });
  }

  function renderServiceTabs() {
    const tabs = (
      <>
        {([
          { key: "flights" as const, label: locale === "en" ? "Flights" : "طيران" },
          { key: "stays" as const, label: locale === "en" ? "Hotels" : "فنادق" },
          { key: "cars" as const, label: locale === "en" ? "Cars" : "سيارات" },
          { key: "activities" as const, label: locale === "en" ? "Activities" : "أنشطة" },
        ] as const)
          .filter((p) => enabledModes.includes(p.key))
          .map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={`wg-svc-tab${props.mode === key ? " on" : ""}`}
              aria-selected={props.mode === key}
              onClick={() => {
                props.onModeChange(key);
                setDockOpen(true);
                setTravelersOpen(false);
              }}
            >
              <TabGlyph mode={key} />
              <span>{label}</span>
            </button>
          ))}
        {showMyTrip && (props.onRuheltiClick || props.tripBuilderHref) ? (
          props.onRuheltiClick ? (
            <button
              type="button"
              className="wg-svc-tab"
              onClick={() => props.onRuheltiClick?.()}
              aria-haspopup="dialog"
            >
              <TabGlyph mode="trip" />
              <span>{locale === "en" ? "Full trips" : "رحلات كاملة"}</span>
            </button>
          ) : (
            <Link href={props.tripBuilderHref || "/trip-builder"} className="wg-svc-tab">
              <TabGlyph mode="trip" />
              <span>{locale === "en" ? "Full trips" : "رحلات كاملة"}</span>
            </Link>
          )
        ) : (
          <Link href="/account" className="wg-svc-tab">
            <TabGlyph mode="trip" />
            <span>{locale === "en" ? "Full trips" : "رحلات كاملة"}</span>
          </Link>
        )}
      </>
    );
    if (headerSlot) return createPortal(tabs, headerSlot);
    return <div className="wg-svc-tabs" role="tablist">{tabs}</div>;
  }

  const isMulticity = props.tripType === "multicity";

  function swapAirports() {
    const o = props.origin;
    const ol = props.originLabel;
    props.onOriginPick({ id: "swap", code: props.destination, title: props.destinationLabel });
    props.onDestinationPick({ id: "swap", code: o, title: ol });
  }

  const showReturnDate =
    (props.mode === "flights" && props.tripType === "roundtrip") ||
    props.mode === "stays" ||
    props.mode === "activities" ||
    (props.mode === "cars" && props.transferRoundtrip);
  const hotelNights = nightsBetweenIso(props.departDate, props.returnDate);

  return (
    <>
      <section className="wg-travela-hero" aria-label={t("heroAria")}>
        <div className="wg-hero-blue-strip" aria-hidden />
        {renderServiceTabs()}
        <div className="wg-travela-carousel">
          {slides.map((slide, index) => (
            <div
              key={slide.image}
              className={`wg-travela-slide${index === slideIdx ? " active" : ""}`}
              aria-hidden={index !== slideIdx}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image} alt="" />
              <div className="wg-travela-caption">
                <div className="wg-travela-caption-inner">
                  <h4>{slide.kicker}</h4>
                  <h1>{slide.title}</h1>
                  <p>{slide.description}</p>
                </div>
              </div>
            </div>
          ))}
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                className="wg-travela-carousel-btn prev"
                aria-label={t("prevSlide")}
                onClick={prevSlide}
              >
                ‹
              </button>
              <button
                type="button"
                className="wg-travela-carousel-btn next"
                aria-label={t("nextSlide")}
                onClick={nextSlide}
              >
                ›
              </button>
              <ol className="wg-travela-dots" aria-label={t("slidesAria")}>
                {slides.map((slide, index) => (
                  <li key={slide.image}>
                    <button
                      type="button"
                      className={index === slideIdx ? "active" : undefined}
                      aria-label={t("slideN", { n: index + 1 })}
                      aria-current={index === slideIdx ? "true" : undefined}
                      onClick={() => setSlideIdx(index)}
                    />
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>

        <div className="wg-hero-search-panel wg-simple-search" id="search" dir={locale === "en" ? "ltr" : "rtl"} lang={locale}>
          <style
            dangerouslySetInnerHTML={{
              __html: `
#search.wg-simple-search {
  width: min(calc(1120px + 4cm), calc(100% - 1.15rem)) !important;
  max-width: calc(1120px + 4cm) !important;
          top: 5.35rem !important;
  bottom: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  display: grid !important;
  gap: 0 !important;
  z-index: 30 !important;
}
.wg-travela-hero .wg-hero-blue-strip {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: calc(5.35rem + 4rem) !important;
  background: #1565c0 !important;
  z-index: 3 !important;
  pointer-events: none !important;
}
.wg-travela-carousel-btn {
  background: #1565c0 !important;
  color: #fff !important;
}
html body .shop-root .shop-header.wg-header-blue,
html body .shop-root.wg-new-ui .exp-header-hero-overlay.wg-header-blue {
  background: #1565c0 !important;
  background-color: #1565c0 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}
html body .shop-root.wg-new-ui .wg-header-blue .wg-topbar-start {
  display: flex !important;
  align-items: center !important;
  gap: 1.1rem !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
}
html body .wg-travela-hero .wg-travela-caption {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  text-align: center !important;
  padding: clamp(13.8rem, 25vh, 17.6rem) clamp(1.4rem, 5vw, 4.75rem) 5rem !important;
  background: linear-gradient(to right, rgba(8, 18, 38, 0.42) 0%, rgba(8, 18, 38, 0.12) 40%, transparent 68%) !important;
}
html body .shop-root[dir="ltr"] .wg-travela-hero .wg-travela-caption {
  background: linear-gradient(to left, rgba(8, 18, 38, 0.4) 0%, rgba(8, 18, 38, 0.12) 38%, transparent 66%) !important;
}
html body .wg-travela-hero .wg-travela-caption-inner {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  width: min(36rem, 52vw) !important;
  max-width: min(36rem, 52vw) !important;
  margin: 0 !important;
  text-align: center !important;
}
html body .wg-travela-hero .wg-travela-caption h4,
html body .wg-travela-hero .wg-travela-caption h1,
html body .wg-travela-hero .wg-travela-caption p {
  width: 100% !important;
  text-align: center !important;
}
html body .wg-travela-hero .wg-travela-caption h4 {
  color: #d4af6a !important;
  font-family: Amiri, "Playfair Display", Georgia, serif !important;
  font-weight: 400 !important;
  letter-spacing: 0.16em !important;
}
html body .wg-travela-hero .wg-travela-caption h1 {
  color: #f8f1e6 !important;
  font-family: Amiri, "Playfair Display", Georgia, serif !important;
  font-weight: 700 !important;
  font-size: clamp(2.5rem, 5.8vw, 4.7rem) !important;
  line-height: 1.28 !important;
  border-inline-start: 0 !important;
  padding-inline-start: 0 !important;
  text-align: center !important;
  text-wrap: balance !important;
}
html body .wg-travela-hero .wg-travela-caption h1::after {
  content: "" !important;
  display: block !important;
  width: 2.55rem !important;
  height: 2px !important;
  margin: 0.78rem auto 0 !important;
  background: #d4af6a !important;
}
html body .wg-travela-hero .wg-travela-caption p {
  color: rgba(248, 241, 230, 0.88) !important;
  padding-inline-start: 0 !important;
  text-wrap: balance !important;
}
@media (max-width: 767px) {
  html body .wg-travela-hero .wg-travela-caption {
    align-items: center !important;
    padding: 8.15rem 1rem 0 !important;
  }
  html body .wg-travela-hero .wg-travela-caption-inner {
    width: min(22rem, 92vw) !important;
    max-width: 92vw !important;
  }
  html body .wg-travela-hero .wg-travela-caption h4 {
    font-size: 0.78rem !important;
    margin-bottom: 0.28rem !important;
  }
  html body .wg-travela-hero .wg-travela-caption h1 {
    font-size: clamp(1.65rem, 7vw, 2.15rem) !important;
    margin-bottom: 0.45rem !important;
  }
  html body .wg-travela-hero .wg-travela-caption p {
    font-size: 0.86rem !important;
    line-height: 1.55 !important;
  }
}
.wg-header-services,
.wg-svc-tabs {
  display: flex !important;
  align-items: center !important;
  gap: 0.45rem 0.85rem !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  scrollbar-width: none !important;
}
.wg-header-services::-webkit-scrollbar,
.wg-svc-tabs::-webkit-scrollbar { display: none !important; }
.wg-header-services .wg-svc-tab,
.wg-svc-tabs .wg-svc-tab {
  appearance: none !important;
  border: 0 !important;
  background: transparent !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  font: inherit !important;
  font-size: 1.24rem !important;
  letter-spacing: 0.01em !important;
  white-space: nowrap !important;
  font-weight: 900 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.52rem !important;
  padding: 0.36rem 0.34rem 0.5rem !important;
  cursor: pointer !important;
  text-decoration: none !important;
  border-bottom: 2px solid transparent !important;
  opacity: 0.94 !important;
  min-height: 0 !important;
  height: auto !important;
  box-shadow: none !important;
}
.wg-header-services .wg-svc-tab svg,
.wg-svc-tabs .wg-svc-tab svg {
  width: 26px !important;
  height: 26px !important;
  flex: 0 0 auto !important;
}
.wg-header-services .wg-svc-tab.on,
.wg-svc-tabs .wg-svc-tab.on {
  opacity: 1 !important;
  border-bottom-color: #fff !important;
}
#search.wg-simple-search .wg-simple-card {
  background: #fff !important;
  border-radius: 22px !important;
  padding: 0.75rem 0.95rem 0.85rem !important;
  box-shadow: 0 10px 36px rgba(8, 18, 38, 0.18) !important;
  display: grid !important;
  gap: 0.55rem !important;
  overflow: visible !important;
}
#search.wg-simple-search .wg-options {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.35rem 1.1rem !important;
}
#search.wg-simple-search .wg-check {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
  font-size: 0.86rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  background: none !important;
  border: 0 !important;
  padding: 0 !important;
  min-height: 0 !important;
}
#search.wg-simple-search .wg-check input {
  width: 0.95rem !important;
  height: 0.95rem !important;
  margin: 0 !important;
  accent-color: #8b93a7 !important;
}
#search.wg-simple-search .wg-simple-fields {
  display: flex !important;
  align-items: stretch !important;
  min-height: 56px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  overflow: visible !important;
  position: relative !important;
  padding: 0 !important;
}
#search.wg-simple-search .wg-simple-cell {
  flex: 1 1 0 !important;
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  padding: 0.3rem 0.7rem !important;
  position: relative !important;
  border: 1.5px solid #1565c0 !important;
  border-radius: 12px !important;
  margin: 0 0.12rem !important;
  background: #fff !important;
  box-shadow: none !important;
  height: auto !important;
  min-height: 52px !important;
}
#search.wg-simple-search .wg-simple-fields > .wg-simple-cell:first-child {
  border-inline-start: 1.5px solid #1565c0 !important;
}
#search.wg-simple-search .wg-cell-origin,
#search.wg-simple-search .wg-cell-dest,
#search.wg-simple-search .wg-cell-dates,
#search.wg-simple-search .wg-cell-nights,
#search.wg-simple-search .wg-cell-travelers,
#search.wg-simple-search .wg-cell-time {
  border: 1.5px solid #1565c0 !important;
  border-radius: 12px !important;
  margin: 0 0.12rem !important;
  background: #fff !important;
}
#search.wg-simple-search .wg-cell-origin,
#search.wg-simple-search .wg-cell-dest {
  flex: 1.2 1 0 !important;
  min-width: 8.5rem !important;
}
#search.wg-simple-search .wg-cell-travelers {
  flex: 1.05 1 0 !important;
  min-width: 8.4rem !important;
}
#search.wg-simple-search .wg-cell-dates {
  flex: 0 0 auto !important;
  width: max-content !important;
  min-width: 0 !important;
  max-width: none !important;
  padding-inline: 0.45rem 0.55rem !important;
}
#search.wg-simple-search .wg-cell-dates .shop-date-range,
#search.wg-simple-search .wg-cell-dates .exp-date-pick {
  flex: 0 0 auto !important;
  width: max-content !important;
  min-width: 0 !important;
}
#search.wg-simple-search .shop-date-range-summary,
#search.wg-simple-search .shop-date-range-footer-dates {
  white-space: nowrap !important;
}
#search.wg-simple-search .wg-simple-cell:focus-within {
  box-shadow: none !important;
}
#search.wg-simple-search .wg-field-ico {
  flex: 0 0 auto !important;
  width: 26px !important;
  height: 26px !important;
  color: #111 !important;
  display: grid !important;
  place-items: center !important;
  pointer-events: none !important;
}
#search.wg-simple-search .wg-field-ico svg,
#search.wg-simple-search .wg-field-ico img {
  width: 26px !important;
  height: 26px !important;
  display: block !important;
  object-fit: contain !important;
}
#search.wg-simple-search .wg-plane-off,
#search.wg-simple-search .wg-plane-land {
  border-radius: 50% !important;
}
#search.wg-simple-search .wg-plane-land {
  transform: rotate(180deg) !important;
}
#search.wg-simple-search .exp-travelers-trigger {
  display: flex !important;
  align-items: center !important;
  min-width: 0 !important;
}
#search.wg-simple-search .wg-traveler-line {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 0.28rem !important;
  line-height: 1.2 !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
}
#search.wg-simple-search .wg-traveler-count,
#search.wg-simple-search .wg-traveler-sep,
#search.wg-simple-search .wg-cabin-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.28rem !important;
  white-space: nowrap !important;
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
  font-size: 0.92rem !important;
  font-weight: 800 !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-day:not(.muted),
html body #search.wg-simple-search .shop-date-range-day:not(.muted) {
  color: #0b1b3a !important;
  -webkit-text-fill-color: #0b1b3a !important;
  font-weight: 800 !important;
  background: #eaf3fb !important;
  border-radius: 8px !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-day.muted,
html body #search.wg-simple-search .shop-date-range-day.muted {
  color: #b7bcc6 !important;
  -webkit-text-fill-color: #b7bcc6 !important;
  background: #f3f4f6 !important;
  text-decoration: line-through !important;
  opacity: 0.7 !important;
  cursor: not-allowed !important;
}
html body .shop-root #search.wg-simple-search .shop-date-day-cell.range-start .shop-date-range-day,
html body .shop-root #search.wg-simple-search .shop-date-day-cell.range-end .shop-date-range-day,
html body .shop-root #search.wg-simple-search .shop-date-day-cell.range-single .shop-date-range-day {
  background: #1565c0 !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  text-decoration: none !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-pop-head,
html body #search.wg-simple-search .shop-date-range-pop-head,
html body .shop-root #search.wg-simple-search .shop-date-range-phase,
html body #search.wg-simple-search .shop-date-range-phase {
  display: none !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-footer,
html body #search.wg-simple-search .shop-date-range-footer {
  display: flex !important;
  flex-direction: row !important;
  direction: ltr !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.6rem !important;
  margin-top: 0.45rem !important;
  padding-top: 0.4rem !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-footer-dates,
html body #search.wg-simple-search .shop-date-range-footer-dates {
  white-space: nowrap !important;
  direction: rtl !important;
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  flex: 1 1 auto !important;
  text-align: end !important;
}
html body .shop-root #search.wg-simple-search .exp-pop-done,
html body #search.wg-simple-search .exp-pop-done,
html body .shop-root #search.wg-simple-search .shop-date-range-footer .exp-pop-done {
  white-space: nowrap !important;
  line-height: 1 !important;
  width: auto !important;
  min-width: 2.6rem !important;
  max-width: 4.2rem !important;
  min-height: 1.65rem !important;
  height: 1.65rem !important;
  padding: 0 0.7rem !important;
  margin: 0 !important;
  flex: 0 0 auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.82rem !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
  border-radius: 8px !important;
  background: #1565c0 !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}
#search.wg-simple-search .wg-simple-cell .exp-cell-label,
#search.wg-simple-search .wg-simple-cell .shop-ac-inline > span:first-child {
  display: none !important;
}
#search.wg-simple-search .wg-simple-cell .shop-ac-inline,
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input,
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input:focus,
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input:focus-visible,
#search.wg-simple-search .wg-simple-cell .exp-date-btn,
#search.wg-simple-search .wg-simple-cell .exp-travelers-trigger,
#search.wg-simple-search .wg-simple-cell .shop-date-range-trigger,
#search.wg-simple-search .wg-simple-cell .exp-time-select {
  border: 0 !important;
  outline: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
  caret-color: #1565c0 !important;
  width: 100% !important;
  text-shadow: none !important;
  color-scheme: light !important;
}
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input:-webkit-autofill,
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  -webkit-text-fill-color: #111 !important;
  caret-color: #1565c0 !important;
}
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input::selection {
  background: #d6e8fb !important;
  color: #111 !important;
}
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input,
#search.wg-simple-search .wg-simple-cell .exp-date-btn,
#search.wg-simple-search .wg-simple-cell .exp-travelers-trigger strong,
#search.wg-simple-search .wg-simple-cell .shop-date-range-trigger {
  font-size: 0.92rem !important;
  font-weight: 700 !important;
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
}
#search.wg-simple-search .wg-simple-cell .shop-ac-inline input::placeholder {
  color: #3a3a3a !important;
  -webkit-text-fill-color: #3a3a3a !important;
  opacity: 1 !important;
}
#search.wg-simple-search .wg-swap {
  flex: 0 0 auto !important;
  align-self: center !important;
  width: 1.7rem !important;
  height: 1.7rem !important;
  border: 0 !important;
  background: transparent !important;
  color: #8b93a7 !important;
  cursor: pointer !important;
  display: grid !important;
  place-items: center !important;
}
#search.wg-simple-search .wg-search-btn {
  flex: 0 0 auto !important;
  align-self: center !important;
  margin-block: 0 !important;
  margin-inline-start: 0.2rem !important;
  margin-inline-end: 0 !important;
  min-height: 52px !important;
  padding: 0 1.2rem !important;
  border: 0 !important;
  border-radius: 12px !important;
  background: #1565c0 !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  font: inherit !important;
  font-size: 1.02rem !important;
  font-weight: 800 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  cursor: pointer !important;
  box-shadow: 0 8px 20px rgba(13, 71, 161, 0.35) !important;
  min-width: 6.4rem !important;
  position: relative !important;
  z-index: 4 !important;
}
#search.wg-simple-search .wg-num,
#search.wg-simple-search .exp-date-btn,
#search.wg-simple-search .exp-travelers-trigger strong,
#search.wg-simple-search .exp-time-select,
#search.wg-simple-search .exp-stepper strong {
  direction: ltr !important;
  unicode-bidi: isolate !important;
  font-variant-numeric: lining-nums tabular-nums !important;
  font-feature-settings: "locl" 0 !important;
}
#search.wg-simple-search .wg-search-btn:hover:not(:disabled) {
  background: #0d47a1 !important;
}
html body .shop-root #search.wg-simple-search .prc-suggest,
html body .shop-root #search.wg-simple-search .exp-ac-menu,
html body .shop-root #search.wg-simple-search .shop-ac .prc-suggest,
html body .shop-root #search.wg-simple-search .exp-travelers-panel,
html body .shop-root #search.wg-simple-search .exp-occupancy-panel,
html body #search.wg-simple-search .prc-suggest,
html body #search.wg-simple-search .exp-ac-menu,
html body #search.wg-simple-search .exp-travelers-panel,
html body #search.wg-simple-search .exp-occupancy-panel {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  bottom: auto !important;
  inset-inline-start: 0 !important;
  inset-inline-end: auto !important;
  left: auto !important;
  right: auto !important;
  transform: none !important;
  z-index: 80 !important;
  max-height: min(280px, 45vh) !important;
  overflow: auto !important;
}
html body .shop-root #search.wg-simple-search .shop-date-range-pop,
html body #search.wg-simple-search .shop-date-range-pop {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  bottom: auto !important;
  inset-inline-start: 0 !important;
  inset-inline-end: auto !important;
  left: auto !important;
  right: auto !important;
  transform: none !important;
  z-index: 80 !important;
  max-height: none !important;
  height: auto !important;
  overflow: hidden !important;
  width: min(620px, 92vw) !important;
  padding: 0.65rem 0.75rem 0.55rem !important;
}
#search.wg-simple-search .shop-date-range {
  flex: 0 0 auto !important;
  width: max-content !important;
  min-width: 0 !important;
  position: relative !important;
}
#search.wg-simple-search .shop-date-range-trigger {
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  flex-wrap: nowrap !important;
  width: max-content !important;
  min-width: 0 !important;
}
#search.wg-simple-search .wg-cell-dates .shop-date-range-trigger,
#search.wg-simple-search .wg-cell-dates .exp-date-btn {
  width: max-content !important;
  font-size: 0.86rem !important;
  padding-inline: 0 !important;
}
#search.wg-simple-search .wg-cell-nights {
  flex: 0 0 auto !important;
  min-width: 4.4rem !important;
  max-width: 5.6rem !important;
  padding: 0.25rem 0.5rem !important;
  justify-content: center !important;
  gap: 0.22rem !important;
  font-size: 0.8rem !important;
  font-weight: 800 !important;
  color: #1565c0 !important;
  -webkit-text-fill-color: #1565c0 !important;
  white-space: nowrap !important;
}
#search.wg-simple-search .shop-date-range-months {
  gap: 0.7rem !important;
}
#search.wg-simple-search .shop-date-month-title {
  margin-bottom: 0.25rem !important;
  font-size: 0.82rem !important;
}
#search.wg-simple-search .shop-date-day-cell {
  min-height: 1.85rem !important;
}
#search.wg-simple-search .shop-date-range-day {
  width: 1.75rem !important;
  height: 1.75rem !important;
}
#search.wg-simple-search .shop-date-range-nav {
  margin-bottom: 0.15rem !important;
}
html body .shop-root #search.wg-simple-search .prc-suggest button,
html body .shop-root #search.wg-simple-search .exp-ac-menu button,
html body #search.wg-simple-search .prc-suggest button {
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
}
html body .shop-root #search.wg-simple-search .prc-suggest,
html body .shop-root #search.wg-simple-search .exp-ac-menu,
html body #search.wg-simple-search .prc-suggest,
html body #search.wg-simple-search .exp-ac-menu {
  background: #fff !important;
  background-color: #fff !important;
  color: #111 !important;
  border: 1.5px solid #1565c0 !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 28px rgba(8, 18, 38, 0.12) !important;
  color-scheme: light !important;
}
html body .shop-root #search.wg-simple-search .prc-suggest button strong,
html body #search.wg-simple-search .prc-suggest button strong {
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
}
#search.wg-simple-search .wg-add-leg {
  border: 0 !important;
  background: transparent !important;
  color: #111 !important;
  font: inherit !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  width: fit-content !important;
}
#search.wg-simple-search .wg-cabin-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.75rem !important;
  color: #111 !important;
}
#search.wg-simple-search .wg-cabin-row select {
  border: 1px solid #e6e8ee !important;
  border-radius: 8px !important;
  background: #fff !important;
  color: #111 !important;
}
@media (max-width: 720px) {
  #search.wg-simple-search .wg-simple-fields { flex-wrap: wrap !important; }
  #search.wg-simple-search .wg-simple-cell { flex: 1 1 100% !important; border: 1.5px solid #1565c0 !important; }
  #search.wg-simple-search .wg-cell-dates { flex: 1 1 100% !important; width: auto !important; }
  #search.wg-simple-search .wg-search-btn { width: auto !important; margin-inline-end: 0 !important; justify-content: center !important; }
}
`,
            }}
          />
          <div className="wg-simple-card">
            {props.mode === "flights" ? (
              <div className="wg-options" role="group" aria-label={t("tripType")}>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.tripType === "oneway"}
                    onChange={() => props.onTripTypeChange("oneway")}
                  />
                  <span>{t("oneWay")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.tripType === "roundtrip"}
                    onChange={() => props.onTripTypeChange("roundtrip")}
                  />
                  <span>{t("roundTrip")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.tripType === "multicity"}
                    onChange={() => props.onTripTypeChange("multicity")}
                  />
                  <span>{t("multiCity")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.directOnly}
                    onChange={(e) => props.onDirectOnlyChange(e.target.checked)}
                  />
                  <span>{t("directOnly")}</span>
                </label>
              </div>
            ) : null}
            {props.mode === "cars" ? (
              <div className="wg-options" role="group" aria-label={t("tripType")}>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={!props.transferRoundtrip}
                    onChange={() => props.onTransferRoundtripChange(false)}
                  />
                  <span>{t("arrivalOnly")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.transferRoundtrip}
                    onChange={() => props.onTransferRoundtripChange(true)}
                  />
                  <span>{t("arrivalAndReturn")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.transferAirport}
                    onChange={(e) => props.onTransferAirportChange(e.target.checked)}
                  />
                  <span>{t("airportTransfer")}</span>
                </label>
                <label className="wg-check">
                  <input
                    type="checkbox"
                    checked={props.transferCarRental}
                    onChange={(e) => props.onTransferCarRentalChange(e.target.checked)}
                  />
                  <span>{t("carRental")}</span>
                </label>
              </div>
            ) : null}

            {props.mode === "flights" && isMulticity ? (
              <div className="exp-multicity-stack">
                {props.flightLegs.map((leg, index) => (
                  <div key={leg.id} className="wg-simple-fields">
                    <span className="wg-leg-badge">{t("flightLegN", { n: index + 1 })}</span>
                    <div className="wg-simple-cell wg-cell-grow wg-cell-origin">
                      <span className="wg-field-ico">
                        <FieldIcon name="takeoff" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={fromLabel}
                        value={leg.origin}
                        display={leg.originLabel}
                        placeholder={fromPlaceholder}
                        onQuery={props.searchAirports}
                        onClearText={(text) =>
                          props.onFlightLegChange(leg.id, { origin: "", originLabel: text })
                        }
                        onPick={(item) =>
                          props.onFlightLegChange(leg.id, {
                            origin: item.code,
                            originLabel: item.title,
                          })
                        }
                      />
                    </div>
                    <button type="button" className="wg-swap" aria-label={t("swap")} onClick={() => swapLegAirports(leg.id)}>
                      <IconSwap />
                    </button>
                    <div className="wg-simple-cell wg-cell-grow wg-cell-dest">
                      <span className="wg-field-ico">
                        <FieldIcon name="landing" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={toLabel}
                        value={leg.destination}
                        display={leg.destinationLabel}
                        placeholder={toPlaceholder}
                        onQuery={props.searchAirports}
                        onClearText={(text) =>
                          props.onFlightLegChange(leg.id, {
                            destination: "",
                            destinationLabel: text,
                          })
                        }
                        onPick={(item) =>
                          props.onFlightLegChange(leg.id, {
                            destination: item.code,
                            destinationLabel: item.title,
                          })
                        }
                      />
                    </div>
                    <div className="wg-simple-cell wg-cell-dates">
                      <span className="wg-field-ico">
                        <FieldIcon name="dates" />
                      </span>
                      <DatePick
                        value={leg.departDate}
                        onChange={(v) => props.onFlightLegChange(leg.id, { departDate: v })}
                        label={t("departDate")}
                      />
                    </div>
                    {props.flightLegs.length > 2 ? (
                      <button
                        type="button"
                        className="exp-leg-remove"
                        aria-label={t("removeFlight")}
                        onClick={() => props.onRemoveFlightLeg(leg.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                {props.flightLegs.length < 5 ? (
                  <button type="button" className="wg-add-leg" onClick={props.onAddFlightLeg}>
                    + {t("addFlight")}
                  </button>
                ) : null}
                <div className="wg-simple-fields">
                  {renderTravelersCell()}
                  {renderSearchButton()}
                </div>
              </div>
            ) : (
              <div className="wg-simple-fields">
                {props.mode === "flights" ? (
                  <>
                    <div className="wg-simple-cell wg-cell-grow wg-cell-origin">
                      <span className="wg-field-ico">
                        <FieldIcon name="takeoff" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={fromLabel}
                        value={props.origin}
                        display={props.originLabel}
                        placeholder={fromPlaceholder}
                        onQuery={props.searchAirports}
                        onClearText={props.onOriginClear}
                        onPick={props.onOriginPick}
                      />
                    </div>
                    <button type="button" className="wg-swap" aria-label={t("swap")} onClick={swapAirports}>
                      <IconSwap />
                    </button>
                    <div className="wg-simple-cell wg-cell-grow wg-cell-dest">
                      <span className="wg-field-ico">
                        <FieldIcon name="landing" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={toLabel}
                        value={props.destination}
                        display={props.destinationLabel}
                        placeholder={toPlaceholder}
                        onQuery={props.searchAirports}
                        onClearText={props.onDestinationClear}
                        onPick={props.onDestinationPick}
                      />
                    </div>
                  </>
                ) : null}
                {props.mode === "stays" ? (
                  <div className="wg-simple-cell wg-cell-grow">
                    <span className="wg-field-ico">
                      <FieldIcon name="location" />
                    </span>
                    <ShopAutocomplete
                      inline
                      label={t("whereTo")}
                      value={props.stayQuery}
                      display={props.stayQuery}
                      placeholder={t("whereToTravel")}
                      onQuery={props.searchCities}
                      onClearText={props.onStayQueryChange}
                      onPick={props.onStayPick}
                    />
                  </div>
                ) : null}
                {props.mode === "cars" ? (
                  <>
                    <div className="wg-simple-cell">
                      <span className="wg-field-ico">
                        <FieldIcon name="takeoff" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={t("airport")}
                        value={props.origin}
                        display={props.originLabel}
                        placeholder={t("pickAirport")}
                        onQuery={props.searchAirports}
                        onClearText={props.onOriginClear}
                        onPick={props.onOriginPick}
                      />
                    </div>
                    <div className="wg-simple-cell wg-cell-grow">
                      <span className="wg-field-ico">
                        <FieldIcon name="location" />
                      </span>
                      <ShopAutocomplete
                        inline
                        label={t("hotelOrAddress")}
                        value={props.transferDropoff}
                        display={props.transferDropoffLabel}
                        placeholder={t("hotelAddressPlaceholder")}
                        onQuery={props.searchCities}
                        onClearText={props.onTransferDropoffClear}
                        onPick={props.onTransferDropoffPick}
                      />
                    </div>
                  </>
                ) : null}
                {props.mode === "activities" ? (
                  <div className="wg-simple-cell wg-cell-grow">
                    <span className="wg-field-ico">
                      <FieldIcon name="location" />
                    </span>
                    <ShopAutocomplete
                      inline
                      label={toLabel}
                      value={props.activityDest}
                      display={props.activityLabel}
                      placeholder={t("activityCity")}
                      onQuery={props.searchCities}
                      onClearText={props.onActivityClear}
                      onPick={props.onActivityPick}
                    />
                  </div>
                ) : null}
                <div className="wg-simple-cell wg-cell-dates">
                  <span className="wg-field-ico">
                    <FieldIcon name="dates" />
                  </span>
                  {showReturnDate ? (
                    <ShopDateRangePicker
                      checkIn={props.departDate}
                      checkOut={props.returnDate}
                      onChange={(checkIn, checkOut) => {
                        props.onDepartDateChange(checkIn);
                        props.onReturnDateChange(checkOut);
                      }}
                      startLabel={
                        props.mode === "stays"
                          ? t("arrivalDate")
                          : props.mode === "activities"
                            ? t("startDate")
                            : t("departDate")
                      }
                      endLabel={
                        props.mode === "stays"
                          ? t("departDate")
                          : props.mode === "activities"
                            ? t("endDate")
                            : t("returnDate")
                      }
                      placeholder={t("selectTravelDates")}
                    />
                  ) : (
                    <DatePick value={props.departDate} onChange={props.onDepartDateChange} label={t("departDate")} />
                  )}
                </div>
                {props.mode === "stays" ? (
                  <div className="wg-simple-cell wg-cell-nights" aria-label={locale === "en" ? "nights" : "ليال"}>
                    <span className="wg-num" dir="ltr">
                      {hotelNights || 1}
                    </span>
                    <span>
                      {locale === "en"
                        ? hotelNights === 1
                          ? "night"
                          : "nights"
                        : hotelNights === 1
                          ? "ليلة"
                          : "ليالٍ"}
                    </span>
                  </div>
                ) : null}
                {props.mode === "cars" ? (
                  <>
                    <div className="wg-simple-cell wg-cell-time">
                      <select
                        className="exp-time-select"
                        value={props.pickupTime}
                        aria-label={t("arrivalTime")}
                        onChange={(e) => props.onPickupTimeChange(e.target.value)}
                      >
                        {["06:00", "08:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map((slot) => (
                          <option key={slot} value={slot}>
                            {formatTimeShort(slot, locale === "en")}
                          </option>
                        ))}
                      </select>
                    </div>
                    {props.transferRoundtrip ? (
                      <div className="wg-simple-cell wg-cell-time">
                        <select
                          className="exp-time-select"
                          value={props.dropoffTime}
                          aria-label={t("returnTime")}
                          onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                        >
                          {["08:00", "10:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map((slot) => (
                            <option key={slot} value={slot}>
                              {formatTimeShort(slot, locale === "en")}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {renderTravelersCell()}
                {renderSearchButton()}
              </div>
            )}
          </div>
          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
        </div>
      </section>
    </>
  );
}
