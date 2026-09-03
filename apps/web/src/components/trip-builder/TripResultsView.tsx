"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripServicesRibbon } from "./TripProgressStepper";
import { MOCKUP_TRIP, money, type MockupTier } from "./mockup-data";

export function TripResultsView() {
  const router = useRouter();
  const { draft, selectTier } = useTripBuilder();
  const [tier, setTier] = useState<MockupTier>("balanced");

  const dest =
    draft.flight.destinationLabel || draft.flight.destination || MOCKUP_TRIP.destinationAr;
  const adults = draft.flight.adults || MOCKUP_TRIP.travelers;
  const services = (draft.services?.length
    ? draft.services
    : ["flight", "hotel", "transfer", "activity"]) as string[];

  const prices = useMemo(() => {
    const offers = (draft as { selectedOffers?: Record<string, { sellAmountMinor?: number }> })
      .selectedOffers;
    const read = (key: string, fallback: number) => {
      const v = offers?.[key]?.sellAmountMinor;
      return typeof v === "number" && v > 0 ? Math.round(v / 1000) : fallback;
    };
    const flight = read("flight", MOCKUP_TRIP.prices.flight);
    const hotel = read("hotel", MOCKUP_TRIP.prices.hotel);
    const transfer = read("transfer", MOCKUP_TRIP.prices.transfer);
    const activities = read("activity", MOCKUP_TRIP.prices.activities);
    return { flight, hotel, transfer, activities, total: flight + hotel + transfer + activities };
  }, [draft]);

  function onTier(next: MockupTier) {
    setTier(next);
    try {
      selectTier(next as never);
    } catch {
      /* demo */
    }
  }

  return (
    <div className="wg-ru-page" dir="rtl">
      <TripServicesRibbon services={services} />

      <header className="wg-ru-hero-head">
        <h1>رحلتك إلى {dest} جاهزة</h1>
        <p>
          {MOCKUP_TRIP.days} أيام · من {MOCKUP_TRIP.dateFromAr} إلى {MOCKUP_TRIP.dateToAr} ·{" "}
          {adults === 1 ? "مسافر واحد" : `${adults} مسافرين`}
        </p>
      </header>

      <div className="wg-ru-tier-row" role="group" aria-label="خيارات الرحلة">
        {MOCKUP_TRIP.tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`wg-ru-tier-card${tier === t.id ? " selected" : ""}`}
            aria-pressed={tier === t.id}
            onClick={() => onTier(t.id)}
          >
            <span className="wg-ru-tier-ico" aria-hidden>
              {t.icon}
            </span>
            <strong>{t.title}</strong>
            <small>{t.desc}</small>
          </button>
        ))}
      </div>

      <div className="wg-ru-layout">
        <div className="wg-ru-main">
          <h2 className="wg-ru-section-title">برنامج رحلتك</h2>

          {services.includes("flight") ? (
            <article className="wg-ru-svc-card">
              <div className="wg-ru-svc-check">✓</div>
              <div className="wg-ru-svc-body">
                <div className="wg-ru-flight-block">
                  {[MOCKUP_TRIP.flight.outbound, MOCKUP_TRIP.flight.inbound].map((leg) => (
                    <div key={`${leg.from}-${leg.depart}`} className="wg-ru-flight-leg">
                      <div className="wg-ru-flight-times">
                        <div>
                          <strong>{leg.depart}</strong>
                          <span>{leg.from}</span>
                        </div>
                        <div className="wg-ru-flight-mid">
                          <small>{leg.duration}</small>
                          <span className="wg-ru-flight-line" />
                          <span aria-hidden>✈</span>
                        </div>
                        <div>
                          <strong>{leg.arrive}</strong>
                          <span>{leg.to}</span>
                        </div>
                      </div>
                      <p className="wg-ru-muted">{leg.dateAr}</p>
                    </div>
                  ))}
                </div>
                <span className="wg-ru-badge-green">{MOCKUP_TRIP.flight.badge}</span>
              </div>
              <div className="wg-ru-svc-side">
                <div className="wg-ru-price">{money(prices.flight)}</div>
                <small>سعر الطيران</small>
                <button type="button" className="wg-ru-outline-btn">
                  تغيير الرحلة
                </button>
              </div>
            </article>
          ) : null}

          {services.includes("hotel") ? (
            <article className="wg-ru-svc-card">
              <div className="wg-ru-svc-check">✓</div>
              <div className="wg-ru-svc-body wg-ru-hotel-body">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MOCKUP_TRIP.hotel.image}
                  alt={MOCKUP_TRIP.hotel.name}
                  className="wg-ru-hotel-img"
                />
                <div>
                  <h3>{MOCKUP_TRIP.hotel.name}</h3>
                  <p className="wg-ru-stars">{"★".repeat(MOCKUP_TRIP.hotel.stars)}</p>
                  <p className="wg-ru-muted">
                    {MOCKUP_TRIP.hotel.nights} ليالٍ · {MOCKUP_TRIP.dateFromAr} —{" "}
                    {MOCKUP_TRIP.dateToAr}
                  </p>
                  <div className="wg-ru-chips">
                    <span>{MOCKUP_TRIP.hotel.board}</span>
                    {MOCKUP_TRIP.hotel.refundable ? (
                      <span className="ok">قابل للاسترداد</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="wg-ru-svc-side">
                <div className="wg-ru-price">{money(prices.hotel)}</div>
                <small>سعر الفندق</small>
                <button type="button" className="wg-ru-outline-btn">
                  تغيير الفندق
                </button>
              </div>
            </article>
          ) : null}

          {services.includes("transfer") ? (
            <article className="wg-ru-svc-card">
              <div className="wg-ru-svc-check">✓</div>
              <div className="wg-ru-svc-body">
                {MOCKUP_TRIP.transfer.legs.map((leg) => (
                  <div key={leg.title} className="wg-ru-transfer-row">
                    <span aria-hidden>🚗</span>
                    <div>
                      <strong>{leg.title}</strong>
                      <p className="wg-ru-muted">{leg.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="wg-ru-svc-side">
                <div className="wg-ru-price">{money(prices.transfer)}</div>
                <small>سعر المواصلات</small>
                <button type="button" className="wg-ru-outline-btn">
                  تغيير المواصلات
                </button>
              </div>
            </article>
          ) : null}

          {services.includes("activity") ? (
            <article className="wg-ru-svc-card">
              <div className="wg-ru-svc-check">✓</div>
              <div className="wg-ru-svc-body">
                {MOCKUP_TRIP.activities.map((a) => (
                  <div key={a.title} className="wg-ru-act-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image} alt={a.title} />
                    <div className="wg-ru-act-info">
                      <strong>
                        اليوم {a.day}: {a.title}
                      </strong>
                      <p className="wg-ru-muted">
                        {a.dateAr} · {a.time}
                      </p>
                    </div>
                    <button type="button" className="wg-ru-ghost-btn">
                      تغيير النشاط
                    </button>
                  </div>
                ))}
              </div>
              <div className="wg-ru-svc-side">
                <div className="wg-ru-price">{money(prices.activities)}</div>
                <small>سعر الأنشطة</small>
                <button type="button" className="wg-ru-outline-btn">
                  تغيير الأنشطة
                </button>
              </div>
            </article>
          ) : null}
        </div>

        <aside className="wg-ru-aside">
          <div className="wg-ru-summary-card">
            <h3>ملخص رحلتك</h3>
            <div className="wg-ru-sum-line">
              <span>✈ الطيران</span>
              <span>{money(prices.flight)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🏨 الفندق</span>
              <span>{money(prices.hotel)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🚗 المواصلات</span>
              <span>{money(prices.transfer)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🎟 الأنشطة</span>
              <span>{money(prices.activities)}</span>
            </div>
            <div className="wg-ru-sum-total">
              <span>الإجمالي</span>
              <strong>{money(prices.total)}</strong>
            </div>
            <p className="wg-ru-muted">السعر شامل الضرائب</p>
            <button
              type="button"
              className="wg-ru-primary-btn"
              onClick={() => router.push("/trip-builder/travelers")}
            >
              متابعة الحجز ←
            </button>
            <button type="button" className="wg-ru-link-btn">
              🔖 حفظ الرحلة
            </button>
          </div>

          <div className="wg-ru-smart-card">
            <h4>✨ اقتراح ذكي</h4>
            <p>
              وفّر {MOCKUP_TRIP.prices.saveSuggestion} د.ك بتغيير موعد المغادرة يوماً واحداً
            </p>
            <button type="button" className="wg-ru-outline-btn">
              عرض الاقتراح
            </button>
          </div>
        </aside>
      </div>

      <div className="wg-ru-mobile-bar">
        <strong>{money(prices.total)}</strong>
        <button
          type="button"
          className="wg-ru-primary-btn"
          onClick={() => router.push("/trip-builder/travelers")}
        >
          متابعة الحجز
        </button>
      </div>
    </div>
  );
}
