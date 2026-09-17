"use client";

import { useEffect, useMemo, useState } from "react";
import "./quotes-page.css";
import { AppShell } from "@/components/AppShell";
import { DashLtr, useDashI18n } from "@/lib/dashboard-i18n";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoneyMinor } from "@/lib/format";
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

function quoteServices(quote: Quote) {
  const types = Array.from(
    new Set((quote.items || []).map((item) => item.serviceType).filter(Boolean)),
  );
  return types.length ? types : ["flight"];
}

function customerLabel(quote: Quote) {
  const c = quote.contact;
  return (
    c?.name ||
    c?.waId ||
    c?.email ||
    "بدون بيانات"
  );
}

function customerDetail(quote: Quote) {
  const c = quote.contact;
  return [c?.name, c?.waId, c?.email].filter(Boolean).join(" · ") || "—";
}

export default function QuotesPage() {
  const i18n = useDashI18n();
  const [rows, setRows] = useState<Quote[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [enabledServices, setEnabledServices] = useState<string[]>([
    "flight",
    "hotel",
    "transfer",
    "activity",
  ]);

  async function load() {
    setError("");
    const data = await apiFetch<Quote[]>("/quotes");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    apiFetch<CmsState>("/shop/platform/cms")
      .then((cms) => {
        const enabled = (cms.heroServices || [])
          .filter((s) => s.enabled && CMS_TO_SERVICE[s.key])
          .map((s) => CMS_TO_SERVICE[s.key]!);
        if (enabled.length) setEnabledServices(Array.from(new Set(enabled)));
      })
      .catch(() => undefined);
  }, []);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      const services = quoteServices(row);
      if (!services.some((s) => enabledServices.includes(s))) return false;
      if (serviceFilter !== "all" && !services.includes(serviceFilter)) return false;
      return true;
    });
  }, [rows, enabledServices, serviceFilter]);

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

  return (
    <AppShell title="عروض الأسعار">
      <div className="quotes-suite">
        {error ? <p className="error">{error}</p> : null}
        {ok ? <p className="quotes-ok">{ok}</p> : null}

        <div className="quotes-toolbar">
          <strong>
            {i18n.lang === "en"
              ? `${visible.length} of ${rows.length} quotes`
              : `${visible.length} من ${rows.length} عرض`}
          </strong>
          <p className="quotes-hint">
            العروض تُحذف تلقائياً بعد 3 أيام ما لم تتحول إلى حجز، حتى لا تُثقل الموقع.
          </p>
          <div className="quotes-filter-group" role="group" aria-label="نوع الخدمة">
            {serviceTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={serviceFilter === tab.key ? "on" : undefined}
                onClick={() => setServiceFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="quotes-panel">
          {visible.length === 0 ? (
            <p className="quotes-empty">
              {rows.length
                ? "لا توجد عروض مطابقة للخدمة المحددة."
                : "لا توجد عروض أسعار بعد."}
            </p>
          ) : (
            <div className="quotes-table-scroll">
              <table className="quotes-table">
                <thead>
                  <tr>
                    <th>{i18n.c("customer")}</th>
                    <th>{i18n.lang === "en" ? "Service" : "الخدمة"}</th>
                    <th>{i18n.c("route")}</th>
                    <th>{i18n.lang === "en" ? "Description" : "الوصف"}</th>
                    <th>{i18n.lang === "en" ? "Sell" : "البيع"}</th>
                    <th>{i18n.lang === "en" ? "Cost" : "التكلفة"}</th>
                    <th>{i18n.lang === "en" ? "Profit" : "الربح"}</th>
                    <th>{i18n.c("status")}</th>
                    <th>{i18n.c("created")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const services = quoteServices(row);
                    return (
                      <tr key={row.id}>
                        <td className="customer">
                          <strong>{customerLabel(row)}</strong>
                          <small className="dash-ltr" dir="ltr">{customerDetail(row)}</small>
                        </td>
                        <td>
                          <div className="quotes-services">
                            {services.map((s) => (
                              <span key={s}>{i18n.service(s)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="route">
                          <DashLtr>
                            {row.inquiry?.origin || "؟"} → {row.inquiry?.destination || "؟"}
                          </DashLtr>
                        </td>
                        <td className="desc">{row.items?.[0]?.description || "—"}</td>
                        <td>{formatMoneyMinor(row.totalSellAmount, row.currency)}</td>
                        <td>
                          {row.totalCostAmount != null
                            ? formatMoneyMinor(row.totalCostAmount, row.currency)
                            : "—"}
                        </td>
                        <td>
                          {row.totalProfitAmount != null
                            ? formatMoneyMinor(row.totalProfitAmount, row.currency)
                            : "—"}
                        </td>
                        <td>
                          <span className={`quotes-status${isExpired(row) ? " expired" : ""}`}>
                            {isExpired(row)
                              ? i18n.status("expired")
                              : i18n.status(row.status)}
                          </span>
                        </td>
                        <td>{formatDate(row.createdAt)}</td>
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
