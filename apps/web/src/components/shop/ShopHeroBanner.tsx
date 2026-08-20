"use client";

import { useState, useRef, type ReactNode } from "react";
import { HERO_SLIDES } from "@/lib/shop-content";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";

type Mode = "flights" | "stays" | "cars" | "activities";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  tripType: "roundtrip" | "oneway";
  onTripTypeChange: (v: "roundtrip" | "oneway") => void;
  transferRoundtrip: boolean;
  onTransferRoundtripChange: (v: boolean) => void;
  cabinClass: string;
  onCabinClassChange: (v: string) => void;
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

const CABIN_LABELS: Record<string, string> = {
  economy: "اقتصادية",
  premium_economy: "اقتصادية مميزة",
  business: "رجال أعمال",
  first: "أولى",
};

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

function formatDateDisplay(iso: string) {
  if (!iso) return "اختر تاريخ";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ar-KW", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
        {formatDateDisplay(value)}
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
  const heroImage = HERO_SLIDES[0]?.image;

  const travelerSummary =
    props.mode === "stays"
      ? `${props.adults + props.children} مسافر · ${props.rooms} غرفة`
      : props.mode === "flights"
        ? `${props.adults + props.children} مسافر · ${CABIN_LABELS[props.cabinClass] || "اقتصادية"}`
        : `${props.adults + props.children} مسافر`;

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
      <div
        className="exp-home-bg"
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden
      />
      <div className="exp-home-shade" aria-hidden />

      <div className="exp-home-content">
        <h1 className="exp-home-tagline">مكان واحد تذهب إليه لتذهب إلى أي مكان</h1>

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
          {props.mode === "flights" ? (
            <div className="exp-pill-tabs" role="group" aria-label="نوع الرحلة">
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
            </div>
          ) : null}

          <div className={`exp-form-row exp-form-${props.mode}`}>
            {props.mode === "flights" ? (
              <>
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
              </>
            ) : null}

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
                    label="من (المطار)"
                    value={props.origin}
                    display={props.originLabel}
                    placeholder="KWI"
                    onQuery={props.searchAirports}
                    onClearText={props.onOriginClear}
                    onPick={props.onOriginPick}
                  />
                </div>
                <div className="exp-input-cell exp-cell-grow">
                  <ShopAutocomplete
                    inline
                    label="إلى"
                    value={props.stayQuery}
                    display={props.stayQuery}
                    placeholder="فندق أو مدينة"
                    onQuery={props.searchCities}
                    onClearText={props.onStayQueryChange}
                    onPick={props.onStayPick}
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

            <div className="exp-input-cell exp-cell-dates">
              <span className="exp-cell-label">التواريخ</span>
              <div className="exp-dates-row">
                <DatePick
                  value={props.departDate}
                  onChange={props.onDepartDateChange}
                  label={props.mode === "stays" ? "تاريخ الوصول" : "تاريخ المغادرة"}
                />
                {showReturnDate ? (
                  <>
                    <span className="exp-date-sep">–</span>
                    <DatePick
                      value={props.returnDate}
                      onChange={props.onReturnDateChange}
                      label={props.mode === "stays" ? "تاريخ المغادرة" : "تاريخ العودة"}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell exp-cell-time">
                  <span className="exp-cell-label">وقت الاستلام</span>
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
                <div className="exp-input-cell exp-cell-time">
                  <span className="exp-cell-label">وقت التسليم</span>
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
              </>
            ) : null}

            <div className="exp-input-cell exp-cell-travelers">
              <button
                type="button"
                className="exp-travelers-trigger"
                onClick={() => setTravelersOpen((v) => !v)}
              >
                <span className="exp-cell-label">المسافرون</span>
                <strong>{travelerSummary}</strong>
              </button>
              {travelersOpen ? (
                <div className="exp-travelers-pop">
                  <div className="exp-travelers-row">
                    <span>بالغون</span>
                    <div className="exp-stepper">
                      <button
                        type="button"
                        onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}
                      >
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
                      <button
                        type="button"
                        onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}
                      >
                        −
                      </button>
                      <strong>{props.children}</strong>
                      <button
                        type="button"
                        onClick={() => props.onChildrenChange(props.children + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {props.mode === "stays" ? (
                    <div className="exp-travelers-row">
                      <span>غرف</span>
                      <div className="exp-stepper">
                        <button
                          type="button"
                          onClick={() => props.onRoomsChange(Math.max(1, props.rooms - 1))}
                        >
                          −
                        </button>
                        <strong>{props.rooms}</strong>
                        <button type="button" onClick={() => props.onRoomsChange(props.rooms + 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {props.mode === "flights" ? (
                    <label className="exp-travelers-row">
                      <span>الدرجة</span>
                      <select
                        value={props.cabinClass}
                        onChange={(e) => props.onCabinClassChange(e.target.value)}
                      >
                        <option value="economy">اقتصادية</option>
                        <option value="premium_economy">اقتصادية مميزة</option>
                        <option value="business">رجال أعمال</option>
                        <option value="first">أولى</option>
                      </select>
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className="exp-pop-done"
                    onClick={() => setTravelersOpen(false)}
                  >
                    تم
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="exp-search-link"
              disabled={props.loading}
              onClick={props.onSearch}
            >
              {props.loading ? "..." : "بحث"}
            </button>
          </div>

          {props.mode === "cars" ? (
            <div className="exp-cars-pills" role="group" aria-label="نوع النقل">
              <div className="exp-cars-pills-start">
                <button type="button" className="exp-pill-tab on">
                  نقل المطار
                </button>
                <button type="button" className="exp-pill-tab" disabled>
                  تأجير سيارات
                </button>
              </div>
              <div className="exp-cars-pills-end">
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
            </div>
          ) : null}

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
        </div>
      </div>
    </section>
  );
}
