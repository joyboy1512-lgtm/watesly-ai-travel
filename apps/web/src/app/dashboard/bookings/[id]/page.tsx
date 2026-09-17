"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { apiFetch, getSession } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import "../../../bookings-suite.css";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_LABEL_EN,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_LABEL_EN,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_LABEL_EN,
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
  const i18n = useDashI18n();
  const en = i18n.lang === "en";
  const [row, setRow] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const [printCost, setPrintCost] = useState(false);
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
      setError(err instanceof Error ? err.message : en ? "Could not update status" : "فشل تحديث الحالة");
    }
  }

  async function issue() {
    try {
      await apiFetch(`/bookings/${params.id}/issue`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Could not issue booking" : "فشل الإصدار");
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
      setError(err instanceof Error ? err.message : en ? "Could not record payment" : "فشل تسجيل الدفع");
    }
  }

  function printInvoice() {
    if (!row) return;
    try {
      printBookingInvoices(
        [row],
        getSession()?.organization.name || "WeekendGate",
        { includeCost: canViewCost && printCost },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Print failed" : "فشل طباعة التقرير");
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
          {en ? "Back to bookings" : "العودة للحجوزات"}
        </Link>
        {row ? (
          <>
            {canViewCost ? (
              <label className="bk-cost-toggle">
                <input
                  type="checkbox"
                  checked={printCost}
                  onChange={(e) => setPrintCost(e.target.checked)}
                />
                <span>
                  {en
                    ? "Include cost on print"
                    : "إظهار التكلفة في الطباعة"}
                </span>
              </label>
            ) : null}
            <button type="button" className="btn" onClick={printInvoice}>
              {en ? "Print itinerary & invoice" : "طباعة التقرير والفاتورة"}
            </button>
          </>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {!row ? (
        <div className="panel">
          <p className="hint">{en ? "Loading…" : "جارٍ التحميل…"}</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="form-grid">
              <div className="field">
                <span>{en ? "ID" : "المعرف"}</span>
                <strong>{row.id}</strong>
              </div>
              <div className="field">
                <span>{i18n.c("status")}</span>
                <strong>
                  {en
                    ? BOOKING_STATUS_LABEL_EN[row.status] || row.status
                    : BOOKING_STATUS_LABEL[row.status] || row.status}
                </strong>
              </div>
              <div className="field">
                <span>{en ? "Provider / PNR" : "مرجع المزود / PNR"}</span>
                <strong>
                  <DashLtr>{row.providerBookingRef || "—"}</DashLtr>
                </strong>
              </div>
              <div className="field">
                <span>{en ? "Booked" : "تاريخ الحجز"}</span>
                <strong>
                  <DashLtr>{formatDay(row.createdAt)}</DashLtr>
                </strong>
              </div>
            </div>
            <div className="actions">
              {(row.status === "on_hold" || row.status === "draft") && (
                <button type="button" className="btn" onClick={() => void issue()}>
                  {en ? "Issue ticket / confirmation" : "إصدار التذكرة / التأكيد"}
                </button>
              )}
              {row.status === "issued" && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => void transition("completed")}
                >
                  {en ? "Complete" : "إكمال"}
                </button>
              )}
              {row.status !== "cancelled" && row.status !== "completed" && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void transition("cancelled")}
                >
                  {i18n.c("cancel")}
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                onClick={() => void pay()}
              >
                {en ? "Record payment" : "تسجيل دفع"}
              </button>
              <button type="button" className="btn" onClick={printInvoice}>
                {en ? "Print itinerary & invoice" : "طباعة التقرير والفاتورة"}
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>{en ? "Trip details" : "تفاصيل الرحلة"}</h3>
            <p>
              <strong>{i18n.c("route")}:</strong>{" "}
              <DashLtr>{routeLabel(row)}</DashLtr>
            </p>
            <p className="hint">
              {en ? "Travel date" : "تاريخ السفر"}:{" "}
              <DashLtr>{formatDay(bookingTravelDate(row))}</DashLtr>
              {bookingReturnDate(row)
                ? ` · ${en ? "Return" : "العودة"}: ${formatDay(bookingReturnDate(row))}`
                : ""}
              {details.route?.cabinClass
                ? ` · ${en ? "Class" : "الدرجة"}: ${details.route.cabinClass}`
                : ""}
            </p>
            {details.stay ? (
              <p className="hint">
                {en ? "Stay" : "إقامة"}:{" "}
                {String(details.stay.locationLabel || details.stay.location || "—")}{" "}
                · {formatDay(String(details.stay.checkIn || ""))} →{" "}
                {formatDay(String(details.stay.checkOut || ""))}
              </p>
            ) : null}
          </div>

          <div className="panel">
            <h3>{en ? "Agency pricing" : "التسعير (وسيط)"}</h3>
            <table className="table">
              <tbody>
                <tr>
                  <td>{en ? "Customer sell price" : "سعر البيع للعميل"}</td>
                  <td>{formatMoneyMinor(row.totalSellAmount, currency)}</td>
                </tr>
                {canViewCost ? (
                  <>
                    <tr>
                      <td>{en ? "Supplier cost (net)" : "تكلفة المورد (صافي)"}</td>
                      <td>
                        {formatMoneyMinor(row.totalCostAmount || 0, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td>{en ? "Profit margin" : "هامش الربح"}</td>
                      <td>
                        {formatMoneyMinor(row.totalProfitAmount || 0, currency)}
                      </td>
                    </tr>
                  </>
                ) : null}
                <tr>
                  <td>{en ? "Applied pricing rule" : "قاعدة التسعير المطبّقة"}</td>
                  <td>{row.quote?.pricingRule?.name || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>{en ? "Customer & travelers" : "العميل والمسافرون"}</h3>
            <p>
              <strong>{customerName(row)}</strong>
            </p>
            <p className="hint">
              {en ? "Phone" : "هاتف"}:{" "}
              <DashLtr>
                {details.contact?.phone || row.quote?.contact?.waId || "—"}
              </DashLtr>{" "}
              · {en ? "Email" : "بريد"}:{" "}
              <DashLtr>
                {details.contact?.email || row.quote?.contact?.email || "—"}
              </DashLtr>
            </p>
            {(details.travelers?.length || details.guests?.length) ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{en ? "Name" : "الاسم"}</th>
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
            <h3>{en ? "Quote items" : "بنود العرض"}</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>{en ? "Service" : "الخدمة"}</th>
                  <th>{en ? "Description" : "الوصف"}</th>
                  <th>{en ? "Sell" : "البيع"}</th>
                </tr>
              </thead>
              <tbody>
                {(row.quote?.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{i18n.service(item.serviceType) || item.serviceType}</td>
                    <td>{item.description}</td>
                    <td>{formatMoneyMinor(item.sellAmount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>{en ? "Payment details" : "تفاصيل الدفع"}</h3>
            <div className="bk-totals">
              <div className="bk-total">
                <span>{en ? "Total" : "الإجمالي"}</span>
                <strong>{formatMoneyMinor(row.totalSellAmount, currency)}</strong>
              </div>
              <div className="bk-total">
                <span>{en ? "Paid" : "المدفوع"}</span>
                <strong>{formatMoneyMinor(paid, currency)}</strong>
              </div>
              <div className="bk-total">
                <span>{en ? "Balance" : "المتبقي"}</span>
                <strong>{formatMoneyMinor(remaining, currency)}</strong>
              </div>
            </div>
            {(row.payments || []).length === 0 ? (
              <p className="hint">
                {en ? "No payments recorded yet." : "لا مدفوعات مسجّلة بعد."}
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{i18n.c("status")}</th>
                    <th>{en ? "Method" : "الطريقة"}</th>
                    <th>{en ? "Reference" : "المرجع"}</th>
                    <th>{en ? "Amount" : "المبلغ"}</th>
                    <th>{i18n.c("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.payments || []).map((p) => (
                    <tr key={p.id}>
                      <td>
                        {en
                          ? PAYMENT_STATUS_LABEL_EN[p.status] || p.status
                          : PAYMENT_STATUS_LABEL[p.status] || p.status}
                      </td>
                      <td>
                        {en
                          ? PAYMENT_METHOD_LABEL_EN[p.method || ""] || p.method || "—"
                          : PAYMENT_METHOD_LABEL[p.method || ""] || p.method || "—"}
                      </td>
                      <td>
                        <DashLtr>{p.reference || "—"}</DashLtr>
                      </td>
                      <td>
                        {formatMoneyMinor(p.amount, p.currency || currency)}
                      </td>
                      <td>
                        <DashLtr>{formatDay(p.createdAt)}</DashLtr>
                      </td>
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
