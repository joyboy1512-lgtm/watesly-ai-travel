"use client";

import { useEffect, useState } from "react";
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

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10z"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  );
}

export function ShopHeroBanner(props: Props) {
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const current = HERO_SLIDES[slide]!;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const whereLabel =
    props.mode === "flights"
      ? "الوجهة"
      : props.mode === "stays"
        ? "الإقامة"
        : props.mode === "cars"
          ? "المدينة / الفندق"
          : "النشاط";

  return (
    <div className="shop-hero-cinematic">
      <div
        className="shop-hero-slide"
        style={{ backgroundImage: `url(${current.image})` }}
      />
      <div className="shop-hero-shade" />

      <div className="shop-hero-inner">
        <div className="shop-hero-copy cinematic">
          <p className="shop-hero-kicker">{current.kicker}</p>
          <h1>{current.title}</h1>
          <p className="shop-hero-sub">{current.subtitle}</p>
          <p className="shop-hero-desc">{current.description}</p>
        </div>

      </div>

      <div className="shop-hero-dots-wrap" role="tablist" aria-label="شرائح الهيرو">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === slide ? "on" : undefined}
            aria-selected={i === slide}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>

      <svg
        className="shop-hero-wave"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="#ffffff"
          d="M0,72 C360,108 720,36 1080,72 C1260,88 1380,56 1440,64 L1440,120 L0,120 Z"
        />
      </svg>

      <div className="shop-hero-float-wrap" id="search">
        <div className="shop-mode-row">
          {(
            [
              ["flights", "الطيران"],
              ["stays", "الفنادق"],
              ["cars", "نقل"],
              ["activities", "أنشطة"],
            ] as Array<[Mode, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={props.mode === key ? "on" : undefined}
              onClick={() => props.onModeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="shop-search-pill">
          <div className="shop-pill-field shop-pill-where">
            <span className="shop-pill-icon">
              <IconPin />
            </span>
            <div className="shop-pill-input">
              {props.mode === "flights" ? (
                <ShopAutocomplete
                  label={whereLabel}
                  value={props.destination}
                  display={props.destinationLabel}
                  placeholder="إلى أين؟"
                  onQuery={props.searchAirports}
                  onClearText={props.onDestinationClear}
                  onPick={props.onDestinationPick}
                />
              ) : props.mode === "activities" ? (
                <ShopAutocomplete
                  label={whereLabel}
                  value={props.activityDest}
                  display={props.activityLabel}
                  placeholder="مدينة النشاط"
                  onQuery={props.searchCities}
                  onClearText={props.onActivityClear}
                  onPick={props.onActivityPick}
                />
              ) : (
                <ShopAutocomplete
                  label={whereLabel}
                  value={props.stayQuery}
                  display={props.stayQuery}
                  placeholder="مدينة أو فندق"
                  onQuery={props.searchCities}
                  onClearText={props.onStayQueryChange}
                  onPick={props.onStayPick}
                />
              )}
            </div>
          </div>

          <div className="shop-pill-divider" />

          <div className="shop-pill-field shop-pill-when">
            <span className="shop-pill-icon">
              <IconCalendar />
            </span>
            <label className="shop-pill-input">
              <span>متى</span>
              <input
                type="date"
                value={props.departDate}
                onChange={(e) => props.onDepartDateChange(e.target.value)}
              />
            </label>
          </div>

          <div className="shop-pill-divider" />

          <div className="shop-pill-field shop-pill-guests">
            <span className="shop-pill-icon">
              <IconUsers />
            </span>
            <div className="shop-pill-input">
              <span>المسافرون</span>
              <div className="shop-pill-counter">
                <button
                  type="button"
                  aria-label="تقليل"
                  onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}
                >
                  −
                </button>
                <strong>{props.adults + props.children}</strong>
                <button
                  type="button"
                  aria-label="زيادة"
                  onClick={() => props.onAdultsChange(props.adults + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="shop-pill-submit"
            disabled={props.loading}
            onClick={props.onSearch}
          >
            {props.loading ? "..." : "ابحث"}
          </button>
        </div>

        <button
          type="button"
          className="shop-expand-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "إخفاء الخيارات" : "خيارات متقدمة"}
        </button>

        {expanded ? (
          <div className="shop-search-expanded">
            {props.mode === "flights" ? (
              <>
                <div className="shop-chips">
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
                  <label className="opt-chip opt-select">
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
                </div>
                <div className="shop-expanded-grid">
                  <ShopAutocomplete
                    label="من"
                    value={props.origin}
                    display={props.originLabel}
                    placeholder="مطار المغادرة"
                    onQuery={props.searchAirports}
                    onClearText={props.onOriginClear}
                    onPick={props.onOriginPick}
                  />
                  {props.tripType === "roundtrip" ? (
                    <label className="fs-cell">
                      <span>تاريخ العودة</span>
                      <input
                        type="date"
                        value={props.returnDate}
                        onChange={(e) => props.onReturnDateChange(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </>
            ) : null}

            {props.mode === "stays" || props.mode === "activities" ? (
              <label className="fs-cell">
                <span>تاريخ العودة / النهاية</span>
                <input
                  type="date"
                  value={props.returnDate}
                  onChange={(e) => props.onReturnDateChange(e.target.value)}
                />
              </label>
            ) : null}

            {props.mode === "cars" ? (
              <>
                <div className="shop-chips">
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
                <div className="shop-expanded-grid">
                  <ShopAutocomplete
                    label="المطار"
                    value={props.origin}
                    display={props.originLabel}
                    placeholder="KWI"
                    onQuery={props.searchAirports}
                    onClearText={props.onOriginClear}
                    onPick={props.onOriginPick}
                  />
                  <label className="fs-cell">
                    <span>وقت الاستلام</span>
                    <input
                      type="time"
                      value={props.pickupTime}
                      onChange={(e) => props.onPickupTimeChange(e.target.value)}
                    />
                  </label>
                  {props.transferRoundtrip ? (
                    <label className="fs-cell">
                      <span>تاريخ العودة</span>
                      <input
                        type="date"
                        value={props.returnDate}
                        onChange={(e) => props.onReturnDateChange(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="shop-chips">
              <button type="button" onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}>
                طفل −
              </button>
              <span>{props.children} طفل</span>
              <button type="button" onClick={() => props.onChildrenChange(props.children + 1)}>
                طفل +
              </button>
            </div>
          </div>
        ) : null}

        {props.error ? <p className="shop-error">{props.error}</p> : null}
        {props.message ? <p className="shop-status">{props.message}</p> : null}
      </div>
    </div>
  );
}
