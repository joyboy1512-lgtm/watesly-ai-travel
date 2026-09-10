"use client";

import { FormEvent, useState } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { formatMoneyMinor } from "@/lib/format";
import { shopFetch } from "@/lib/shop-session";
import { COMPANY_LEGAL, normalizeBookingStatusAr, normalizePaymentStatusAr } from "@watesly-travel/shared";

type LookupResult = {
  id: string;
  weekendgateRef?: string;
  providerRef?: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  description: string;
  totalSellAmount: number;
  currency: string;
  createdAt: string;
  timeline?: Array<{ at: string; label: string }>;
};

export default function ManageBookingPage() {
  const [ref, setRef] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [row, setRow] = useState<LookupResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setRow(null);
    setLoading(true);
    try {
      const result = await shopFetch<LookupResult>("/shop/bookings/lookup", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          bookingRef: ref.trim(),
          contact: emailOrPhone.trim(),
        }),
      });
      setRow(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر العثور على الحجز");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StoreFront>
      <main className="shop-legal shop-manage-booking" dir="rtl">
        <h1>إدارة حجزي</h1>
        <p>
          ابحث برقم حجز WeekendGate مع البريد أو الجوال المستخدم عند الحجز. لا يتم
          تنفيذ الإلغاء أو الاسترداد تلقائيًا — يراجعها فريق الدعم.
        </p>
        <form className="shop-manage-form" onSubmit={onSubmit}>
          <label>
            رقم الحجز
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
              autoComplete="off"
              inputMode="text"
              minLength={4}
            />
          </label>
          <label>
            البريد أو الجوال
            <input
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
            />
          </label>
          <button type="submit" disabled={loading} style={{ minHeight: 48 }}>
            {loading ? "جاري البحث…" : "عرض الحجز"}
          </button>
        </form>
        {error ? <p className="shop-status error">{error}</p> : null}
        {row ? (
          <section className="shop-manage-result">
            <h2>{normalizeBookingStatusAr(row.status).ar}</h2>
            <ul>
              <li>
                <strong>رقم WeekendGate:</strong> {row.weekendgateRef || row.id}
              </li>
              {row.providerRef ? (
                <li>
                  <strong>مرجع المزوّد / PNR:</strong> {row.providerRef}
                </li>
              ) : null}
              <li>
                <strong>التفاصيل:</strong> {row.description}
              </li>
              <li>
                <strong>المبلغ:</strong> {formatMoneyMinor(row.totalSellAmount, row.currency)}
              </li>
              <li>
                <strong>الدفع:</strong>{" "}
                {normalizePaymentStatusAr(row.paymentStatus || "PENDING").ar}
                {row.paymentMethod ? ` · ${row.paymentMethod}` : ""}
              </li>
            </ul>
            {row.timeline?.length ? (
              <div>
                <h3>السجل الزمني</h3>
                <ol>
                  {row.timeline.map((t) => (
                    <li key={`${t.at}-${t.label}`}>
                      {t.label} — {new Date(t.at).toLocaleString("ar")}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="shop-manage-actions">
              <a className="shop-btn" href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
                تواصل عبر واتساب
              </a>
              <a className="shop-btn ghost" href={`mailto:${COMPANY_LEGAL.supportEmail}?subject=حجز%20${row.weekendgateRef || row.id}`}>
                طلب تعديل / إلغاء
              </a>
            </div>
          </section>
        ) : null}
      </main>
    </StoreFront>
  );
}
