"use client";

import Link from "next/link";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { HERO_SLIDES } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";

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
  rooms: number;
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
  onRoomsChange: (n: number) => void;
  onSearch: () => void;
  loading: boolean;
  error: string;
  message: string;
  searchAirports: (q: string) => Promise<SuggestItem[]>;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

const CABIN_LABELS: Record<string, string> = {
  economy: "سياحية",
  premium_economy: "سياحية مميزة",
  business: "رجال أعمال",
  first: "أولى",
};

const PRODUCTS: Array<{ key: Mode; label: string; icon: ReactNode }> = [
  {
    key: "flights",
    label: "رحلات",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    ),
  },
  {
    key: "stays",
    label: "فنادق",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"
        />
      </svg>
    ),
  },
  {
    key: "cars",
    label: "سيارات",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    ),
  },
  {
    key: "activities",
    label: "أنشطة",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
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
        d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
      />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
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

function formatDateDisplay(iso: string) {
  if (!iso) return "اختر تاريخ";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ar-KW", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
        {mounted ? formatDateDisplay(value) : value || "اختر تاريخ"}
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

function CheckOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className={`wg-check${checked ? " on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export function ShopHeroBanner(props: Props) {
  const [travelersOpen, setTravelersOpen] = useState(false);
  const heroSlide = HERO_SLIDES[0];
  const heroImage = heroSlide?.image;
  const cabinLabel = CABIN_LABELS[props.cabinClass] || "سياحية";
  const travelerCount = props.adults + props.children;
  const travelerSummary =
    props.mode === "stays"
      ? `${travelerCount} مسافر · ${props.rooms} غرفة`
      : props.mode === "flights"
        ? `${travelerCount} مسافر ${cabinLabel}`
        : `${travelerCount} مسافر`;

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

  function renderTravelersPop(includeRooms: boolean, includeCabin: boolean) {
    return (
      <div className="exp-travelers-pop">
        <div className="exp-travelers-row">
          <span>بالغون</span>
          <div className="exp-stepper">
            <button type="button" onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}>
              −
            </button>
            <strong>{props.adults}</strong>
            <button type="button" onClick={() => props.onAdultsChange(props.adults + 1)}>
              +
            </button>
          </div>
        </div>
        <div className="exp-travelers-row">
          <span>أطفال</span>
          <div className="exp-stepper">
            <button type="button" onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}>
              −
            </button>
            <strong>{props.children}</strong>
            <button type="button" onClick={() => props.onChildrenChange(props.children + 1)}>
              +
            </button>
          </div>
        </div>
        {includeRooms ? (
          <div className="exp-travelers-row">
            <span>غرف</span>
            <div className="exp-stepper">
              <button type="button" onClick={() => props.onRoomsChange(Math.max(1, props.rooms - 1))}>
                −
              </button>
              <strong>{props.rooms}</strong>
              <button type="button" onClick={() => props.onRoomsChange(props.rooms + 1)}>
                +
              </button>
            </div>
          </div>
        ) : null}
        {includeCabin ? (
          <label className="wg-cabin-row">
            <span>المقصورة</span>
            <select
              value={props.cabinClass}
              onChange={(e) => props.onCabinClassChange(e.target.value)}
              aria-label="فئة المقصورة"
            >
              <option value="economy">سياحية</option>
              <option value="premium_economy">سياحية مميزة</option>
              <option value="business">رجال أعمال</option>
              <option value="first">أولى</option>
            </select>
          </label>
        ) : null}
        <button type="button" className="exp-pop-done" onClick={() => setTravelersOpen(false)}>
          تم
        </button>
      </div>
    );
  }

  function renderTravelersCell(includeRooms: boolean, includeCabin: boolean) {
    return (
      <div className="wg-simple-cell wg-cell-travelers">
        <button
          type="button"
          className="exp-travelers-trigger"
          onClick={() => setTravelersOpen((v) => !v)}
        >
          <IconPeople />
          <strong>{travelerSummary}</strong>
        </button>
        {travelersOpen ? renderTravelersPop(includeRooms, includeCabin) : null}
      </div>
    );
  }

  function renderSearchButton() {
    return (
      <button
        type="button"
        className="wg-search-btn"
        disabled={props.loading}
        onClick={props.onSearch}
      >
        <span>{props.loading ? "..." : "ابحث"}</span>
        <IconSearch />
      </button>
    );
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
    <section className="exp-home-hero" id="search">
      <div className="exp-home-bg" aria-hidden>
        {heroImage ? (
          <div className="exp-home-bg-image" style={{ backgroundImage: `url(${heroImage})` }} />
        ) : null}
      </div>
      <div className="exp-home-shade" aria-hidden />

      <div className="exp-home-content wg-simple-hero">
        <div className="wg-svc-tabs" role="tablist" aria-label="نوع الحجز">
          {PRODUCTS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={`wg-svc-tab${props.mode === key ? " on" : ""}`}
              aria-selected={props.mode === key}
              onClick={() => props.onModeChange(key)}
            >
              <span className="wg-svc-tab-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          <Link href="/account" className="wg-svc-tab wg-svc-tab-link">
            <span className="wg-svc-tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24L16.58 10l-5.64 5.54z"
                />
              </svg>
            </span>
            <span>رحلتي</span>
          </Link>
        </div>

        <div className="exp-dialog">
          <div className="wg-simple-card">
            {props.mode === "flights" ? (
              <>
                <div className="wg-options" role="group" aria-label="نوع الرحلة">
                  <CheckOption
                    checked={props.tripType === "oneway"}
                    onChange={() => props.onTripTypeChange("oneway")}
                    label="ذهاب فقط"
                  />
                  <CheckOption
                    checked={props.tripType === "roundtrip"}
                    onChange={() => props.onTripTypeChange("roundtrip")}
                    label="ذهاب وعودة"
                  />
                  <CheckOption
                    checked={props.tripType === "multicity"}
                    onChange={() => props.onTripTypeChange("multicity")}
                    label="وجهات متعددة"
                  />
                  <CheckOption
                    checked={props.directOnly}
                    onChange={() => props.onDirectOnlyChange(!props.directOnly)}
                    label="رحلات مباشرة"
                  />
                </div>

                {isMulticity ? (
                  <div className="exp-multicity-stack">
                    {props.flightLegs.map((leg, index) => (
                      <div key={leg.id} className="wg-simple-fields wg-simple-fields-leg">
                        <span className="wg-leg-badge">الرحلة {index + 1}</span>
                        <div className="wg-simple-cell wg-cell-grow">
                          <IconPin />
                          <ShopAutocomplete
                            inline
                            label="من"
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
                          className="wg-swap"
                          aria-label="تبديل"
                          onClick={() => swapLegAirports(leg.id)}
                        >
                          <IconSwap />
                        </button>
                        <div className="wg-simple-cell wg-cell-grow">
                          <IconPin />
                          <ShopAutocomplete
                            inline
                            label="إلى"
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
                        <div className="wg-simple-cell wg-cell-dates">
                          <IconCalendar />
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
                      <button type="button" className="wg-add-leg" onClick={props.onAddFlightLeg}>
                        + إضافة رحلة
                      </button>
                    ) : null}
                    <div className="wg-simple-fields wg-simple-fields-footer">
                      {renderTravelersCell(false, true)}
                      {renderSearchButton()}
                    </div>
                  </div>
                ) : (
                  <div className="wg-simple-fields">
                    <div className="wg-simple-cell wg-cell-grow">
                      <IconPin />
                      <ShopAutocomplete
                        inline
                        label="من"
                        value={props.origin}
                        display={props.originLabel}
                        placeholder="مدينة أو مطار"
                        onQuery={props.searchAirports}
                        onClearText={props.onOriginClear}
                        onPick={props.onOriginPick}
                      />
                    </div>
                    <button type="button" className="wg-swap" aria-label="تبديل" onClick={swapAirports}>
                      <IconSwap />
                    </button>
                    <div className="wg-simple-cell wg-cell-grow">
                      <IconPin />
                      <ShopAutocomplete
                        inline
                        label="إلى"
                        value={props.destination}
                        display={props.destinationLabel}
                        placeholder="إلى أين؟"
                        onQuery={props.searchAirports}
                        onClearText={props.onDestinationClear}
                        onPick={props.onDestinationPick}
                      />
                    </div>
                    <div className="wg-simple-cell wg-cell-dates">
                      <IconCalendar />
                      <DatePick
                        value={props.departDate}
                        onChange={props.onDepartDateChange}
                        label="تاريخ المغادرة"
                      />
                      {showReturnDate ? (
                        <DatePick
                          value={props.returnDate}
                          onChange={props.onReturnDateChange}
                          label="تاريخ العودة"
                        />
                      ) : null}
                    </div>
                    {renderTravelersCell(false, true)}
                    {renderSearchButton()}
                  </div>
                )}
              </>
            ) : (
              <>
                {props.mode === "cars" ? (
                  <div className="wg-options" role="group" aria-label="نوع النقل">
                    <CheckOption
                      checked={!props.transferRoundtrip}
                      onChange={() => props.onTransferRoundtripChange(false)}
                      label="وصول فقط"
                    />
                    <CheckOption
                      checked={props.transferRoundtrip}
                      onChange={() => props.onTransferRoundtripChange(true)}
                      label="وصول وعودة"
                    />
                    <CheckOption
                      checked={props.transferAirport}
                      onChange={() => props.onTransferAirportChange(!props.transferAirport)}
                      label="نقل المطار"
                    />
                    <CheckOption
                      checked={props.transferCarRental}
                      onChange={() => props.onTransferCarRentalChange(!props.transferCarRental)}
                      label="تأجير سيارة"
                    />
                  </div>
                ) : null}

                <div className={`wg-simple-fields wg-fields-${props.mode}`}>
                  {props.mode === "stays" ? (
                    <div className="wg-simple-cell wg-cell-grow">
                      <IconPin />
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
                      <div className="wg-simple-cell">
                        <IconPin />
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
                      <div className="wg-simple-cell wg-cell-grow">
                        <IconPin />
                        <ShopAutocomplete
                          inline
                          label="الوجهة"
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
                    <div className="wg-simple-cell wg-cell-grow">
                      <IconPin />
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

                  <div className="wg-simple-cell wg-cell-dates">
                    <IconCalendar />
                    <DatePick
                      value={props.departDate}
                      onChange={props.onDepartDateChange}
                      label={props.mode === "activities" ? "تاريخ البداية" : "تاريخ الوصول"}
                    />
                    {showReturnDate ? (
                      <DatePick
                        value={props.returnDate}
                        onChange={props.onReturnDateChange}
                        label={props.mode === "activities" ? "تاريخ النهاية" : "تاريخ المغادرة"}
                      />
                    ) : null}
                  </div>

                  {props.mode === "cars" ? (
                    <>
                      <div className="wg-simple-cell wg-cell-time">
                        <select
                          className="exp-time-select"
                          value={props.pickupTime}
                          onChange={(e) => props.onPickupTimeChange(e.target.value)}
                          aria-label="وقت الوصول"
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
                        <div className="wg-simple-cell wg-cell-time">
                          <select
                            className="exp-time-select"
                            value={props.dropoffTime}
                            onChange={(e) => props.onDropoffTimeChange(e.target.value)}
                            aria-label="وقت العودة"
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

                  {renderTravelersCell(props.mode === "stays", false)}
                  {renderSearchButton()}
                </div>
              </>
            )}
          </div>

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
        </div>

        <h1 className="exp-home-tagline">مكان واحد تذهب إليه لتذهب إلى أي مكان</h1>
      </div>
    </section>
  );
}
