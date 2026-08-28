"use client";

import "../../wa-suite.css";
import "../../customers-crm.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Template = { id: string; name: string; body: string; status?: string };
type Contact = { id: string; waId: string; name?: string | null };
type Campaign = {
  id: string;
  name: string;
  status: string;
  scheduledAt?: string | null;
  stats?: { sent?: number; failed?: number; pending?: number } | null;
  recipients: Array<{ id: string }>;
  template?: { name?: string } | null;
  createdAt?: string;
};

type WaAccount = {
  id: string;
  status: string;
  displayPhone?: string | null;
  channelName?: string | null;
  isDefault?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  running: "قيد الإرسال",
  completed: "مكتملة",
  failed: "فشلت",
};

export default function CampaignsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [waAccounts, setWaAccounts] = useState<WaAccount[]>([]);
  const [name, setName] = useState("حملة ترحيب");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState<"draft" | "send" | null>(null);
  const [tab, setTab] = useState<"active" | "create">("active");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    const [t, c, camps, wa] = await Promise.all([
      apiFetch<Template[]>("/campaigns/templates"),
      apiFetch<Contact[]>("/contacts"),
      apiFetch<Campaign[]>("/campaigns"),
      apiFetch<WaAccount[]>("/whatsapp/accounts").catch(() => []),
    ]);
    setTemplates(t);
    setContacts(c);
    setCampaigns(camps);
    setWaAccounts(wa);
    if (!templateId && t[0]) setTemplateId(t[0].id);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultChannel = waAccounts.find((a) => a.isDefault);

  const hasDefaultChannel = Boolean(
    defaultChannel &&
      (defaultChannel.status === "connected" ||
        defaultChannel.status === "pending"),
  );

  const waReady = waAccounts.some(
    (a) => a.status === "connected" || a.status === "pending",
  );

  const stats = useMemo(() => {
    const total = campaigns.length;
    const sending = campaigns.filter((c) => c.status === "running").length;
    const completed = campaigns.filter((c) => c.status === "completed").length;
    const failed = campaigns.filter((c) => c.status === "failed").length;
    const drafts = campaigns.filter(
      (c) => c.status === "draft" || c.status === "scheduled",
    ).length;
    return { total, sending, completed, failed, drafts };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!query) return true;
      const hay = [c.name, c.template?.name, c.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [campaigns, q, statusFilter]);

  function formatCampaignStats(s?: Campaign["stats"], total?: number) {
    const sent = s?.sent ?? 0;
    const failedCount = s?.failed ?? 0;
    const pending = s?.pending ?? 0;
    const denom = total ?? sent + failedCount + pending;
    const rate = denom > 0 ? Math.round((sent / denom) * 100) : 0;
    return { sent, failed: failedCount, pending, rate, total: denom };
  }

  async function submitCampaign(mode: "draft" | "send") {
    setError("");
    setOk("");
    if (!name.trim()) {
      setError("اسم الحملة مطلوب");
      return;
    }
    if (!templateId) {
      setError("اختر قالبًا أولًا");
      return;
    }
    if (!selected.length) {
      setError("حدد مستلمًا واحدًا على الأقل");
      return;
    }
    if (mode === "send" && !hasDefaultChannel) {
      setError("عيّن قناة واتساب افتراضية متصلة قبل الإرسال");
      return;
    }

    setLoading(mode);
    try {
      const campaign = await apiFetch<Campaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          templateId,
          contactIds: selected,
          scheduledAt: mode === "draft" ? scheduledAt || undefined : undefined,
        }),
      });

      if (mode === "draft") {
        setOk(
          scheduledAt
            ? "تم حفظ الحملة كمسودة مجدولة. أرسلها لاحقًا من القائمة أدناه."
            : "تم حفظ الحملة كمسودة. أرسلها لاحقًا من القائمة أدناه.",
        );
      } else {
        const result = await apiFetch<Campaign>(
          `/campaigns/${campaign.id}/send`,
          { method: "POST" },
        );
        setOk(
          `تم إرسال الحملة · نجح ${result.stats?.sent ?? 0} من ${selected.length} · فشل ${result.stats?.failed ?? 0}${(result.stats?.pending ?? 0) > 0 ? ` · معلّق ${result.stats?.pending}` : ""}`,
        );
      }
      setSelected([]);
      setScheduledAt("");
      setTab("active");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحملة");
    } finally {
      setLoading(null);
    }
  }

  async function sendExisting(id: string) {
    if (!hasDefaultChannel) {
      setError("عيّن قناة واتساب افتراضية متصلة قبل الإرسال");
      return;
    }
    setError("");
    setOk("");
    setLoading("send");
    try {
      const result = await apiFetch<Campaign>(`/campaigns/${id}/send`, {
        method: "POST",
      });
      const s = formatCampaignStats(result.stats, result.recipients?.length);
      setOk(
        `تم إرسال الحملة · نجح ${s.sent} من ${s.total} (${s.rate}%) · فشل ${s.failed}${s.pending > 0 ? ` · معلّق ${s.pending}` : ""}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال الحملة");
    } finally {
      setLoading(null);
    }
  }

  function toggleContact(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAll() {
    setSelected(contacts.map((c) => c.id));
  }

  function clearSelection() {
    setSelected([]);
  }

  function statusTone(status: string) {
    if (status === "completed") return "ok";
    if (status === "failed") return "bad";
    if (status === "running") return "warn";
    return "warn";
  }

  return (
    <AppShell title="الحملات">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">حملات WhatsApp</p>
            <h3>حملات WhatsApp</h3>
            <p>
              أنشئ حملات من قوالب معتمدة وأرسلها للمستلمين عبر القناة الافتراضية
              — صفحة مستقلة عن واتساب والقنوات والقوالب.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link className="btn secondary" href="/dashboard/templates">
              القوالب
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => setTab("create")}
            >
              إنشاء حملة
            </button>
          </div>
        </section>

        <section className="wa-stats">
          <article className="wa-stat">
            <span>إجمالي الحملات</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="wa-stat">
            <span>قيد الإرسال</span>
            <strong>{stats.sending}</strong>
          </article>
          <article className="wa-stat">
            <span>مكتملة</span>
            <strong>{stats.completed}</strong>
          </article>
          <article className="wa-stat">
            <span>فشلت</span>
            <strong>{stats.failed}</strong>
          </article>
          <article className="wa-stat">
            <span>مسودات</span>
            <strong>{stats.drafts}</strong>
          </article>
        </section>

        <div className="wa-tabs">
          <button
            type="button"
            className={tab === "active" ? "on" : ""}
            onClick={() => setTab("active")}
          >
            جدول الحملات
          </button>
          <button
            type="button"
            className={tab === "create" ? "on" : ""}
            onClick={() => setTab("create")}
          >
            إنشاء حملة
          </button>
        </div>

        {!hasDefaultChannel ? (
          <p className="cust-error">
            {!waReady
              ? "لا توجد قناة واتساب متصلة. "
              : "لا توجد قناة واتساب افتراضية. "}
            <Link href="/dashboard/whatsapp">إعداد واتساب</Link>
            {" · "}
            <Link href="/dashboard/channels">إدارة القنوات</Link>
          </p>
        ) : (
          <p className="wa-ok">
            القناة الافتراضية:{" "}
            {defaultChannel?.channelName ||
              defaultChannel?.displayPhone ||
              "بدون اسم"}
          </p>
        )}

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        {tab === "create" ? (
          <section className="wa-card">
            <div className="wa-card-head">
              <h4>إنشاء حملة جديدة</h4>
              <p>اختر قالبًا ومستلمين ثم احفظ كمسودة أو أرسل فورًا</p>
            </div>
            <div className="wa-form-grid">
              <label className="cust-field">
                <span>اسم الحملة</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="cust-field">
                <span>القالب</span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.length === 0 ? (
                    <option value="">لا توجد قوالب</option>
                  ) : null}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cust-field">
                <span>جدولة الإرسال (اختياري)</span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </label>
            </div>

            <div className="wa-card-head row" style={{ marginTop: "0.75rem" }}>
              <div>
                <h4>
                  المستلمون ({selected.length}/{contacts.length})
                </h4>
                <p>حدد العملاء المستهدفين من قائمة العملاء</p>
              </div>
              <div className="cust-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={selectAll}
                  disabled={!contacts.length}
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={clearSelection}
                  disabled={!selected.length}
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {contacts.length === 0 ? (
              <p className="hint">
                لا يوجد عملاء بعد. أضف عملاء من{" "}
                <Link href="/dashboard/contacts">صفحة العملاء</Link>.
              </p>
            ) : (
              <div className="chip-list">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${selected.includes(c.id) ? "active" : ""}`}
                    onClick={() => toggleContact(c.id)}
                  >
                    {c.name || c.waId}
                  </button>
                ))}
              </div>
            )}

            <div className="cust-actions" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="btn secondary"
                disabled={loading !== null}
                onClick={() => void submitCampaign("draft")}
              >
                {loading === "draft" ? "جارٍ الحفظ..." : "حفظ كمسودة"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={
                  loading !== null ||
                  !hasDefaultChannel ||
                  !templateId ||
                  !selected.length
                }
                onClick={() => void submitCampaign("send")}
              >
                {loading === "send" ? "جارٍ الإرسال..." : "إنشاء وإرسال الآن"}
              </button>
              <Link className="btn secondary" href="/dashboard/templates">
                إنشاء قالب
              </Link>
            </div>
            {templates.length === 0 ? (
              <p className="hint">لا توجد قوالب بعد. أنشئ قالبًا أولًا.</p>
            ) : null}
          </section>
        ) : (
          <section className="wa-card">
            <div className="wa-card-head row">
              <div>
                <h4>جدول الحملات</h4>
                <p>متابعة الحالة والنتائج وإرسال المسودات</p>
              </div>
            </div>
            <div className="wa-toolbar">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث باسم الحملة أو القالب..."
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="scheduled">مجدولة</option>
                <option value="running">قيد الإرسال</option>
                <option value="completed">مكتملة</option>
                <option value="failed">فشلت</option>
              </select>
            </div>
            <div className="cust-table-scroll">
              <table className="cust-table">
                <thead>
                  <tr>
                    <th>الحملة / القالب</th>
                    <th>الحالة</th>
                    <th>النتيجة</th>
                    <th>البدء / الانتهاء</th>
                    <th>الإحصائيات</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const s = formatCampaignStats(
                      row.stats,
                      row.recipients.length,
                    );
                    const resultLabel =
                      row.status === "completed" && s.failed === 0
                        ? "تمت بنجاح"
                        : row.status === "completed" && s.failed > 0
                          ? "تمت بأخطاء"
                          : row.status === "failed"
                            ? "فشلت"
                            : row.status === "running"
                              ? "قيد الإرسال"
                              : "—";
                    const resultTone =
                      resultLabel === "تمت بنجاح"
                        ? "ok"
                        : resultLabel === "تمت بأخطاء" || resultLabel === "فشلت"
                          ? "bad"
                          : "warn";
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.name}</strong>
                          <div className="wa-meta-ids">
                            <span>{row.template?.name || "بدون قالب"}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`wa-badge ${statusTone(row.status)}`}>
                            {STATUS_LABEL[row.status] || row.status}
                          </span>
                        </td>
                        <td>
                          {resultLabel !== "—" ? (
                            <span className={`wa-badge ${resultTone}`}>
                              {resultLabel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="cust-date">
                          {row.scheduledAt
                            ? formatDate(row.scheduledAt)
                            : row.createdAt
                              ? formatDate(row.createdAt)
                              : "—"}
                        </td>
                        <td>
                          <div className="camp-stats">
                            <span className="camp-stat sent">
                              إجمالي {s.total}
                            </span>
                            <span className="camp-stat sent">نجح {s.sent}</span>
                            {s.failed > 0 ? (
                              <span className="camp-stat failed">
                                فشل {s.failed}
                              </span>
                            ) : null}
                            {s.pending > 0 ? (
                              <span className="camp-stat pending">
                                معلّق {s.pending}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="wa-row-actions">
                            {row.status === "draft" ||
                            row.status === "scheduled" ? (
                              <button
                                type="button"
                                className="cust-table-btn"
                                disabled={
                                  loading !== null || !hasDefaultChannel
                                }
                                onClick={() => void sendExisting(row.id)}
                              >
                                إرسال
                              </button>
                            ) : (
                              <span className="hint">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 ? (
                <div className="cust-empty">
                  <strong>لا حملات مطابقة</strong>
                  <p>أنشئ حملة جديدة من تبويب الإنشاء.</p>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
