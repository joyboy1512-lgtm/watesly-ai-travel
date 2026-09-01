"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { HERO_SLIDES } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { formatDay } from "@/lib/flight-search";
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
};

const PRODUCTS: Array<{ key: Mode; label: string; icon: ReactNode }> = [
  {
    key: "stays",
    label: "الفنادق",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"
        />
      </svg>
    ),
  },
  {
    key: "flights",
    label: "الطيران",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    ),
  },
  {
    key: "cars",
    label: "النقل",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    ),
  },
  {
    key: "activities",
    label: "الأنشطة",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M22 10.99h-3.5v-2h3.5v2zm0-4h-3.5V5h3.5v2zM7.5 5C5.57 5 4 6.57 4 8.5S5.57 12 7.5 12 11 10.43 11 8.5 9.43 5 7.5 5zM2 19h20v2H2v-2zm2-8h16v6H4v-6z"
        />
      </svg>
    ),
  },
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

function formatTimeShort(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return t;
  const suffix = hour >= 12 ? "م" : "ص";
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
      <div className="exp-travelers-panel exp-occupancy-panel" role="dialog" aria-label="الغرف والمسافرون">
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
          <span className="exp-cell-label">المسافرون</span>
          <strong>{travelerSummary}</strong>
        </button>
      </div>
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
      </section>

      <div className="wg-travela-search-wrap" id="search">
        <div className="wg-travela-search-shell">
        <div className="exp-icon-tabs exp-icon-tabs-hero" role="tablist" aria-label="نوع الحجز">
          {PRODUCTS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={`exp-icon-circle exp-icon-circle-labeled${props.mode === key ? " on" : ""}`}
              aria-selected={props.mode === key}
              aria-label={label}
              title={label}
              onClick={() => props.onModeChange(key)}
            >
              <span className="exp-icon-circle-svg">{icon}</span>
              <span className="exp-icon-circle-label">{label}</span>
            </button>
          ))}
        </div>

        <div className="exp-dialog">
          <div className="exp-unified-card">
          {props.mode === "flights" ? (
            <>
              <div className="exp-flight-toolbar">
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label="نوع الرحلة">
                  <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "roundtrip" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("roundtrip")}
                  >
                    ذهاب وعودة
                  </button>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "oneway" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("oneway")}
                  >
                    ذهاب فقط
                  </button>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.tripType === "multicity" ? " on" : ""}`}
                    onClick={() => props.onTripTypeChange("multicity")}
                  >
                    وجهات متعددة
                  </button>
                </div>
                <label className="exp-cabin-pill">
                  <span>فئة المقصورة</span>
                  <select
                    value={props.cabinClass}
                    onChange={(e) => props.onCabinClassChange(e.target.value)}
                    aria-label="فئة المقصورة"
                  >
                    <option value="economy">اقتصادية</option>
                    <option value="premium_economy">اقتصادية مميزة</option>
                    <option value="business">رجال أعمال</option>
                    <option value="first">أولى</option>
                  </select>
                </label>
                <label className={`exp-direct-pill${props.directOnly ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.directOnly}
                    onChange={(e) => props.onDirectOnlyChange(e.target.checked)}
                  />
                  <span>الرحلات المباشرة فقط</span>
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
                          label="المغادرة من"
                          value={leg.origin}
                          display={leg.originLabel}
                          placeholder="مدينة أو مطار"
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
                          label="الوجهة"
                          value={leg.destination}
                          display={leg.destinationLabel}
                          placeholder="إلى أين؟"
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
                        <span className="exp-cell-label">التاريخ</span>
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
                    <button
                      type="button"
                      className="exp-search-link"
                      disabled={props.loading}
                      onClick={props.onSearch}
                    >
                      {props.loading ? "..." : "بحث"}
                    </button>
                  </div>
                </div>
              ) : (
              <div className="exp-form-row exp-form-flights">
                <div className="exp-input-cell exp-cell-grow">
                  <ShopAutocomplete
                    inline
                    label="المغادرة من"
                    value={props.origin}
                    display={props.originLabel}
                    placeholder="مدينة أو مطار"
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
                    label="الوجهة"
                    value={props.destination}
                    display={props.destinationLabel}
                    placeholder="إلى أين؟"
                    onQuery={props.searchAirports}
                    onClearText={props.onDestinationClear}
                    onPick={props.onDestinationPick}
                  />
                </div>
                <div className="exp-input-cell exp-cell-dates">
                  <span className="exp-cell-label">التواريخ</span>
                  {showReturnDate ? (
                    <ShopDateRangePicker
                      checkIn={props.departDate}
                      checkOut={props.returnDate}
                      onChange={(checkIn, checkOut) => {
                        props.onDepartDateChange(checkIn);
                        props.onReturnDateChange(checkOut);
                      }}
                      startLabel="تاريخ المغادرة"
                      endLabel="تاريخ العودة"
                      placeholder="اختر تواريخ السفر"
                    />
                  ) : (
                    <DatePick
                      value={props.departDate}
                      onChange={props.onDepartDateChange}
                      label="تاريخ المغادرة"
                    />
                  )}
                </div>
                {renderTravelersCell()}
                <button
                  type="button"
                  className="exp-search-link"
                  disabled={props.loading}
                  onClick={props.onSearch}
                >
                  {props.loading ? "..." : "بحث"}
                </button>
              </div>
              )}
              {renderTravelersPanel()}
            </>
          ) : (
            <>
            {props.mode === "cars" ? (
              <div className="exp-transfer-toolbar">
                <div className="exp-pill-tabs exp-pill-tabs-inset" role="group" aria-label="نوع الرحلة">
                  <button
                    type="button"
                    className={`exp-pill-tab${!props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(false)}
                  >
                    وصول فقط
                  </button>
                  <button
                    type="button"
                    className={`exp-pill-tab${props.transferRoundtrip ? " on" : ""}`}
                    onClick={() => props.onTransferRoundtripChange(true)}
                  >
                    وصول وعودة
                  </button>
                </div>
                <label className={`exp-direct-pill${props.transferAirport ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferAirport}
                    onChange={(e) => props.onTransferAirportChange(e.target.checked)}
                  />
                  <span>نقل المطار</span>
                </label>
                <label className={`exp-direct-pill${props.transferCarRental ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.transferCarRental}
                    onChange={(e) => props.onTransferCarRentalChange(e.target.checked)}
                  />
                  <span>تأجير سيارة</span>
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
                  label="الوجهة"
                  value={props.activityDest}
                  display={props.activityLabel}
                  placeholder="مدينة النشاط"
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
                  checkIn={props.departDate}
                  checkOut={props.returnDate}
                  onChange={(checkIn, checkOut) => {
                    props.onDepartDateChange(checkIn);
                    props.onReturnDateChange(checkOut);
                  }}
                  startLabel={
                    props.mode === "activities"
                      ? "تاريخ البداية"
                      : props.mode === "cars"
                        ? "تاريخ الوصول"
                        : "تاريخ الوصول"
                  }
                  endLabel={
                    props.mode === "activities"
                      ? "تاريخ النهاية"
                      : "تاريخ المغادرة"
                  }
                  placeholder={
                    props.mode === "stays"
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
                  label="تاريخ الوصول"
                />
              )}
            </div>

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                  <span className="exp-cell-label">وقت الوصول</span>
                  <select
                    className="exp-time-select"
                    value={props.pickupTime}
                    onChange={(e) => props.onPickupTimeChange(e.target.value)}
                  >
                    {["06:00", "08:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {formatTimeShort(t)}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {props.transferRoundtrip ? (
                  <div className="exp-input-cell exp-cell-time exp-cell-time-compact">
                    <span className="exp-cell-label">وقت العودة</span>
                    <select
                      className="exp-time-select"
                      value={props.dropoffTime}
                      onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                    >
                      {["08:00", "10:00", "10:30", "12:00", "14:00", "16:00", "18:00", "20:00"].map(
                        (t) => (
                          <option key={t} value={t}>
                            {formatTimeShort(t)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : null}
              </>
            ) : null}

            {renderTravelersCell()}

            <button
              type="button"
              className="exp-search-link"
              disabled={props.loading}
              onClick={props.onSearch}
            >
              {props.loading ? "..." : "بحث"}
            </button>
            </div>
            {renderTravelersPanel()}
            </>
          )}
          </div>

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}

          {props.tripBuilderHref ? (
            <div className="exp-trip-builder-cta">
              <div className="exp-trip-builder-cta-copy">
                <strong>رحّلتي — Trip Builder</strong>
                <span>كوّن رحلتك: طيران + فندق + نقل + أنشطة — بنفس بيانات البحث أعلاه</span>
              </div>
              <Link
                href={props.tripBuilderHref}
                className="exp-trip-builder-cta-btn"
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
                ابدأ بناء رحلتي
              </Link>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </>
  );
}
