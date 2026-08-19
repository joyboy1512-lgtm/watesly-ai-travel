"use client";

import { useState } from "react";
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
  adults: number;
  children: number;
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
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onSearch: () => void;
  loading: boolean;
  error: string;
  message: string;
  searchAirports: (q: string) => Promise<SuggestItem[]>;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

const PRODUCTS: Array<[Mode, string]> = [
  ["stays", "الفنادق"],
  ["flights", "الطيران"],
  ["cars", "النقل"],
  ["activities", "الأنشطة"],
];

const CABIN_LABELS: Record<string, string> = {
  economy: "اقتصادية",
  premium_economy: "اقتصادية مميزة",
  business: "رجال أعمال",
  first: "أولى",
};

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
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

export function ShopHeroBanner(props: Props) {
  const [expanded, setExpanded] = useState(false);

  const pageTitle =
    props.mode === "flights"
      ? "قارن واحجز رحلات الطيران"
      : props.mode === "stays"
        ? "ابحث عن أفضل الفنادق"
        : props.mode === "cars"
          ? "احجز النقل من المطار"
          : "اكتشف الأنشطة والمعالم";

  const travelerSummary = `${props.adults + props.children} مسافر${
    props.mode === "flights" ? ` · ${CABIN_LABELS[props.cabinClass] || "اقتصادية"}` : ""
  }`;

  function swapAirports() {
    const o = props.origin;
    const ol = props.originLabel;
    props.onOriginPick({ id: "swap", code: props.destination, title: props.destinationLabel });
    props.onDestinationPick({ id: "swap", code: o, title: ol });
  }

  return (
    <section className="exp-search-hero" id="search">
      <div className="exp-search-wrap">
        <h1 className="exp-page-title">{pageTitle}</h1>

        <div className="exp-product-tabs" role="tablist" aria-label="نوع الحجز">
          {PRODUCTS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={props.mode === key ? "on" : undefined}
              aria-selected={props.mode === key}
              onClick={() => props.onModeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {props.mode === "flights" ? (
          <div className="exp-trip-row">
            <div className="exp-trip-type" role="group" aria-label="نوع الرحلة">
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
            <label className="exp-cabin-select">
              <span className="sr-only">درجة السفر</span>
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
          </div>
        ) : null}

        {props.mode === "cars" ? (
          <div className="exp-trip-row">
            <div className="exp-trip-type" role="group" aria-label="نوع النقل">
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
          </div>
        ) : null}

        <div className="exp-search-bar">
          {props.mode === "flights" ? (
            <>
              <div className="exp-segment exp-segment-from">
                <ShopAutocomplete
                  label="من"
                  value={props.origin}
                  display={props.originLabel}
                  placeholder="مطار المغادرة"
                  onQuery={props.searchAirports}
                  onClearText={props.onOriginClear}
                  onPick={props.onOriginPick}
                />
              </div>
              <button
                type="button"
                className="exp-swap-btn"
                aria-label="تبديل المطارات"
                onClick={swapAirports}
              >
                <IconSwap />
              </button>
              <div className="exp-segment exp-segment-to">
                <ShopAutocomplete
                  label="إلى"
                  value={props.destination}
                  display={props.destinationLabel}
                  placeholder="مطار الوصول"
                  onQuery={props.searchAirports}
                  onClearText={props.onDestinationClear}
                  onPick={props.onDestinationPick}
                />
              </div>
            </>
          ) : props.mode === "stays" || props.mode === "cars" ? (
            <div className="exp-segment exp-segment-wide">
              <ShopAutocomplete
                label={props.mode === "cars" ? "إلى" : "الوجهة"}
                value={props.stayQuery}
                display={props.stayQuery}
                placeholder="مدينة أو فندق"
                onQuery={props.searchCities}
                onClearText={props.onStayQueryChange}
                onPick={props.onStayPick}
              />
            </div>
          ) : (
            <div className="exp-segment exp-segment-wide">
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
          )}

          {props.mode === "cars" ? (
            <div className="exp-segment">
              <ShopAutocomplete
                label="المطار"
                value={props.origin}
                display={props.originLabel}
                placeholder="KWI"
                onQuery={props.searchAirports}
                onClearText={props.onOriginClear}
                onPick={props.onOriginPick}
              />
            </div>
          ) : null}

          <div className="exp-segment exp-segment-dates">
            <label className="exp-field">
              <span>{props.mode === "stays" ? "الوصول" : "المغادرة"}</span>
              <input
                type="date"
                value={props.departDate}
                onChange={(e) => props.onDepartDateChange(e.target.value)}
              />
              <em className="exp-field-hint">{formatDateShort(props.departDate)}</em>
            </label>
          </div>

          {(props.mode === "flights" && props.tripType === "roundtrip") ||
          props.mode === "stays" ||
          props.mode === "activities" ||
          (props.mode === "cars" && props.transferRoundtrip) ? (
            <div className="exp-segment exp-segment-dates">
              <label className="exp-field">
                <span>{props.mode === "stays" ? "المغادرة" : "العودة"}</span>
                <input
                  type="date"
                  value={props.returnDate}
                  onChange={(e) => props.onReturnDateChange(e.target.value)}
                />
                <em className="exp-field-hint">{formatDateShort(props.returnDate)}</em>
              </label>
            </div>
          ) : null}

          {props.mode === "cars" ? (
            <div className="exp-segment">
              <label className="exp-field">
                <span>وقت الاستلام</span>
                <input
                  type="time"
                  value={props.pickupTime}
                  onChange={(e) => props.onPickupTimeChange(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            className="exp-segment exp-segment-travelers"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="exp-field-label">المسافرون</span>
            <strong>{travelerSummary}</strong>
          </button>

          <button
            type="button"
            className="exp-search-btn"
            disabled={props.loading}
            aria-label="بحث"
            onClick={props.onSearch}
          >
            {props.loading ? "…" : <IconSearch />}
          </button>
        </div>

        {expanded ? (
          <div className="exp-travelers-panel">
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
                <button
                  type="button"
                  onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}
                >
                  −
                </button>
                <strong>{props.children}</strong>
                <button type="button" onClick={() => props.onChildrenChange(props.children + 1)}>
                  +
                </button>
              </div>
            </div>
            {props.mode === "flights" ? (
              <label className="exp-travelers-row">
                <span>درجة السفر</span>
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
          </div>
        ) : null}

        {props.error ? <p className="shop-error exp-search-msg">{props.error}</p> : null}
        {props.message ? <p className="shop-status exp-search-msg">{props.message}</p> : null}
      </div>
    </section>
  );
}
