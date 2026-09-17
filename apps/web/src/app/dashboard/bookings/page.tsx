"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  formatIsoDateDisplay,
  openNativeDatePicker,
} from "@/components/dashboard/DashDateCell";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { apiFetch, getSession } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import "../../bookings-suite.css";
import {
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

function PrintCostToggle({
  en,
  checked,
  onChange,
}: {
  en: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="bk-cost-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {en
          ? "Include cost on print (hidden unless checked)"
          : "إظهار التكلفة في الطباعة (تختفي ما لم تُطلب)"}
      </span>
    </label>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const i18n = useDashI18n();
  return (
    <label
      className="field bk-date-field"
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          openNativeDatePicker(inputRef.current);
        }
      }}
    >
      <span>{label}</span>
      <em className={`bk-date-value${value ? "" : " placeholder"}`}>
        {value ? formatIsoDateDisplay(value) : i18n.c("pickDate")}
      </em>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          e.stopPropagation();
          openNativeDatePicker(inputRef.current);
        }}
      />
    </label>
  );
}

export default function BookingsPage() {
  const i18n = useDashI18n();
  const en = i18n.lang === "en";
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
  const [printCost, setPrintCost] = useState(false);
  const canViewCost =
    getSession()?.permissions?.includes("pricing.view_cost") ?? false;

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
        { includeCost: canViewCost && printCost },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Print failed" : "فشل طباعة التقرير");
    }
  }

  function printFiltered() {
    if (!rows.length) return;
    try {
      printBookingInvoices(
        rows,
        getSession()?.organization.name || "WeekendGate",
        { includeCost: canViewCost && printCost },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Print failed" : "فشل طباعة التقارير");
    }
  }

  return (
    <AppShell title="الحجوزات">
      <div className="panel">
        <p className="hint" style={{ marginTop: 0 }}>
          {en
            ? "Filter by booking date, travel date, and route (origin only is enough). Print a bilingual itinerary and invoice from the results or each row. Cost stays hidden unless you ask to show it."
            : "فلترة الحجوزات بتاريخ الحجز وتاريخ السفر والمسار (يمكن تحديد جهة المغادرة فقط). اطبع تقرير خط السير والفاتورة من النتائج أو من صف كل حجز. التكلفة تختفي ما لم يُطلب إظهارها."}
        </p>
        <div className="bk-filters">
          <div className="bk-filter-grid">
            <label className="field span-2">
              <span>{i18n.c("search")}</span>
              <input
                value={q}
                placeholder={
                  en ? "Name, phone, email, reference…" : "اسم، هاتف، بريد، مرجع…"
                }
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
              />
            </label>
            <label className="field">
              <span>{i18n.c("status")}</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">{i18n.service("all")}</option>
                <option value="on_hold">{i18n.status("on_hold")}</option>
                <option value="issued">{i18n.status("issued")}</option>
                <option value="completed">{i18n.status("completed")}</option>
                <option value="cancelled">{i18n.status("cancelled")}</option>
                <option value="draft">{i18n.status("draft")}</option>
              </select>
            </label>
            <label className="field">
              <span>{en ? "Service" : "الخدمة"}</span>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="">{i18n.service("all")}</option>
                <option value="flight">{i18n.service("flight")}</option>
                <option value="hotel">{i18n.service("hotel")}</option>
                <option value="transfer">{i18n.service("transfer")}</option>
                <option value="activity">{i18n.service("activity")}</option>
              </select>
            </label>
            <FilterDate
              label={en ? "Booked from" : "تاريخ الحجز من"}
              value={bookedFrom}
              onChange={setBookedFrom}
            />
            <FilterDate
              label={en ? "Booked to" : "تاريخ الحجز إلى"}
              value={bookedTo}
              onChange={setBookedTo}
            />
            <FilterDate
              label={en ? "Travel from" : "تاريخ السفر من"}
              value={travelFrom}
              onChange={setTravelFrom}
            />
            <FilterDate
              label={en ? "Travel to" : "تاريخ السفر إلى"}
              value={travelTo}
              onChange={setTravelTo}
            />
            <label className="field">
              <span>{en ? "Route from" : "المسار من"}</span>
              <input
                value={origin}
                placeholder={en ? "City / departure airport" : "مدينة / مطار المغادرة"}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
              />
            </label>
            <label className="field">
              <span>{en ? "Route to (optional)" : "المسار إلى (اختياري)"}</span>
              <input
                value={destination}
                placeholder={
                  en
                    ? "Leave empty to search by origin only"
                    : "يمكن تركه فارغًا والبحث بالمغادرة فقط"
                }
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
            {i18n.c("apply")}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={resetFilters}
          >
            {i18n.c("reset")}
          </button>
          {canViewCost ? (
            <PrintCostToggle en={en} checked={printCost} onChange={setPrintCost} />
          ) : null}
          <button
            type="button"
            className="btn"
            disabled={!rows.length}
            onClick={printFiltered}
          >
            {en
              ? `Print itinerary & invoice (${rows.length})`
              : `طباعة التقرير والفاتورة (${rows.length})`}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="panel bk-table-wrap">
        <table className="table bk-table">
          <thead>
            <tr>
              <th>{en ? "Reference" : "المرجع"}</th>
              <th>{i18n.c("customer")}</th>
              <th>{i18n.c("route")}</th>
              <th>{en ? "Travel date" : "تاريخ السفر"}</th>
              <th>{i18n.c("status")}</th>
              <th>{en ? "Sell / payment" : "البيع / الدفع"}</th>
              <th>{en ? "Booked" : "تاريخ الحجز"}</th>
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
                    <Link className="dash-ltr" dir="ltr" href={`/dashboard/bookings/${row.id}`}>
                      {(row.providerBookingRef || row.id).slice(0, 12)}
                    </Link>
                  </td>
                  <td>
                    <div>{customerName(row)}</div>
                    <small className="hint dash-ltr" dir="ltr">
                      {row.passengerDetails?.contact?.phone ||
                        row.quote?.contact?.waId ||
                        "—"}
                    </small>
                  </td>
                  <td>
                    <DashLtr>{routeLabel(row)}</DashLtr>
                  </td>
                  <td>
                    <DashLtr>{formatDay(bookingTravelDate(row))}</DashLtr>
                  </td>
                  <td>{i18n.status(row.status)}</td>
                  <td>
                    <div className="bk-pay">
                      <strong>
                        {formatMoneyMinor(row.totalSellAmount, currency)}
                      </strong>
                      <small>
                        {en ? "Paid" : "مدفوع"} {formatMoneyMinor(paid, currency)}
                        {remaining > 0
                          ? ` · ${en ? "Balance" : "متبقي"} ${formatMoneyMinor(remaining, currency)}`
                          : en
                            ? " · Complete"
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
                        {en ? "Details" : "تفاصيل"}
                      </Link>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => printOne(row)}
                      >
                        {en ? "Print" : "طباعة"}
                      </button>
                      {row.status === "on_hold" || row.status === "draft" ? (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => void issue(row.id)}
                        >
                          {en ? "Issue" : "إصدار"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => void pay(row.id, remaining || row.totalSellAmount)}
                      >
                        {en ? "Record payment" : "تسجيل دفع"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="hint">
            {en ? "No matching bookings." : "لا توجد حجوزات مطابقة."}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
