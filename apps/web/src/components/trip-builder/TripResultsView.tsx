"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_LABELS } from "@watesly-travel/shared";
import type { TripServiceKind, TripTier } from "@watesly-travel/shared";
import { formatKwdMinor } from "@/lib/platform-api";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";

const SERVICE_LABELS: Record<TripServiceKind, string> = {
  flight: "الطيران",
  hotel: "الفندق",
  transfer: "المواصلات",
  activity: "الأنشطة",
};

export function TripResultsView() {
  const router = useRouter();
  const { draft, selectTier, swapOffer } = useTripBuilder();
  const [changing, setChanging] = useState<TripServiceKind | null>(null);

  const dest =
    draft.flight.destinationLabel || draft.flight.destination || draft.hotel.destination;
  const options = draft.search?.options || [];
  const selectedTier = draft.selectedTier || options[1]?.tier || "balanced";
  const current = options.find((o) => o.tier === selectedTier);

  const total = useMemo(() => {
    let sum = 0;
    const offers = draft.selectedOffers;
    if (offers.flight) sum += offers.flight.sellAmountMinor;
    if (offers.hotel) sum += offers.hotel.sellAmountMinor;
    if (offers.transfer) sum += offers.transfer.sellAmountMinor;
    if (offers.activity) sum += offers.activity.sellAmountMinor;
    return sum;
  }, [draft.selectedOffers]);

  const partialSlices = draft.search?.slices.filter(
    (s) => s.status === "error" || s.status === "timeout",
  );

  if (!draft.search) {
    return (
      <div className="wg-trip-flow">
        <p>لا توجد نتائج بعد. <button type="button" onClick={() => router.push("/")}>ابدأ بحثًا جديدًا</button></p>
      </div>
    );
  }

  function handleTier(tier: TripTier) {
    selectTier(tier);
  }

  function renderService(kind: TripServiceKind, offer?: { label: string; sellAmountMinor: number; currency: string }) {
    if (!draft.services.includes(kind)) return null;
    const slice = draft.search?.slices.find((s) => s.kind === kind);
    const altOffers = slice?.offers || [];

    return (
      <div className="wg-trip-service-block" key={kind}>
        <div className="wg-trip-service-head">
          <h4>{SERVICE_LABELS[kind]}</h4>
          {altOffers.length > 1 ? (
            <button
              type="button"
              className="wg-trip-change-btn"
              onClick={() => setChanging(changing === kind ? null : kind)}
            >
              تغيير
            </button>
          ) : null}
        </div>
        {offer ? (
          <>
            <p>{offer.label}</p>
            <p>{formatKwdMinor(offer.sellAmountMinor, offer.currency)}</p>
          </>
        ) : (
          <p className="wg-trip-status-pending">لا توجد عروض متاحة</p>
        )}
        {changing === kind && altOffers.length > 1 ? (
          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.35rem" }}>
            {altOffers.map((o) => (
              <button
                key={o.id}
                type="button"
                className="wg-trip-change-btn"
                onClick={() => {
                  swapOffer(kind, o);
                  setChanging(null);
                }}
              >
                {o.label} — {formatKwdMinor(o.sellAmountMinor, o.currency)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="wg-trip-flow">
      <TripProgressStepper current="select" />

      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, color: "var(--tv-primary,#13357b)" }}>
          رحلتك إلى {dest} جاهزة
        </h1>
        <p style={{ color: "var(--wg-muted,#64748b)", margin: "0.35rem 0 0" }}>
          {draft.flight.departDate}
          {draft.flight.returnDate ? ` — ${draft.flight.returnDate}` : ""}
          {" · "}
          {draft.flight.adults} مسافر
        </p>
      </header>

      {partialSlices?.length ? (
        <div className="wg-trip-card" style={{ marginBottom: "1rem", borderColor: "#f59e0b" }}>
          <strong>تنبيه:</strong> بعض الخدمات لم تُحمَّل بالكامل. يمكنك المتابعة بالنتائج المتاحة أو إعادة المحاولة.
        </div>
      ) : null}

      <div className="wg-trip-tier-tabs" role="group" aria-label="خيارات الرحلة">
        {options.map((opt) => (
          <button
            key={opt.tier}
            type="button"
            className="wg-trip-tier-tab"
            aria-pressed={selectedTier === opt.tier}
            onClick={() => handleTier(opt.tier)}
          >
            {TIER_LABELS[opt.tier] || opt.titleAr}
            <br />
            <small>{formatKwdMinor(opt.totalMinor, opt.currency)}</small>
          </button>
        ))}
      </div>

      <div className="wg-trip-grid">
        <div className="wg-trip-card">
          <h3 style={{ margin: "0 0 0.75rem", color: "var(--tv-primary,#13357b)" }}>
            برنامج رحلتك
          </h3>
          {renderService("flight", draft.selectedOffers.flight)}
          {renderService("hotel", draft.selectedOffers.hotel)}
          {renderService("transfer", draft.selectedOffers.transfer)}
          {renderService("activity", draft.selectedOffers.activity)}
        </div>

        <aside className="wg-trip-sticky-price">
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>ملخص السعر</h3>
          {draft.selectedOffers.flight ? (
            <div className="wg-trip-price-line">
              <span>الطيران</span>
              <span>{formatKwdMinor(draft.selectedOffers.flight.sellAmountMinor)}</span>
            </div>
          ) : null}
          {draft.selectedOffers.hotel ? (
            <div className="wg-trip-price-line">
              <span>الفندق</span>
              <span>{formatKwdMinor(draft.selectedOffers.hotel.sellAmountMinor)}</span>
            </div>
          ) : null}
          {draft.selectedOffers.transfer ? (
            <div className="wg-trip-price-line">
              <span>المواصلات</span>
              <span>{formatKwdMinor(draft.selectedOffers.transfer.sellAmountMinor)}</span>
            </div>
          ) : null}
          {draft.selectedOffers.activity ? (
            <div className="wg-trip-price-line">
              <span>الأنشطة</span>
              <span>{formatKwdMinor(draft.selectedOffers.activity.sellAmountMinor)}</span>
            </div>
          ) : null}
          <div className="wg-trip-price-line" style={{ marginTop: "0.5rem", fontWeight: 700 }}>
            <span>الإجمالي</span>
            <span className="total">{formatKwdMinor(total || current?.totalMinor || 0)}</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>يشمل الضرائب والرسوم</p>

          {draft.flight.flexibleDates ? (
            <div className="wg-trip-smart-tip">
              💡 اقتراح ذكي: غيّر تاريخ المغادرة بيوم واحد لتوفير محتمل يصل إلى 22 د.ك
            </div>
          ) : null}

          <button
            type="button"
            className="wg-trip-primary-btn"
            onClick={() => router.push("/trip-builder/travelers")}
          >
            متابعة الحجز
          </button>
        </aside>
      </div>

      <div className="wg-trip-mobile-bar">
        <span className="total">{formatKwdMinor(total || current?.totalMinor || 0)}</span>
        <button
          type="button"
          className="wg-trip-primary-btn"
          style={{ margin: 0 }}
          onClick={() => router.push("/trip-builder/travelers")}
        >
          متابعة الحجز
        </button>
      </div>
    </div>
  );
}
