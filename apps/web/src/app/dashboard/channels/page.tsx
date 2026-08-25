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

const TYPE_LABEL: Record<string, string> = {
  whatsapp: "واتساب",
  telegram: "تلجرام",
  instagram: "إنستغرام",
  messenger: "ماسنجر",
};

const CHANNEL_TYPES = [
  {
    key: "whatsapp",
    title: "WhatsApp",
    tags: ["Business API", "Inbox", "حملات", "قوالب Meta"],
    hint: "Phone Number ID + Access Token من Meta",
  },
  {
    key: "telegram",
    title: "Telegram",
    tags: ["Bot API", "Inbox", "بدون نافذة 24س"],
    hint: "أنشئ بوتًا من @BotFather ثم الصق التوكن",
  },
  {
    key: "instagram",
    title: "Instagram",
    tags: ["Direct", "Graph API", "Inbox"],
    hint: "Instagram User ID + توكن الصفحة المرتبطة",
  },
  {
    key: "messenger",
    title: "Messenger",
    tags: ["صفحة فيسبوك", "Graph API", "Inbox"],
    hint: "Page ID + Page Access Token",
  },
] as const;

type ChannelKey = (typeof CHANNEL_TYPES)[number]["key"];

const emptyForm = {
  channelName: "",
  phoneNumberId: "",
  businessAccountId: "",
  displayPhone: "",
  accessToken: "",
  status: "connected",
  isDefault: false,
};

export default function ChannelsPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [connectType, setConnectType] = useState<ChannelKey | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const rows = await apiFetch<WaAccount[]>("/whatsapp/accounts");
    setAccounts(rows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {
      whatsapp: 0,
      telegram: 0,
      instagram: 0,
      messenger: 0,
    };
    for (const a of accounts) {
      const key = a.channelType || "whatsapp";
      byType[key] = (byType[key] || 0) + 1;
    }
    return byType;
  }, [accounts]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && (a.channelType || "whatsapp") !== typeFilter) {
        return false;
      }
      if (!query) return true;
      const hay = [a.channelName, a.displayPhone, a.phoneNumberId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [accounts, q, statusFilter, typeFilter]);

  function openConnect(type: ChannelKey) {
    setConnectType(type);
    setTypeFilter(type);
    setForm({
      ...emptyForm,
      accessToken: type === "whatsapp" ? "mock" : "",
      isDefault: accounts.length === 0,
    });
    setError("");
    setOk("");
  }

  async function saveChannel() {
    if (!connectType) return;
    setError("");
    setOk("");
    if (connectType === "whatsapp" && !form.phoneNumberId.trim()) {
      setError("Phone Number ID مطلوب");
      return;
    }
    if (connectType === "telegram" && !form.accessToken.trim()) {
      setError("توكن بوت تلجرام مطلوب");
      return;
    }
    if (connectType === "messenger" && !form.phoneNumberId.trim()) {
      setError("معرّف صفحة فيسبوك (Page ID) مطلوب");
      return;
    }
    if (connectType === "instagram" && !form.phoneNumberId.trim()) {
      setError("معرّف حساب إنستغرام (IG User ID) مطلوب");
      return;
    }
    setSaving(true);
    try {
      const saved = await apiFetch<WaAccount>("/whatsapp/accounts", {
        method: "POST",
        body: JSON.stringify({
          channelType: connectType,
          channelName: form.channelName.trim() || undefined,
          phoneNumberId: form.phoneNumberId.trim() || undefined,
          businessAccountId: form.businessAccountId.trim() || undefined,
          displayPhone: form.displayPhone.trim() || undefined,
          accessToken: form.accessToken.trim() || undefined,
          status: form.status,
          isDefault: form.isDefault,
        }),
      });
      let extra = "";
      if (saved?.id) {
        try {
          const result = await apiFetch<{
            ok: boolean;
            message: string;
            webhookUrl?: string;
          }>(`/whatsapp/accounts/${saved.id}/test`, { method: "POST" });
          extra = result.message;
          if (result.webhookUrl) {
            extra += ` · Webhook: ${result.webhookUrl}`;
          }
        } catch {
          extra = "تم الحفظ. اختبر المزامنة من الجدول.";
        }
      }
      setOk(
        extra
          ? `تم تفعيل ${TYPE_LABEL[connectType]} — ${extra}`
          : `تم تفعيل قناة ${TYPE_LABEL[connectType]}`,
      );
      setConnectType(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل ربط القناة");
    } finally {
      setSaving(false);
    }
  }

  async function syncChannel(id: string) {
    setBusyId(id);
    setError("");
    setOk("");
    try {
      const result = await apiFetch<{
        ok: boolean;
        mode: string;
        message: string;
        webhookUrl?: string;
      }>(`/whatsapp/accounts/${id}/test`, { method: "POST" });
      if (result.ok) {
        setOk(
          `مزامنة ناجحة: ${result.message}${
            result.webhookUrl ? ` · ${result.webhookUrl}` : ""
          }`,
        );
      } else setError(result.message);
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

  const connectMeta = CHANNEL_TYPES.find((t) => t.key === connectType);

  return (
    <AppShell title="القنوات">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">إدارة القنوات</p>
            <h3>القنوات</h3>
            <p>
              فعّل واتساب وتلجرام وإنستغرام وماسنجر من هنا. المحادثات الواردة
              تصل لصندوق الوارد، والردود تُرسل عبر القناة نفسها.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link className="btn secondary" href="/dashboard/whatsapp">
              واتساب / تفاصيل الربط
            </Link>
            <Link className="btn secondary" href="/dashboard/conversations">
              صندوق الوارد
            </Link>
          </div>
        </section>

        <div className="wa-banner">
          اختر قناة أدناه لربطها. تلجرام يستخدم توكن البوت، وماسنجر/إنستغرام
          يستخدمان نفس Webhook ميتا الحالي بعد اشتراك الصفحة.
        </div>

        <section className="wa-type-grid">
          {CHANNEL_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`wa-type-card${connectType === t.key ? " active" : ""}`}
              onClick={() => openConnect(t.key)}
            >
              <strong>{t.title}</strong>
              <div className="wa-tag-list">
                {t.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <small>
                {counts[t.key] || 0} قناة مربوطة
              </small>
              <span className="wa-type-cta">تفعيل / ربط</span>
            </button>
          ))}
        </section>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        {connectType && connectMeta ? (
          <section className="wa-card">
            <div className="wa-card-head row">
              <div>
                <h4>تفعيل {connectMeta.title}</h4>
                <p>{connectMeta.hint}</p>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setConnectType(null)}
              >
                إغلاق
              </button>
            </div>
            {connectType === "telegram" ? (
              <p className="wa-hook">
                بعد الحفظ نضبط Webhook تلقائيًا على
                {" "}
                <code>/whatsapp/telegram/webhook/&lt;id&gt;</code>
                . للتطوير استخدم توكن يبدأ بـ mock.
              </p>
            ) : null}
            {connectType === "messenger" || connectType === "instagram" ? (
              <p className="wa-hook">
                أضف اشتراك الرسائل في تطبيق ميتا على نفس عنوان Webhook واتساب:
                {" "}
                <code>/whatsapp/webhook</code>
                {" "}
                مع توكن التحقق الحالي.
              </p>
            ) : null}
            <div className="wa-form-grid">
              <label className="cust-field">
                <span>اسم القناة</span>
                <input
                  value={form.channelName}
                  onChange={(e) =>
                    setForm({ ...form, channelName: e.target.value })
                  }
                  placeholder={
                    connectType === "telegram"
                      ? "بوت WeekendGate"
                      : connectType === "messenger"
                        ? "صفحة WeekendGate"
                        : connectType === "instagram"
                          ? "حساب إنستغرام"
                          : "فرع واتساب"
                  }
                />
              </label>
              {connectType === "whatsapp" ? (
                <>
                  <label className="cust-field">
                    <span>رقم العرض</span>
                    <input
                      value={form.displayPhone}
                      onChange={(e) =>
                        setForm({ ...form, displayPhone: e.target.value })
                      }
                      placeholder="+965..."
                    />
                  </label>
                  <label className="cust-field">
                    <span>Phone Number ID</span>
                    <input
                      value={form.phoneNumberId}
                      onChange={(e) =>
                        setForm({ ...form, phoneNumberId: e.target.value })
                      }
                      placeholder="من Meta"
                    />
                  </label>
                  <label className="cust-field">
                    <span>WABA / Business Account ID</span>
                    <input
                      value={form.businessAccountId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          businessAccountId: e.target.value,
                        })
                      }
                    />
                  </label>
                </>
              ) : null}
              {connectType === "telegram" ? (
                <label className="cust-field">
                  <span>اسم العرض / @username (اختياري)</span>
                  <input
                    value={form.displayPhone}
                    onChange={(e) =>
                      setForm({ ...form, displayPhone: e.target.value })
                    }
                    placeholder="@YourBot"
                  />
                </label>
              ) : null}
              {connectType === "messenger" ? (
                <label className="cust-field">
                  <span>Facebook Page ID</span>
                  <input
                    value={form.phoneNumberId}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumberId: e.target.value })
                    }
                    placeholder="رقم الصفحة"
                  />
                </label>
              ) : null}
              {connectType === "instagram" ? (
                <label className="cust-field">
                  <span>Instagram User ID</span>
                  <input
                    value={form.phoneNumberId}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumberId: e.target.value })
                    }
                    placeholder="IG User ID"
                  />
                </label>
              ) : null}
              <label className="cust-field">
                <span>
                  {connectType === "telegram"
                    ? "توكن البوت"
                    : connectType === "messenger"
                      ? "Page Access Token"
                      : "Access Token"}
                </span>
                <input
                  value={form.accessToken}
                  onChange={(e) =>
                    setForm({ ...form, accessToken: e.target.value })
                  }
                  placeholder={
                    connectType === "telegram"
                      ? "123456:ABC... أو mock"
                      : "توكن حقيقي أو mock"
                  }
                />
              </label>
              <label className="cust-field">
                <span>الحالة</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="connected">متصل</option>
                  <option value="pending">قيد الإعداد</option>
                  <option value="disconnected">غير متصل</option>
                </select>
              </label>
            </div>
            <label className="wa-check">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />{" "}
              تعيين كقناة افتراضية للمنظمة
            </label>
            <div className="cust-actions">
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => void saveChannel()}
              >
                {saving ? "جارٍ التفعيل..." : `تفعيل ${connectMeta.title}`}
              </button>
              {connectType === "whatsapp" ? (
                <Link className="btn secondary" href="/dashboard/whatsapp">
                  صفحة واتساب التفصيلية
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="wa-card">
          <div className="wa-card-head row">
            <div>
              <h4>جدول القنوات</h4>
              <p>مزامنة، تعيين افتراضي، وإدارة حالة كل قناة</p>
            </div>
          </div>
          <div className="wa-toolbar">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">كل الأنواع</option>
              <option value="whatsapp">واتساب</option>
              <option value="telegram">تلجرام</option>
              <option value="instagram">إنستغرام</option>
              <option value="messenger">ماسنجر</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">كل الحالات</option>
              <option value="connected">متصل</option>
              <option value="pending">قيد الإعداد</option>
              <option value="disconnected">غير متصل</option>
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث باسم القناة أو المعرّف..."
            />
          </div>
          <div className="cust-table-scroll">
            <table className="cust-table">
              <thead>
                <tr>
                  <th>القناة</th>
                  <th>النوع</th>
                  <th>العرض / المعرّف</th>
                  <th>ID</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const type = a.channelType || "whatsapp";
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>
                          {a.channelName || TYPE_LABEL[type] || "قناة"}
                        </strong>
                        {a.isDefault ? (
                          <span className="wa-pill">افتراضي</span>
                        ) : null}
                      </td>
                      <td>{TYPE_LABEL[type] || type}</td>
                      <td className="cust-mono">{a.displayPhone || "—"}</td>
                      <td className="cust-mono">{a.phoneNumberId}</td>
                      <td>
                        <span
                          className={`wa-badge ${
                            a.status === "connected"
                              ? "ok"
                              : a.status === "pending"
                                ? "warn"
                                : "bad"
                          }`}
                        >
                          {STATUS_LABEL[a.status] || a.status}
                        </span>
                      </td>
                      <td>
                        <div className="wa-row-actions">
                          <button
                            type="button"
                            className="cust-table-btn"
                            disabled={busyId === a.id}
                            onClick={() => void syncChannel(a.id)}
                          >
                            مزامنة
                          </button>
                          {type === "whatsapp" ? (
                            <Link
                              className="wa-mini-btn"
                              href="/dashboard/whatsapp"
                            >
                              تعديل
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="wa-mini-btn"
                              onClick={() =>
                                openConnect(type as ChannelKey)
                              }
                            >
                              ربط جديد
                            </button>
                          )}
                          {!a.isDefault ? (
                            <button
                              type="button"
                              className="wa-mini-btn"
                              disabled={busyId === a.id}
                              onClick={() => void setDefault(a.id)}
                            >
                              افتراضي
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="wa-mini-btn danger"
                            disabled={busyId === a.id}
                            onClick={() => void removeChannel(a.id)}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="cust-empty">
                <strong>لا قنوات بعد</strong>
                <p>اختر واتساب أو تلجرام أو إنستغرام أو ماسنجر أعلاه لتفعيلها.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
