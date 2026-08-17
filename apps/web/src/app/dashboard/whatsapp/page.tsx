"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

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
  webhookVerifiedAt?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  connected: "متصل",
  pending: "قيد الإعداد",
  disconnected: "غير متصل",
};

const emptyForm = {
  channelName: "",
  phoneNumberId: "",
  businessAccountId: "",
  displayPhone: "",
  accessToken: "mock",
  status: "connected",
  isDefault: true,
};

export default function WhatsAppPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [tab, setTab] = useState<"linked" | "link">("linked");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    const rows = await apiFetch<WaAccount[]>("/whatsapp/accounts");
    setAccounts(rows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    const linked = accounts.length;
    const connected = accounts.filter((a) => a.status === "connected").length;
    const pending = accounts.filter((a) => a.status === "pending").length;
    const disconnected = accounts.filter((a) => a.status === "disconnected").length;
    const withToken = accounts.filter((a) => a.hasAccessToken).length;
    return { linked, connected, pending, disconnected, withToken };
  }, [accounts]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!query) return true;
      const hay = [
        a.channelName,
        a.displayPhone,
        a.phoneNumberId,
        a.businessAccountId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [accounts, q, statusFilter]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function saveAccount() {
    setError("");
    setOk("");
    if (!form.phoneNumberId.trim()) {
      setError("Phone Number ID مطلوب");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/whatsapp/accounts", {
        method: "POST",
        body: JSON.stringify({
          phoneNumberId: form.phoneNumberId.trim(),
          channelName: form.channelName.trim() || undefined,
          channelType: "whatsapp",
          businessAccountId: form.businessAccountId.trim() || undefined,
          displayPhone: form.displayPhone.trim() || undefined,
          accessToken: form.accessToken.trim() || undefined,
          status: form.status,
          isDefault: form.isDefault,
        }),
      });
      setOk(editingId ? "تم تحديث الحساب بنجاح" : "تم ربط حساب واتساب بنجاح");
      resetForm();
      setTab("linked");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ الحساب");
    } finally {
      setLoading(false);
    }
  }

  function editAccount(account: WaAccount) {
    setEditingId(account.id);
    setForm({
      channelName: account.channelName || "",
      phoneNumberId: account.phoneNumberId,
      businessAccountId: account.businessAccountId || "",
      displayPhone: account.displayPhone || "",
      accessToken: "",
      status: account.status || "connected",
      isDefault: Boolean(account.isDefault),
    });
    setTab("link");
    setOk("عدّل الحقول ثم احفظ. اترك التوكن فارغًا إن لم ترد تغييره.");
    setError("");
  }

  async function testAccount(id: string) {
    setBusyId(id);
    setError("");
    setOk("");
    try {
      const result = await apiFetch<{ ok: boolean; mode: string; message: string }>(
        `/whatsapp/accounts/${id}/test`,
        { method: "POST" },
      );
      if (result.ok) setOk(`${result.message} (${result.mode})`);
      else setError(result.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل اختبار الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  async function setDefault(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/whatsapp/accounts/${id}/set-default`, { method: "POST" });
      setOk("تم تعيين الحساب كافتراضي");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التعيين");
    } finally {
      setBusyId(null);
    }
  }

  async function removeAccount(id: string) {
    if (!window.confirm("هل تريد فصل هذا الحساب؟")) return;
    setBusyId(id);
    try {
      await apiFetch(`/whatsapp/accounts/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      setOk("تم فصل الحساب");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الفصل");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="واتساب">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">WhatsApp Business API</p>
            <h3>واتساب Business</h3>
            <p>
              ربط حسابات واتساب وإدارتها وتعديلها ومزامنتها — صفحة مستقلة عن
              القنوات والقوالب والحملات.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link className="btn secondary" href="/dashboard/channels">
              إدارة القنوات
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetForm();
                setTab("link");
              }}
            >
              ربط حساب جديد
            </button>
          </div>
        </section>

        <section className="wa-stats">
          <article className="wa-stat"><span>الحسابات المربوطة</span><strong>{stats.linked}</strong></article>
          <article className="wa-stat"><span>متصل</span><strong>{stats.connected}</strong></article>
          <article className="wa-stat"><span>قيد الإعداد</span><strong>{stats.pending}</strong></article>
          <article className="wa-stat"><span>بتوكن</span><strong>{stats.withToken}</strong></article>
          <article className="wa-stat"><span>غير متصل</span><strong>{stats.disconnected}</strong></article>
        </section>

        <div className="wa-tabs">
          <button type="button" className={tab === "linked" ? "on" : ""} onClick={() => setTab("linked")}>الحسابات المربوطة</button>
          <button type="button" className={tab === "link" ? "on" : ""} onClick={() => setTab("link")}>{editingId ? "تعديل الحساب" : "ربط حساب جديد"}</button>
        </div>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        {tab === "link" ? (
          <section className="wa-card">
            <div className="wa-card-head">
              <h4>{editingId ? "تعديل حساب واتساب" : "ربط حساب واتساب"}</h4>
              <p>أدخل بيانات Meta Business API. للتطوير المحلي استخدم التوكن mock.</p>
            </div>
            <div className="wa-form-grid">
              <label className="cust-field"><span>اسم الحساب / القناة</span><input value={form.channelName} onChange={(e) => setForm({ ...form, channelName: e.target.value })} placeholder="Watesly Travel" /></label>
              <label className="cust-field"><span>رقم العرض</span><input value={form.displayPhone} onChange={(e) => setForm({ ...form, displayPhone: e.target.value })} placeholder="+965..." /></label>
              <label className="cust-field"><span>Phone Number ID</span><input value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} placeholder="من Meta" /></label>
              <label className="cust-field"><span>WABA / Business Account ID</span><input value={form.businessAccountId} onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })} /></label>
              <label className="cust-field"><span>Access Token</span><input value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder={editingId ? "اتركه فارغًا لعدم التغيير" : "mock أو توكن حقيقي"} /></label>
              <label className="cust-field"><span>الحالة</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="connected">متصل</option>
                  <option value="pending">قيد الإعداد</option>
                  <option value="disconnected">غير متصل</option>
                </select>
              </label>
            </div>
            <label className="wa-check"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> تعيين كحساب افتراضي</label>
            <div className="cust-actions">
              <button type="button" className="btn" disabled={loading} onClick={() => void saveAccount()}>{loading ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "ربط الحساب"}</button>
              {editingId ? <button type="button" className="btn secondary" onClick={resetForm}>إلغاء التعديل</button> : null}
            </div>
          </section>
        ) : (
          <section className="wa-card">
            <div className="wa-toolbar">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالقناة أو الرقم أو WABA..." />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">كل الحالات</option>
                <option value="connected">متصل</option>
                <option value="pending">قيد الإعداد</option>
                <option value="disconnected">غير متصل</option>
              </select>
            </div>
            <div className="cust-table-scroll">
              <table className="cust-table">
                <thead>
                  <tr>
                    <th>الحساب / الفرع</th>
                    <th>رقم واتساب</th>
                    <th>Meta IDs</th>
                    <th>التوكن</th>
                    <th>آخر تحقق</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.channelName || "حساب واتساب"}</strong>
                        {a.isDefault ? <span className="wa-pill">افتراضي</span> : null}
                      </td>
                      <td className="cust-mono">{a.displayPhone || "—"}</td>
                      <td>
                        <div className="wa-meta-ids">
                          <span>PN: {a.phoneNumberId}</span>
                          <span>WABA: {a.businessAccountId || "—"}</span>
                        </div>
                      </td>
                      <td>{a.hasAccessToken ? <span className="wa-badge ok">مفعّل</span> : <span className="wa-badge warn">غير موجود</span>}</td>
                      <td className="cust-date">{formatDate(a.webhookVerifiedAt)}</td>
                      <td><span className={`wa-badge ${a.status === "connected" ? "ok" : a.status === "pending" ? "warn" : "bad"}`}>{STATUS_LABEL[a.status] || a.status}</span></td>
                      <td>
                        <div className="wa-row-actions">
                          <button type="button" className="cust-table-btn" disabled={busyId === a.id} onClick={() => void testAccount(a.id)}>مزامنة</button>
                          <button type="button" className="wa-mini-btn" onClick={() => editAccount(a)}>إعدادات</button>
                          {!a.isDefault ? <button type="button" className="wa-mini-btn" disabled={busyId === a.id} onClick={() => void setDefault(a.id)}>افتراضي</button> : null}
                          <button type="button" className="wa-mini-btn danger" disabled={busyId === a.id} onClick={() => void removeAccount(a.id)}>فصل</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 ? <div className="cust-empty"><strong>لا حسابات مطابقة</strong><p>اربط حساب واتساب جديد من تبويب الربط.</p></div> : null}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
