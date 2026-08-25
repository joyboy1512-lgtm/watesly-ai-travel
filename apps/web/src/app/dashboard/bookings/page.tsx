"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getSession } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import "../../bookings-suite.css";
import {
  BOOKING_STATUS_LABEL,
  bookingTravelDate,
  customerName,
  formatDay,
  paidAmount,
  printBookingInvoices,
  routeLabel,
  type BookingInvoiceData,
} from "@/lib/booking-invoice";

type Booking = BookingInvoiceData & {
  totalCostAmount?: number;
  totalProfitAmount?: number;
};

export default function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [bookedFrom, setBookedFrom] = useState("");
  const [bookedTo, setBookedTo] = useState("");
  const [travelFrom, setTravelFrom] = useState("");
  const [travelTo, setTravelTo] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (serviceType) params.set("serviceType", serviceType);
    if (bookedFrom) params.set("bookedFrom", bookedFrom);
    if (bookedTo) params.set("bookedTo", bookedTo);
    if (travelFrom) params.set("travelFrom", travelFrom);
    if (travelTo) params.set("travelTo", travelTo);
    if (origin.trim()) params.set("origin", origin.trim());
    if (destination.trim()) params.set("destination", destination.trim());
    const qs = params.toString();
    setRows(await apiFetch<Booking[]>(`/bookings${qs ? `?${qs}` : ""}`));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  function resetFilters() {
    setQ("");
    setStatus("");
    setServiceType("");
    setBookedFrom("");
    setBookedTo("");
    setTravelFrom("");
    setTravelTo("");
    setOrigin("");
    setDestination("");
    setError("");
    apiFetch<Booking[]>("/bookings")
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }

  async function issue(id: string) {
    try {
      await apiFetch(`/bookings/${id}/issue`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإصدار");
    }
  }

  async function pay(id: string, amount: number) {
    try {
      await apiFetch(`/bookings/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, status: "paid", method: "manual" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدفع");
    }
  }

  function printOne(row: Booking) {
    try {
      printBookingInvoices(
        [row],
        getSession()?.organization.name || "WeekendGate",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل طباعة الفاتورة");
    }
  }

  function printFiltered() {
    if (!rows.length) return;
    try {
      printBookingInvoices(
        rows,
        getSession()?.organization.name || "WeekendGate",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل طباعة الفواتير");
    }
  }

  return (
    <AppShell title="الحجوزات">
      <div className="panel">
        <p className="hint" style={{ marginTop: 0 }}>
          فلترة الحجوزات بتاريخ الحجز وتاريخ السفر والمسار (يمكن تحديد جهة
          المغادرة فقط). اطبع فاتورة PDF من النتائج أو من صف كل حجز.
        </p>
        <div className="bk-filters">
          <div className="bk-filter-grid">
            <label className="field">
              <span>بحث</span>
              <input
                value={q}
                placeholder="اسم، هاتف، بريد، مرجع…"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
              />
            </label>
            <label className="field">
              <span>الحالة</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">الكل</option>
                <option value="on_hold">معلّق</option>
                <option value="issued">مُصدَر</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
                <option value="draft">مسودة</option>
              </select>
            </label>
            <label className="field">
              <span>الخدمة</span>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="">الكل</option>
                <option value="flight">طيران</option>
                <option value="hotel">فنادق</option>
                <option value="transfer">نقل</option>
              </select>
            </label>
          </div>

          <div className="bk-range">
            <label className="field">
              <span>تاريخ الحجز من</span>
              <input
                type="date"
                value={bookedFrom}
                onChange={(e) => setBookedFrom(e.target.value)}
              />
            </label>
            <span className="bk-range-sep">إلى</span>
            <label className="field">
              <span>تاريخ الحجز إلى</span>
              <input
                type="date"
                value={bookedTo}
                onChange={(e) => setBookedTo(e.target.value)}
              />
            </label>
          </div>

          <div className="bk-range">
            <label className="field">
              <span>تاريخ السفر من</span>
              <input
                type="date"
                value={travelFrom}
                onChange={(e) => setTravelFrom(e.target.value)}
              />
            </label>
            <span className="bk-range-sep">إلى</span>
            <label className="field">
              <span>تاريخ السفر إلى</span>
              <input
                type="date"
                value={travelTo}
                onChange={(e) => setTravelTo(e.target.value)}
              />
            </label>
          </div>

          <div className="bk-range">
            <label className="field">
              <span>المسار من</span>
              <input
                value={origin}
                placeholder="مدينة / مطار المغادرة"
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
              />
            </label>
            <span className="bk-range-sep">إلى</span>
            <label className="field">
              <span>المسار إلى (اختياري)</span>
              <input
                value={destination}
                placeholder="يمكن تركه فارغًا والبحث بالمغادرة فقط"
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
              />
            </label>
          </div>
        </div>
        <div className="actions bk-actions">
          <button type="button" className="btn" onClick={() => void load()}>
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={resetFilters}
          >
            مسح الفلاتر
          </button>
          <button
            type="button"
            className="btn"
            disabled={!rows.length}
            onClick={printFiltered}
          >
            طباعة فواتير النتائج PDF ({rows.length})
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>المرجع</th>
              <th>العميل</th>
              <th>المسار</th>
              <th>تاريخ السفر</th>
              <th>الحالة</th>
              <th>البيع / الدفع</th>
              <th>تاريخ الحجز</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const paid = paidAmount(row);
              const remaining = Math.max(0, row.totalSellAmount - paid);
              const currency = row.quote?.currency || "KWD";
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/bookings/${row.id}`}>
                      {(row.providerBookingRef || row.id).slice(0, 12)}
                    </Link>
                  </td>
                  <td>
                    <div>{customerName(row)}</div>
                    <small className="hint">
                      {row.passengerDetails?.contact?.phone ||
                        row.quote?.contact?.waId ||
                        "—"}
                    </small>
                  </td>
                  <td>{routeLabel(row)}</td>
                  <td>{formatDay(bookingTravelDate(row))}</td>
                  <td>{BOOKING_STATUS_LABEL[row.status] || row.status}</td>
                  <td>
                    <div className="bk-pay">
                      <strong>
                        {formatMoneyMinor(row.totalSellAmount, currency)}
                      </strong>
                      <small>
                        مدفوع {formatMoneyMinor(paid, currency)}
                        {remaining > 0
                          ? ` · متبقي ${formatMoneyMinor(remaining, currency)}`
                          : " · مكتمل"}
                      </small>
                    </div>
                  </td>
                  <td>{formatDay(row.createdAt)}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <Link
                        className="btn secondary"
                        href={`/dashboard/bookings/${row.id}`}
                      >
                        تفاصيل
                      </Link>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => printOne(row)}
                      >
                        فاتورة PDF
                      </button>
                      {row.status === "on_hold" || row.status === "draft" ? (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => void issue(row.id)}
                        >
                          إصدار
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => void pay(row.id, remaining || row.totalSellAmount)}
                      >
                        تسجيل دفع
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="hint">لا توجد حجوزات مطابقة.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
