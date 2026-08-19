"use client";

import { useState, type ReactNode } from "react";
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

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10z"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
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

function formatDateShort(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("ar-KW", { weekday: "short", day: "numeric", month: "short" });
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

  function crossSell(mode: Mode) {
    props.onModeChange(mode);
    document.getElementById("search")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

        <div className="exp-dialog">
          <div className="exp-icon-tabs" role="tablist" aria-label="نوع الحجز">
            {PRODUCTS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                className={`exp-icon-tab${props.mode === key ? " on" : ""}`}
                aria-selected={props.mode === key}
                onClick={() => props.onModeChange(key)}
              >
                <span className="exp-icon-tab-svg">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {props.mode === "flights" ? (
            <div className="exp-subtabs" role="group" aria-label="نوع الرحلة">
              <button
                type="button"
                className={props.tripType === "roundtrip" ? "on" : undefined}
                onClick={() => props.onTripTypeChange("roundtrip")}
              >
                ذهاب وعودة
              </button>
              <button
                type="button"
                className={props.tripType === "oneway" ? "on" : undefined}
                onClick={() => props.onTripTypeChange("oneway")}
              >
                ذهاب فقط
              </button>
            </div>
          ) : null}

          {props.mode === "cars" ? (
            <div className="exp-subtabs exp-subtabs-cars" role="group" aria-label="نوع النقل">
              <button type="button" className="on">
                نقل المطار
              </button>
              <button type="button" disabled>
                تأجير سيارات
              </button>
              <span className="exp-subtabs-spacer" />
              <button
                type="button"
                className={!props.transferRoundtrip ? "on" : undefined}
                onClick={() => props.onTransferRoundtripChange(false)}
              >
                وصول فقط
              </button>
              <button
                type="button"
                className={props.transferRoundtrip ? "on" : undefined}
                onClick={() => props.onTransferRoundtripChange(true)}
              >
                وصول وعودة
              </button>
            </div>
          ) : null}

          {props.mode === "activities" ? (
            <p className="exp-activities-hint">
              تبحث عن رياضة أو حفلات؟{" "}
              <button type="button" onClick={() => void props.onSearch()}>
                ابحث عن فعاليات
              </button>
            </p>
          ) : null}

          <div className="exp-form-row">
            {props.mode === "flights" ? (
              <>
                <div className="exp-input-cell exp-cell-grow">
                  <IconPin />
                  <div className="exp-cell-body">
                    <ShopAutocomplete
                      label="المغادرة من"
                      value={props.origin}
                      display={props.originLabel}
                      placeholder="مدينة أو مطار"
                      onQuery={props.searchAirports}
                      onClearText={props.onOriginClear}
                      onPick={props.onOriginPick}
                    />
                  </div>
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
                  <IconPin />
                  <div className="exp-cell-body">
                    <ShopAutocomplete
                      label="الوجهة"
                      value={props.destination}
                      display={props.destinationLabel}
                      placeholder="إلى أين؟"
                      onQuery={props.searchAirports}
                      onClearText={props.onDestinationClear}
                      onPick={props.onDestinationPick}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {props.mode === "stays" ? (
              <div className="exp-input-cell exp-cell-grow">
                <IconPin />
                <div className="exp-cell-body">
                  <ShopAutocomplete
                    label="إلى أين؟"
                    value={props.stayQuery}
                    display={props.stayQuery}
                    placeholder="مدينة أو فندق"
                    onQuery={props.searchCities}
                    onClearText={props.onStayQueryChange}
                    onPick={props.onStayPick}
                  />
                </div>
              </div>
            ) : null}

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell">
                  <IconPin />
                  <div className="exp-cell-body">
                    <ShopAutocomplete
                      label="من (المطار)"
                      value={props.origin}
                      display={props.originLabel}
                      placeholder="KWI"
                      onQuery={props.searchAirports}
                      onClearText={props.onOriginClear}
                      onPick={props.onOriginPick}
                    />
                  </div>
                </div>
                <div className="exp-input-cell exp-cell-grow">
                  <IconPin />
                  <div className="exp-cell-body">
                    <ShopAutocomplete
                      label="إلى"
                      value={props.stayQuery}
                      display={props.stayQuery}
                      placeholder="فندق أو مدينة"
                      onQuery={props.searchCities}
                      onClearText={props.onStayQueryChange}
                      onPick={props.onStayPick}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {props.mode === "activities" ? (
              <div className="exp-input-cell exp-cell-grow">
                <IconPin />
                <div className="exp-cell-body">
                  <ShopAutocomplete
                    label="الوجهة"
                    value={props.activityDest}
                    display={props.activityLabel}
                    placeholder="مدينة النشاط"
                    onQuery={props.searchCities}
                    onClearText={props.onActivityClear}
                    onPick={props.onActivityPick}
                  />
                </div>
              </div>
            ) : null}

            <div className="exp-input-cell exp-cell-dates">
              <IconCalendar />
              <div className="exp-cell-body exp-dates-inline">
                <label>
                  <span>{props.mode === "stays" ? "الوصول" : "المغادرة"}</span>
                  <input
                    type="date"
                    value={props.departDate}
                    onChange={(e) => props.onDepartDateChange(e.target.value)}
                  />
                  <em>{formatDateShort(props.departDate)}</em>
                </label>
                {(props.mode === "flights" && props.tripType === "roundtrip") ||
                props.mode === "stays" ||
                props.mode === "activities" ||
                (props.mode === "cars" && props.transferRoundtrip) ? (
                  <>
                    <span className="exp-date-sep">–</span>
                    <label>
                      <span>{props.mode === "stays" ? "المغادرة" : "العودة"}</span>
                      <input
                        type="date"
                        value={props.returnDate}
                        onChange={(e) => props.onReturnDateChange(e.target.value)}
                      />
                      <em>{formatDateShort(props.returnDate)}</em>
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            {props.mode === "cars" ? (
              <>
                <div className="exp-input-cell exp-cell-time">
                  <label>
                    <span>وقت الاستلام</span>
                    <select
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
                  </label>
                </div>
                <div className="exp-input-cell exp-cell-time">
                  <label>
                    <span>وقت التسليم</span>
                    <select
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
                  </label>
                </div>
              </>
            ) : null}

            {props.mode !== "activities" && props.mode !== "cars" ? (
              <div className="exp-input-cell exp-cell-travelers">
                <button
                  type="button"
                  className="exp-travelers-trigger"
                  onClick={() => setTravelersOpen((v) => !v)}
                >
                  <IconUsers />
                  <span className="exp-cell-body">
                    <span className="exp-cell-label">المسافرون</span>
                    <strong>{travelerSummary}</strong>
                  </span>
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
                          onClick={() =>
                            props.onChildrenChange(Math.max(0, props.children - 1))
                          }
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
            ) : null}

            <button
              type="button"
              className="exp-search-submit"
              disabled={props.loading}
              onClick={props.onSearch}
            >
              {props.loading ? "..." : "بحث"}
            </button>
          </div>

          {props.mode === "flights" ? (
            <div className="exp-extras">
              <label>
                <input type="checkbox" onChange={() => crossSell("stays")} />
                <span>أضف مكان إقامة</span>
              </label>
              <label>
                <input type="checkbox" onChange={() => crossSell("cars")} />
                <span>أضف نقل</span>
              </label>
            </div>
          ) : null}

          {props.mode === "stays" ? (
            <div className="exp-extras">
              <label>
                <input type="checkbox" onChange={() => crossSell("flights")} />
                <span>أضف رحلة طيران</span>
              </label>
              <label>
                <input type="checkbox" onChange={() => crossSell("cars")} />
                <span>أضف نقل</span>
              </label>
            </div>
          ) : null}

          {props.error ? <p className="shop-error exp-dialog-msg">{props.error}</p> : null}
          {props.message ? <p className="shop-status exp-dialog-msg">{props.message}</p> : null}
        </div>

        <div className="exp-promo-banner">
          <div className="exp-promo-copy">
            <span className="exp-promo-icon" aria-hidden>
              %
            </span>
            <div>
              <strong>وفّر 30% أو أكثر على الفنادق</strong>
              <span>عروض مختارة لمسافري WeekendGate</span>
            </div>
          </div>
          <a href="/#offers" className="exp-promo-btn">
            احجز الآن
          </a>
        </div>
      </div>
    </section>
  );
}
