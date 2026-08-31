"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  buildTripPriceBreakdown,
  emptyTripDraft,
  removeComponent,
  upsertComponent,
  type PackageComponent,
  type PackageDraft,
} from "@watesly-travel/shared";
import { formatKwdMinor, setTripComponent, createTrip, removeTripComponent } from "@/lib/platform-api";

const SLOTS: Array<{ kind: PackageComponent["kind"]; label: string; emoji: string; hint: string; href: string }> = [
  { kind: "flight", label: "الطيران", emoji: "✈️", hint: "أضف رحلة ذهاب/عودة", href: "/flights/results" },
  { kind: "hotel", label: "الفندق", emoji: "🏨", hint: "اختر إقامة", href: "/hotels/results" },
  { kind: "transfer", label: "النقل", emoji: "🚗", hint: "نقل المطار أو المدينة", href: "/#search" },
  { kind: "activity", label: "الأنشطة", emoji: "🎯", hint: "جولات وتجارب", href: "/#search" },
];

const DEMO: Record<PackageComponent["kind"], PackageComponent> = {
  flight: {
    kind: "flight",
    offerId: "demo-flight",
    status: "selected",
    sellAmountMinor: 89_000,
    currency: "KWD",
    label: "KWI → DXB · ذهاب وعودة",
  },
  hotel: {
    kind: "hotel",
    offerId: "demo-hotel",
    status: "selected",
    sellAmountMinor: 95_000,
    currency: "KWD",
    label: "فندق 4★ · 3 ليالٍ",
  },
  transfer: {
    kind: "transfer",
    offerId: "demo-transfer",
    status: "selected",
    sellAmountMinor: 18_000,
    currency: "KWD",
    label: "نقل المطار ذهاب وعودة",
  },
  activity: {
    kind: "activity",
    offerId: "demo-activity",
    status: "selected",
    sellAmountMinor: 25_000,
    currency: "KWD",
    label: "سفاري صحراء",
  },
};

export default function TripBuilderPage() {
  const [trip, setTrip] = useState<PackageDraft>(() => emptyTripDraft());
  const [busy, setBusy] = useState(false);
  const [apiOk, setApiOk] = useState(false);

  useEffect(() => {
    createTrip()
      .then((t) => {
        setTrip(t);
        setApiOk(true);
      })
      .catch(() => setApiOk(false));
  }, []);

  const price = useMemo(() => buildTripPriceBreakdown(trip.components), [trip]);

  async function add(kind: PackageComponent["kind"]) {
    const component = DEMO[kind];
    setBusy(true);
    try {
      if (apiOk) {
        const res = await setTripComponent(trip.id, component);
        setTrip(res.trip);
      } else {
        setTrip((prev) => upsertComponent(prev, component));
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: PackageComponent["kind"]) {
    setBusy(true);
    try {
      if (apiOk) {
        const res = await removeTripComponent(trip.id, kind);
        setTrip(res.trip);
      } else {
        setTrip((prev) => removeComponent(prev, kind));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <h1>رحّلتي — Trip Builder</h1>
        <p className="lead">
          كوّن رحلتك: طيران + فندق + نقل + أنشطة. غيّر أي جزء في أي وقت وشاهد التوفير فوراً.
        </p>

        <div className="wg-trip-builder">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {SLOTS.map((slot) => {
              const current = trip.components.find((c) => c.kind === slot.kind);
              return (
                <div key={slot.kind} className={`wg-trip-slot${current ? " on" : ""}`}>
                  <strong>
                    {slot.emoji} {slot.label}
                  </strong>
                  {current ? (
                    <>
                      <span>{current.label}</span>
                      <span>{formatKwdMinor(current.sellAmountMinor, current.currency)}</span>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="wg-btn secondary" disabled={busy} onClick={() => remove(slot.kind)}>
                          إزالة
                        </button>
                        <button type="button" className="wg-btn secondary" disabled={busy} onClick={() => add(slot.kind)}>
                          استبدال (تجريبي)
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "#64748b" }}>{slot.hint}</span>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="wg-btn" disabled={busy} onClick={() => add(slot.kind)}>
                          + إضافة تجريبية
                        </button>
                        <Link className="wg-btn secondary" href={slot.href}>
                          بحث حقيقي
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <aside className="wg-trip-summary" aria-label="ملخص السعر">
            <strong>ملخص الرحلة</strong>
            <dl>
              <div>
                <dt>السعر الأصلي</dt>
                <dd>{formatKwdMinor(price.originalMinor, price.currency)}</dd>
              </div>
              <div>
                <dt>الخصم</dt>
                <dd>− {formatKwdMinor(price.discountMinor, price.currency)}</dd>
              </div>
              <div>
                <dt>التوفير</dt>
                <dd style={{ color: "#18785a" }}>{formatKwdMinor(price.savingsMinor, price.currency)}</dd>
              </div>
              <div>
                <dt>الضرائب/رسوم</dt>
                <dd>{formatKwdMinor(price.taxesMinor + price.feesMinor, price.currency)}</dd>
              </div>
              <div className="final">
                <span>السعر النهائي</span>
                <span>{formatKwdMinor(price.finalMinor, price.currency)}</span>
              </div>
            </dl>
            <Link
              className="wg-btn"
              href={
                trip.components.length
                  ? `/book/checkout?tripId=${encodeURIComponent(trip.id)}`
                  : "/trip-builder"
              }
              aria-disabled={!trip.components.length}
            >
              متابعة للدفع
            </Link>
          </aside>
        </div>
      </div>
    </StoreFront>
  );
}
