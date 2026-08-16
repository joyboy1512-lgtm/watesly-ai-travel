"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type WaAccount = {
  id: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  displayPhone?: string | null;
  status: string;
  channelName?: string | null;
  channelType?: string | null;
  isDefault?: boolean;
  hasAccessToken?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  connected: "متصل",
  pending: "قيد الإعداد",
  disconnected: "غير متصل",
};

const CHANNEL_TYPES = [
  { key: "whatsapp", title: "WhatsApp", tags: ["Business API", "Inbox", "حملات", "قوالب Meta"] },
  { key: "telegram", title: "Telegram", tags: ["قريبًا", "Inbox"], soon: true },
  { key: "instagram", title: "Instagram", tags: ["قريبًا", "Direct"], soon: true },
  { key: "messenger", title: "Messenger", tags: ["قريبًا", "ردود"], soon: true },
];

export default function ChannelsPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  async function load() {
    const rows = await apiFetch<WaAccount[]>("/whatsapp/accounts");
    setAccounts(rows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && (a.channelType || "whatsapp") !== typeFilter) return false;
      if (!query) return true;
      const hay = [a.channelName, a.displayPhone, a.phoneNumberId].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(query);
    });
  }, [accounts, q, statusFilter, typeFilter]);

  async function syncChannel(id: string) {
    setBusyId(id);
    setError("");
    setOk("");
    try {
      const result = await apiFetch<{ ok: boolean; mode: string; message: string }>(
        `/whatsapp/accounts/${id}/test`,
        { method: "POST" },
      );
      if (result.ok) setOk(`مزامنة ناجحة: ${result.message}`);
      else setError(result.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل المزامنة");
    } finally {
      setBusyId(null);
    }
  }

  async function setDefault(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/whatsapp/accounts/${id}/set-default`, { method: "POST" });
      setOk("تم تعيين القناة الافتراضية");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التعيين");
    } finally {
      setBusyId(null);
    }
  }

  async function removeChannel(id: string) {
    if (!window.confirm("هل تريد حذف هذه القناة؟")) return;
    setBusyId(id);
    try {
      await apiFetch(`/whatsapp/accounts/${id}`, { method: "DELETE" });
      setOk("تم حذف القناة");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحذف");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="القنوات">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">إدارة القنوات</p>
            <h3>القنوات</h3>
            <p>
              صفحة مستقلة لتشغيل القنوات ومزامنتها وتعديل حالتها وتعيين
              الافتراضي — منفصلة عن ربط حسابات واتساب.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link className="btn secondary" href="/dashboard/whatsapp">واتساب / ربط حساب</Link>
            <Link className="btn" href="/dashboard/whatsapp">إضافة قناة واتساب</Link>
          </div>
        </section>

        <div className="wa-banner">
          استقبل المحادثات وأرسل الحملات عبر القنوات المتصلة. ابدأ بواتساب ثم فعّل بقية القنوات لاحقًا.
        </div>

        <section className="wa-type-grid">
          {CHANNEL_TYPES.map((t) => (
            <article key={t.key} className={`wa-type-card${t.soon ? " soon" : ""}`}>
              <strong>{t.title}</strong>
              <div className="wa-tag-list">
                {t.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              {!t.soon ? (
                <small>{accounts.length} قناة مربوطة</small>
              ) : (
                <small>قريبًا</small>
              )}
            </article>
          ))}
        </section>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        <section className="wa-card">
          <div className="wa-card-head row">
            <div>
              <h4>جدول القنوات</h4>
              <p>مزامنة، تعيين افتراضي، وإدارة حالة كل قناة</p>
            </div>
          </div>
          <div className="wa-toolbar">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">كل الأنواع</option>
              <option value="whatsapp">واتساب</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="connected">متصل</option>
              <option value="pending">قيد الإعداد</option>
              <option value="disconnected">غير متصل</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث باسم القناة أو الرقم..." />
          </div>
          <div className="cust-table-scroll">
            <table className="cust-table">
              <thead>
                <tr>
                  <th>القناة</th>
                  <th>النوع</th>
                  <th>الرقم</th>
                  <th>Phone Number ID</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.channelName || "قناة واتساب"}</strong>
                      {a.isDefault ? <span className="wa-pill">افتراضي</span> : null}
                    </td>
                    <td>WhatsApp</td>
                    <td className="cust-mono">{a.displayPhone || "—"}</td>
                    <td className="cust-mono">{a.phoneNumberId}</td>
                    <td>
                      <span className={`wa-badge ${a.status === "connected" ? "ok" : a.status === "pending" ? "warn" : "bad"}`}>
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td>
                      <div className="wa-row-actions">
                        <button type="button" className="cust-table-btn" disabled={busyId === a.id} onClick={() => void syncChannel(a.id)}>مزامنة</button>
                        <Link className="wa-mini-btn" href="/dashboard/whatsapp">تعديل</Link>
                        {!a.isDefault ? (
                          <button type="button" className="wa-mini-btn" disabled={busyId === a.id} onClick={() => void setDefault(a.id)}>افتراضي</button>
                        ) : null}
                        <button type="button" className="wa-mini-btn danger" disabled={busyId === a.id} onClick={() => void removeChannel(a.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="cust-empty">
                <strong>لا قنوات بعد</strong>
                <p>اربط حساب واتساب من صفحة واتساب ثم أدره هنا.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
