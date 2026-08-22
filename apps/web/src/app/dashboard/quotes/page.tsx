"use client";

import { useEffect, useMemo, useState } from "react";
import "./quotes-page.css";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoneyMinor } from "@/lib/format";

type QuoteItem = {
  description: string;
  providerKey: string;
  serviceType: string;
  rawOfferSnapshot?: Record<string, unknown> | null;
};

type Quote = {
  id: string;
  status: string;
  currency: string;
  totalSellAmount: number;
  totalCostAmount?: number;
  totalProfitAmount?: number;
  expiresAt?: string;
  inquiry?: { origin?: string | null; destination?: string | null };
  items?: QuoteItem[];
};

type CancelFilter = "all" | "free" | "non_refundable";

type CancelInfo = {
  kind: "free" | "non_refundable" | "unknown";
  text: string;
};

function itemCancellation(item: QuoteItem): CancelInfo {
  const raw = item.rawOfferSnapshot;
  if (!raw) return { kind: "unknown", text: "—" };

  if (item.serviceType === "hotel") {
    const rooms = raw.rooms as
      | Array<{ rates?: Array<{ freeCancellation?: boolean }> }>
      | undefined;
    if (rooms?.some((room) => room.rates?.some((rate) => rate.freeCancellation))) {
      return { kind: "free", text: "إلغاء مجاني" };
    }
    const matchingRates = raw.matchingRates as Array<{ freeCancellation?: boolean }> | undefined;
    if (matchingRates?.some((rate) => rate.freeCancellation)) {
      return { kind: "free", text: "إلغاء مجاني" };
    }
    if (rooms?.length || matchingRates?.length) {
      return { kind: "non_refundable", text: "غير قابل للاسترداد" };
    }
    return { kind: "unknown", text: "—" };
  }

  if (item.serviceType === "flight") {
    const policies = raw.policies as { refundable?: boolean; changeable?: boolean } | undefined;
    if (policies?.refundable) return { kind: "free", text: "قابل للاسترداد" };
    if (policies?.refundable === false) {
      return { kind: "non_refundable", text: "غير قابل للاسترداد" };
    }
    return { kind: "unknown", text: "—" };
  }

  const freeCancel = raw.freeCancellation;
  if (freeCancel === true) return { kind: "free", text: "إلغاء مجاني" };
  if (freeCancel === false) return { kind: "non_refundable", text: "غير قابل للاسترداد" };

  return { kind: "unknown", text: "—" };
}

function quoteCancellation(quote: Quote): CancelInfo {
  const items = quote.items || [];
  if (!items.length) return { kind: "unknown", text: "—" };
  const free = items.find((item) => itemCancellation(item).kind === "free");
  if (free) return itemCancellation(free);
  const non = items.find((item) => itemCancellation(item).kind === "non_refundable");
  if (non) return itemCancellation(non);
  return itemCancellation(items[0]!);
}

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  accepted: "مقبول",
  expired: "منتهي",
  booked: "محجوز",
};

export default function QuotesPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [error, setError] = useState("");
  const [cancelFilter, setCancelFilter] = useState<CancelFilter>("all");

  async function load() {
    setRows(await apiFetch<Quote[]>("/quotes"));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (cancelFilter === "all") return rows;
    return rows.filter((row) => {
      const info = quoteCancellation(row);
      if (cancelFilter === "free") return info.kind === "free";
      return info.kind === "non_refundable";
    });
  }, [rows, cancelFilter]);

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

  return (
    <AppShell title="عروض الأسعار">
      <div className="quotes-suite">
        {error ? <p className="error">{error}</p> : null}

        <div className="quotes-toolbar">
          <strong>{filtered.length} من {rows.length} عرض</strong>
          <div className="quotes-filter-group" role="group" aria-label="فلتر الإلغاء">
            <span>الإلغاء:</span>
            <button
              type="button"
              className={cancelFilter === "all" ? "on" : undefined}
              onClick={() => setCancelFilter("all")}
            >
              الكل
            </button>
            <button
              type="button"
              className={cancelFilter === "free" ? "on" : undefined}
              onClick={() => setCancelFilter("free")}
            >
              إلغاء مجاني
            </button>
            <button
              type="button"
              className={cancelFilter === "non_refundable" ? "on" : undefined}
              onClick={() => setCancelFilter("non_refundable")}
            >
              غير قابل للاسترداد
            </button>
          </div>
        </div>

        <div className="quotes-panel">
          {filtered.length === 0 ? (
            <p className="quotes-empty">
              {rows.length
                ? "لا توجد عروض مطابقة لفلتر الإلغاء الحالي."
                : "لا توجد عروض أسعار بعد."}
            </p>
          ) : (
            <div className="quotes-table-scroll">
              <table className="quotes-table">
                <thead>
                  <tr>
                    <th>المسار</th>
                    <th>الوصف</th>
                    <th>البيع</th>
                    <th>التكلفة</th>
                    <th>الربح</th>
                    <th>الإلغاء</th>
                    <th>الحالة</th>
                    <th>ينتهي</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const cancel = quoteCancellation(row);
                    return (
                      <tr key={row.id}>
                        <td className="route">
                          {row.inquiry?.origin || "؟"} → {row.inquiry?.destination || "؟"}
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
                          <span className={`quotes-cancel ${cancel.kind}`}>{cancel.text}</span>
                        </td>
                        <td>
                          <span className="quotes-status">
                            {STATUS_LABEL[row.status] || row.status}
                          </span>
                        </td>
                        <td>{formatDate(row.expiresAt)}</td>
                        <td>
                          <div className="quotes-actions">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => send(row.id)}
                            >
                              إرسال
                            </button>
                            <button type="button" className="btn" onClick={() => book(row.id)}>
                              حجز
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
