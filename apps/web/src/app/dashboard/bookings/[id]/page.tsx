"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getSession } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import "../../../bookings-suite.css";
import {
  BOOKING_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  bookingReturnDate,
  bookingTravelDate,
  customerName,
  formatDay,
  paidAmount,
  printBookingInvoices,
  routeLabel,
  type BookingInvoiceData,
} from "@/lib/booking-invoice";

type BookingDetail = BookingInvoiceData & {
  totalCostAmount?: number;
  totalProfitAmount?: number;
  quote?: BookingInvoiceData["quote"] & {
    id?: string;
    pricingRule?: { name?: string; percentValue?: number | null } | null;
    items?: Array<{
      id: string;
      serviceType: string;
      description: string;
      sellAmount: number;
      costAmount?: number;
      profitAmount?: number;
    }>;
  };
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const canViewCost =
    getSession()?.permissions?.includes("pricing.view_cost") ?? false;

  async function load() {
    setRow(await apiFetch<BookingDetail>(`/bookings/${params.id}`));
  }

  useEffect(() => {
    if (!params.id) return;
    load().catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function transition(status: string) {
    try {
      await apiFetch(`/bookings/${params.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث الحالة");
    }
  }

  async function issue() {
    try {
      await apiFetch(`/bookings/${params.id}/issue`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإصدار");
    }
  }

  async function pay() {
    if (!row) return;
    const remaining = Math.max(0, row.totalSellAmount - paidAmount(row));
    try {
      await apiFetch(`/bookings/${params.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: remaining || row.totalSellAmount,
          status: "paid",
          method: "manual",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدفع");
    }
  }

  function printInvoice() {
    if (!row) return;
    try {
      printBookingInvoices(
        [row],
        getSession()?.organization.name || "WeekendGate",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل طباعة الفاتورة");
    }
  }

  const details = (row?.passengerDetails || {}) as NonNullable<
    BookingInvoiceData["passengerDetails"]
  >;
  const currency = row?.quote?.currency || "KWD";
  const paid = row ? paidAmount(row) : 0;
  const remaining = row ? Math.max(0, row.totalSellAmount - paid) : 0;

  return (
    <AppShell title="تفاصيل الحجز">
      <div className="actions" style={{ marginTop: 0 }}>
        <Link className="btn secondary" href="/dashboard/bookings">
          العودة للحجوزات
        </Link>
        {row ? (
          <button type="button" className="btn" onClick={printInvoice}>
            فاتورة PDF
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {!row ? (
        <div className="panel">
          <p className="hint">جارٍ التحميل…</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="form-grid">
              <div className="field">
                <span>المعرف</span>
                <strong>{row.id}</strong>
              </div>
              <div className="field">
                <span>الحالة</span>
                <strong>{BOOKING_STATUS_LABEL[row.status] || row.status}</strong>
              </div>
              <div className="field">
                <span>مرجع المزود / PNR</span>
                <strong>{row.providerBookingRef || "—"}</strong>
              </div>
              <div className="field">
                <span>تاريخ الحجز</span>
                <strong>{formatDay(row.createdAt)}</strong>
              </div>
            </div>
            <div className="actions">
              {(row.status === "on_hold" || row.status === "draft") && (
                <button type="button" className="btn" onClick={() => void issue()}>
                  إصدار التذكرة / التأكيد
                </button>
              )}
              {row.status === "issued" && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => void transition("completed")}
                >
                  إكمال
                </button>
              )}
              {row.status !== "cancelled" && row.status !== "completed" && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void transition("cancelled")}
                >
                  إلغاء
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                onClick={() => void pay()}
              >
                تسجيل دفع
              </button>
              <button type="button" className="btn" onClick={printInvoice}>
                طباعة الفاتورة PDF
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>تفاصيل الرحلة</h3>
            <p>
              <strong>المسار:</strong> {routeLabel(row)}
            </p>
            <p className="hint">
              تاريخ السفر: {formatDay(bookingTravelDate(row))}
              {bookingReturnDate(row)
                ? ` · العودة: ${formatDay(bookingReturnDate(row))}`
                : ""}
              {details.route?.cabinClass
                ? ` · الدرجة: ${details.route.cabinClass}`
                : ""}
            </p>
            {details.stay ? (
              <p className="hint">
                إقامة:{" "}
                {String(details.stay.locationLabel || details.stay.location || "—")}{" "}
                · {formatDay(String(details.stay.checkIn || ""))} →{" "}
                {formatDay(String(details.stay.checkOut || ""))}
              </p>
            ) : null}
          </div>

          <div className="panel">
            <h3>التسعير (وسيط)</h3>
            <table className="table">
              <tbody>
                <tr>
                  <td>سعر البيع للعميل</td>
                  <td>{formatMoneyMinor(row.totalSellAmount, currency)}</td>
                </tr>
                {canViewCost ? (
                  <>
                    <tr>
                      <td>تكلفة المورد (صافي)</td>
                      <td>
                        {formatMoneyMinor(row.totalCostAmount || 0, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td>هامش الربح</td>
                      <td>
                        {formatMoneyMinor(row.totalProfitAmount || 0, currency)}
                      </td>
                    </tr>
                  </>
                ) : null}
                <tr>
                  <td>قاعدة التسعير المطبّقة</td>
                  <td>{row.quote?.pricingRule?.name || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>العميل والمسافرون</h3>
            <p>
              <strong>{customerName(row)}</strong>
            </p>
            <p className="hint">
              هاتف:{" "}
              {details.contact?.phone || row.quote?.contact?.waId || "—"} · بريد:{" "}
              {details.contact?.email || row.quote?.contact?.email || "—"}
            </p>
            {(details.travelers?.length || details.guests?.length) ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...(details.travelers || []),
                    ...(details.guests || []),
                  ].map((t, i) => (
                    <tr key={`${t.firstName || ""}-${i}`}>
                      <td>{i + 1}</td>
                      <td>
                        {[t.firstName, t.lastName].filter(Boolean).join(" ") ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          <div className="panel">
            <h3>بنود العرض</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>الخدمة</th>
                  <th>الوصف</th>
                  <th>البيع</th>
                </tr>
              </thead>
              <tbody>
                {(row.quote?.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.serviceType}</td>
                    <td>{item.description}</td>
                    <td>{formatMoneyMinor(item.sellAmount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>تفاصيل الدفع</h3>
            <div className="bk-totals">
              <div className="bk-total">
                <span>الإجمالي</span>
                <strong>{formatMoneyMinor(row.totalSellAmount, currency)}</strong>
              </div>
              <div className="bk-total">
                <span>المدفوع</span>
                <strong>{formatMoneyMinor(paid, currency)}</strong>
              </div>
              <div className="bk-total">
                <span>المتبقي</span>
                <strong>{formatMoneyMinor(remaining, currency)}</strong>
              </div>
            </div>
            {(row.payments || []).length === 0 ? (
              <p className="hint">لا مدفوعات مسجّلة بعد.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>الحالة</th>
                    <th>الطريقة</th>
                    <th>المرجع</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.payments || []).map((p) => (
                    <tr key={p.id}>
                      <td>{PAYMENT_STATUS_LABEL[p.status] || p.status}</td>
                      <td>
                        {PAYMENT_METHOD_LABEL[p.method || ""] || p.method || "—"}
                      </td>
                      <td>{p.reference || "—"}</td>
                      <td>
                        {formatMoneyMinor(p.amount, p.currency || currency)}
                      </td>
                      <td>{formatDay(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
