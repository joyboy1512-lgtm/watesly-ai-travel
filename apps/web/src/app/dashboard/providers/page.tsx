"use client";

import "../../prov-desk.css";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type CatalogEntry = {
  providerKey: string;
  displayName: string;
  displayNameAr: string;
  description: string;
  capabilities: string[];
  status: "live" | "ready" | "scaffold";
  envConfigured: boolean;
  notes?: string;
  credentialFields: Array<{
    key: string;
    label: string;
    secret?: boolean;
    required?: boolean;
    placeholder?: string;
  }>;
};

type ProviderRow = {
  id: string;
  providerKey: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  capabilities?: string[];
  hasCredentials?: boolean;
  catalogStatus?: string;
  envConfigured?: boolean;
  notes?: string;
  archivedAt?: string | null;
  credentialHints?: Record<string, string>;
  credentialFields?: CatalogEntry["credentialFields"];
  description?: string;
};

const CAPABILITY_LABEL: Record<string, string> = {
  flight: "طيران",
  hotel: "فنادق",
  transfer: "مواصلات",
  activity: "أنشطة",
};

const STATUS_LABEL: Record<string, string> = {
  live: "حي",
  ready: "جاهز",
  scaffold: "هيكل",
};

type DrawerMode = "create" | "edit" | null;

export default function ProvidersPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [capability, setCapability] = useState("");
  const [status, setStatus] = useState("active");
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [editing, setEditing] = useState<ProviderRow | null>(null);

  const [selectedKey, setSelectedKey] = useState("duffel");
  const [displayName, setDisplayName] = useState("");
  const [priority, setPriority] = useState(50);
  const [enabled, setEnabled] = useState(true);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const selected = useMemo(
    () => catalog.find((c) => c.providerKey === selectedKey) || null,
    [catalog, selectedKey],
  );

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.archivedAt);
    return {
      total: active.length,
      enabled: active.filter((r) => r.enabled).length,
      withKeys: active.filter((r) => r.hasCredentials || r.envConfigured).length,
      archived: rows.filter((r) => r.archivedAt).length,
    };
  }, [rows]);

  async function load() {
    const includeArchived =
      status === "archived" || status === "all" ? "true" : "false";
    const params = new URLSearchParams({
      includeArchived,
      ...(capability ? { capability } : {}),
      ...(status === "archived" ? { status: "archived" } : {}),
      ...(status === "enabled" ? { status: "enabled" } : {}),
      ...(status === "disabled" ? { status: "disabled" } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
    });
    const [c, r] = await Promise.all([
      apiFetch<CatalogEntry[]>("/providers/catalog"),
      apiFetch<ProviderRow[]>(`/providers?${params.toString()}`),
    ]);
    setCatalog(c);
    setRows(r);
    if (!c.find((x) => x.providerKey === selectedKey) && c[0]) {
      setSelectedKey(c[0].providerKey);
    }
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, capability]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((err: Error) => setError(err.message));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setDrawer("create");
    setEditing(null);
    setError("");
    setOk("");
    const first = catalog[0];
    setSelectedKey(first?.providerKey || "duffel");
    setDisplayName(first?.displayNameAr || "");
    setPriority(50);
    setEnabled(true);
    const next: Record<string, string> = {};
    for (const f of first?.credentialFields || []) next[f.key] = "";
    setCredentials(next);
  }

  function openEdit(row: ProviderRow) {
    setDrawer("edit");
    setEditing(row);
    setError("");
    setOk("");
    setSelectedKey(row.providerKey);
    setDisplayName(row.displayName);
    setPriority(row.priority);
    setEnabled(row.enabled);
    const fields =
      catalog.find((c) => c.providerKey === row.providerKey)?.credentialFields ||
      row.credentialFields ||
      [];
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = "";
    setCredentials(next);
  }

  useEffect(() => {
    if (drawer !== "create" || !selected) return;
    setDisplayName(selected.displayNameAr);
    const next: Record<string, string> = {};
    for (const f of selected.credentialFields) next[f.key] = "";
    setCredentials(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, drawer]);

  async function saveProvider() {
    if (!selected && drawer === "create") return;
    setError("");
    setOk("");
    setLoading(true);
    try {
      if (drawer === "edit" && editing) {
        await apiFetch(`/providers/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            displayName: displayName.trim() || editing.displayName,
            enabled,
            priority,
            credentials,
            archived: false,
          }),
        });
        setOk(`تم تحديث ${displayName || editing.displayName}`);
      } else {
        await apiFetch("/providers", {
          method: "POST",
          body: JSON.stringify({
            providerKey: selectedKey,
            displayName: displayName.trim() || selected?.displayNameAr,
            enabled,
            priority,
            credentials,
          }),
        });
        setOk(`تم حفظ مزود ${selected?.displayNameAr || selectedKey}`);
      }
      setDrawer(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(row: ProviderRow) {
    setError("");
    try {
      await apiFetch(`/providers/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحديث");
    }
  }

  async function archive(row: ProviderRow) {
    setError("");
    try {
      await apiFetch(`/providers/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !row.archivedAt }),
      });
      setOk(row.archivedAt ? "تمت استعادة المزود" : "تمت أرشفة المزود");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الأرشفة");
    }
  }

  async function hardDelete(row: ProviderRow) {
    if (
      !window.confirm(
        `حذف نهائي لمزود «${row.displayName}»؟ لا يمكن التراجع عن هذا الإجراء.`,
      )
    ) {
      return;
    }
    setError("");
    try {
      await apiFetch(`/providers/${row.id}`, { method: "DELETE" });
      setOk("تم الحذف النهائي");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحذف");
    }
  }

  const draftFields =
    selected?.credentialFields ||
    editing?.credentialFields ||
    catalog.find((c) => c.providerKey === selectedKey)?.credentialFields ||
    [];

  return (
    <AppShell title="مزودو السفر">
      <div className="prov-desk">
        <section className="prov-hero">
          <div>
            <p className="prov-kicker">Provider Operations</p>
            <h3>غرفة تشغيل المزودين</h3>
            <p>
              إدارة Duffel وAmadeus وTravelfusion وHotelbeds من جدول واحد.
              البحث يجمع المحركات المفعّلة ويعرض الأرخص لنفس الرحلة — بلا أولوية
              لمزود بعينه.
            </p>
          </div>
          <div className="prov-hero-actions">
            <button type="button" className="prov-btn prov-btn-primary" onClick={openCreate}>
              إنشاء مزود
            </button>
            <button
              type="button"
              className="prov-btn prov-btn-ghost"
              onClick={() => void load().catch((e: Error) => setError(e.message))}
            >
              تحديث
            </button>
          </div>
        </section>

        {error ? <div className="prov-alert err">{error}</div> : null}
        {ok ? <div className="prov-alert ok">{ok}</div> : null}

        <section className="prov-stats">
          <div className="prov-stat">
            <span>المضافون</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="prov-stat">
            <span>مفعّلون</span>
            <strong>{stats.enabled}</strong>
          </div>
          <div className="prov-stat">
            <span>بمفاتيح جاهزة</span>
            <strong>{stats.withKeys}</strong>
          </div>
          <div className="prov-stat">
            <span>مؤرشفون</span>
            <strong>{stats.archived}</strong>
          </div>
        </section>

        <section className="prov-toolbar">
          <label className="prov-field">
            <span>بحث</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="اسم أو مفتاح المزود"
            />
          </label>
          <label className="prov-field">
            <span>القدرة</span>
            <select value={capability} onChange={(e) => setCapability(e.target.value)}>
              <option value="">الكل</option>
              <option value="flight">طيران</option>
              <option value="hotel">فنادق</option>
              <option value="transfer">مواصلات</option>
              <option value="activity">أنشطة</option>
            </select>
          </label>
          <label className="prov-field">
            <span>الحالة</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">النشطون</option>
              <option value="enabled">مفعّل فقط</option>
              <option value="disabled">متوقف</option>
              <option value="archived">المؤرشف</option>
              <option value="all">الكل شامل المؤرشف</option>
            </select>
          </label>
          <label className="prov-field">
            <span>عرض سريع</span>
            <button
              type="button"
              className="prov-btn prov-btn-soft"
              style={{ width: "100%" }}
              onClick={openCreate}
            >
              + إضافة من الكتالوج
            </button>
          </label>
        </section>

        <section className="prov-panel">
          <div className="prov-panel-head">
            <div>
              <h4>المزودون المضافون للمؤسسة</h4>
              <p>الإعدادات · الأرشفة · الحذف النهائي — من الصف مباشرة</p>
            </div>
            <span className="prov-chip">{rows.length} سجل</span>
          </div>

          {rows.length === 0 ? (
            <div className="prov-empty">
              <strong>لا مزودين في هذا العرض</strong>
              <p>أنشئ مزودًا جديدًا أو غيّر الفلاتر لإظهار المؤرشف.</p>
            </div>
          ) : (
            <div className="prov-table-wrap">
              <table className="prov-table">
                <thead>
                  <tr>
                    <th>المزود</th>
                    <th>القدرات</th>
                    <th>الحالة التقنية</th>
                    <th>المفاتيح</th>
                    <th>الأولوية</th>
                    <th>التفعيل</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.archivedAt ? "is-archived" : undefined}>
                      <td>
                        <div className="prov-name">
                          <strong>{row.displayName}</strong>
                          <span className="prov-mono">{row.providerKey}</span>
                        </div>
                      </td>
                      <td>
                        <div className="prov-caps">
                          {(row.capabilities || []).map((cap) => (
                            <span key={cap} className="prov-chip">
                              {CAPABILITY_LABEL[cap] || cap}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="prov-badge muted">
                          {STATUS_LABEL[row.catalogStatus || ""] ||
                            row.catalogStatus ||
                            "—"}
                        </span>
                        {row.archivedAt ? (
                          <span className="prov-badge warn" style={{ marginInlineStart: 6 }}>
                            مؤرشف
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`prov-badge ${
                            row.hasCredentials || row.envConfigured ? "ok" : "warn"
                          }`}
                        >
                          {row.hasCredentials || row.envConfigured ? "جاهزة" : "ناقصة"}
                        </span>
                      </td>
                      <td>{row.priority}</td>
                      <td>
                        <span className={`prov-badge ${row.enabled ? "ok" : "warn"}`}>
                          {row.enabled ? "مفعّل" : "متوقف"}
                        </span>
                      </td>
                      <td>
                        <div className="prov-actions">
                          <button
                            type="button"
                            className="prov-btn prov-btn-soft prov-btn-sm"
                            onClick={() => openEdit(row)}
                          >
                            إعدادات
                          </button>
                          {!row.archivedAt ? (
                            <button
                              type="button"
                              className="prov-btn prov-btn-soft prov-btn-sm"
                              onClick={() => void toggle(row)}
                            >
                              {row.enabled ? "إيقاف" : "تفعيل"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="prov-btn prov-btn-soft prov-btn-sm"
                            onClick={() => void archive(row)}
                          >
                            {row.archivedAt ? "استعادة" : "أرشفة"}
                          </button>
                          <button
                            type="button"
                            className="prov-btn prov-btn-danger prov-btn-sm"
                            onClick={() => void hardDelete(row)}
                          >
                            حذف نهائي
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {drawer ? (
          <div className="prov-drawer-backdrop" onClick={() => setDrawer(null)}>
            <aside
              className="prov-drawer"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="prov-drawer-head">
                <h4>{drawer === "create" ? "إنشاء مزود" : "إعدادات المزود"}</h4>
                <p>
                  {drawer === "create"
                    ? "نفس حقول الإعدادات — اختر المحرك وأدخل المفاتيح"
                    : `${editing?.displayName || ""} · ${editing?.providerKey || ""}`}
                </p>
              </div>
              <div className="prov-drawer-body">
                {drawer === "create" ? (
                  <label className="prov-field">
                    <span>نوع المزود</span>
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    >
                      {catalog.map((c) => (
                        <option key={c.providerKey} value={c.providerKey}>
                          {c.displayNameAr} · {STATUS_LABEL[c.status]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {selected || editing ? (
                  <p style={{ margin: 0, color: "#5c7078", fontSize: "0.86rem" }}>
                    {(selected || editing)?.notes ||
                      selected?.description ||
                      editing?.description ||
                      ""}
                  </p>
                ) : null}

                <div className="prov-grid-2">
                  <label className="prov-field">
                    <span>الاسم المعروض</span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </label>
                  <label className="prov-field">
                    <span>الأولوية (ترتيب العرض)</span>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>

                <label className="prov-field">
                  <span>التفعيل</span>
                  <select
                    value={enabled ? "1" : "0"}
                    onChange={(e) => setEnabled(e.target.value === "1")}
                  >
                    <option value="1">مفعّل — يدخل في البحث</option>
                    <option value="0">متوقف</option>
                  </select>
                </label>

                <div className="prov-grid-2">
                  {draftFields.length === 0 ? (
                    <p style={{ margin: 0, color: "#5c7078" }}>
                      لا يحتاج مفاتيح إضافية.
                    </p>
                  ) : (
                    draftFields.map((f) => (
                      <label key={f.key} className="prov-field">
                        <span>
                          {f.label}
                          {f.required ? " *" : ""}
                          {editing?.credentialHints?.[f.key]
                            ? ` · الحالي: ${editing.credentialHints[f.key]}`
                            : ""}
                        </span>
                        <input
                          type={f.secret ? "password" : "text"}
                          placeholder={f.placeholder || (f.secret ? "اتركه فارغًا للإبقاء" : "")}
                          value={credentials[f.key] || ""}
                          onChange={(e) =>
                            setCredentials({
                              ...credentials,
                              [f.key]: e.target.value,
                            })
                          }
                          autoComplete="off"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="prov-drawer-foot">
                <button
                  type="button"
                  className="prov-btn prov-btn-soft"
                  onClick={() => setDrawer(null)}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="prov-btn prov-btn-primary"
                  disabled={loading}
                  onClick={() => void saveProvider()}
                >
                  {loading ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
