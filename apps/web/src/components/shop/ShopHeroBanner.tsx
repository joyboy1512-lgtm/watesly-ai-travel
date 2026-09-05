"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { heroSlidesFor } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { formatDay } from "@/lib/flight-search";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
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
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-4-6h2v2h-2v-2zm0 4h2v2h-2v-2z"
        />
      </svg>
    );
  }
  if (mode === "flights") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    );
  }
  if (mode === "cars") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
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
      width="16"
      height="16"
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
  /** Accordion panel open — visual only; search handlers unchanged */
  const [dockOpen, setDockOpen] = useState(true);
  const infants = props.infants ?? 0;
  const { locale, t } = useShopI18n();
  const slides = heroSlidesFor(locale);
  const fromLabel = t("from");
  const fromPlaceholder = t("fromPlaceholder");
  const toLabel = t("destination");
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
      <div className="exp-input-cell exp-cell-travelers wg-hero-acc-field" data-field={props.mode === "stays" ? "guests" : "travelers"}>
        <span className="wg-hero-acc-field-ico" aria-hidden />
        <button
          type="button"
          className={`exp-travelers-trigger wg-hero-acc-field-body${travelersOpen ? " open" : ""}`}
          aria-expanded={travelersOpen}
          onClick={() => setTravelersOpen((v) => !v)}
        >
          <span className="exp-cell-label">{props.mode === "stays" ? t("guests") : t("travelers")}</span>
          <strong>{travelerSummary}</strong>
        </button>
        <span className="wg-hero-acc-field-chevron" aria-hidden />
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
          <div className={`wg-hero-ticket-shell wg-hero-dock-shell wg-hero-acc-shell${dockOpen ? " is-open" : ""}`} data-mode={props.mode}>
            <div
              className="wg-hero-dock-modes wg-hero-acc-modes"
              role="tablist"
              aria-label={t("bookingType")}
            >
              {PRODUCT_KEYS.map(({ key, label, hint }) => {
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
                      props.onModeChange(key);
                      setDockOpen(true);
                    }}
                  >
                    <span className="wg-hero-acc-icon" aria-hidden>
                      <ModeGlyph mode={key} />
                    </span>
                    <span className="wg-hero-acc-copy">
                      <span className="wg-hero-acc-title">{t(label)}</span>
                      <span className="wg-hero-acc-hint">{t(hint)}</span>
                      <AccordionChevron open={expanded} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={`wg-hero-dock wg-hero-acc-panel${dockOpen ? " is-open" : ""}`}
              hidden={!dockOpen}
              id="wg-hero-search-fields"
            >
        <div className="exp-dialog">
          <div className="exp-unified-card wg-hero-ticket-card wg-hero-dock-card">
          {props.mode === "flights" ? (
            <>
              <div className="exp-flight-toolbar">
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label={t("tripType")}>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "roundtrip" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("roundtrip")}
                  >
                    {t("roundTrip")}
                  </button>
                   <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "oneway" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("oneway")}
                  >
                     {t("oneWay")}
                  </button>
                   <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "multicity" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("multicity")}
                  >
                     {t("multiCity")}
                  </button>
                </div>
                 <label className="exp-cabin-pill">
                   <span>{t("cabinClass")}</span>
                  <select
                    value={props.cabinClass}
                    onChange={(e) => props.onCabinClassChange(e.target.value)}
                     aria-label={t("cabinClass")}
                  >
                     <option value="economy">{t("cabinEconomy")}</option>
                     <option value="premium_economy">
                       {t("cabinPremium")}
                     </option>
                     <option value="business">{t("cabinBusiness")}</option>
                     <option value="first">{t("cabinFirst")}</option>
                  </select>
                </label>
                <label className={`exp-direct-pill${props.directOnly ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.directOnly}
                    onChange={(e) => props.onDirectOnlyChange(e.target.checked)}
                  />
                   <span>{t("directOnly")}</span>
                </label>
              </div>

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
                <div className="exp-input-cell exp-cell-grow">
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
                <button
                  type="button"
                  className="exp-swap-inline"
                  aria-label={t("swap")}
                  onClick={swapAirports}
                >
                  <IconSwap />
                </button>
                <div className="exp-input-cell exp-cell-grow">
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
                <div className="exp-input-cell exp-cell-dates">
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
                </div>
                {renderTravelersCell()}
                {renderSearchButton("wg-hero-ticket-search")}
              </div>
              )}
              {renderTravelersPanel()}
            </>
          ) : (
            <>
            {props.mode === "cars" ? (
              <div className="exp-transfer-toolbar">
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label={t("tripType")}>
                  <button
                    type="button"
                    className={`exp-pill-tab${!props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(false)}
                  >
                    {t("arrivalOnly")}
                  </button>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(true)}
                  >
                    {t("arrivalAndReturn")}
                  </button>
                </div>
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
                <div className="exp-input-cell">
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
                <div className="exp-input-cell exp-cell-grow">
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
              <div className="exp-input-cell exp-cell-grow">
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
                <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                  <span className="exp-cell-label">{t("arrivalTime")}</span>
                  <select
                    className="exp-time-select"
                    value={props.pickupTime}
                    onChange={(e) => props.onPickupTimeChange(e.target.value)}
                  >
                    {["06:00", "08:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {formatTimeShort(t, locale === "en")}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {props.transferRoundtrip ? (
                  <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                    <span className="exp-cell-label">{t("returnTime")}</span>
                    <select
                      className="exp-time-select"
                      value={props.dropoffTime}
                      onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                    >
                      {["08:00", "10:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                        (t) => (
                          <option key={t} value={t}>
                            {formatTimeShort(t, locale === "en")}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : null}
              </>
            ) : null}

            {renderTravelersCell()}
            {renderSearchButton("wg-hero-ticket-search")}
            </div>
            {renderTravelersPanel()}
            </>
          )}
          </div>
        </div>
            </div>

            {props.onRuheltiClick || props.tripBuilderHref ? (
              <div className="wg-hero-dock-ruhelti">
                {props.onRuheltiClick ? (
                  <button
                    type="button"
                    className="wg-hero-dock-ruhelti-link wg-ruhelti-hero-btn"
                    onClick={props.onRuheltiClick}
                    aria-haspopup="dialog"
                  >
                    {t("myTrip")}
                  </button>
                ) : props.tripBuilderHref ? (
                  <Link
                    href={props.tripBuilderHref}
                    className="wg-hero-dock-ruhelti-link"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          "wg_trip_builder_search",
                          JSON.stringify({
                            href: props.tripBuilderHref,
                            at: Date.now(),
                          }),
                        );
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    {t("myTrip")}
                  </Link>
                ) : null}
              </div>
            ) : null}

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
