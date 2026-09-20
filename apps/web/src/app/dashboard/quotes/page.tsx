"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./quotes-page.css";
import { AppShell } from "@/components/AppShell";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { apiFetch, getSession } from "@/lib/api";
import { formatAmountMinor, formatDate } from "@/lib/format";
import type { CmsState } from "@watesly-travel/shared";

type QuoteItem = {
  description: string;
  providerKey: string;
  serviceType: string;
};

type QuoteContact = {
  id?: string;
  waId?: string | null;
  name?: string | null;
  email?: string | null;
};

type Quote = {
  id: string;
  status: string;
  currency: string;
  totalSellAmount: number;
  totalCostAmount?: number;
  totalProfitAmount?: number;
  expiresAt?: string;
  createdAt?: string;
  inquiry?: {
    origin?: string | null;
    destination?: string | null;
    adults?: number;
  };
  contact?: QuoteContact | null;
  items?: QuoteItem[];
};

const CMS_TO_SERVICE: Record<string, string> = {
  flights: "flight",
  stays: "hotel",
  cars: "transfer",
  activities: "activity",
};

const COL_KEYS = [
  "customer",
  "service",
  "route",
  "description",
  "currency",
  "sell",
  "cost",
  "profit",
  "status",
  "created",
] as const;

type ColKey = (typeof COL_KEYS)[number];
const COLS_STORAGE = "watesly_quotes_columns";
const COLS_VERSION = 1;
const DEFAULT_COLS: ColKey[] = [...COL_KEYS];

function validCols(keys: unknown): ColKey[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is ColKey => COL_KEYS.includes(key as ColKey));
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
    if (parsed && typeof parsed === "object" && "cols" in parsed) {
      const cols = validCols((parsed as { cols?: unknown }).cols);
      return cols.length ? cols : DEFAULT_COLS;
    }
    return DEFAULT_COLS;
  } catch {
    return DEFAULT_COLS;
  }
}

function quoteServices(quote: Quote) {
  const types = Array.from(
    new Set((quote.items || []).map((item) => item.serviceType).filter(Boolean)),
  );
  return types.length ? types : ["flight"];
}

function customerLabel(quote: Quote) {
  const c = quote.contact;
  return c?.name || c?.waId || c?.email || "بدون بيانات";
}

function customerDetail(quote: Quote) {
  const c = quote.contact;
  return [c?.name, c?.waId, c?.email].filter(Boolean).join(" · ") || "—";
}

export default function QuotesPage() {
  const i18n = useDashI18n();
  const en = i18n.lang === "en";
  const [rows, setRows] = useState<Quote[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);
  const [enabledServices, setEnabledServices] = useState<string[]>([
    "flight",
    "hotel",
    "transfer",
    "activity",
  ]);
  const canViewCost =
    getSession()?.permissions?.includes("pricing.view_cost") ?? false;
  const canBulk =
    getSession()?.permissions?.includes("quotes.create") ?? false;

  async function load() {
    setError("");
    const params = new URLSearchParams();
    if (statusFilter === "archived") params.set("status", "archived");
    const qs = params.toString();
    const data = await apiFetch<Quote[]>(`/quotes${qs ? `?${qs}` : ""}`);
    const next = Array.isArray(data) ? data : [];
    setRows(next);
    setSelected((prev) => prev.filter((id) => next.some((row) => row.id === id)));
  }

  useEffect(() => {
    setVisibleCols(readStoredCols());
    apiFetch<CmsState>("/shop/platform/cms")
      .then((cms) => {
        const enabled = (cms.heroServices || [])
          .filter((s) => s.enabled && CMS_TO_SERVICE[s.key])
          .map((s) => CMS_TO_SERVICE[s.key]!);
        if (enabled.length) setEnabledServices(Array.from(new Set(enabled)));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!colsRef.current?.contains(e.target as Node)) setColsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      const services = quoteServices(row);
      if (!services.some((s) => enabledServices.includes(s))) return false;
      if (serviceFilter !== "all" && !services.includes(serviceFilter)) return false;
      return true;
    });
  }, [rows, enabledServices, serviceFilter]);

  const colLabel: Record<ColKey, string> = {
    customer: i18n.c("customer"),
    service: en ? "Service" : "الخدمة",
    route: i18n.c("route"),
    description: en ? "Description" : "الوصف",
    currency: en ? "Currency" : "العملة",
    sell: en ? "Sell" : "البيع",
    cost: en ? "Cost" : "التكلفة",
    profit: en ? "Profit" : "الربح",
    status: i18n.c("status"),
    created: i18n.c("created"),
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
    const next = canViewCost
      ? DEFAULT_COLS
      : DEFAULT_COLS.filter((key) => key !== "cost");
    setVisibleCols(next);
    persistCols(next);
  }

  function toggleAll(on: boolean) {
    setSelected(on ? visible.map((row) => row.id) : []);
  }

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) =>
      on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  }

  async function send(id: string) {
    try {
      await apiFetch(`/quotes/${id}/send`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإرسال");
    }
  }

  async function book(id: string) {
    try {
      const result = await apiFetch<{ status: string; message?: string }>(
        `/bookings/from-quote/${id}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setError(result.message || `نتيجة الحجز: ${result.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء الحجز");
    }
  }

  async function remove(id: string) {
    const okConfirm = window.confirm("حذف عرض السعر هذا نهائياً؟ لا يمكن التراجع.");
    if (!okConfirm) return;
    try {
      setError("");
      await apiFetch(`/quotes/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحذف");
    }
  }

  async function bulk(action: "archive" | "unarchive" | "delete") {
    if (!selected.length) {
      setError(en ? "Select quotes first" : "حدّد عروض أسعار أولاً");
      return;
    }
    if (action === "delete") {
      const sure = window.confirm(
        en
          ? `Permanently delete ${selected.length} quotes?`
          : `حذف ${selected.length} عرض سعر نهائياً؟`,
      );
      if (!sure) return;
    }
    setBusy(true);
    setError("");
    try {
      await apiFetch("/quotes/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: selected, action }),
      });
      setSelected([]);
      setOk(
        action === "delete"
          ? en
            ? "Quotes deleted"
            : "تم حذف العروض"
          : action === "archive"
            ? en
              ? "Quotes archived"
              : "تمت أرشفة العروض"
            : en
              ? "Quotes restored"
              : "تمت استعادة العروض",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Action failed" : "فشل الإجراء");
    } finally {
      setBusy(false);
    }
  }

  async function saveContact(row: Quote) {
    const phone = row.contact?.waId?.trim();
    const email = row.contact?.email?.trim();
    const name = row.contact?.name?.trim();
    if (!phone && !email) {
      setError("لا توجد بيانات عميل كافية للحفظ");
      return;
    }
    try {
      setError("");
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({
          waId: phone || email,
          name: name || undefined,
          email: email || undefined,
          source: "quote",
          stage: "lead",
        }),
      });
      setOk("تم حفظ العميل في قائمة العملاء");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ العميل");
    }
  }

  function isExpired(row: Quote) {
    if (!row.expiresAt) return false;
    return new Date(row.expiresAt).getTime() < Date.now();
  }

  const serviceTabs = [
    { key: "all", label: i18n.service("all") },
    ...enabledServices.map((key) => ({
      key,
      label: i18n.service(key),
    })),
  ];

  const allOn = visible.length > 0 && visible.every((row) => selected.includes(row.id));

  return (
    <AppShell title="عروض الأسعار">
      <div className="quotes-suite">
        {error ? <p className="error">{error}</p> : null}
        {ok ? <p className="quotes-ok">{ok}</p> : null}

        <section className="quotes-hero">
          <h3>{en ? "Quotes desk" : "عروض الأسعار"}</h3>
          <p>
            {en
              ? `${visible.length} of ${rows.length} quotes`
              : `${visible.length} من ${rows.length} عرض`}
          </p>
        </section>

        <section className="quotes-card">
          <div className="quotes-filter-stack">
            <label className="quotes-field quotes-field-status">
              <span>{i18n.c("status")}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{en ? "Active" : "النشطة"}</option>
                <option value="archived">{en ? "Archived" : "مؤرشف"}</option>
              </select>
            </label>
            <label className="quotes-field quotes-field-service">
              <span>{en ? "Service" : "الخدمة"}</span>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                {serviceTabs.map((tab) => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="quotes-toolbar">
            <p className="quotes-hint">
              العروض تُحذف تلقائياً بعد 3 أيام ما لم تتحول إلى حجز أو تُأرشف.
            </p>
            <div className="quotes-cols" ref={colsRef}>
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
                <div className="quotes-cols-menu" role="menu">
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

          <div className="quotes-bulk">
            <label className="quotes-bulk-count">
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
                  onClick={() =>
                    void bulk(statusFilter === "archived" ? "unarchive" : "archive")
                  }
                >
                  {statusFilter === "archived"
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
          </div>
        </section>

        <div className="quotes-panel">
          {visible.length === 0 ? (
            <p className="quotes-empty">
              {rows.length
                ? "لا توجد عروض مطابقة للفلتر المحدد."
                : "لا توجد عروض أسعار بعد."}
            </p>
          ) : (
            <div className="quotes-table-scroll">
              <table
                className="quotes-table"
                style={{
                  minWidth: `${Math.max(880, 180 + pickerKeys().filter(show).length * 110)}px`,
                }}
              >
                <thead>
                  <tr>
                    <th className="quotes-check">
                      <input
                        type="checkbox"
                        checked={allOn}
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label={en ? "Select all" : "تحديد الكل"}
                      />
                    </th>
                    {show("customer") ? <th>{colLabel.customer}</th> : null}
                    {show("service") ? <th>{colLabel.service}</th> : null}
                    {show("route") ? <th>{colLabel.route}</th> : null}
                    {show("description") ? <th>{colLabel.description}</th> : null}
                    {show("currency") ? <th>{colLabel.currency}</th> : null}
                    {show("sell") ? <th>{colLabel.sell}</th> : null}
                    {show("cost") ? <th>{colLabel.cost}</th> : null}
                    {show("profit") ? <th>{colLabel.profit}</th> : null}
                    {show("status") ? <th>{colLabel.status}</th> : null}
                    {show("created") ? <th>{colLabel.created}</th> : null}
                    <th>{i18n.c("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const services = quoteServices(row);
                    const currency = row.currency || "KWD";
                    return (
                      <tr
                        key={row.id}
                        className={selected.includes(row.id) ? "is-selected" : undefined}
                      >
                        <td className="quotes-check">
                          <input
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            onChange={(e) => toggleOne(row.id, e.target.checked)}
                            aria-label={en ? "Select quote" : "تحديد العرض"}
                          />
                        </td>
                        {show("customer") ? (
                          <td className="customer">
                            <strong>{customerLabel(row)}</strong>
                            <small className="dash-ltr" dir="ltr">{customerDetail(row)}</small>
                          </td>
                        ) : null}
                        {show("service") ? (
                          <td>
                            <div className="quotes-services">
                              {services.map((s) => (
                                <span key={s}>{i18n.service(s)}</span>
                              ))}
                            </div>
                          </td>
                        ) : null}
                        {show("route") ? (
                          <td className="route">
                            <DashLtr>
                              {row.inquiry?.origin || "؟"} → {row.inquiry?.destination || "؟"}
                            </DashLtr>
                          </td>
                        ) : null}
                        {show("description") ? (
                          <td className="desc">{row.items?.[0]?.description || "—"}</td>
                        ) : null}
                        {show("currency") ? (
                          <td className="quotes-ccy">{currency}</td>
                        ) : null}
                        {show("sell") ? (
                          <td className="quotes-num">{formatAmountMinor(row.totalSellAmount, currency)}</td>
                        ) : null}
                        {show("cost") ? (
                          <td className="quotes-num">
                            {row.totalCostAmount != null
                              ? formatAmountMinor(row.totalCostAmount, currency)
                              : "—"}
                          </td>
                        ) : null}
                        {show("profit") ? (
                          <td className="quotes-num">
                            {row.totalProfitAmount != null
                              ? formatAmountMinor(row.totalProfitAmount, currency)
                              : "—"}
                          </td>
                        ) : null}
                        {show("status") ? (
                          <td>
                            <span className={`quotes-status${isExpired(row) ? " expired" : ""}`}>
                              {isExpired(row)
                                ? i18n.status("expired")
                                : i18n.status(row.status)}
                            </span>
                          </td>
                        ) : null}
                        {show("created") ? <td>{formatDate(row.createdAt)}</td> : null}
                        <td>
                          <div className="quotes-actions">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => void saveContact(row)}
                            >
                              {i18n.c("saveCustomer")}
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => send(row.id)}
                            >
                              {i18n.c("send")}
                            </button>
                            <button type="button" className="btn" onClick={() => book(row.id)}>
                              {i18n.c("book")}
                            </button>
                            <button
                              type="button"
                              className="btn danger"
                              onClick={() => remove(row.id)}
                              title={i18n.c("delete")}
                            >
                              {i18n.c("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
