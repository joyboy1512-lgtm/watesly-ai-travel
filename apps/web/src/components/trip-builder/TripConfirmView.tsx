"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";
import { MOCKUP_TRIP, money } from "./mockup-data";

type Svc = {
  key: string;
  title: string;
  detail: string;
  status: "issued" | "confirmed" | "pending";
  statusLabel: string;
  action?: string;
  actionDisabled?: boolean;
};

export function TripConfirmView() {
  const { draft } = useTripBuilder();
  const [paid, setPaid] = useState(MOCKUP_TRIP.prices.total);
  const bookingRef = MOCKUP_TRIP.bookingRef;
  const tripId = draft.tripId || "demo";

  const [services, setServices] = useState<Svc[]>([
    {
      key: "flight",
      title: "الطيران",
      detail: `${MOCKUP_TRIP.originCode} → ${MOCKUP_TRIP.destCode}`,
      status: "issued",
      statusLabel: "تم الإصدار",
      action: "عرض التذكرة",
    },
    {
      key: "hotel",
      title: "الفندق",
      detail: `${MOCKUP_TRIP.hotel.name} · ${MOCKUP_TRIP.hotel.nights} ليالٍ`,
      status: "confirmed",
      statusLabel: "تم التأكيد",
      action: "عرض قسيمة الفندق",
    },
    {
      key: "transfer",
      title: "المواصلات",
      detail: "استقبال مطار دبي + رحلة العودة",
      status: "pending",
      statusLabel: "جاري التأكيد",
      action: "سيظهر المستند بعد التأكيد",
      actionDisabled: true,
    },
    {
      key: "activity",
      title: "الأنشطة",
      detail: "برج خليفة (مؤكد) · جولة دبي (مؤكد) · سفاري (قيد التأكيد)",
      status: "pending",
      statusLabel: "2 مؤكد · 1 قيد التأكيد",
      action: "عرض الأنشطة",
    },
  ]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wg_trip_booking_ref");
      if (raw) {
        const data = JSON.parse(raw) as { paidMinor?: number };
        if (data.paidMinor) setPaid(Math.round(data.paidMinor / 1000));
      }
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => {
      setServices((prev) =>
        prev.map((s) =>
          s.key === "transfer"
            ? {
                ...s,
                status: "confirmed",
                statusLabel: "تم التأكيد",
                action: "عرض قسيمة المواصلات",
                actionDisabled: false,
              }
            : s,
        ),
      );
    }, 4500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="wg-ru-page" dir="rtl">
      <TripProgressStepper current="confirm" />

      <div className="wg-ru-layout">
        <div className="wg-ru-main">
          <div className="wg-ru-success-card">
            <div className="wg-ru-success-ico" aria-hidden>
              ✓
            </div>
            <h1>تم استلام دفعتك بنجاح</h1>
            <p>نعمل الآن على تأكيد وإصدار خدمات رحلتك</p>
            <div className="wg-ru-success-meta">
              <span>
                رقم الحجز: <strong>{bookingRef}</strong>
              </span>
              <span>
                تم دفع <strong>{money(paid)}</strong>
              </span>
            </div>
            <p className="wg-ru-notify">✉️ تم إرسال التأكيد إلى بريدك وواتساب</p>
          </div>

          <div className="wg-ru-form-card">
            <h3>حالة إصدار رحلتك</h3>
            <div className="wg-ru-issue-list">
              {services.map((s) => (
                <div key={s.key} className="wg-ru-issue-row">
                  <div className="wg-ru-issue-main">
                    <strong>{s.title}</strong>
                    <p className="wg-ru-muted">{s.detail}</p>
                  </div>
                  <span
                    className={
                      s.status === "pending" ? "wg-ru-status-pending" : "wg-ru-status-ok"
                    }
                  >
                    {s.status === "pending" ? "⏳ " : "✓ "}
                    {s.statusLabel}
                  </span>
                  <button
                    type="button"
                    className="wg-ru-outline-btn"
                    disabled={s.actionDisabled}
                  >
                    {s.action}
                  </button>
                </div>
              ))}
            </div>
            <p className="wg-ru-info-bar">
              ℹ لا تحتاج للبقاء في الصفحة — سنرسل تحديثاً عند اكتمال جميع الخدمات
            </p>
          </div>

          <div className="wg-ru-form-card">
            <h3>ماذا بعد؟</h3>
            <div className="wg-ru-next-grid">
              <div>
                <span className="wg-ru-next-num">1</span>
                <strong>تابع الحالة</strong>
                <p>تتحدث الحالة تلقائياً عند توفر المستندات</p>
              </div>
              <div>
                <span className="wg-ru-next-num">2</span>
                <strong>راجع المستندات</strong>
                <p>تحقق من التفاصيل ومتطلبات الدخول قبل السفر</p>
              </div>
              <div>
                <span className="wg-ru-next-num">3</span>
                <strong>التذكيرات</strong>
                <p>سنرسل تذكيرات الرحلة والمعلومات المهمة</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="wg-ru-aside">
          <div className="wg-ru-summary-card">
            <h3>🧳 ملف رحلتي</h3>
            <button type="button" className="wg-ru-outline-btn full">
              تحميل المستندات المتاحة
            </button>
            <button type="button" className="wg-ru-outline-btn full" disabled>
              تحميل الرحلة كاملة PDF
            </button>
            <p className="wg-ru-muted" style={{ fontSize: "0.75rem" }}>
              يتفعل بعد اكتمال الإصدار
            </p>
            <button type="button" className="wg-ru-link-btn">
              📅 إضافة إلى التقويم
            </button>
            <button type="button" className="wg-ru-link-btn">
              إرسال عبر واتساب
            </button>
            <button type="button" className="wg-ru-link-btn">
              مشاركة الرحلة
            </button>
            <Link
              href={`/trip-builder/my-trip/${tripId}`}
              className="wg-ru-primary-btn"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: "0.75rem",
              }}
            >
              فتح ملف الرحلة
            </Link>
          </div>

          <div className="wg-ru-summary-card">
            <h3>تحتاج مساعدة؟</h3>
            <p className="wg-ru-muted">فريقنا متاح لمساعدتك على مدار الساعة</p>
            <Link
              href="/contact"
              className="wg-ru-primary-btn"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              تواصل معنا
            </Link>
          </div>

          <div className="wg-ru-receipt-card">
            <span>إيصال الدفع {money(paid)}</span>
            <button type="button" className="wg-ru-ghost-btn">
              تحميل
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
