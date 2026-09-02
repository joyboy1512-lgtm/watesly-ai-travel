"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatKwdMinor } from "@/lib/platform-api";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";
import type { TripServiceKind } from "@watesly-travel/shared";

type ServiceState = {
  kind: TripServiceKind;
  label: string;
  status: "issued" | "confirmed" | "confirming" | "pending";
  statusLabel: string;
};

export function TripConfirmView() {
  const { draft } = useTripBuilder();
  const [paidMinor, setPaidMinor] = useState(0);
  const [services, setServices] = useState<ServiceState[]>([]);

  const bookingRef = `TRP-${draft.tripId.slice(-8).toUpperCase()}`;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wg_trip_booking_ref");
      if (raw) {
        const data = JSON.parse(raw) as { paidMinor?: number };
        if (data.paidMinor) setPaidMinor(data.paidMinor);
      }
    } catch {
      /* ignore */
    }

    const initial: ServiceState[] = [];
    if (draft.services.includes("flight") && draft.selectedOffers.flight) {
      initial.push({
        kind: "flight",
        label: draft.selectedOffers.flight.label,
        status: "issued",
        statusLabel: "تم الإصدار",
      });
    }
    if (draft.services.includes("hotel") && draft.selectedOffers.hotel) {
      initial.push({
        kind: "hotel",
        label: draft.selectedOffers.hotel.label,
        status: "confirmed",
        statusLabel: "تم التأكيد",
      });
    }
    if (draft.services.includes("transfer") && draft.selectedOffers.transfer) {
      initial.push({
        kind: "transfer",
        label: draft.selectedOffers.transfer.label,
        status: "confirming",
        statusLabel: "جاري التأكيد",
      });
    }
    if (draft.services.includes("activity") && draft.selectedOffers.activity) {
      initial.push({
        kind: "activity",
        label: draft.selectedOffers.activity.label,
        status: "pending",
        statusLabel: "قيد التأكيد",
      });
    }
    setServices(initial);

    const timers: number[] = [];
    initial.forEach((svc, i) => {
      if (svc.status === "confirming" || svc.status === "pending") {
        const t = window.setTimeout(() => {
          setServices((prev) =>
            prev.map((s, j) =>
              j === i
                ? {
                    ...s,
                    status: s.kind === "transfer" ? "confirmed" : "confirmed",
                    statusLabel: s.kind === "transfer" ? "تم التأكيد" : "تم التأكيد",
                  }
                : s,
            ),
          );
        }, 3000 + i * 1500);
        timers.push(t);
      }
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [draft]);

  const allConfirmed = services.every((s) => s.status === "issued" || s.status === "confirmed");

  return (
    <div className="wg-trip-flow">
      <TripProgressStepper current="confirm" />

      <div className="wg-trip-card" style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }} aria-hidden>
          ✓
        </div>
        <h1 style={{ margin: 0, color: "#18785a" }}>تم استلام دفعتك بنجاح</h1>
        <p style={{ color: "var(--wg-muted)" }}>
          نعمل الآن على تأكيد وإصدار خدمات رحلتك
        </p>
        <p>
          <strong>رقم الحجز:</strong> {bookingRef}
        </p>
        {paidMinor ? (
          <p style={{ color: "#18785a", fontWeight: 700 }}>{formatKwdMinor(paidMinor)}</p>
        ) : null}
        <p style={{ fontSize: "0.85rem" }}>
          أُرسل التأكيد إلى {draft.contact.email}
          {draft.contact.whatsappUpdates ? " وواتساب" : ""}
        </p>
      </div>

      <div className="wg-trip-grid">
        <div>
          <div className="wg-trip-card">
            <h3>حالة إصدار رحلتك</h3>
            <div className="wg-trip-status-list">
              {services.map((svc) => (
                <div key={svc.kind} className="wg-trip-status-item">
                  <span aria-hidden>
                    {svc.status === "issued" || svc.status === "confirmed" ? "✓" : "⏳"}
                  </span>
                  <div>
                    <strong>{svc.label}</strong>
                    <p style={{ margin: 0, fontSize: "0.82rem" }}>{svc.kind}</p>
                  </div>
                  <span
                    className={
                      svc.status === "issued" || svc.status === "confirmed"
                        ? "wg-trip-status-ok"
                        : "wg-trip-status-pending"
                    }
                  >
                    {svc.statusLabel}
                  </span>
                </div>
              ))}
            </div>
            <p
              style={{
                marginTop: "1rem",
                padding: "0.65rem",
                background: "#f0f9ff",
                borderRadius: 8,
                fontSize: "0.85rem",
              }}
            >
              لا تحتاج إلى البقاء في الصفحة — سنرسل تحديثًا عند اكتمال جميع الخدمات
            </p>
          </div>
        </div>

        <aside className="wg-trip-sticky-price">
          <h3>ملف رحلتي</h3>
          <button type="button" className="wg-trip-primary-btn" disabled={!allConfirmed}>
            تحميل المستندات المتاحة
          </button>
          <Link
            href={`/trip-builder/my-trip/${draft.tripId}`}
            className="wg-trip-primary-btn"
            style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "0.5rem" }}
          >
            فتح ملف الرحلة
          </Link>
          <button type="button" className="wg-trip-change-btn" style={{ marginTop: "0.75rem", width: "100%" }}>
            إرسال عبر واتساب
          </button>
        </aside>
      </div>
    </div>
  );
}
