"use client";

import "../../wa-suite.css";
import "../../wa-upload.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, apiUpload } from "@/lib/api";
import {
  extractTemplateVars,
  previewTemplateBody,
} from "@/lib/template-vars";

type HeaderType = "none" | "text" | "image" | "video" | "document";

type Template = {
  id: string;
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  headerType?: HeaderType | string | null;
  headerMediaUrl?: string | null;
  headerMediaName?: string | null;
  language: string;
  category: string;
  status: string;
  metaTemplateId?: string | null;
  exampleValues?: Record<string, string> | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمدة",
  pending: "قيد المراجعة",
  rejected: "مرفوضة",
};

const CATEGORY_LABEL: Record<string, string> = {
  marketing: "تسويق",
  utility: "خدمي",
  authentication: "مصادقة",
};

const HEADER_TYPE_LABEL: Record<HeaderType, string> = {
  none: "بدون رأس",
  text: "نص",
  image: "صورة",
  video: "فيديو",
  document: "ملف",
};

const emptyForm = {
  name: "",
  body: "",
  header: "",
  footer: "",
  language: "ar",
  category: "marketing",
  metaTemplateId: "",
  headerType: "text" as HeaderType,
  headerMediaUrl: "",
  headerMediaName: "",
};

function acceptFor(type: HeaderType) {
  if (type === "image") return "image/jpeg,image/png,image/webp";
  if (type === "video") return "video/mp4,video/3gpp";
  if (type === "document")
    return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf";
  return undefined;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"table" | "create">("table");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const rows = await apiFetch<Template[]>("/campaigns/templates");
    setTemplates(rows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    const total = templates.length;
    const approved = templates.filter((t) => t.status === "approved").length;
    const pending = templates.filter(
      (t) => t.status === "pending" || t.status === "draft",
    ).length;
    const rejected = templates.filter((t) => t.status === "rejected").length;
    const marketing = templates.filter((t) => t.category === "marketing").length;
    return { total, approved, pending, rejected, marketing };
  }, [templates]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (!query) return true;
      return [t.name, t.body, t.metaTemplateId, t.headerMediaName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [templates, q, statusFilter, categoryFilter]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    const type = form.headerType;
    if (type !== "image" && type !== "video" && type !== "document") {
      setError("اختر نوع الرأس (صورة أو فيديو أو ملف) قبل الرفع");
      return;
    }
    setError("");
    setOk("");
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("headerType", type);
      const result = await apiUpload<{
        url: string;
        name: string;
        headerType: HeaderType;
      }>("/campaigns/templates/upload", data);
      setForm((prev) => ({
        ...prev,
        headerType: result.headerType || type,
        headerMediaUrl: result.url,
        headerMediaName: result.name,
        header: "",
      }));
      setOk(`تم رفع الملف: ${result.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setError("");
    setOk("");
    if (!form.name.trim() || !form.body.trim()) {
      setError("اسم القالب والنص مطلوبان");
      return;
    }
    if (
      (form.headerType === "image" ||
        form.headerType === "video" ||
        form.headerType === "document") &&
      !form.headerMediaUrl
    ) {
      setError("ارفع صورة أو فيديو أو ملف للرأس قبل الحفظ");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        body: form.body.trim(),
        header:
          form.headerType === "text" ? form.header.trim() || undefined : undefined,
        footer: form.footer.trim() || undefined,
        language: form.language,
        category: form.category,
        metaTemplateId: form.metaTemplateId.trim() || undefined,
        headerType: form.headerType,
        headerMediaUrl:
          form.headerType === "image" ||
          form.headerType === "video" ||
          form.headerType === "document"
            ? form.headerMediaUrl || undefined
            : undefined,
        headerMediaName:
          form.headerType === "image" ||
          form.headerType === "video" ||
          form.headerType === "document"
            ? form.headerMediaName || undefined
            : undefined,
      };
      if (editingId) {
        await apiFetch(`/campaigns/templates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setOk("تم تحديث القالب");
      } else {
        await apiFetch("/campaigns/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setOk("تم إنشاء القالب");
      }
      resetForm();
      setTab("table");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ القالب");
    } finally {
      setLoading(false);
    }
  }

  function edit(t: Template) {
    const ht = (t.headerType || "text") as HeaderType;
    setEditingId(t.id);
    setForm({
      name: t.name,
      body: t.body,
      header: t.header || "",
      footer: t.footer || "",
      language: t.language || "ar",
      category: t.category || "marketing",
      metaTemplateId: t.metaTemplateId || "",
      headerType: ht,
      headerMediaUrl: t.headerMediaUrl || "",
      headerMediaName: t.headerMediaName || "",
    });
    setTab("create");
  }

  async function remove(id: string) {
    if (!window.confirm("حذف هذا القالب؟")) return;
    try {
      await apiFetch(`/campaigns/templates/${id}`, { method: "DELETE" });
      setOk("تم حذف القالب");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحذف");
    }
  }

  function clearMedia() {
    setForm((prev) => ({
      ...prev,
      headerMediaUrl: "",
      headerMediaName: "",
    }));
  }

  const vars = extractTemplateVars(form.body);
  const mediaHeader =
    form.headerType === "image" ||
    form.headerType === "video" ||
    form.headerType === "document";

  return (
    <AppShell title="القوالب">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">WhatsApp Business API</p>
            <h3>قوالب WhatsApp</h3>
            <p>
              إدارة القوالب المعتمدة للرسائل والحملات، مع رأس نصي أو صورة أو فيديو
              أو ملف.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link className="btn secondary" href="/dashboard/campaigns">
              الحملات
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetForm();
                setTab("create");
              }}
            >
              إنشاء قالب
            </button>
          </div>
        </section>

        <section className="wa-stats">
          <article className="wa-stat">
            <span>إجمالي القوالب</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="wa-stat">
            <span>معتمدة</span>
            <strong>{stats.approved}</strong>
          </article>
          <article className="wa-stat">
            <span>قيد المراجعة</span>
            <strong>{stats.pending}</strong>
          </article>
          <article className="wa-stat">
            <span>مرفوضة</span>
            <strong>{stats.rejected}</strong>
          </article>
          <article className="wa-stat">
            <span>تسويق</span>
            <strong>{stats.marketing}</strong>
          </article>
        </section>

        <div className="wa-tabs">
          <button
            type="button"
            className={tab === "table" ? "on" : ""}
            onClick={() => setTab("table")}
          >
            جدول القوالب
          </button>
          <button
            type="button"
            className={tab === "create" ? "on" : ""}
            onClick={() => setTab("create")}
          >
            {editingId ? "تعديل قالب" : "إنشاء قالب"}
          </button>
        </div>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        {tab === "create" ? (
          <section className="wa-card">
            <div className="wa-form-grid">
              <label className="cust-field">
                <span>اسم القالب</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="welcome_offer"
                />
              </label>
              <label className="cust-field">
                <span>اللغة</span>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value })
                  }
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="cust-field">
                <span>الفئة</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="marketing">تسويق</option>
                  <option value="utility">خدمي</option>
                  <option value="authentication">مصادقة</option>
                </select>
              </label>
              <label className="cust-field">
                <span>Meta Template ID</span>
                <input
                  value={form.metaTemplateId}
                  onChange={(e) =>
                    setForm({ ...form, metaTemplateId: e.target.value })
                  }
                />
              </label>

              <label className="cust-field">
                <span>نوع الرأس</span>
                <select
                  value={form.headerType}
                  onChange={(e) => {
                    const headerType = e.target.value as HeaderType;
                    setForm({
                      ...form,
                      headerType,
                      header: headerType === "text" ? form.header : "",
                      headerMediaUrl:
                        headerType === "image" ||
                        headerType === "video" ||
                        headerType === "document"
                          ? form.headerMediaUrl
                          : "",
                      headerMediaName:
                        headerType === "image" ||
                        headerType === "video" ||
                        headerType === "document"
                          ? form.headerMediaName
                          : "",
                    });
                  }}
                >
                  <option value="none">بدون رأس</option>
                  <option value="text">نص</option>
                  <option value="image">صورة</option>
                  <option value="video">فيديو</option>
                  <option value="document">ملف</option>
                </select>
              </label>

              {form.headerType === "text" ? (
                <label
                  className="cust-field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span>نص الرأس (اختياري)</span>
                  <input
                    value={form.header}
                    onChange={(e) =>
                      setForm({ ...form, header: e.target.value })
                    }
                  />
                </label>
              ) : null}

              {mediaHeader ? (
                <div className="wa-upload" style={{ gridColumn: "1 / -1" }}>
                  <div className="wa-upload-head">
                    <strong>
                      رفع{" "}
                      {HEADER_TYPE_LABEL[form.headerType as HeaderType] ||
                        "وسائط"}
                    </strong>
                    <p>
                      يمكنك رفع صورة (JPG/PNG/WebP) أو فيديو (MP4) أو ملف
                      (PDF/Office) لرأس القالب.
                    </p>
                  </div>
                  <div className="wa-upload-row">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={acceptFor(form.headerType)}
                      disabled={uploading}
                      onChange={(e) =>
                        void onPickFile(e.target.files?.[0] ?? null)
                      }
                    />
                    {form.headerMediaUrl ? (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={clearMedia}
                      >
                        إزالة الملف
                      </button>
                    ) : null}
                  </div>
                  {uploading ? <p className="hint">جارٍ الرفع...</p> : null}
                  {form.headerMediaUrl ? (
                    <div className="wa-media-preview">
                      {form.headerType === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.headerMediaUrl}
                          alt={form.headerMediaName || "صورة الرأس"}
                        />
                      ) : null}
                      {form.headerType === "video" ? (
                        <video
                          src={form.headerMediaUrl}
                          controls
                          preload="metadata"
                        />
                      ) : null}
                      {form.headerType === "document" ? (
                        <a
                          href={form.headerMediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="wa-file-link"
                        >
                          {form.headerMediaName || "فتح الملف"}
                        </a>
                      ) : null}
                      <span className="hint">{form.headerMediaName}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="cust-field" style={{ gridColumn: "1 / -1" }}>
                <span>نص القالب</span>
                <textarea
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="مرحباً {{name}}..."
                />
              </label>
              <label className="cust-field" style={{ gridColumn: "1 / -1" }}>
                <span>التذييل (اختياري)</span>
                <input
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </label>
            </div>
            {vars.length ? (
              <p className="hint">متغيرات: {vars.join("، ")}</p>
            ) : null}
            <div className="wa-preview">
              <strong>معاينة</strong>
              {form.headerType === "text" && form.header ? (
                <div className="wa-preview-header">{form.header}</div>
              ) : null}
              {mediaHeader && form.headerMediaUrl ? (
                <div className="wa-media-preview compact">
                  {form.headerType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.headerMediaUrl} alt="" />
                  ) : null}
                  {form.headerType === "video" ? (
                    <video src={form.headerMediaUrl} controls />
                  ) : null}
                  {form.headerType === "document" ? (
                    <span>{form.headerMediaName || "ملف مرفق"}</span>
                  ) : null}
                </div>
              ) : null}
              <div className="wa-bubble">
                {previewTemplateBody(form.body) || "—"}
              </div>
            </div>
            <div className="cust-actions">
              <button
                type="button"
                className="btn"
                disabled={loading || uploading}
                onClick={() => void save()}
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : editingId
                    ? "حفظ التعديل"
                    : "إنشاء القالب"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={resetForm}
                >
                  إلغاء
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="wa-card">
            <div className="wa-toolbar">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث بالاسم أو النص أو الحساب..."
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="approved">معتمدة</option>
                <option value="draft">مسودة</option>
                <option value="pending">قيد المراجعة</option>
                <option value="rejected">مرفوضة</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">كل الفئات</option>
                <option value="marketing">تسويق</option>
                <option value="utility">خدمي</option>
                <option value="authentication">مصادقة</option>
              </select>
            </div>
            <div className="cust-table-scroll">
              <table className="cust-table">
                <thead>
                  <tr>
                    <th>القالب</th>
                    <th>اللغة</th>
                    <th>الفئة</th>
                    <th>الحالة</th>
                    <th>الرأس</th>
                    <th>نص القالب</th>
                    <th>Meta ID</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const ht = (t.headerType || "text") as HeaderType;
                    return (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.name}</strong>
                        </td>
                        <td>{t.language}</td>
                        <td>
                          <span className="wa-pill soft">
                            {CATEGORY_LABEL[t.category] || t.category}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`wa-badge ${t.status === "approved" ? "ok" : t.status === "rejected" ? "bad" : "warn"}`}
                          >
                            {STATUS_LABEL[t.status] || t.status}
                          </span>
                        </td>
                        <td>
                          <span className="wa-pill">
                            {HEADER_TYPE_LABEL[ht] || ht}
                          </span>
                          {t.headerMediaName ? (
                            <div className="wa-meta-ids">
                              <span>{t.headerMediaName}</span>
                            </div>
                          ) : t.header ? (
                            <div className="wa-meta-ids">
                              <span>{t.header}</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="wa-clip">{t.body}</td>
                        <td className="cust-mono">
                          {t.metaTemplateId || "—"}
                        </td>
                        <td>
                          <div className="wa-row-actions">
                            <button
                              type="button"
                              className="wa-mini-btn"
                              onClick={() => edit(t)}
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              className="wa-mini-btn danger"
                              onClick={() => void remove(t.id)}
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
                  <strong>لا قوالب</strong>
                  <p>أنشئ أول قالب للبدء بالحملات.</p>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
