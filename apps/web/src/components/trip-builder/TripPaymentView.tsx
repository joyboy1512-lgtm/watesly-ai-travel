"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";
import { MOCKUP_TRIP, money } from "./mockup-data";

type PayMethod = "card" | "knet" | "apple" | "link";

export function TripPaymentView() {
  const router = useRouter();
  const { draft } = useTripBuilder();
  const [method, setMethod] = useState<PayMethod>("card");
  const [lockSec, setLockSec] = useState(9 * 60 + 42);
  const [paying, setPaying] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState(draft.contact?.email || "");

  const dest =
    draft.flight.destinationLabel || draft.flight.destination || MOCKUP_TRIP.destinationAr;
  const prices = MOCKUP_TRIP.prices;
  const adults = draft.flight.adults || MOCKUP_TRIP.travelers;

  useEffect(() => {
    const id = window.setInterval(() => setLockSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const lockLabel =
    String(Math.floor(lockSec / 60)).padStart(2, "0") +
    ":" +
    String(lockSec % 60).padStart(2, "0");

  async function pay() {
    setPaying(true);
    try {
      sessionStorage.setItem(
        "wg_trip_booking_ref",
        JSON.stringify({
          tripId: draft.tripId,
          paidMinor: prices.total * 1000,
          contact: draft.contact,
          at: Date.now(),
        }),
      );
      router.push("/trip-builder/confirm");
    } finally {
      setPaying(false);
    }
  }

  const methods: Array<{ key: PayMethod; label: string }> = [
    { key: "card", label: "بطاقة بنكية" },
    { key: "knet", label: "كي نت" },
    { key: "apple", label: "Apple Pay" },
    { key: "link", label: "رابط دفع" },
  ];

  return (
    <div className="wg-ru-page" dir="rtl">
      <TripProgressStepper current="payment" />

      <header className="wg-ru-hero-head">
        <h1>الدفع وإتمام الحجز</h1>
        <p>دفعة واحدة لجميع خدمات رحلتك</p>
      </header>

      <div className="wg-ru-layout">
        <div className="wg-ru-main">
          <div className="wg-ru-ticket-card perforated">
            <div>
              <h3>رحلتك إلى {dest}</h3>
              <p className="wg-ru-route">
                {MOCKUP_TRIP.originCode} → {MOCKUP_TRIP.destCode}
              </p>
              <div className="wg-ru-service-pills">
                <span>✓ طيران</span>
                <span>✓ فندق</span>
                <span>✓ مواصلات</span>
                <span>✓ أنشطة</span>
              </div>
            </div>
            <div className="wg-ru-ticket-meta">
              <p>
                📅 {MOCKUP_TRIP.dateFromAr} — {MOCKUP_TRIP.dateToAr}
              </p>
              <p>👤 {adults === 1 ? "مسافر واحد" : `${adults} مسافرين`}</p>
              <button
                type="button"
                className="wg-ru-link-btn"
                onClick={() => router.push("/trip-builder/results")}
              >
                مراجعة الرحلة ←
              </button>
            </div>
          </div>

          <div className="wg-ru-form-card">
            <h3>اختر طريقة الدفع</h3>
            <div className="wg-ru-pay-methods">
              {methods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`wg-ru-pay-method${method === m.key ? " selected" : ""}`}
                  aria-pressed={method === m.key}
                  onClick={() => setMethod(m.key)}
                >
                  <span className="wg-ru-radio" aria-hidden />
                  {m.label}
                </button>
              ))}
            </div>

            {method === "card" ? (
              <p className="wg-ru-muted" style={{ marginTop: "1rem" }}>
                بيانات البطاقة تُدخل فقط على بوابة الدفع المشفّرة — لا نجمع رقم البطاقة أو رمز الأمان في هذا الموقع.
              </p>
            ) : (
              <p className="wg-ru-muted" style={{ marginTop: "1rem" }}>
                سيتم تحويلك لإتمام الدفع عبر {methods.find((x) => x.key === method)?.label}.
              </p>
            )}

            <p className="wg-ru-muted" style={{ marginTop: "0.75rem" }}>
              بعد التفعيل الحقيقي سيتم تحويلك لبوابة معتمدة (كي نت / بطاقة) دون تخزين بيانات الدفع لدينا.
            </p>
          </div>

          <div className="wg-ru-form-card">
            <label>
              ✉️ البريد الإلكتروني للإيصال
              <input
                type="email"
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
              />
            </label>
          </div>

          <div className="wg-ru-trust-row">
            <div>
              <strong>🔒 دفع مشفّر</strong>
              <p>حماية بمستوى عالٍ</p>
            </div>
            <div>
              <strong>🛡 لن يتم تخزين رمز الأمان</strong>
              <p>خصوصيتك محمية</p>
            </div>
            <div>
              <strong>⚡ تأكيد فوري</strong>
              <p>ستصلك تفاصيل الحجز فوراً</p>
            </div>
          </div>

          <div className="wg-ru-form-card">
            <h3>🛡 قبل الدفع</h3>
            <ul className="wg-ru-policy-list">
              <li>
                <span>✈ الطيران</span>
                <em className="bad">غير قابل للاسترداد</em>
              </li>
              <li>
                <span>🏨 الفندق</span>
                <em className="ok">إلغاء مجاني حتى 48 ساعة</em>
              </li>
              <li>
                <span>🚗 المواصلات</span>
                <em className="ok">قابل للتعديل</em>
              </li>
              <li>
                <span>🎟 الأنشطة</span>
                <em className="ok">حسب سياسة كل نشاط</em>
              </li>
            </ul>
            <button type="button" className="wg-ru-link-btn">
              عرض الشروط كاملة
            </button>
          </div>
        </div>

        <aside className="wg-ru-aside">
          <div className="wg-ru-summary-card perforated">
            <h3>ملخص الدفع</h3>
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
            <p className="wg-ru-muted">شامل الضرائب والرسوم</p>
            <p className="wg-ru-lock">⏱ تم تثبيت السعر لمدة {lockLabel}</p>
            <button
              type="button"
              className="wg-ru-primary-btn"
              disabled={paying}
              onClick={() => void pay()}
            >
              {paying ? "جاري الدفع…" : `ادفع ${money(prices.total)}`}
            </button>
            <p className="wg-ru-muted" style={{ fontSize: "0.78rem" }}>
              لن يتم إصدار الحجز إلا بعد نجاح الدفع
            </p>
            <button
              type="button"
              className="wg-ru-link-btn"
              onClick={() => router.push("/trip-builder/travelers")}
            >
              العودة إلى بيانات المسافر ←
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
