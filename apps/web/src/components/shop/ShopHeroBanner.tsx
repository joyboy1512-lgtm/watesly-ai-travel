"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { heroSlidesFor } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { formatDay } from "@/lib/flight-search";
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
        {mounted ? (value ? formatDay(value, locale) : label) : value || label}
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
  const travelerSummary =
    props.mode === "stays"
      ? t("guestsAdultsChildren", { adults: stayAdults, children: stayChildren })
      : shopTravelerCount(locale, props.adults + props.children + infants);

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
            <strong>{props.adults}</strong>
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
            <strong>{props.children}</strong>
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
            <strong>{infants}</strong>
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
            <strong>{state.rooms.length}</strong>
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
                <strong>{room.adults}</strong>
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
                <strong>{room.childAges.length}</strong>
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
        className="exp-input-cell exp-cell-travelers wg-hero-acc-field"
        data-field={props.mode === "stays" ? "guests" : "travelers"}
        ref={travelersWrapRef}
      >
        <span className="wg-hero-acc-field-ico" aria-hidden />
        <button
          type="button"
          className={`exp-travelers-trigger wg-hero-acc-field-body${travelersOpen ? " open" : ""}`}
          aria-expanded={travelersOpen}
          onClick={(e) => {
            e.stopPropagation();
            setTravelersOpen((v) => !v);
          }}
        >
          <span className="exp-cell-label">{props.mode === "stays" ? t("guests") : t("travelers")}</span>
          <strong>{travelerSummary}</strong>
        </button>
        <span className="wg-hero-acc-field-chevron" aria-hidden />
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

  function renderSearchButton(extraClass = "") {
    return (
      <button
        type="button"
        className={`exp-search-link wg-hero-acc-search-btn${extraClass ? ` ${extraClass}` : ""}`}
        disabled={props.loading}
        onClick={props.onSearch}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
        <span>{props.loading ? "..." : searchCtaLabel()}</span>
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

  return (
    <>
      <section className="wg-travela-hero" aria-label={t("heroAria")}>
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

        <div className="wg-hero-search-panel" id="search">
          {/* Visual-only: brighter blue tabs + glass body/trip row (matches reference). */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
#search.wg-hero-search-panel {
  --wg-search-blue: #1565c0;
  --wg-search-label: #111111;
  --wg-search-ink: #0d47a1;
  width: min(1180px, calc(100% - 3.25cm)) !important;
  max-width: 1180px !important;
  overflow: visible !important;
  margin-top: 0.55rem !important;
}
#search.wg-hero-search-panel .wg-hero-acc-shell,
#search.wg-hero-search-panel .wg-hero-ticket-shell,
#search.wg-hero-search-panel .wg-hero-dock-shell {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  position: relative !important;
}
/* Notebook spiral rings — decorative only */
#search.wg-hero-search-panel .wg-hero-acc-spiral {
  position: absolute !important;
  top: -0.7rem !important;
  inset-inline: 0.35rem !important;
  height: 1.4rem !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 0.045rem !important;
  pointer-events: none !important;
  z-index: 8 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-spiral-ring {
  flex: 0 0 auto !important;
  width: 0.48rem !important;
  height: 1.22rem !important;
  display: block !important;
  overflow: visible !important;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.35));
}
#search.wg-hero-search-panel .wg-hero-acc-spiral-ring ellipse {
  fill: none !important;
  stroke: url(#wgSpiralMetal) !important;
  stroke-width: 2.45 !important;
  stroke-linecap: round !important;
  vector-effect: non-scaling-stroke;
}
/* Top tabs: solid blue */
#search.wg-hero-search-panel .wg-hero-acc-modes,
#search.wg-hero-search-panel .wg-hero-dock-modes {
  background: var(--wg-search-blue) !important;
  background-color: var(--wg-search-blue) !important;
  background-image: none !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-bottom: 0 !important;
  border-radius: 18px 18px 0 0 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  min-height: 5.15rem !important;
  height: auto !important;
  max-height: none !important;
  align-items: stretch !important;
  overflow: visible !important;
  position: relative !important;
  z-index: 2 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-mode,
#search.wg-hero-search-panel .wg-hero-dock-mode.wg-hero-acc-mode {
  min-height: 5.15rem !important;
  height: auto !important;
  max-height: none !important;
  padding: 0.55rem 0.4rem 0.45rem !important;
  overflow: visible !important;
}
#search.wg-hero-search-panel .wg-hero-acc-mode.on,
#search.wg-hero-search-panel .wg-hero-acc-mode.is-expanded {
  background: rgba(0, 0, 0, 0.14) !important;
  box-shadow: none !important;
}
#search.wg-hero-search-panel .wg-hero-acc-mode.on .wg-hero-acc-icon,
#search.wg-hero-search-panel .wg-hero-acc-mode.is-expanded .wg-hero-acc-icon {
  background: rgba(255, 255, 255, 0.95) !important;
  color: var(--wg-search-blue) !important;
  border-radius: 999px !important;
  box-shadow: none !important;
}
#search.wg-hero-search-panel .wg-hero-acc-textcol {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.28rem !important;
}
#search.wg-hero-search-panel .wg-hero-acc-title {
  margin: 0 !important;
  line-height: 1.15 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-hint {
  display: block !important;
  margin: 0.2rem 0 0 !important;
  padding: 0 !important;
  max-width: 10.5rem !important;
  font-size: 0.7rem !important;
  line-height: 1.25 !important;
  color: rgba(255, 255, 255, 0.82) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  text-align: center !important;
}
#search.wg-hero-search-panel .wg-hero-acc-chevron,
#search.wg-hero-search-panel .wg-hero-acc-chevron.open {
  display: block !important;
  width: 14px !important;
  height: 14px !important;
  margin: 0.12rem auto 0 !important;
  color: rgba(255, 255, 255, 0.9) !important;
  fill: rgba(255, 255, 255, 0.9) !important;
}
/* رحلتي sticker */
#search.wg-hero-search-panel .wg-hero-acc-mode-ruhelti {
  position: relative !important;
  overflow: visible !important;
  z-index: 3 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-ruhelti-sticker {
  position: absolute !important;
  inset: 50% auto auto 50% !important;
  width: 4.35rem !important;
  height: 4.35rem !important;
  transform: translate(-50%, -50%) rotate(-8deg) !important;
  border-radius: 999px !important;
  border: 2px dashed rgba(255, 255, 255, 0.85) !important;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 55%),
    rgba(21, 101, 192, 0.35) !important;
  box-shadow:
    0 0 0 3px rgba(66, 165, 245, 0.35),
    0 6px 14px rgba(0, 20, 50, 0.28) !important;
  pointer-events: none !important;
  z-index: 0 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-ruhelti-stars {
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  background-image:
    radial-gradient(1.5px 1.5px at 18% 28%, #fff 99%, transparent 100%),
    radial-gradient(1.5px 1.5px at 72% 22%, #fff 99%, transparent 100%),
    radial-gradient(1.2px 1.2px at 80% 68%, #fff 99%, transparent 100%),
    radial-gradient(1.2px 1.2px at 28% 74%, #fff 99%, transparent 100%),
    radial-gradient(1.4px 1.4px at 50% 12%, #ffe082 99%, transparent 100%),
    radial-gradient(1.4px 1.4px at 58% 86%, #ffe082 99%, transparent 100%) !important;
}
#search.wg-hero-search-panel .wg-hero-acc-mode-ruhelti .wg-hero-acc-copy {
  position: relative !important;
  z-index: 1 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-mode-ruhelti .wg-hero-acc-title {
  font-size: 0.95rem !important;
  text-shadow: 0 1px 2px rgba(0, 20, 50, 0.45) !important;
}
/* Trip choices row + fields: frosted glass */
#search.wg-hero-search-panel .wg-hero-acc-tripstrip,
#search.wg-hero-search-panel .wg-hero-acc-shell.is-open .wg-hero-acc-tripstrip,
#search.wg-hero-search-panel .wg-hero-acc-shell .wg-hero-acc-tripstrip,
#wg-hero-search-fields.wg-hero-acc-panel,
#search.wg-hero-search-panel .wg-hero-acc-panel,
#search.wg-hero-search-panel .wg-hero-dock.wg-hero-acc-panel {
  background: rgba(8, 24, 48, 0.18) !important;
  background-color: rgba(8, 24, 48, 0.18) !important;
  background-image: none !important;
  border-color: rgba(255, 255, 255, 0.28) !important;
  border-style: solid !important;
  border-width: 1px !important;
  backdrop-filter: blur(28px) saturate(1.35) !important;
  -webkit-backdrop-filter: blur(28px) saturate(1.35) !important;
  box-shadow: none !important;
  overflow: visible !important;
}
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-dialog,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-unified-card,
#search.wg-hero-search-panel .wg-hero-acc-panel .wg-hero-ticket-card,
#search.wg-hero-search-panel .wg-hero-acc-panel .wg-hero-dock-card,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row.exp-form-flights,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row.exp-form-stays,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row.exp-form-cars,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row.exp-form-activities,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-input-cell,
#search.wg-hero-search-panel .wg-hero-acc-field,
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-flight-toolbar,
#search.wg-hero-search-panel .wg-hero-acc-panel .wg-hero-acc-flight-meta {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  overflow: visible !important;
}
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-form-row {
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  border-radius: 14px !important;
  backdrop-filter: none !important;
  min-height: 5.1rem !important;
  overflow: visible !important;
}
#search.wg-hero-search-panel .wg-hero-acc-tripstrip {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.55rem !important;
  min-height: 3.35rem !important;
  padding: 0.7rem 0.85rem !important;
  border-radius: 0 !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}
#search.wg-hero-search-panel .wg-hero-acc-panel {
  border-top: 0 !important;
  border-radius: 0 0 18px 18px !important;
  padding: 0.55rem 0.65rem 0.7rem !important;
}
/* Trip type pills */
#search.wg-hero-search-panel .wg-hero-acc-trip {
  background: transparent !important;
  border: 1.5px solid var(--wg-search-blue) !important;
  color: #e3f2fd !important;
  font-size: 0.92rem !important;
  font-weight: 800 !important;
  min-height: 2.35rem !important;
  max-height: none !important;
  padding: 0.4rem 1.05rem !important;
  border-radius: 999px !important;
}
#search.wg-hero-search-panel .wg-hero-acc-trip.on {
  background: var(--wg-search-blue) !important;
  border-color: var(--wg-search-blue) !important;
  color: #fff !important;
}
#search.wg-hero-search-panel .wg-hero-acc-trip-extra,
#search.wg-hero-search-panel .wg-hero-acc-cabin {
  display: none !important;
}
/* Fields: black labels raised; icons aligned with airport/value text */
#search.wg-hero-search-panel .wg-hero-acc-field,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="travelers"],
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="guests"] {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-end !important;
  column-gap: 0.55rem !important;
  min-width: 9.5rem !important;
  min-height: 5.25rem !important;
  padding: 0.45rem 0.85rem 0.75rem !important;
  overflow: visible !important;
}
#search.wg-hero-search-panel .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="travelers"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="guests"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="dates"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="from"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="to"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="destination"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="checkin"] .wg-hero-acc-field-ico,
#search.wg-hero-search-panel .wg-hero-acc-field[data-field="checkout"] .wg-hero-acc-field-ico {
  flex: 0 0 auto !important;
  width: 1.55rem !important;
  height: 1.55rem !important;
  min-width: 1.55rem !important;
  min-height: 1.55rem !important;
  color: #1565c0 !important;
  background: currentColor !important;
  background-color: currentColor !important;
  align-self: flex-end !important;
  margin: 0 0 0.12rem !important;
  transform: none !important;
  position: relative !important;
  top: 0 !important;
  filter: none !important;
  opacity: 1 !important;
  order: 0 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-field-body,
#search.wg-hero-search-panel .wg-hero-acc-field .exp-travelers-trigger,
#search.wg-hero-search-panel .wg-hero-acc-field .shop-ac-inline {
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  gap: 0.48rem !important;
  min-width: 0 !important;
  overflow: visible !important;
  order: 1 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-field-chevron {
  flex: 0 0 auto !important;
  align-self: flex-end !important;
  margin-bottom: 0.28rem !important;
  order: 2 !important;
}
#search.wg-hero-search-panel .wg-hero-acc-panel .exp-cell-label,
#search.wg-hero-search-panel .wg-hero-acc-field .exp-cell-label,
#search.wg-hero-search-panel .wg-hero-acc-field .shop-ac-inline > span:first-child,
#search.wg-hero-search-panel .wg-hero-acc-field .exp-travelers-trigger .exp-cell-label {
  color: #111111 !important;
  -webkit-text-fill-color: #111111 !important;
  font-weight: 800 !important;
  font-size: 1.05rem !important;
  line-height: 1.15 !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 1 !important;
  position: relative !important;
  top: -0.22rem !important;
}
#search.wg-hero-search-panel .wg-hero-acc-field .shop-ac-inline input,
#search.wg-hero-search-panel .wg-hero-acc-field .exp-date-btn,
#search.wg-hero-search-panel .wg-hero-acc-field .exp-travelers-trigger strong,
#search.wg-hero-search-panel .wg-hero-acc-field strong,
#search.wg-hero-search-panel .wg-hero-acc-field .shop-date-range-trigger {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  font-size: 1.02rem !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
  line-height: 1.2 !important;
  margin: 0 !important;
  padding: 0 !important;
}
/* Travelers / rooms popup: keep numbers & ages readable */
#search.wg-hero-search-panel .exp-travelers-panel,
#search.wg-hero-search-panel .exp-occupancy-panel {
  display: grid !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 90 !important;
  max-height: min(70vh, 520px) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  background: #fff !important;
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  min-width: 17rem !important;
  width: max(17rem, 100%) !important;
}
#search.wg-hero-search-panel .exp-travelers-panel *,
#search.wg-hero-search-panel .exp-occupancy-panel * {
  color: inherit;
}
#search.wg-hero-search-panel .exp-travelers-panel strong,
#search.wg-hero-search-panel .exp-occupancy-panel strong,
#search.wg-hero-search-panel .exp-travelers-panel .exp-stepper strong,
#search.wg-hero-search-panel .exp-occupancy-panel .exp-stepper strong,
#search.wg-hero-search-panel .exp-travelers-panel .exp-travelers-row > span,
#search.wg-hero-search-panel .exp-occupancy-panel .exp-travelers-row > span,
#search.wg-hero-search-panel .exp-occupancy-panel .exp-room-occ-title,
#search.wg-hero-search-panel .exp-travelers-panel label,
#search.wg-hero-search-panel .exp-occupancy-panel label,
#search.wg-hero-search-panel .exp-travelers-panel small,
#search.wg-hero-search-panel .exp-occupancy-panel small {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  opacity: 1 !important;
  visibility: visible !important;
  font-size: 0.95rem !important;
}
#search.wg-hero-search-panel .exp-travelers-panel select,
#search.wg-hero-search-panel .exp-occupancy-panel select {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  background: #fff !important;
  border: 1px solid #cbd5e1 !important;
  min-width: 5.5rem !important;
  opacity: 1 !important;
  visibility: visible !important;
}
#search.wg-hero-search-panel .exp-travelers-panel select option,
#search.wg-hero-search-panel .exp-occupancy-panel select option {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  background: #fff !important;
}
#search.wg-hero-search-panel .exp-stepper button {
  color: #0f172a !important;
  border-color: #cbd5e1 !important;
  background: #fff !important;
}
/* Transparent search CTA */
#search.wg-hero-search-panel .wg-hero-ticket-search.exp-search-link,
#search.wg-hero-search-panel .wg-hero-acc-search-btn,
#search.wg-hero-search-panel .exp-search-link.wg-hero-acc-search-btn {
  background: rgba(255, 255, 255, 0.14) !important;
  background-color: rgba(255, 255, 255, 0.14) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.55) !important;
  color: #fff !important;
  box-shadow: none !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  min-width: 10.75rem !important;
  white-space: nowrap !important;
}
#search.wg-hero-search-panel .wg-hero-ticket-search.exp-search-link:hover:not(:disabled),
#search.wg-hero-search-panel .wg-hero-acc-search-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22) !important;
  border-color: #fff !important;
  color: #fff !important;
}
`,
            }}
          />
          <div className={`wg-hero-ticket-shell wg-hero-dock-shell wg-hero-acc-shell${dockOpen ? " is-open" : ""}`} data-mode={props.mode}>
            <div className="wg-hero-acc-spiral" aria-hidden="true">
              <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
                <defs>
                  <linearGradient id="wgSpiralMetal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3e454e" />
                    <stop offset="18%" stopColor="#cfd5dc" />
                    <stop offset="36%" stopColor="#ffffff" />
                    <stop offset="52%" stopColor="#8a929c" />
                    <stop offset="70%" stopColor="#f4f6f8" />
                    <stop offset="88%" stopColor="#b7bec6" />
                    <stop offset="100%" stopColor="#4a515a" />
                  </linearGradient>
                </defs>
              </svg>
              {Array.from({ length: 42 }, (_, i) => (
                <svg key={i} className="wg-hero-acc-spiral-ring" viewBox="0 0 10 22" aria-hidden="true">
                  <ellipse cx="5" cy="11" rx="3.35" ry="8.6" fill="none" stroke="url(#wgSpiralMetal)" strokeWidth="2.55" />
                </svg>
              ))}
            </div>
            <div
              className="wg-hero-dock-modes wg-hero-acc-modes"
              role="tablist"
              aria-label={t("bookingType")}
            >
              {PRODUCT_KEYS.filter((p) => enabledModes.includes(p.key)).map(({ key, label, hint }) => {
                const on = props.mode === key;
                const expanded = on && dockOpen;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    className={`wg-hero-dock-mode wg-hero-acc-mode${on ? " on" : ""}${expanded ? " is-expanded" : ""}`}
                    aria-selected={on}
                    aria-expanded={expanded}
                    onClick={() => {
                      if (props.mode === key) {
                        setDockOpen((v) => !v);
                      } else {
                        props.onModeChange(key);
                        setDockOpen(true);
                      }
                      setTravelersOpen(false);
                    }}
                  >
                    <span className="wg-hero-acc-copy">
                      <span className="wg-hero-acc-textcol">
                        <span className="wg-hero-acc-title">{t(label)}</span>
                        <span className="wg-hero-acc-hint">{t(hint)}</span>
                        <AccordionChevron open={expanded} />
                      </span>
                      <span className="wg-hero-acc-icon" aria-hidden>
                        <ModeGlyph mode={key} />
                      </span>
                    </span>
                  </button>
                );
              })}
              {showMyTrip && (props.onRuheltiClick || props.tripBuilderHref) ? (
                props.onRuheltiClick ? (
                  <button
                    type="button"
                    className="wg-hero-dock-mode wg-hero-acc-mode wg-hero-acc-mode-ruhelti"
                    onClick={() => props.onRuheltiClick?.()}
                    aria-haspopup="dialog"
                  >
                    <span className="wg-hero-acc-ruhelti-sticker" aria-hidden>
                      <span className="wg-hero-acc-ruhelti-stars" />
                    </span>
                    <span className="wg-hero-acc-copy">
                      <span className="wg-hero-acc-textcol">
                        <span className="wg-hero-acc-title">{t("myTrip")}</span>
                      </span>
                    </span>
                  </button>
                ) : (
                  <Link
                    href={props.tripBuilderHref || "/trip-builder"}
                    className="wg-hero-dock-mode wg-hero-acc-mode wg-hero-acc-mode-ruhelti"
                  >
                    <span className="wg-hero-acc-ruhelti-sticker" aria-hidden>
                      <span className="wg-hero-acc-ruhelti-stars" />
                    </span>
                    <span className="wg-hero-acc-copy">
                      <span className="wg-hero-acc-textcol">
                        <span className="wg-hero-acc-title">{t("myTrip")}</span>
                      </span>
                    </span>
                  </Link>
                )
              ) : null}
            </div>

            {props.mode === "flights" && dockOpen ? (
              <div className="wg-hero-acc-tripstrip" role="group" aria-label={t("tripType")}>
                <button
                  type="button"
                  className={`wg-hero-acc-trip${props.tripType === "oneway" ? " on" : ""}`}
                  onClick={() => props.onTripTypeChange("oneway")}
                >
                  {t("oneWay")}
                </button>
                <button
                  type="button"
                  className={`wg-hero-acc-trip${props.tripType === "roundtrip" ? " on" : ""}`}
                  onClick={() => props.onTripTypeChange("roundtrip")}
                >
                  {t("roundTrip")}
                </button>
                <button
                  type="button"
                  className={`wg-hero-acc-trip${props.tripType === "multicity" ? " on" : ""}`}
                  onClick={() => props.onTripTypeChange("multicity")}
                >
                  {t("multiCity")}
                </button>
              </div>
            ) : null}

            {props.mode === "cars" && dockOpen ? (
              <div className="wg-hero-acc-tripstrip" role="group" aria-label={t("tripType")}>
                <button
                  type="button"
                  className={`wg-hero-acc-trip${!props.transferRoundtrip ? " on" : ""}`}
                  onClick={() => props.onTransferRoundtripChange(false)}
                >
                  {t("arrivalOnly")}
                </button>
                <button
                  type="button"
                  className={`wg-hero-acc-trip${props.transferRoundtrip ? " on" : ""}`}
                  onClick={() => props.onTransferRoundtripChange(true)}
                >
                  {t("arrivalAndReturn")}
                </button>
              </div>
            ) : null}

            <div
              className={`wg-hero-dock wg-hero-acc-panel${dockOpen ? " is-open" : ""}`}
              hidden={!dockOpen}
              id="wg-hero-search-fields"
            >
        <div className="exp-dialog">
          <div className="exp-unified-card wg-hero-ticket-card wg-hero-dock-card">
          {props.mode === "flights" ? (
            <>
              {isMulticity ? (
                <div className="exp-multicity-stack">
                  {props.flightLegs.map((leg, index) => (
                    <div key={leg.id} className="exp-form-row exp-form-flights exp-flight-leg-row">
                      <span className="exp-leg-badge">{t("flightLegN", { n: index + 1 })}</span>
                      <div className="exp-input-cell exp-cell-grow">
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
                      <button
                        type="button"
                        className="exp-swap-inline"
                        aria-label={t("swap")}
                        onClick={() => swapLegAirports(leg.id)}
                      >
                        <IconSwap />
                      </button>
                      <div className="exp-input-cell exp-cell-grow">
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
                      <div className="exp-input-cell exp-cell-dates">
                        <span className="exp-cell-label">{dateLabel}</span>
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
                    <button type="button" className="exp-add-leg-btn" onClick={props.onAddFlightLeg}>
                      + {t("addFlight")}
                    </button>
                  ) : null}
                  <div className="exp-form-row exp-form-flights exp-multicity-footer">
                    {renderTravelersCell()}
                    {renderSearchButton("wg-hero-ticket-search")}
                  </div>
                </div>
              ) : (
              <div className="exp-form-row exp-form-flights">
                <div className="exp-input-cell exp-cell-grow wg-hero-acc-field" data-field="from">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
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
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                <button
                  type="button"
                  className="exp-swap-inline"
                  aria-label={t("swap")}
                  onClick={swapAirports}
                >
                  <IconSwap />
                </button>
                <div className="exp-input-cell exp-cell-grow wg-hero-acc-field" data-field="to">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
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
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                <div className="exp-input-cell exp-cell-dates wg-hero-acc-field" data-field="dates">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
                    <span className="exp-cell-label">{datesLabel}</span>
                    {showReturnDate ? (
                      <ShopDateRangePicker
                        forcePortal
                        checkIn={props.departDate}
                        checkOut={props.returnDate}
                        onChange={(checkIn, checkOut) => {
                          props.onDepartDateChange(checkIn);
                          props.onReturnDateChange(checkOut);
                        }}
                        startLabel={t("departDate")}
                        endLabel={t("returnDate")}
                        placeholder={t("selectTravelDates")}
                      />
                    ) : (
                      <DatePick
                        value={props.departDate}
                        onChange={props.onDepartDateChange}
                        label={t("departDate")}
                      />
                    )}
                    <label className={`exp-flex-dates${props.flexibleDates ? " on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={props.flexibleDates}
                        onChange={(e) => props.onFlexibleDatesChange(e.target.checked)}
                      />
                      <span>{t("flexibleDates")}</span>
                    </label>
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                {renderTravelersCell()}
                {renderSearchButton("wg-hero-ticket-search")}
              </div>
              )}
            </>
          ) : (
            <>
            {props.mode === "cars" ? (
              <div className="exp-transfer-toolbar wg-hero-acc-cars-meta">
                <label className={`exp-direct-pill${props.transferAirport ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferAirport}
                    onChange={(e) => props.onTransferAirportChange(e.target.checked)}
                  />
                  <span>{t("airportTransfer")}</span>
                </label>
                <label className={`exp-direct-pill${props.transferCarRental ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferCarRental}
                    onChange={(e) => props.onTransferCarRentalChange(e.target.checked)}
                  />
                  <span>{t("carRental")}</span>
                </label>
              </div>
            ) : null}
            <div className={`exp-form-row exp-form-${props.mode}`}>
            {props.mode === "stays" ? (
              <div className="exp-input-cell exp-cell-grow wg-hero-acc-field" data-field="destination">
                <span className="wg-hero-acc-field-ico" aria-hidden />
                <span className="wg-hero-acc-field-body">
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
                </span>
                <span className="wg-hero-acc-field-chevron" aria-hidden />
              </div>
            ) : null}

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell wg-hero-acc-field" data-field="airport">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
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
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                <div className="exp-input-cell exp-cell-grow wg-hero-acc-field" data-field="address">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
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
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
              </>
            ) : null}

            {props.mode === "activities" ? (
              <div className="exp-input-cell exp-cell-grow wg-hero-acc-field" data-field="destination">
                <span className="wg-hero-acc-field-ico" aria-hidden />
                <span className="wg-hero-acc-field-body">
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
                </span>
                <span className="wg-hero-acc-field-chevron" aria-hidden />
              </div>
            ) : null}

            {props.mode === "stays" ? (
              <>
                <div className="exp-input-cell exp-cell-dates wg-hero-acc-field" data-field="checkin">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
                    <span className="exp-cell-label">{t("arrivalDate")}</span>
                    <DatePick
                      value={props.departDate}
                      onChange={props.onDepartDateChange}
                      label={t("pickDateShort")}
                    />
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                <div className="exp-input-cell exp-cell-dates wg-hero-acc-field" data-field="checkout">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
                    <span className="exp-cell-label">{t("departDate")}</span>
                    <DatePick
                      value={props.returnDate}
                      onChange={props.onReturnDateChange}
                      label={t("pickDateShort")}
                    />
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
              </>
            ) : (
              <div
                className={`exp-input-cell exp-cell-dates wg-hero-acc-field${
                  props.mode === "cars" ? " exp-cell-dates-wide" : ""
                }`}
                data-field="dates"
              >
                <span className="wg-hero-acc-field-ico" aria-hidden />
                <span className="wg-hero-acc-field-body">
                  <span className="exp-cell-label">{props.mode === "cars" ? t("date") : t("dates")}</span>
                  {showReturnDate ? (
                    <ShopDateRangePicker
                      forcePortal
                      checkIn={props.departDate}
                      checkOut={props.returnDate}
                      onChange={(checkIn, checkOut) => {
                        props.onDepartDateChange(checkIn);
                        props.onReturnDateChange(checkOut);
                      }}
                      startLabel={
                        props.mode === "activities"
                          ? t("startDate")
                          : t("arrivalDate")
                      }
                      endLabel={
                        props.mode === "activities" ? t("endDate") : t("departDate")
                      }
                      placeholder={
                        props.mode === "activities"
                          ? t("selectActivityDates")
                          : props.mode === "cars"
                            ? t("selectTripDates")
                            : t("selectDates")
                      }
                    />
                  ) : (
                    <DatePick
                      value={props.departDate}
                      onChange={props.onDepartDateChange}
                      label={t("arrivalDate")}
                    />
                  )}
                </span>
                <span className="wg-hero-acc-field-chevron" aria-hidden />
              </div>
            )}

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell exp-cell-time exp-cell-time-compact wg-hero-acc-field" data-field="time">
                  <span className="wg-hero-acc-field-ico" aria-hidden />
                  <span className="wg-hero-acc-field-body">
                    <span className="exp-cell-label">{t("arrivalTime")}</span>
                    <span className="exp-time-wrap">
                      <strong className="exp-time-display" aria-hidden>
                        {formatTimeShort(props.pickupTime, locale === "en") || "—"}
                      </strong>
                      <select
                        className="exp-time-select"
                        value={props.pickupTime}
                        aria-label={t("arrivalTime")}
                        onChange={(e) => props.onPickupTimeChange(e.target.value)}
                      >
                        {["06:00", "08:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                          (slot) => (
                            <option key={slot} value={slot}>
                              {formatTimeShort(slot, locale === "en")}
                            </option>
                          ),
                        )}
                      </select>
                    </span>
                  </span>
                  <span className="wg-hero-acc-field-chevron" aria-hidden />
                </div>
                {props.transferRoundtrip ? (
                  <div className="exp-input-cell exp-cell-time exp-cell-time-compact wg-hero-acc-field" data-field="time">
                    <span className="wg-hero-acc-field-ico" aria-hidden />
                    <span className="wg-hero-acc-field-body">
                      <span className="exp-cell-label">{t("returnTime")}</span>
                      <span className="exp-time-wrap">
                        <strong className="exp-time-display" aria-hidden>
                          {formatTimeShort(props.dropoffTime, locale === "en") || "—"}
                        </strong>
                        <select
                          className="exp-time-select"
                          value={props.dropoffTime}
                          aria-label={t("returnTime")}
                          onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                        >
                          {["08:00", "10:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                            (slot) => (
                              <option key={slot} value={slot}>
                                {formatTimeShort(slot, locale === "en")}
                              </option>
                            ),
                          )}
                        </select>
                      </span>
                    </span>
                    <span className="wg-hero-acc-field-chevron" aria-hidden />
                  </div>
                ) : null}
              </>
            ) : null}

            {renderTravelersCell()}
            {renderSearchButton("wg-hero-ticket-search")}
            </div>
            </>
          )}
          </div>
        </div>
            </div>

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
