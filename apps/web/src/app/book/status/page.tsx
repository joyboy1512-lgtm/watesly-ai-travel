"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { FlightBookingSteps } from "@/components/shop/FlightBookingSteps";
import { formatMoneyMinor } from "@/lib/format";
import { shopFetch } from "@/lib/shop-session";
import { COMPANY_LEGAL, FLIGHT_SHOP_LIFECYCLE_AR, type FlightShopLifecycle } from "@watesly-travel/shared";
import { clearBookingDraft } from "@/lib/booking-draft";

type StatusPayload = {
  id: string;
  weekendgateRef?: string;
  providerRef?: string;
  status: string;
  lifecycle?: FlightShopLifecycle;
  lifecycleLabelAr?: string;
  paymentStatus?: string;
  totalSellAmount: number;
  currency: string;
  description?: string;
  travelers?: Array<{ firstName?: string; lastName?: string; ticketNumber?: string }>;
  tickets?: Array<{ passengerName?: string; ticketNumber?: string }>;
  issueError?: string;
  support?: { email?: string; whatsapp?: string; phone?: string };
};

function StatusInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  const [row, setRow] = useState<StatusPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mailNote, setMailNote] = useState("");

  async function load() {
    if (!id) {
      setError("لا يوجد رقم حجز");
      return;
    }
    try {
      const data = await shopFetch<StatusPayload>(`/shop/bookings/${id}`);
      setRow(data);
      if (data.lifecycle === "ticketed") clearBookingDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحميل حالة الحجز");
    }
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function retryIssue() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const latest = await shopFetch<StatusPayload>(`/shop/bookings/${id}`);
      if (latest.lifecycle === "ticketed") {
        setRow(latest);
        return;
      }
      const next = await shopFetch<StatusPayload>(`/shop/bookings/${id}/issue`, {
        method: "POST",
        timeoutMs: 35000,
      });
      setRow(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إعادة الإصدار");
    } finally {
      setBusy(false);
    }
  }

  async function emailTickets() {
    if (!id) return;
    setBusy(true);
    try {
      const res = await shopFetch<{ messageAr?: string }>(`/shop/bookings/${id}/email-tickets`, {
        method: "POST",
      });
      setMailNote(res.messageAr || "تم");
    } catch (err) {
      setMailNote(err instanceof Error ? err.message : "تعذّر الإرسال");
    } finally {
      setBusy(false);
    }
  }

  function downloadTickets() {
    if (!row) return;
    const tickets = (row.tickets || [])
      .map((t) => `${t.passengerName || ""} — ${t.ticketNumber || ""}`)
      .join("\n");
    const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تذاكر ${row.weekendgateRef}</title>
      <body style="font-family:sans-serif;padding:24px">
      <h1>WeekendGate</h1>
      <p>رقم الطلب: ${row.weekendgateRef || row.id}</p>
      <p>مرجع شركة الطيران: ${row.providerRef || "غير متوفر بعد"}</p>
      <p>الحالة: ${row.lifecycleLabelAr || row.lifecycle}</p>
      <pre>${tickets || "لا أرقام تذاكر بعد"}</pre>
      <p>الدعم: ${COMPANY_LEGAL.supportEmail} · ${COMPANY_LEGAL.phoneDisplay}</p>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekendgate-${row.weekendgateRef || row.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const lifecycle = row?.lifecycle || "checking";
  const label = row?.lifecycleLabelAr || FLIGHT_SHOP_LIFECYCLE_AR[lifecycle];

  return (
    <div className="shop-flight-review-page">
      <ShopMockBanner />
      <FlightBookingSteps current={4} />
      <header className="shop-flight-review-head">
        <h1>حالة الحجز والتذاكر</h1>
        <p>ندفع ونحجز ونصدر في خطوات منفصلة. «صدرت التذاكر» تظهر فقط بعد تأكيد الإصدار الحقيقي.</p>
      </header>
      {error ? <p className="shop-error">{error}</p> : null}
      {row ? (
        <section className="shop-flight-review-card">
          <p className={`shop-flight-status-pill ${lifecycle}`}>{label}</p>
          <ul className="shop-flight-status-list">
            <li>
              <strong>رقم WeekendGate:</strong> {row.weekendgateRef || row.id}
            </li>
            <li>
              <strong>مرجع شركة الطيران:</strong> {row.providerRef || "غير متوفر بعد"}
            </li>
            <li>
              <strong>الدفع:</strong>{" "}
              {row.paymentStatus === "paid"
                ? "تم الدفع"
                : row.paymentStatus === "failed"
                  ? "فشل الدفع"
                  : row.paymentStatus === "refunded"
                    ? "مسترد"
                    : "بانتظار الدفع"}
            </li>
            <li>
              <strong>المبلغ:</strong> {formatMoneyMinor(row.totalSellAmount, row.currency)}
            </li>
            <li>
              <strong>التفاصيل:</strong> {row.description}
            </li>
          </ul>
          {row.tickets?.length ? (
            <div>
              <h3>أرقام التذاكر</h3>
              <ul>
                {row.tickets.map((t, i) => (
                  <li key={`${t.ticketNumber}-${i}`}>
                    {t.passengerName || `مسافر ${i + 1}`}: {t.ticketNumber}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="shop-hint">لا تذاكر صادرة بعد.</p>
          )}
          {row.issueError ? (
            <p className="shop-error">
              تم تسجيل الحالة للمتابعة: {row.issueError}. إذا تم الدفع ولم يصدر التذكرة،
              يراجع الدعم مسار المعالجة أو الاسترداد الفعلي دون إنشاء خصم جديد.
            </p>
          ) : null}
          <div className="shop-flight-review-foot">
            {lifecycle === "ticketed" ? (
              <>
                <button type="button" className="shop-flight-review-continue" onClick={downloadTickets}>
                  تنزيل التذاكر
                </button>
                <button type="button" className="shop-flight-review-back" disabled={busy} onClick={() => void emailTickets()}>
                  إرسال بالبريد
                </button>
              </>
            ) : (
              <button type="button" className="shop-flight-review-continue" disabled={busy} onClick={() => void retryIssue()}>
                {busy ? "جارٍ الاستعلام…" : "استعلام / إعادة الإصدار"}
              </button>
            )}
            <a className="shop-flight-review-back" href="/bookings/manage">
              استعراض الحجز
            </a>
            <a className="shop-flight-review-back" href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
              تواصل مع الدعم
            </a>
            <button type="button" className="shop-flight-review-cancel" onClick={() => router.push("/")}>
              الرئيسية
            </button>
          </div>
          {mailNote ? <p className="shop-hint">{mailNote}</p> : null}
        </section>
      ) : (
        <p>جارٍ التحقق…</p>
      )}
    </div>
  );
}

export default function FlightStatusPage() {
  return (
    <StoreFront>
      <Suspense fallback={<p className="shop-flight-review-loading">جارٍ التحميل…</p>}>
        <StatusInner />
      </Suspense>
    </StoreFront>
  );
}
