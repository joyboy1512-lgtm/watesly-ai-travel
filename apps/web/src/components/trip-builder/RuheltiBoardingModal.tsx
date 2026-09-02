"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { TRIP_SERVICE_META } from "@watesly-travel/shared";
import type { TripServiceKind } from "@watesly-travel/shared";
import { useTripBuilder } from "./TripBuilderProvider";

type Props = {
  searchAirports: (q: string) => Promise<SuggestItem[]>;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

const SERVICE_ORDER: TripServiceKind[] = ["flight", "hotel", "transfer", "activity"];

function ServiceIcon({ kind }: { kind: TripServiceKind }) {
  if (kind === "flight") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="currentColor"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
    );
  }
  if (kind === "hotel") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="currentColor"
          d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"
        />
      </svg>
    );
  }
  if (kind === "transfer") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="currentColor"
          d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  );
}

export function RuheltiBoardingModal({ searchAirports, searchCities }: Props) {
  const {
    draft,
    boardingOpen,
    closeBoarding,
    toggleService,
    patchFlight,
    patchHotel,
    patchTransfer,
    patchActivity,
    runSearch,
    searching,
    searchError,
    searchButtonLabel,
  } = useTripBuilder();

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!boardingOpen) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 50);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      prevFocus.current?.focus?.();
    };
  }, [boardingOpen]);

  useEffect(() => {
    if (!boardingOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeBoarding();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boardingOpen, closeBoarding]);

  const serviceChips = useMemo(() => {
    const chips: string[] = [];
    if (draft.services.includes("hotel")) {
      const nights =
        draft.hotel.checkIn && draft.hotel.checkOut
          ? Math.max(
              1,
              Math.round(
                (new Date(`${draft.hotel.checkOut}T12:00:00`).getTime() -
                  new Date(`${draft.hotel.checkIn}T12:00:00`).getTime()) /
                  86400000,
              ),
            )
          : 7;
      chips.push(`فندق في ${draft.hotel.destination || "الوجهة"} · ${nights} ليال`);
    }
    if (draft.services.includes("transfer")) {
      chips.push(
        draft.transfer.roundtrip
          ? "نقل المطار ↔ الفندق"
          : `${draft.transfer.pickup || "المطار"} → ${draft.transfer.dropoff || "الفندق"}`,
      );
    }
    if (draft.services.includes("activity")) {
      chips.push(draft.activity.suggestWithAi ? "أنشطة مقترحة" : "أنشطة مختارة");
    }
    if (draft.services.includes("flight")) {
      chips.unshift(
        draft.flight.tripType === "oneway"
          ? "طيران ذهاب فقط"
          : draft.flight.tripType === "multicity"
            ? "طيران متعدد الوجهات"
            : "طيران ذهاب وعودة",
      );
    }
    return chips;
  }, [draft]);

  if (!boardingOpen || typeof document === "undefined") return null;

  const showReturn = draft.flight.tripType === "roundtrip";
  const selectedCount = draft.services.length;
  const travelersLabel =
    draft.flight.adults + draft.flight.children + draft.flight.infants === 1
      ? "1 مسافر"
      : `${draft.flight.adults + draft.flight.children + draft.flight.infants} مسافرين`;

  function swapAirports() {
    patchFlight({
      origin: draft.flight.destination,
      originLabel: draft.flight.destinationLabel,
      destination: draft.flight.origin,
      destinationLabel: draft.flight.originLabel,
    });
  }

  return createPortal(
    <div
      className="wg-ruhelti-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeBoarding();
      }}
    >
      <div
        ref={dialogRef}
        className="wg-ruhelti-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="wg-boarding-pass">
          <button
            type="button"
            className="wg-boarding-close"
            onClick={closeBoarding}
            aria-label="إغلاق"
          >
            ×
          </button>

          <aside className="wg-boarding-sidebar" aria-label="بحث متقدم">
            <span className="wg-boarding-sidebar-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
                />
              </svg>
            </span>
            <span className="wg-boarding-sidebar-text">بحث متقدم</span>
          </aside>

          <section className="wg-boarding-main">
            <header className="wg-boarding-header">
              <h2 id={titleId}>ابحث عن رحلتك</h2>
              <p>اختر خدماتك ودعنا نرتّب الرحلة</p>
            </header>

            <div className="wg-boarding-route-line" aria-hidden="true">
              <span className="wg-boarding-plane">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                  />
                </svg>
              </span>
            </div>

            {/* Mobile: compact service toggles */}
            <div className="wg-boarding-services-mobile" role="group" aria-label="اختيار الخدمات">
              {SERVICE_ORDER.map((kind) => {
                const meta = TRIP_SERVICE_META[kind];
                const selected = draft.services.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className="wg-service-chip"
                    aria-pressed={selected}
                    onClick={() => toggleService(kind)}
                  >
                    <ServiceIcon kind={kind} />
                    <span>{meta.labelAr}</span>
                  </button>
                );
              })}
            </div>

            <div className="wg-boarding-trip-types" role="radiogroup" aria-label="نوع الرحلة">
              {(
                [
                  ["roundtrip", "ذهاب وعودة"],
                  ["oneway", "ذهاب فقط"],
                  ["multicity", "متعدد الوجهات"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`wg-boarding-type${draft.flight.tripType === value ? " is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="tripType"
                    checked={draft.flight.tripType === value}
                    onChange={() => patchFlight({ tripType: value })}
                  />
                  <span className="wg-boarding-type-dot" aria-hidden />
                  {label}
                </label>
              ))}
            </div>

            <div className="wg-boarding-fields">
              <div className="wg-boarding-route-row">
                <div className="wg-boarding-cell wg-boarding-cell-from">
                  <ShopAutocomplete
                    label="من"
                    value={draft.flight.origin}
                    display={draft.flight.originLabel}
                    placeholder="مطار المغادرة"
                    inline
                    onQuery={searchAirports}
                    onPick={(item) =>
                      patchFlight({ origin: item.code, originLabel: item.title })
                    }
                    onClearText={(text) => patchFlight({ origin: "", originLabel: text })}
                  />
                </div>

                <button
                  type="button"
                  className="wg-boarding-swap"
                  onClick={swapAirports}
                  aria-label="تبديل الاتجاه"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
                    />
                  </svg>
                </button>

                <div className="wg-boarding-cell wg-boarding-cell-to">
                  <ShopAutocomplete
                    label="إلى"
                    value={draft.flight.destination}
                    display={draft.flight.destinationLabel}
                    placeholder="مطار الوصول"
                    inline
                    onQuery={searchAirports}
                    onPick={(item) => {
                      patchFlight({ destination: item.code, destinationLabel: item.title });
                      patchHotel({ destination: item.title });
                      patchActivity({ city: item.title });
                    }}
                    onClearText={(text) =>
                      patchFlight({ destination: "", destinationLabel: text })
                    }
                  />
                </div>
              </div>

              <div className="wg-boarding-meta-row">
                <div className="wg-boarding-cell wg-boarding-cell-dates">
                  <ShopDateRangePicker
                    checkIn={draft.flight.departDate}
                    checkOut={showReturn ? draft.flight.returnDate : ""}
                    onChange={(depart, ret) => {
                      patchFlight({ departDate: depart, returnDate: ret });
                      patchHotel({ checkIn: depart, checkOut: ret });
                      patchTransfer({ pickupDate: depart });
                      patchActivity({ startDate: depart, endDate: ret });
                    }}
                    startLabel="تاريخ المغادرة"
                    endLabel="تاريخ العودة"
                  />
                </div>

                <label className="wg-boarding-cell">
                  <span className="wg-boarding-cell-label">المسافرون</span>
                  <span className="wg-boarding-cell-value">
                    <select
                      aria-label="عدد المسافرين"
                      value={draft.flight.adults}
                      onChange={(e) => {
                        const n = Number(e.target.value) || 1;
                        patchFlight({ adults: n });
                        patchHotel({ adults: n });
                        patchTransfer({ passengers: n });
                        patchActivity({ participants: n });
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? "1 مسافر" : `${n} مسافرين`}
                        </option>
                      ))}
                    </select>
                    <span className="wg-boarding-cell-hint" aria-hidden>
                      {travelersLabel}
                    </span>
                  </span>
                </label>

                <label className="wg-boarding-cell">
                  <span className="wg-boarding-cell-label">درجة السفر</span>
                  <span className="wg-boarding-cell-value">
                    <select
                      value={draft.flight.cabinClass}
                      onChange={(e) => patchFlight({ cabinClass: e.target.value })}
                    >
                      <option value="economy">السياحية</option>
                      <option value="premium_economy">سياحية ممتازة</option>
                      <option value="business">رجال الأعمال</option>
                      <option value="first">الأولى</option>
                    </select>
                  </span>
                </label>
              </div>

              <div className="wg-boarding-checks">
                <label className="wg-boarding-check">
                  <input
                    type="checkbox"
                    checked={draft.flight.directOnly}
                    onChange={(e) => patchFlight({ directOnly: e.target.checked })}
                  />
                  <span>رحلات مباشرة فقط</span>
                </label>
                <label className="wg-boarding-check">
                  <input
                    type="checkbox"
                    checked={draft.flight.flexibleDates}
                    onChange={(e) => patchFlight({ flexibleDates: e.target.checked })}
                  />
                  <span>تواريخ مرنة ±3 أيام</span>
                </label>
              </div>
            </div>

            {selectedCount > 0 ? (
              <details className="wg-boarding-details" open>
                <summary>
                  <span>تفاصيل الخدمات المختارة</span>
                  <span className="wg-boarding-chip-row" aria-hidden>
                    {serviceChips.slice(0, 3).map((chip) => (
                      <span key={chip} className="wg-boarding-chip">
                        {chip}
                      </span>
                    ))}
                  </span>
                </summary>
                <div className="wg-boarding-details-body">
                  {draft.services.includes("hotel") ? (
                    <div className="wg-boarding-detail-block">
                      <h4>الفندق</h4>
                      <div className="wg-boarding-meta-row">
                        <div className="wg-boarding-cell">
                          <ShopAutocomplete
                            label="وجهة الفندق"
                            value={draft.hotel.destination}
                            display={draft.hotel.destination}
                            inline
                            onQuery={searchCities}
                            onPick={(item) => patchHotel({ destination: item.title })}
                            onClearText={(text) => patchHotel({ destination: text })}
                          />
                        </div>
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">الغرف</span>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={draft.hotel.rooms}
                            onChange={(e) =>
                              patchHotel({ rooms: Number(e.target.value) || 1 })
                            }
                          />
                        </label>
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">التصنيف</span>
                          <select
                            value={draft.hotel.starRating}
                            onChange={(e) =>
                              patchHotel({ starRating: Number(e.target.value) })
                            }
                          >
                            {[3, 4, 5].map((s) => (
                              <option key={s} value={s}>
                                {s} نجوم
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {draft.services.includes("transfer") ? (
                    <div className="wg-boarding-detail-block">
                      <h4>المواصلات</h4>
                      <div className="wg-boarding-meta-row">
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">الاستلام</span>
                          <input
                            value={draft.transfer.pickup}
                            onChange={(e) => patchTransfer({ pickup: e.target.value })}
                          />
                        </label>
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">الوجهة</span>
                          <input
                            value={draft.transfer.dropoff}
                            onChange={(e) => patchTransfer({ dropoff: e.target.value })}
                          />
                        </label>
                        <label className="wg-boarding-check wg-boarding-cell-check">
                          <input
                            type="checkbox"
                            checked={draft.transfer.roundtrip}
                            onChange={(e) => patchTransfer({ roundtrip: e.target.checked })}
                          />
                          <span>ذهاب وعودة</span>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {draft.services.includes("activity") ? (
                    <div className="wg-boarding-detail-block">
                      <h4>الأنشطة</h4>
                      <div className="wg-boarding-meta-row">
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">المدينة</span>
                          <input
                            value={draft.activity.city}
                            onChange={(e) => patchActivity({ city: e.target.value })}
                          />
                        </label>
                        <label className="wg-boarding-cell">
                          <span className="wg-boarding-cell-label">المشاركون</span>
                          <input
                            type="number"
                            min={1}
                            value={draft.activity.participants}
                            onChange={(e) =>
                              patchActivity({ participants: Number(e.target.value) || 1 })
                            }
                          />
                        </label>
                        <label className="wg-boarding-check wg-boarding-cell-check">
                          <input
                            type="checkbox"
                            checked={draft.activity.suggestWithAi}
                            onChange={(e) =>
                              patchActivity({ suggestWithAi: e.target.checked })
                            }
                          />
                          <span>دع المساعد يقترح الأنشطة</span>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

            {searchError ? <p className="wg-boarding-error" role="alert">{searchError}</p> : null}

            <div className="wg-boarding-mobile-cta">
              <button
                type="button"
                className="wg-boarding-cta"
                disabled={searching || selectedCount === 0}
                onClick={() => void runSearch()}
              >
                {searching ? "جاري البحث…" : searchButtonLabel}
              </button>
            </div>
          </section>

          <aside className="wg-boarding-stub">
            <div className="wg-boarding-stub-notch" aria-hidden />
            <h3>ماذا تريد في رحلتك؟</h3>
            <div className="wg-boarding-services" role="group" aria-label="اختيار الخدمات">
              {SERVICE_ORDER.map((kind) => {
                const meta = TRIP_SERVICE_META[kind];
                const selected = draft.services.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className="wg-service-check"
                    aria-pressed={selected}
                    onClick={() => toggleService(kind)}
                  >
                    <span className={`wg-service-tick${selected ? " is-on" : ""}`} aria-hidden>
                      {selected ? "✓" : ""}
                    </span>
                    <span className="wg-service-icon">
                      <ServiceIcon kind={kind} />
                    </span>
                    <strong>{meta.labelAr}</strong>
                    <span className="wg-service-desc">{meta.descriptionAr}</span>
                  </button>
                );
              })}
            </div>
            <p className="wg-boarding-services-summary">
              {selectedCount ? `${selectedCount} خدمات محددة` : "اختر خدمة واحدة على الأقل"}
            </p>
            <button
              type="button"
              className="wg-boarding-cta"
              disabled={searching || selectedCount === 0}
              onClick={() => void runSearch()}
            >
              {searching ? "جاري البحث…" : searchButtonLabel}
            </button>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
