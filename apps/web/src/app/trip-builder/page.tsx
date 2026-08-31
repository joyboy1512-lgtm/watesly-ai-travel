"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { buildFlightResultsHref } from "@/lib/flight-results-url";

type SearchCtx = {
  origin?: string;
  originLabel?: string;
  destination?: string;
  destinationLabel?: string;
  departDate?: string;
  returnDate?: string;
  tripType?: string;
  adults?: string;
  children?: string;
  infants?: string;
  cabinClass?: string;
  directOnly?: string;
  hotelQuery?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: string;
};

function flightLabel(ctx: SearchCtx) {
  const from = ctx.originLabel || ctx.origin || "KWI";
  const to = ctx.destinationLabel || ctx.destination || "DXB";
  const dates =
    ctx.departDate && ctx.returnDate
      ? `${ctx.departDate} → ${ctx.returnDate}`
      : ctx.departDate || "";
  return `${from} → ${to}${dates ? ` · ${dates}` : ""}`;
}

function flightSearchHref(ctx: SearchCtx) {
  return buildFlightResultsHref({
    tripType: (ctx.tripType as "roundtrip" | "oneway" | "multicity") || "roundtrip",
    origin: ctx.origin || "KWI",
    originLabel: ctx.originLabel,
    destination: ctx.destination || "DXB",
    destinationLabel: ctx.destinationLabel,
    departDate: ctx.departDate,
    returnDate: ctx.returnDate,
    adults: Number(ctx.adults || 1),
    children: Number(ctx.children || 0),
    infants: Number(ctx.infants || 0),
    cabinClass: ctx.cabinClass || "economy",
    directOnly: ctx.directOnly === "1",
  });
}

function hotelSearchHref(ctx: SearchCtx) {
  const q = new URLSearchParams();
  if (ctx.hotelQuery || ctx.destinationLabel || ctx.destination) {
    q.set("destination", ctx.hotelQuery || ctx.destinationLabel || ctx.destination || "");
  }
  if (ctx.checkIn || ctx.departDate) q.set("checkIn", ctx.checkIn || ctx.departDate || "");
  if (ctx.checkOut || ctx.returnDate) q.set("checkOut", ctx.checkOut || ctx.returnDate || "");
  q.set("adults", ctx.adults || "1");
  q.set("rooms", ctx.rooms || "1");
  return `/hotels/results?${q.toString()}`;
}

function TripBuilderInner() {
  const sp = useSearchParams();
  const ctx: SearchCtx = useMemo(
    () => ({
      origin: sp.get("origin") || undefined,
      originLabel: sp.get("originLabel") || undefined,
      destination: sp.get("destination") || undefined,
      destinationLabel: sp.get("destinationLabel") || undefined,
      departDate: sp.get("departDate") || undefined,
      returnDate: sp.get("returnDate") || undefined,
      tripType: sp.get("tripType") || undefined,
      adults: sp.get("adults") || undefined,
      children: sp.get("children") || undefined,
      infants: sp.get("infants") || undefined,
      cabinClass: sp.get("cabinClass") || undefined,
      directOnly: sp.get("directOnly") || undefined,
      hotelQuery: sp.get("hotelQuery") || undefined,
      checkIn: sp.get("checkIn") || undefined,
      checkOut: sp.get("checkOut") || undefined,
      rooms: sp.get("rooms") || undefined,
    }),
    [sp],
  );

  const fromSearch = sp.get("fromSearch") === "1" || Boolean(ctx.origin || ctx.destination);

  const DEMO = useMemo((): Record<PackageComponent["kind"], PackageComponent> => {
    return {
      flight: {
        kind: "flight",
        offerId: "search-flight",
        status: "selected",
        sellAmountMinor: 89_000,
        currency: "KWD",
        label: flightLabel(ctx),
      },
      hotel: {
        kind: "hotel",
        offerId: "search-hotel",
        status: "selected",
        sellAmountMinor: 95_000,
        currency: "KWD",
        label: ctx.hotelQuery
          ? `فندق · ${ctx.hotelQuery}`
          : `فندق في ${ctx.destinationLabel || ctx.destination || "الوجهة"}`,
      },
      transfer: {
        kind: "transfer",
        offerId: "search-transfer",
        status: "selected",
        sellAmountMinor: 18_000,
        currency: "KWD",
        label: `نقل · ${ctx.destinationLabel || ctx.destination || "الوجهة"}`,
      },
      activity: {
        kind: "activity",
        offerId: "search-activity",
        status: "selected",
        sellAmountMinor: 25_000,
        currency: "KWD",
        label: `نشاط · ${ctx.destinationLabel || ctx.destination || "الوجهة"}`,
      },
    };
  }, [ctx]);

  const SLOTS: Array<{
    kind: PackageComponent["kind"];
    label: string;
    emoji: string;
    hint: string;
    href: string;
  }> = [
    {
      kind: "flight",
      label: "الطيران",
      emoji: "✈️",
      hint: fromSearch ? `من البحث: ${flightLabel(ctx)}` : "أضف رحلة ذهاب/عودة",
      href: flightSearchHref(ctx),
    },
    {
      kind: "hotel",
      label: "الفندق",
      emoji: "🏨",
      hint: "اختر إقامة لنفس الوجهة والتواريخ",
      href: hotelSearchHref(ctx),
    },
    {
      kind: "transfer",
      label: "النقل",
      emoji: "🚗",
      hint: "نقل المطار أو المدينة",
      href: "/#search",
    },
    {
      kind: "activity",
      label: "الأنشطة",
      emoji: "🎯",
      hint: "جولات وتجارب",
      href: "/#search",
    },
  ];

  const [trip, setTrip] = useState<PackageDraft>(() => emptyTripDraft());
  const [busy, setBusy] = useState(false);
  const [apiOk, setApiOk] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    createTrip()
      .then((t) => {
        setTrip(t);
        setApiOk(true);
      })
      .catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    if (seeded || !fromSearch || !ctx.origin || !ctx.destination) return;
    const component = DEMO.flight;
    setSeeded(true);
    (async () => {
      try {
        if (apiOk && trip.id) {
          const res = await setTripComponent(trip.id, component);
          setTrip(res.trip);
        } else {
          setTrip((prev) => upsertComponent(prev, component));
        }
      } catch {
        setTrip((prev) => upsertComponent(prev, component));
      }
    })();
  }, [seeded, fromSearch, ctx.origin, ctx.destination, apiOk, trip.id, DEMO.flight]);

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
    <div className="wg-platform">
      <h1>رحّلتي — Trip Builder</h1>
      <p className="lead">
        {fromSearch
          ? "تم ربط بيانات محرك البحث. اختر الطيران من النتائج الحقيقية أو أضف باقي الخدمات."
          : "كوّن رحلتك: طيران + فندق + نقل + أنشطة. غيّر أي جزء في أي وقت وشاهد التوفير فوراً."}
      </p>

      {fromSearch ? (
        <div className="wg-trip-slot on" style={{ marginBottom: "1rem" }}>
          <strong>من محرك البحث</strong>
          <span>{flightLabel(ctx)}</span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link className="wg-btn" href={flightSearchHref(ctx)}>
              اختيار رحلة من النتائج
            </Link>
            <Link className="wg-btn secondary" href="/#search">
              تعديل البحث
            </Link>
          </div>
        </div>
      ) : null}

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
                      <Link className="wg-btn" href={slot.href}>
                        اختيار من البحث
                      </Link>
                      <button
                        type="button"
                        className="wg-btn secondary"
                        disabled={busy}
                        onClick={() => remove(slot.kind)}
                      >
                        إزالة
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ color: "#64748b" }}>{slot.hint}</span>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <Link className="wg-btn" href={slot.href}>
                        بحث واختيار
                      </Link>
                      <button
                        type="button"
                        className="wg-btn secondary"
                        disabled={busy}
                        onClick={() => add(slot.kind)}
                      >
                        + إضافة سريعة
                      </button>
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
          >
            متابعة للدفع
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default function TripBuilderPage() {
  return (
    <StoreFront wide>
      <Suspense fallback={<div className="wg-platform">جاري تجهيز رحلتك…</div>}>
        <TripBuilderInner />
      </Suspense>
    </StoreFront>
  );
}
