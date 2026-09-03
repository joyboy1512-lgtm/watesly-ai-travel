"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { HERO_SLIDES } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { formatDay } from "@/lib/flight-search";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import {
  emptyRoom,
  occupancyTotals,
  setRoomCount,
  type HotelOccupancyState,
  validateOccupancy,
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

const PRODUCTS: Array<{ key: Mode; labelAr: string; labelEn: string }> = [
  { key: "flights", labelAr: "الطيران", labelEn: "Flights" },
  { key: "stays", labelAr: "الفنادق", labelEn: "Hotels" },
  { key: "cars", labelAr: "النقل", labelEn: "Transfers" },
  { key: "activities", labelAr: "الأنشطة", labelEn: "Activities" },
];

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
        {mounted ? (value ? formatDay(value) : "اختر تاريخ") : value || "اختر تاريخ"}
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
  const slides = HERO_SLIDES;
  const infants = props.infants ?? 0;
  const { locale } = useShopI18n();
  const isEn = locale === "en";
  const fromLabel = isEn ? "From" : "المغادرة من";
  const fromPlaceholder = isEn ? "City or airport" : "مدينة أو مطار";
  const toLabel = isEn ? "Destination" : "الوجهة";
  const toPlaceholder = isEn ? "Where to?" : "إلى أين؟";
  const datesLabel = isEn ? "Dates" : "التواريخ";
  const dateLabel = isEn ? "Date" : "التاريخ";

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

  const travelerSummary =
    props.mode === "stays"
      ? `${(stayTotals?.adults ?? props.adults) + (stayTotals?.children ?? props.children)} مسافر · ${
          stayTotals?.rooms ?? props.rooms
        } غرفة`
      : `${props.adults + props.children + infants} مسافر`;

  function updateStayOccupancy(next: HotelOccupancyState) {
    props.onStayOccupancyChange?.(next);
    const totals = occupancyTotals(next);
    props.onAdultsChange(totals.adults);
    props.onChildrenChange(totals.children);
    props.onRoomsChange(totals.rooms);
    setOccError(validateOccupancy(next) || "");
  }

  function renderFlightTravelersPanel() {
    return (
      <div className="exp-travelers-panel" role="dialog" aria-label="عدد المسافرين">
        <div className="exp-travelers-row">
          <span>
            بالغون
            <small className="exp-traveler-hint">12 سنة فأكثر</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label="تقليل البالغين"
              onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}
            >
              −
            </button>
            <strong>{props.adults}</strong>
            <button
              type="button"
              aria-label="زيادة البالغين"
              onClick={() => props.onAdultsChange(Math.min(9, props.adults + 1))}
            >
              +
            </button>
          </div>
        </div>
        <div className="exp-travelers-row">
          <span>
            أطفال
            <small className="exp-traveler-hint">2 – 11 سنة</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label="تقليل الأطفال"
              onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}
            >
              −
            </button>
            <strong>{props.children}</strong>
            <button
              type="button"
              aria-label="زيادة الأطفال"
              onClick={() => props.onChildrenChange(Math.min(8, props.children + 1))}
            >
              +
            </button>
          </div>
        </div>
        <div className="exp-travelers-row">
          <span>
            رضع
            <small className="exp-traveler-hint">أقل من سنتين</small>
          </span>
          <div className="exp-stepper">
            <button
              type="button"
              aria-label="تقليل الرضع"
              onClick={() => props.onInfantsChange?.(Math.max(0, infants - 1))}
            >
              −
            </button>
            <strong>{infants}</strong>
            <button
              type="button"
              aria-label="زيادة الرضع"
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
          تم
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
          aria-label={isEn ? "Rooms & Travelers" : "الغرف والمسافرون"}
        >
        <div className="exp-travelers-row">
          <span>عدد الغرف</span>
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
            <strong className="exp-room-occ-title">الغرفة {roomIdx + 1}</strong>
            <div className="exp-travelers-row">
              <span>بالغون</span>
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
              <span>أطفال</span>
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
                <span>عمر الطفل {childIdx + 1}</span>
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
                      {ageOpt} سنة
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
                حذف الغرفة
              </button>
            ) : null}
          </div>
        ))}
        {occError ? <p className="shop-error exp-occ-error">{occError}</p> : null}
        <button
          type="button"
          className="exp-pop-done"
          onClick={() => {
            const err = validateOccupancy(state);
            if (err) {
              setOccError(err);
              return;
            }
            setTravelersOpen(false);
          }}
        >
          تم
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
      <div className="exp-input-cell exp-cell-travelers">
        <button
          type="button"
          className={`exp-travelers-trigger${travelersOpen ? " open" : ""}`}
          aria-expanded={travelersOpen}
          onClick={() => setTravelersOpen((v) => !v)}
        >
          <span className="exp-cell-label">{isEn ? "Travelers" : "المسافرون"}</span>
          <strong>{travelerSummary}</strong>
        </button>
      </div>
    );
  }

  function renderSearchButton(extraClass = "") {
    return (
      <button
        type="button"
        className={`exp-search-link${extraClass ? ` ${extraClass}` : ""}`}
        disabled={props.loading}
        onClick={props.onSearch}
      >
        {props.loading ? "..." : isEn ? "Search" : "بحث"}
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
      <section className="wg-travela-hero" aria-label="صور الرحلة">
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
                aria-label="الشريحة السابقة"
                onClick={prevSlide}
              >
                ‹
              </button>
              <button
                type="button"
                className="wg-travela-carousel-btn next"
                aria-label="الشريحة التالية"
                onClick={nextSlide}
              >
                ›
              </button>
              <ol className="wg-travela-dots" aria-label="شرائح العرض">
                {slides.map((slide, index) => (
                  <li key={slide.image}>
                    <button
                      type="button"
                      className={index === slideIdx ? "active" : undefined}
                      aria-label={`الشريحة ${index + 1}`}
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
          <div className="wg-hero-ticket-shell wg-hero-dock-shell" data-mode={props.mode}>
            <div
              className="wg-hero-dock-modes"
              role="tablist"
              aria-label={isEn ? "Booking type" : "نوع الحجز"}
            >
              {PRODUCTS.map(({ key, labelAr, labelEn }) => {
                const on = props.mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    className={`wg-hero-dock-mode${on ? " on" : ""}`}
                    aria-selected={on}
                    onClick={() => props.onModeChange(key)}
                  >
                    {isEn ? labelEn : labelAr}
                  </button>
                );
              })}
              <Link
                href="/chat"
                className="wg-hero-dock-mode wg-hero-dock-mode-ai"
                title={isEn ? "AI Assistant" : "المساعد الذكي AI"}
                aria-label={isEn ? "Open AI Assistant" : "فتح المساعد الذكي AI"}
              >
                AI
              </Link>
            </div>

            <div className="wg-hero-dock">
        <div className="exp-dialog">
          <div className="exp-unified-card wg-hero-ticket-card wg-hero-dock-card">
          {props.mode === "flights" ? (
            <>
              <div className="exp-flight-toolbar">
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label={isEn ? "Trip type" : "نوع الرحلة"}>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "roundtrip" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("roundtrip")}
                  >
                    {isEn ? "Round trip" : "ذهاب وعودة"}
                  </button>
                   <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "oneway" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("oneway")}
                  >
                     {isEn ? "One way" : "ذهاب فقط"}
                  </button>
                   <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "multicity" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("multicity")}
                  >
                     {isEn ? "Multi-city" : "وجهات متعددة"}
                  </button>
                </div>
                 <label className="exp-cabin-pill">
                   <span>{isEn ? "Cabin class" : "فئة المقصورة"}</span>
                  <select
                    value={props.cabinClass}
                    onChange={(e) => props.onCabinClassChange(e.target.value)}
                     aria-label={isEn ? "Cabin class" : "فئة المقصورة"}
                  >
                     <option value="economy">{isEn ? "Economy" : "اقتصادية"}</option>
                     <option value="premium_economy">
                       {isEn ? "Premium economy" : "اقتصادية مميزة"}
                     </option>
                     <option value="business">{isEn ? "Business" : "رجال أعمال"}</option>
                     <option value="first">{isEn ? "First" : "أولى"}</option>
                  </select>
                </label>
                <label className={`exp-direct-pill${props.directOnly ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.directOnly}
                    onChange={(e) => props.onDirectOnlyChange(e.target.checked)}
                  />
                   <span>{isEn ? "Direct flights only" : "الرحلات المباشرة فقط"}</span>
                </label>
              </div>

              {isMulticity ? (
                <div className="exp-multicity-stack">
                  {props.flightLegs.map((leg, index) => (
                    <div key={leg.id} className="exp-form-row exp-form-flights exp-flight-leg-row">
                      <span className="exp-leg-badge">الرحلة {index + 1}</span>
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
                        aria-label="تبديل"
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
                          label={`تاريخ الرحلة ${index + 1}`}
                        />
                      </div>
                      {props.flightLegs.length > 2 ? (
                        <button
                          type="button"
                          className="exp-leg-remove"
                          aria-label={`حذف الرحلة ${index + 1}`}
                          onClick={() => props.onRemoveFlightLeg(leg.id)}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {props.flightLegs.length < 5 ? (
                    <button type="button" className="exp-add-leg-btn" onClick={props.onAddFlightLeg}>
                      + إضافة رحلة
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
                  aria-label="تبديل"
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
                      startLabel={isEn ? "Departure date" : "تاريخ المغادرة"}
                      endLabel={isEn ? "Return date" : "تاريخ العودة"}
                      placeholder={isEn ? "Select travel dates" : "اختر تواريخ السفر"}
                    />
                  ) : (
                    <DatePick
                      value={props.departDate}
                      onChange={props.onDepartDateChange}
                      label={isEn ? "Departure date" : "تاريخ المغادرة"}
                    />
                  )}
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
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label={isEn ? "Trip type" : "نوع الرحلة"}>
                  <button
                    type="button"
                    className={`exp-pill-tab${!props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(false)}
                  >
                    {isEn ? "Arrival only" : "وصول فقط"}
                  </button>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(true)}
                  >
                    {isEn ? "Round trip" : "وصول وعودة"}
                  </button>
                </div>
                <label className={`exp-direct-pill${props.transferAirport ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferAirport}
                    onChange={(e) => props.onTransferAirportChange(e.target.checked)}
                  />
                  <span>{isEn ? "Airport transfer" : "نقل المطار"}</span>
                </label>
                <label className={`exp-direct-pill${props.transferCarRental ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferCarRental}
                    onChange={(e) => props.onTransferCarRentalChange(e.target.checked)}
                  />
                  <span>{isEn ? "Car rental" : "تأجير سيارة"}</span>
                </label>
              </div>
            ) : null}
            <div className={`exp-form-row exp-form-${props.mode}`}>
            {props.mode === "stays" ? (
              <div className="exp-input-cell exp-cell-grow">
                <ShopAutocomplete
                  inline
                  label="إلى أين؟"
                  value={props.stayQuery}
                  display={props.stayQuery}
                  placeholder="مدينة أو فندق"
                  onQuery={props.searchCities}
                  onClearText={props.onStayQueryChange}
                  onPick={props.onStayPick}
                />
              </div>
            ) : null}

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell">
                  <ShopAutocomplete
                    inline
                    label="المطار"
                    value={props.origin}
                    display={props.originLabel}
                    placeholder="اختر المطار"
                    onQuery={props.searchAirports}
                    onClearText={props.onOriginClear}
                    onPick={props.onOriginPick}
                  />
                </div>
                <div className="exp-input-cell exp-cell-grow">
                  <ShopAutocomplete
                    inline
                    label="الفندق أو العنوان"
                    value={props.transferDropoff}
                    display={props.transferDropoffLabel}
                    placeholder="اسم فندق، عنوان، أو مدينة"
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
                  placeholder={isEn ? "Activity city" : "مدينة النشاط"}
                  onQuery={props.searchCities}
                  onClearText={props.onActivityClear}
                  onPick={props.onActivityPick}
                />
              </div>
            ) : null}

            <div
              className={`exp-input-cell exp-cell-dates${
                props.mode === "cars" ? " exp-cell-dates-wide" : ""
              }`}
            >
              <span className="exp-cell-label">{props.mode === "cars" ? "التاريخ" : "التواريخ"}</span>
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
                    isEn
                      ? props.mode === "activities"
                        ? "Start date"
                        : props.mode === "cars"
                          ? "Arrival date"
                          : "Arrival date"
                      : props.mode === "activities"
                        ? "تاريخ البداية"
                        : props.mode === "cars"
                          ? "تاريخ الوصول"
                          : "تاريخ الوصول"
                  }
                  endLabel={
                    isEn
                      ? props.mode === "activities"
                        ? "End date"
                        : "Departure date"
                      : props.mode === "activities"
                        ? "تاريخ النهاية"
                        : "تاريخ المغادرة"
                  }
                  placeholder={
                    isEn
                      ? props.mode === "stays"
                        ? "Select stay dates"
                        : props.mode === "activities"
                          ? "Select activity dates"
                          : props.mode === "cars"
                            ? "Select trip dates"
                            : "Select dates"
                      : props.mode === "stays"
                        ? "اختر تواريخ الإقامة"
                        : props.mode === "activities"
                          ? "اختر تواريخ النشاط"
                          : props.mode === "cars"
                            ? "اختر تواريخ الرحلة"
                            : "اختر التواريخ"
                  }
                />
              ) : (
                <DatePick
                  value={props.departDate}
                  onChange={props.onDepartDateChange}
                  label={isEn ? "Arrival date" : "تاريخ الوصول"}
                />
              )}
            </div>

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                  <span className="exp-cell-label">{isEn ? "Arrival time" : "وقت الوصول"}</span>
                  <select
                    className="exp-time-select"
                    value={props.pickupTime}
                    onChange={(e) => props.onPickupTimeChange(e.target.value)}
                  >
                    {["06:00", "08:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {formatTimeShort(t, isEn)}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {props.transferRoundtrip ? (
                  <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                    <span className="exp-cell-label">{isEn ? "Return time" : "وقت العودة"}</span>
                    <select
                      className="exp-time-select"
                      value={props.dropoffTime}
                      onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                    >
                      {["08:00", "10:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                        (t) => (
                          <option key={t} value={t}>
                            {formatTimeShort(t, isEn)}
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
                    {isEn ? "My trip" : "رحلتي"}
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
                    {isEn ? "My trip" : "رحلتي"}
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
