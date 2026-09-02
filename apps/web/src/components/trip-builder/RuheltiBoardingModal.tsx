"use client";

import { useEffect, useId, useRef } from "react";
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

  if (!boardingOpen || typeof document === "undefined") return null;

  const showReturn = draft.flight.tripType === "roundtrip";
  const selectedCount = draft.services.length;

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
        <div className="wg-boarding-pass" style={{ position: "relative" }}>
          <button
            type="button"
            className="wg-boarding-close"
            onClick={closeBoarding}
            aria-label="إغلاق"
          >
            ×
          </button>

          <aside className="wg-boarding-sidebar" aria-hidden="true">
            <span aria-hidden>⚙</span>
            <span>بحث متقدم</span>
          </aside>

          <section className="wg-boarding-main">
            <header className="wg-boarding-header">
              <h2 id={titleId}>ابحث عن رحلتك</h2>
              <p>اختر خدماتك ودعنا نرتّب الرحلة</p>
            </header>

            <div className="wg-boarding-trip-types" role="radiogroup" aria-label="نوع الرحلة">
              {(
                [
                  ["roundtrip", "ذهاب وعودة"],
                  ["oneway", "ذهاب فقط"],
                  ["multicity", "متعدد الوجهات"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="tripType"
                    checked={draft.flight.tripType === value}
                    onChange={() => patchFlight({ tripType: value })}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="wg-boarding-route-line" aria-hidden="true">
              <span>✈</span>
            </div>

            <div className="wg-boarding-fields">
              <div className="wg-boarding-row">
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
                <button
                  type="button"
                  className="wg-boarding-swap"
                  onClick={swapAirports}
                  aria-label="تبديل الاتجاه"
                >
                  ⇄
                </button>
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

              <div className="wg-boarding-row">
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
                <label>
                  المسافرون
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={draft.flight.adults}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 1;
                      patchFlight({ adults: n });
                      patchHotel({ adults: n });
                      patchTransfer({ passengers: n });
                      patchActivity({ participants: n });
                    }}
                  />
                </label>
                <label>
                  درجة السفر
                  <select
                    value={draft.flight.cabinClass}
                    onChange={(e) => patchFlight({ cabinClass: e.target.value })}
                  >
                    <option value="economy">السياحية</option>
                    <option value="premium_economy">سياحية ممتازة</option>
                    <option value="business">رجال الأعمال</option>
                    <option value="first">الأولى</option>
                  </select>
                </label>
              </div>

              <div className="wg-boarding-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.flight.directOnly}
                    onChange={(e) => patchFlight({ directOnly: e.target.checked })}
                  />
                  رحلات مباشرة فقط
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.flight.flexibleDates}
                    onChange={(e) => patchFlight({ flexibleDates: e.target.checked })}
                  />
                  تواريخ مرنة ±3 أيام
                </label>
              </div>
            </div>

            {selectedCount > 0 ? (
              <details className="wg-boarding-details" open>
                <summary>تفاصيل الخدمات المختارة</summary>
                <div className="wg-boarding-details-body">
                  {draft.services.includes("hotel") ? (
                    <div className="wg-boarding-row">
                      <ShopAutocomplete
                        label="وجهة الفندق"
                        value={draft.hotel.destination}
                        display={draft.hotel.destination}
                        inline
                        onQuery={searchCities}
                        onPick={(item) => patchHotel({ destination: item.title })}
                        onClearText={(text) => patchHotel({ destination: text })}
                      />
                      <label>
                        الغرف
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
                      <label>
                        تصنيف
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
                  ) : null}

                  {draft.services.includes("transfer") ? (
                    <div className="wg-boarding-row">
                      <label>
                        الاستلام
                        <input
                          value={draft.transfer.pickup}
                          onChange={(e) => patchTransfer({ pickup: e.target.value })}
                        />
                      </label>
                      <label>
                        الوجهة
                        <input
                          value={draft.transfer.dropoff}
                          onChange={(e) => patchTransfer({ dropoff: e.target.value })}
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.transfer.roundtrip}
                          onChange={(e) => patchTransfer({ roundtrip: e.target.checked })}
                        />
                        ذهاب وعودة
                      </label>
                    </div>
                  ) : null}

                  {draft.services.includes("activity") ? (
                    <div className="wg-boarding-row">
                      <label>
                        المدينة
                        <input
                          value={draft.activity.city}
                          onChange={(e) => patchActivity({ city: e.target.value })}
                        />
                      </label>
                      <label>
                        المشاركون
                        <input
                          type="number"
                          min={1}
                          value={draft.activity.participants}
                          onChange={(e) =>
                            patchActivity({ participants: Number(e.target.value) || 1 })
                          }
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.activity.suggestWithAi}
                          onChange={(e) =>
                            patchActivity({ suggestWithAi: e.target.checked })
                          }
                        />
                        دع المساعد يقترح الأنشطة
                      </label>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

            {searchError ? <p className="wg-boarding-error" role="alert">{searchError}</p> : null}
          </section>

          <aside className="wg-boarding-stub">
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
                    <span className="icon" aria-hidden>
                      {meta.icon}
                    </span>
                    <strong>{meta.labelAr}</strong>
                    <span>{meta.descriptionAr}</span>
                  </button>
                );
              })}
            </div>
            <p className="wg-boarding-services-summary">
              {selectedCount ? `${selectedCount} خدمات محددة` : "لم تُحدد خدمات بعد"}
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
