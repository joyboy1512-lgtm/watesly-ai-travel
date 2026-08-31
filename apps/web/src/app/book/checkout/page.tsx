"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { getShopSession } from "@/lib/shop-session";
import {
  createCheckout,
  formatKwdMinor,
  payCheckout,
  fetchPoints,
} from "@/lib/platform-api";
import type { CheckoutSummary } from "@watesly-travel/shared";

function CheckoutInner() {
  const sp = useSearchParams();
  const tripId = sp.get("tripId") || "";
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [points, setPoints] = useState(0);
  const [redeem, setRedeem] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace(`/account/login?next=${encodeURIComponent(`/book/checkout?tripId=${tripId}`)}`);
      return;
    }
    if (!tripId) {
      setError("لا توجد رحلة — ابدأ من Trip Builder أو العروض.");
      return;
    }
    fetchPoints()
      .then((p) => setPoints(p.account.balance))
      .catch(() => undefined);
    createCheckout(tripId, 0)
      .then(setSummary)
      .catch((e: Error) => setError(e.message || "تعذر تجهيز الدفع"));
  }, [tripId]);

  async function refreshWithPoints(nextRedeem: number) {
    setRedeem(nextRedeem);
    if (!tripId) return;
    try {
      const s = await createCheckout(tripId, nextRedeem);
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function pay() {
    if (!tripId) return;
    setBusy(true);
    setError("");
    try {
      const s = await payCheckout(tripId);
      setSummary(s);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الدفع");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wg-platform">
      <h1>💳 إتمام الدفع</h1>
      <p className="lead">راجع تفاصيل الرحلة ثم ادفع بأمان. لا نخزّن بيانات البطاقة.</p>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {summary ? (
        <div className="wg-trip-builder">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {summary.components.map((c) => (
              <div key={c.kind} className="wg-trip-slot on">
                <strong>
                  {c.kind === "flight"
                    ? "✈️"
                    : c.kind === "hotel"
                      ? "🏨"
                      : c.kind === "transfer"
                        ? "🚗"
                        : "🎯"}{" "}
                  {c.label}
                </strong>
                <span>{formatKwdMinor(c.amountMinor, summary.currency)}</span>
              </div>
            ))}
          </div>
          <aside className="wg-trip-summary">
            <dl>
              <div>
                <dt>السعر</dt>
                <dd>{formatKwdMinor(summary.originalMinor, summary.currency)}</dd>
              </div>
              <div>
                <dt>الخصم</dt>
                <dd>− {formatKwdMinor(summary.discountMinor, summary.currency)}</dd>
              </div>
              <div>
                <dt>الضرائب</dt>
                <dd>{formatKwdMinor(summary.taxesMinor, summary.currency)}</dd>
              </div>
              <div>
                <dt>الرسوم</dt>
                <dd>{formatKwdMinor(summary.feesMinor, summary.currency)}</dd>
              </div>
              <div>
                <dt>النقاط المستخدمة</dt>
                <dd>− {formatKwdMinor(summary.pointsRedeemedMinor, summary.currency)}</dd>
              </div>
              <div className="final">
                <span>الإجمالي النهائي</span>
                <span>{formatKwdMinor(summary.finalMinor, summary.currency)}</span>
              </div>
            </dl>
            <label style={{ fontSize: "0.85rem" }}>
              استبدال نقاط (رصيدك {points})
              <input
                type="number"
                min={0}
                max={points}
                value={redeem}
                onChange={(e) => refreshWithPoints(Number(e.target.value) || 0)}
              />
            </label>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
              الحالة: {summary.paymentStatus} (pending / paid / failed / refunded / partially_refunded)
            </p>
            {done ? (
              <Link className="wg-btn" href="/account/trips">
                عرض رحلاتي
              </Link>
            ) : (
              <button type="button" className="wg-btn" disabled={busy} onClick={pay}>
                ادفع الآن (sandbox)
              </button>
            )}
          </aside>
        </div>
      ) : null}
      {!summary && !error ? <p>جاري تجهيز الملخص…</p> : null}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <StoreFront wide>
      <Suspense fallback={<div className="wg-platform">جاري التحميل…</div>}>
        <CheckoutInner />
      </Suspense>
    </StoreFront>
  );
}
