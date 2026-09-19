"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  formatIsoDateDisplay,
  openNativeDatePicker,
} from "@/components/dashboard/DashDateCell";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { apiFetch, getSession } from "@/lib/api";
import { formatAmountMinor } from "@/lib/format";
import "../../bookings-suite.css";
import {
  bookingCurrency,
  bookingTravelDate,
  bookingTravelerCount,
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
  passengerDetails?: BookingInvoiceData["passengerDetails"] & {
    archived?: boolean;
  };
};

function bookingPhone(row: Booking) {
  return (
    row.passengerDetails?.contact?.phone ||
    row.quote?.contact?.waId ||
    ""
  );
}

function csvCell(value: string) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

const COL_KEYS = [
  "ref",
  "customer",
  "route",
  "travel",
  "status",
  "pax",
  "currency",
  "sell",
  "cost",
  "profit",
  "paid",
  "booked",
] as const;

type ColKey = (typeof COL_KEYS)[number];
const COLS_STORAGE = "watesly_bookings_columns";
const COLS_VERSION = 2;
const DEFAULT_COLS: ColKey[] = [...COL_KEYS];
const LEAD_COLS: ColKey[] = ["ref", "customer", "route", "travel", "status"];
const NEW_COLS: ColKey[] = ["pax", "currency"];

function validCols(keys: unknown): ColKey[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is ColKey => COL_KEYS.includes(key as ColKey));
}

function insertMissingCols(cols: ColKey[], extras: ColKey[]) {
  const next = [...cols];
  for (const key of extras) {
    if (next.includes(key)) continue;
    const at = DEFAULT_COLS.indexOf(key);
    next.splice(at < 0 ? next.length : Math.min(at, next.length), 0, key);
  }
  return next;
}

function persistCols(cols: ColKey[]) {
  localStorage.setItem(
    COLS_STORAGE,
    JSON.stringify({ v: COLS_VERSION, cols }),
  );
}

function readStoredCols(): ColKey[] {
  if (typeof window === "undefined") return DEFAULT_COLS;
  try {
    const raw = localStorage.getItem(COLS_STORAGE);
    if (!raw) return DEFAULT_COLS;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const migrated = insertMissingCols(validCols(parsed), NEW_COLS);
      return migrated.length ? migrated : DEFAULT_COLS;
    }
    if (parsed && typeof parsed === "object" && "cols" in parsed) {
      const rec = parsed as { v?: number; cols?: unknown };
      const cols = validCols(rec.cols);
      const next =
        (rec.v ?? 1) < COLS_VERSION
          ? insertMissingCols(cols, NEW_COLS)
          : cols;
      return next.length ? next : DEFAULT_COLS;
    }
    return DEFAULT_COLS;
  } catch {
    return DEFAULT_COLS;
  }
}

function FilterDate({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tone: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const i18n = useDashI18n();
  return (
    <label
      className={`field bk-date-field ${tone}`}
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
  const [ok, setOk] = useState("");
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
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);
  const canViewCost =
    getSession()?.permissions?.includes("pricing.view_cost") ?? false;
  const canBulk =
    getSession()?.permissions?.includes("bookings.issue") ?? false;

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.includes(row.id)),
    [rows, selected],
  );

  const totals = useMemo(() => {
    const byCurrency = new Map<
      string,
      {
        sell: number;
        cost: number;
        profit: number;
        paid: number;
        remaining: number;
        pax: number;
      }
    >();
    for (const row of rows) {
      const currency = bookingCurrency(row);
      const sell = Number(row.totalSellAmount) || 0;
      const cost = Number(row.totalCostAmount) || 0;
      const paid = paidAmount(row);
      const remaining = Math.max(0, sell - paid);
      const current = byCurrency.get(currency) || {
        sell: 0,
        cost: 0,
        profit: 0,
        paid: 0,
        remaining: 0,
        pax: 0,
      };
      current.sell += sell;
      current.cost += cost;
      current.profit += sell - cost;
      current.paid += paid;
      current.remaining += remaining;
      current.pax += bookingTravelerCount(row);
      byCurrency.set(currency, current);
    }
    return [...byCurrency.entries()];
  }, [rows]);

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
    const next = await apiFetch<Booking[]>(`/bookings${qs ? `?${qs}` : ""}`);
    setRows(next);
    setSelected((prev) => prev.filter((id) => next.some((row) => row.id === id)));
  }

  useEffect(() => {
    setVisibleCols(readStoredCols());
    load().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!colsRef.current?.contains(e.target as Node)) setColsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const colLabel: Record<ColKey, string> = {
    ref: en ? "Reference" : "المرجع",
    customer: i18n.c("customer"),
    route: i18n.c("route"),
    travel: en ? "Travel date" : "تاريخ السفر",
    status: i18n.c("status"),
    pax: en ? "Travelers" : "المسافرون",
    currency: en ? "Currency" : "العملة",
    sell: en ? "Sell" : "البيع",
    cost: en ? "Cost" : "التكلفة",
    profit: en ? "Profit" : "الأرباح",
    paid: en ? "Paid / balance" : "المدفوع / المتبقي",
    booked: en ? "Booked" : "تاريخ الحجز",
  };

  function pickerKeys() {
    return COL_KEYS.filter((key) => key !== "cost" || canViewCost);
  }

  function show(key: ColKey) {
    if (key === "cost" && !canViewCost) return false;
    return visibleCols.includes(key);
  }

  function toggleCol(key: ColKey) {
    if (key === "cost" && !canViewCost) return;
    setVisibleCols((prev) => {
      const allowed = prev.filter((item) => item !== "cost" || canViewCost);
      if (allowed.includes(key) && allowed.length <= 1) return prev;
      const next = allowed.includes(key)
        ? allowed.filter((item) => item !== key)
        : [...allowed, key];
      persistCols(next);
      return next;
    });
  }

  function resetCols() {
    const next = canViewCost ? DEFAULT_COLS : DEFAULT_COLS.filter((key) => key !== "cost");
    setVisibleCols(next);
    persistCols(next);
  }

  const leadSpan = 1 + LEAD_COLS.filter(show).length;
  const tailSpan = (show("booked") ? 1 : 0) + 1;

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
    setOk("");
    apiFetch<Booking[]>("/bookings")
      .then((next) => {
        setRows(next);
        setSelected([]);
      })
      .catch((err: Error) => setError(err.message));
  }

  function toggleAll(on: boolean) {
    setSelected(on ? rows.map((row) => row.id) : []);
  }

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) =>
      on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
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

  function printRows(list: Booking[]) {
    if (!list.length) return;
    try {
      printBookingInvoices(
        list,
        getSession()?.organization.name || "WeekendGate",
        { includeCost: canViewCost && printCost },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Print failed" : "فشل الطباعة");
    }
  }

  function exportExcel(list: Booking[]) {
    if (!list.length) return;
    const headerPairs: Array<[ColKey | "phone", string]> = [
      ["ref", en ? "Reference" : "المرجع"],
      ["customer", en ? "Customer" : "العميل"],
      ["phone", en ? "Phone" : "الهاتف"],
      ["route", en ? "Route" : "المسار"],
      ["travel", en ? "Travel date" : "تاريخ السفر"],
      ["status", en ? "Status" : "الحالة"],
      ["pax", en ? "Travelers" : "المسافرون"],
      ["currency", en ? "Currency" : "العملة"],
      ["sell", en ? "Sell" : "البيع"],
      ["cost", en ? "Cost" : "التكلفة"],
      ["profit", en ? "Profit" : "الأرباح"],
      ["paid", en ? "Paid" : "المدفوع"],
      ["paid", en ? "Balance" : "المتبقي"],
      ["booked", en ? "Booked" : "تاريخ الحجز"],
    ];
    const header = headerPairs
      .filter(([key]) => key === "phone" ? show("customer") : show(key))
      .map(([, label]) => label);
    const lines = list.map((row) => {
      const paid = paidAmount(row);
      const remaining = Math.max(0, row.totalSellAmount - paid);
      const currency = bookingCurrency(row);
      const cost = Number(row.totalCostAmount) || 0;
      const sell = Number(row.totalSellAmount) || 0;
      const cells: Array<[ColKey | "phone", string]> = [
        ["ref", row.providerBookingRef || row.id],
        ["customer", customerName(row)],
        ["phone", bookingPhone(row)],
        ["route", routeLabel(row)],
        ["travel", formatDay(bookingTravelDate(row))],
        ["status", i18n.status(row.status)],
        ["pax", String(bookingTravelerCount(row))],
        ["currency", currency],
        ["sell", formatAmountMinor(sell, currency)],
        ["cost", formatAmountMinor(cost, currency)],
        ["profit", formatAmountMinor(sell - cost, currency)],
        ["paid", formatAmountMinor(paid, currency)],
        ["paid", formatAmountMinor(remaining, currency)],
        ["booked", formatDay(row.createdAt)],
      ];
      return cells
        .filter(([key]) => (key === "phone" ? show("customer") : show(key)))
        .map(([, cell]) => csvCell(cell));
    });
    const csv = ["\uFEFF" + header.map(csvCell).join(","), ...lines.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekendgate-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOk(en ? `Exported ${list.length} bookings` : `تم تصدير ${list.length} حجز`);
  }

  async function bulk(action: "archive" | "unarchive" | "delete") {
    if (!selected.length) {
      setError(en ? "Select bookings first" : "حدّد حجوزات أولاً");
      return;
    }
    if (action === "delete") {
      const sure = window.confirm(
        en
          ? `Permanently delete ${selected.length} bookings?`
          : `حذف ${selected.length} حجز نهائياً؟`,
      );
      if (!sure) return;
    }
    setBusy(true);
    setError("");
    try {
      await apiFetch("/bookings/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: selected, action }),
      });
      setSelected([]);
      setOk(
        action === "delete"
          ? en
            ? "Bookings deleted"
            : "تم حذف الحجوزات"
          : action === "archive"
            ? en
              ? "Bookings archived"
              : "تمت أرشفة الحجوزات"
            : en
              ? "Bookings restored"
              : "تمت استعادة الحجوزات",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Action failed" : "فشل الإجراء");
    } finally {
      setBusy(false);
    }
  }

  const allOn = rows.length > 0 && selected.length === rows.length;

  return (
    <AppShell title="الحجوزات">
      <div className="bk-desk">
        <section className="bk-hero">
          <div>
            <p className="bk-kicker">Bookings</p>
            <h3>{en ? "Bookings desk" : "سجل الحجوزات"}</h3>
            <p>
              {en
                ? "Colored search cards, one compact row per booking, and a selection box for archive, delete, print, or Excel export."
                : "بطاقات بحث ملوّنة، كل حجز في صف واحد، ومربع تحديد للأرشفة أو الحذف أو الطباعة أو تصدير إكسل."}
            </p>
          </div>
        </section>

        <section className="bk-card">
          <div className="bk-filters">
            <div className="bk-filter-grid">
              <label className="field span-2 bk-field-search">
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
              <label className="field bk-field-status">
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
                  <option value="archived">{en ? "Archived" : "مؤرشف"}</option>
                </select>
              </label>
              <label className="field bk-field-service">
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
                tone="bk-field-booked"
                label={en ? "Booked from" : "تاريخ الحجز من"}
                value={bookedFrom}
                onChange={setBookedFrom}
              />
              <FilterDate
                tone="bk-field-booked"
                label={en ? "Booked to" : "تاريخ الحجز إلى"}
                value={bookedTo}
                onChange={setBookedTo}
              />
              <FilterDate
                tone="bk-field-travel"
                label={en ? "Travel from" : "تاريخ السفر من"}
                value={travelFrom}
                onChange={setTravelFrom}
              />
              <FilterDate
                tone="bk-field-travel"
                label={en ? "Travel to" : "تاريخ السفر إلى"}
                value={travelTo}
                onChange={setTravelTo}
              />
              <label className="field bk-field-route">
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
              <label className="field bk-field-route">
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

          <div className="bk-actions">
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
            <div className="bk-cols" ref={colsRef}>
              <button
                type="button"
                className="btn secondary"
                aria-expanded={colsOpen}
                onClick={() => setColsOpen((v) => !v)}
              >
                {en ? "Columns" : "الأعمدة"}{" "}
                {pickerKeys().filter(show).length}/{pickerKeys().length}
              </button>
              {colsOpen ? (
                <div className="bk-cols-menu" role="menu">
                  <p>{en ? "Show or hide report columns" : "إظهار أو إخفاء أعمدة التقرير"}</p>
                  {pickerKeys().map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={show(key)}
                        onChange={() => toggleCol(key)}
                      />
                      <span>{colLabel[key]}</span>
                    </label>
                  ))}
                  <button type="button" className="btn secondary" onClick={resetCols}>
                    {en ? "Show all" : "إظهار الكل"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bk-bulk">
            <label className="bk-bulk-count">
              <input
                type="checkbox"
                checked={allOn}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span>
                {en
                  ? `Selected ${selected.length}`
                  : `محدد ${selected.length}`}
              </span>
            </label>
            {canBulk ? (
              <>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy || !selected.length}
                  onClick={() => void bulk(status === "archived" ? "unarchive" : "archive")}
                >
                  {status === "archived"
                    ? en
                      ? "Restore"
                      : "استعادة"
                    : i18n.c("archive")}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy || !selected.length}
                  onClick={() => void bulk("delete")}
                >
                  {i18n.c("delete")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="btn"
              disabled={!selectedRows.length}
              onClick={() => printRows(selectedRows)}
            >
              {en ? "Print" : "طباعة"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedRows.length}
              onClick={() => exportExcel(selectedRows)}
            >
              {en ? "Export Excel" : "تصدير إكسل"}
            </button>
          </div>

          {error ? <p className="bk-msg err">{error}</p> : null}
          {ok ? <p className="bk-msg ok">{ok}</p> : null}
        </section>

        <div className="bk-table-wrap">
          <table
            className="bk-table"
            style={{
              minWidth: `${Math.max(720, 220 + pickerKeys().filter(show).length * 118)}px`,
            }}
          >
            <thead>
              <tr>
                <th className="bk-check">
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label={en ? "Select all" : "تحديد الكل"}
                  />
                </th>
                {show("ref") ? <th>{colLabel.ref}</th> : null}
                {show("customer") ? <th>{colLabel.customer}</th> : null}
                {show("route") ? <th>{colLabel.route}</th> : null}
                {show("travel") ? <th>{colLabel.travel}</th> : null}
                {show("status") ? <th>{colLabel.status}</th> : null}
                {show("pax") ? <th>{colLabel.pax}</th> : null}
                {show("currency") ? <th>{colLabel.currency}</th> : null}
                {show("sell") ? <th>{colLabel.sell}</th> : null}
                {show("cost") ? <th>{colLabel.cost}</th> : null}
                {show("profit") ? <th>{colLabel.profit}</th> : null}
                {show("paid") ? <th>{colLabel.paid}</th> : null}
                {show("booked") ? <th>{colLabel.booked}</th> : null}
                <th>{i18n.c("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const paid = paidAmount(row);
                const sell = Number(row.totalSellAmount) || 0;
                const cost = Number(row.totalCostAmount) || 0;
                const profit = sell - cost;
                const remaining = Math.max(0, sell - paid);
                const currency = bookingCurrency(row);
                const pax = bookingTravelerCount(row);
                const phone = bookingPhone(row);
                const checked = selected.includes(row.id);
                return (
                  <tr key={row.id} className={checked ? "is-selected" : undefined}>
                    <td className="bk-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleOne(row.id, e.target.checked)}
                      />
                    </td>
                    {show("ref") ? (
                      <td>
                        <Link className="dash-ltr" dir="ltr" href={`/dashboard/bookings/${row.id}`}>
                          {(row.providerBookingRef || row.id).slice(0, 12)}
                        </Link>
                      </td>
                    ) : null}
                    {show("customer") ? (
                      <td className="bk-cell-inline">
                        {customerName(row)}
                        {phone ? (
                          <span className="bk-cell-muted">
                            {" · "}
                            <DashLtr>{phone}</DashLtr>
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                    {show("route") ? (
                      <td className="bk-cell-inline">
                        <DashLtr>{routeLabel(row)}</DashLtr>
                      </td>
                    ) : null}
                    {show("travel") ? (
                      <td>
                        <DashLtr>{formatDay(bookingTravelDate(row))}</DashLtr>
                      </td>
                    ) : null}
                    {show("status") ? (
                      <td>
                        <span className={`bk-badge ${row.status}`}>
                          {i18n.status(row.status)}
                        </span>
                      </td>
                    ) : null}
                    {show("pax") ? <td className="bk-num">{pax}</td> : null}
                    {show("currency") ? (
                      <td className="bk-ccy">
                        <DashLtr>{currency}</DashLtr>
                      </td>
                    ) : null}
                    {show("sell") ? (
                      <td className="bk-num">{formatAmountMinor(sell, currency)}</td>
                    ) : null}
                    {show("cost") ? (
                      <td className="bk-num">{formatAmountMinor(cost, currency)}</td>
                    ) : null}
                    {show("profit") ? (
                      <td className={`bk-num ${profit < 0 ? "is-loss" : "is-profit"}`}>
                        {formatAmountMinor(profit, currency)}
                      </td>
                    ) : null}
                    {show("paid") ? (
                      <td className="bk-pay">
                        {formatAmountMinor(paid, currency)}
                        {" · "}
                        {remaining > 0
                          ? `${en ? "Bal." : "متبقي"} ${formatAmountMinor(remaining, currency)}`
                          : en
                            ? "Complete"
                            : "مكتمل"}
                      </td>
                    ) : null}
                    {show("booked") ? <td>{formatDay(row.createdAt)}</td> : null}
                    <td>
                      <div className="bk-row-actions">
                        <Link
                          className="btn secondary bk-mini"
                          href={`/dashboard/bookings/${row.id}`}
                        >
                          {en ? "Open" : "تفاصيل"}
                        </Link>
                        <button
                          type="button"
                          className="btn bk-mini"
                          onClick={() => printRows([row])}
                        >
                          {en ? "Print" : "طباعة"}
                        </button>
                        {row.status === "on_hold" || row.status === "draft" ? (
                          <button
                            type="button"
                            className="btn bk-mini"
                            onClick={() => void issue(row.id)}
                          >
                            {en ? "Issue" : "إصدار"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn secondary bk-mini"
                          onClick={() => void pay(row.id, remaining || row.totalSellAmount)}
                        >
                          {en ? "Pay" : "دفع"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rows.length ? (
              <tfoot>
                {totals.map(([currency, sum], index) => (
                  <tr key={currency}>
                    <td colSpan={Math.max(1, leadSpan)}>
                      {index === 0
                        ? en
                          ? `Filtered total · ${rows.length} bookings`
                          : `إجمالي النتائج المفلترة · ${rows.length} حجز`
                        : ""}
                      {!show("currency") ? (
                        <span className="bk-foot-ccy">
                          {index === 0 ? " · " : ""}
                          <DashLtr>{currency}</DashLtr>
                        </span>
                      ) : null}
                    </td>
                    {show("pax") ? <td className="bk-num">{sum.pax}</td> : null}
                    {show("currency") ? (
                      <td className="bk-ccy">
                        <DashLtr>{currency}</DashLtr>
                      </td>
                    ) : null}
                    {show("sell") ? (
                      <td className="bk-num">{formatAmountMinor(sum.sell, currency)}</td>
                    ) : null}
                    {show("cost") ? (
                      <td className="bk-num">{formatAmountMinor(sum.cost, currency)}</td>
                    ) : null}
                    {show("profit") ? (
                      <td className={`bk-num ${sum.profit < 0 ? "is-loss" : "is-profit"}`}>
                        {formatAmountMinor(sum.profit, currency)}
                      </td>
                    ) : null}
                    {show("paid") ? (
                      <td className="bk-pay">
                        {formatAmountMinor(sum.paid, currency)}
                        {" · "}
                        {en ? "Bal." : "متبقي"} {formatAmountMinor(sum.remaining, currency)}
                      </td>
                    ) : null}
                    {tailSpan ? <td colSpan={tailSpan} /> : null}
                  </tr>
                ))}
              </tfoot>
            ) : null}
          </table>
          {rows.length === 0 ? (
            <p className="bk-empty">
              {en ? "No matching bookings." : "لا توجد حجوزات مطابقة."}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
