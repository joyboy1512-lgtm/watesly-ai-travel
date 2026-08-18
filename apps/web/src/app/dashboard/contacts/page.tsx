"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import "../../customers-crm.css";

type Customer = {
  key: string;
  contactId?: string;
  conversationId?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  stage: string;
  gender: string;
  branch: string;
  channel: string;
  channelType: string;
  marketing: boolean;
  source: string;
  createdAt: string | null;
  lastContactedAt: string | null;
};

type CustomersPayload = {
  customers: Customer[];
  organizationName?: string;
  stats?: {
    total: number;
    newThisWeek: number;
    unnamed: number;
    inactive30: number;
  };
  branches?: string[];
  channels?: string[];
};

const STAGE_LABEL: Record<string, string> = {
  lead: "عميل محتمل",
  customer: "عميل",
  vip: "VIP",
  inactive: "غير نشط",
};

const GENDER_LABEL: Record<string, string> = {
  male: "ذكر",
  female: "أنثى",
};

const PAGE_SIZE = 14;
const AVATAR_COLORS = [
  "#3b6d8c",
  "#6b5b95",
  "#184a52",
  "#c4923a",
  "#2e7a84",
  "#4f6fa8",
  "#8d4f66",
];

function initials(name?: string | null, phone?: string | null) {
  const source = (name || phone || "؟").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function avatarColor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatAdded(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-KW", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseCsv(text: string) {
  const raw = text.replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const alias: Record<string, string> = {
    الاسم: "name",
    name: "name",
    الهاتف: "phone",
    phone: "phone",
    waid: "phone",
    البريد: "email",
    email: "email",
    الجنس: "gender",
    gender: "gender",
    المرحلة: "stage",
    stage: "stage",
    الفرع: "branch",
    branch: "branch",
    التسويق: "marketing",
    marketing: "marketing",
  };
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = alias[header] || header;
      row[key] = (cols[index] || "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((ch === "," || ch === ";") && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function mapGender(value: string) {
  const v = value.trim().toLowerCase();
  if (["male", "m", "ذكر", "رجل"].includes(v)) return "male";
  if (["female", "f", "أنثى", "انثى", "امرأة"].includes(v)) return "female";
  return "";
}

function mapStage(value: string) {
  const v = value.trim().toLowerCase();
  if (["vip"].includes(v)) return "vip";
  if (["customer", "عميل"].includes(v)) return "customer";
  if (["inactive", "غير نشط"].includes(v)) return "inactive";
  return "lead";
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  stage: "lead",
  marketing: true,
};

export default function ContactsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newThisWeek: 0,
    unnamed: 0,
    inactive30: 0,
  });
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [gender, setGender] = useState("all");
  const [branch, setBranch] = useState("all");
  const [channel, setChannel] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (stage !== "all") params.set("stage", stage);
      if (gender !== "all") params.set("gender", gender);
      if (branch !== "all") params.set("branch", branch);
      if (channel !== "all") params.set("channel", channel);
      const qs = params.toString();
      const data = await apiFetch<CustomersPayload>(
        `/contacts/customers${qs ? `?${qs}` : ""}`,
      );
      setRows(data.customers || []);
      setBranches(data.branches || []);
      setChannels(data.channels || []);
      if (data.stats) setStats(data.stats);
      setPage(1);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, gender, branch, channel]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const from = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, rows.length);

  function toggleAll() {
    if (selected.length === pageRows.length) setSelected([]);
    else setSelected(pageRows.map((r) => r.key));
  }

  function toggleOne(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function createCustomer() {
    if (!form.phone.trim()) {
      setError("رقم الهاتف مطلوب");
      return;
    }
    try {
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({
          waId: form.phone.trim(),
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          gender: form.gender,
          stage: form.stage,
          marketing: form.marketing,
        }),
      });
      setShowCreate(false);
      setForm(emptyForm);
      setOk("تم إنشاء العميل");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإنشاء");
    }
  }

  async function toggleMarketing(row: Customer) {
    if (!row.contactId) return;
    try {
      await apiFetch(`/contacts/${row.contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ marketing: !row.marketing }),
      });
      setRows((prev) =>
        prev.map((item) =>
          item.key === row.key ? { ...item, marketing: !item.marketing } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحديث");
    }
  }

  function downloadTemplate() {
    const header = "name,phone,email,gender,stage,branch,marketing";
    const sample = "أحمد المسافر,96550000000,ahmed@example.com,male,lead,,true";
    const blob = new Blob(["\uFEFF" + [header, sample].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "watesly-customers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const source = selected.length
      ? rows.filter((r) => selected.includes(r.key))
      : rows;
    const header = [
      "name",
      "phone",
      "email",
      "gender",
      "stage",
      "branch",
      "channel",
      "marketing",
      "createdAt",
    ];
    const lines = [
      header.join(","),
      ...source.map((r) =>
        [
          JSON.stringify(r.name || ""),
          JSON.stringify(r.phone || ""),
          JSON.stringify(r.email || ""),
          r.gender,
          r.stage,
          JSON.stringify(r.branch || ""),
          JSON.stringify(r.channel || ""),
          r.marketing ? "true" : "false",
          r.createdAt || "",
        ].join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watesly-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError("ارفع ملف CSV (يمكن حفظ قالب Excel كـ CSV).");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.length) {
      setError("الملف فارغ أو غير صالح");
      return;
    }
    try {
      const result = await apiFetch<{ created: number; updated: number }>(
        "/contacts/import",
        {
          method: "POST",
          body: JSON.stringify({
            rows: parsed.map((row) => ({
              name: row.name,
              phone: row.phone,
              email: row.email,
              gender: mapGender(row.gender || ""),
              stage: mapStage(row.stage || "lead"),
              branch: row.branch,
              marketing: row.marketing,
            })),
          }),
        },
      );
      setOk(`تم الاستيراد: ${result.created} جديد، ${result.updated} محدّث`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاستيراد");
    }
  }

  function openChat(row: Customer) {
    if (row.conversationId) {
      router.push(`/dashboard/conversations?id=${row.conversationId}`);
      return;
    }
    router.push("/dashboard/conversations");
  }

  const segmentCounts = useMemo(() => {
    return {
      lead: rows.filter((r) => r.stage === "lead").length,
      customer: rows.filter((r) => r.stage === "customer").length,
      vip: rows.filter((r) => r.stage === "vip").length,
      unnamed: rows.filter((r) => !r.name || r.name === r.phone).length,
    };
  }, [rows]);

  return (
    <AppShell title="العملاء" surface="light">
      <div className="crm-page">
        <aside className="crm-metrics">
          <article className="crm-metric gold">
            <span>إجمالي العملاء</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="crm-metric teal">
            <span>جديد هذا الأسبوع</span>
            <strong>{stats.newThisWeek}</strong>
          </article>
          <article className="crm-metric navy">
            <span>بدون اسم</span>
            <strong>{stats.unnamed}</strong>
          </article>
          <article className="crm-metric mute">
            <span>غير نشط 30 يوم</span>
            <strong>{stats.inactive30}</strong>
          </article>
        </aside>

        <section className="crm-main">
            <div className="crm-actions">
              <button
                type="button"
                className="crm-btn primary"
                onClick={() => setShowCreate(true)}
              >
                إنشاء عميل جديد
              </button>
              <button
                type="button"
                className="crm-btn ghost"
                onClick={() => fileRef.current?.click()}
              >
                رفع Excel
              </button>
              <button
                type="button"
                className="crm-btn ghost"
                onClick={() => setShowSegments((v) => !v)}
              >
                الشرائح
              </button>
              <button type="button" className="crm-btn ghost" onClick={downloadTemplate}>
                قالب Excel
              </button>
              <button type="button" className="crm-btn ghost" onClick={exportCsv}>
                تنزيل
              </button>
              <button
                type="button"
                className="crm-btn"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? "جاري التحديث…" : "تحديث"}
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".csv,text/csv"
                onChange={(e) => {
                  void onUpload(e.target.files?.[0] || null);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {showSegments ? (
              <div className="crm-segments">
                {(
                  [
                    ["all", `الكل (${rows.length})`],
                    ["lead", `عملاء محتملون (${segmentCounts.lead})`],
                    ["customer", `عملاء (${segmentCounts.customer})`],
                    ["vip", `VIP (${segmentCounts.vip})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`crm-chip${stage === key ? " active" : ""}`}
                    onClick={() => setStage(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="crm-filters">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="all">المرحلة</option>
                <option value="lead">عميل محتمل</option>
                <option value="customer">عميل</option>
                <option value="vip">VIP</option>
                <option value="inactive">غير نشط</option>
              </select>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="all">الجنس</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="all">الفرع</option>
                {branches.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="all">القناة</option>
                {channels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
                placeholder="بحث..."
                onBlur={() => void load()}
              />
              <button type="button" className="crm-btn primary" onClick={() => void load()}>
                بحث
              </button>
            </div>

            {error ? <p className="crm-error">{error}</p> : null}
            {ok ? <p className="crm-ok">{ok}</p> : null}

            {rows.length === 0 ? (
              <div className="crm-empty">
                <strong>لا عملاء مطابقون</strong>
                <p>أنشئ عميلاً جديداً أو ارفع ملف Excel للبدء.</p>
              </div>
            ) : (
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={
                            pageRows.length > 0 &&
                            selected.length === pageRows.length
                          }
                          onChange={toggleAll}
                        />
                      </th>
                      <th>الاسم</th>
                      <th>المرحلة</th>
                      <th>الجنس</th>
                      <th>الهاتف</th>
                      <th>الفرع</th>
                      <th>القناة</th>
                      <th>التسويق</th>
                      <th>تاريخ الإضافة</th>
                      <th>رسالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(row.key)}
                            onChange={() => toggleOne(row.key)}
                          />
                        </td>
                        <td>
                          <div className="crm-user">
                            <span
                              className="crm-avatar"
                              style={{
                                background: avatarColor(
                                  row.name || row.phone || row.key,
                                ),
                              }}
                            >
                              {initials(row.name, row.phone)}
                            </span>
                            <strong>{row.name || "بدون اسم"}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="crm-stage">
                            {STAGE_LABEL[row.stage] || "عميل محتمل"}
                          </span>
                        </td>
                        <td>{GENDER_LABEL[row.gender] || "—"}</td>
                        <td className="crm-phone">{row.phone || "—"}</td>
                        <td>{row.branch || "—"}</td>
                        <td>{row.channel || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className={`crm-check${row.marketing ? "" : " off"}`}
                            title="التسويق"
                            onClick={() => void toggleMarketing(row)}
                          >
                            {row.marketing ? "✓" : "○"}
                          </button>
                        </td>
                        <td>{formatAdded(row.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="crm-msg"
                            title="فتح المحادثة"
                            onClick={() => openChat(row)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-4 3v-3.5A2.5 2.5 0 0 1 4 14.5v-8Z"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="crm-pager">
              <span>
                {from}-{to} / {rows.length}
              </span>
              <span>
                <button
                  type="button"
                  className="crm-btn ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  السابق
                </button>{" "}
                <button
                  type="button"
                  className="crm-btn ghost"
                  disabled={to >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </button>
              </span>
            </div>
          </section>
      </div>

      {showCreate ? (
        <div className="crm-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>إنشاء عميل جديد</h3>
            <div className="crm-modal-grid">
              <label>
                الاسم
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم العميل"
                />
              </label>
              <label>
                الهاتف
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="965..."
                />
              </label>
              <label>
                البريد
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </label>
              <label>
                الجنس
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </label>
              <label>
                المرحلة
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                >
                  <option value="lead">عميل محتمل</option>
                  <option value="customer">عميل</option>
                  <option value="vip">VIP</option>
                </select>
              </label>
              <label>
                التسويق
                <select
                  value={form.marketing ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, marketing: e.target.value === "1" })
                  }
                >
                  <option value="1">مسموح</option>
                  <option value="0">غير مسموح</option>
                </select>
              </label>
            </div>
            <div className="crm-modal-actions">
              <button
                type="button"
                className="crm-btn ghost"
                onClick={() => setShowCreate(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="crm-btn primary"
                onClick={() => void createCustomer()}
              >
                حفظ العميل
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
