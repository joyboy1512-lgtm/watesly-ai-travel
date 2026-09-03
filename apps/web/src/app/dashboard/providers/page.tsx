"use client";

import "../../prc-suite.css";
import "../../customers-crm.css";

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
  credentialHints?: Record<string, string>;
};

const CAPABILITY_LABEL: Record<string, string> = {
  flight: "طيران",
  hotel: "فنادق",
  transfer: "مواصلات",
  activity: "أنشطة",
};

const STATUS_LABEL: Record<string, string> = {
  live: "حي",
  ready: "جاهز للتفعيل",
  scaffold: "هيكل جاهز",
};

export default function ProvidersPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("hotelbeds");
  const [displayName, setDisplayName] = useState("");
  const [priority, setPriority] = useState(50);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const selected = useMemo(
    () => catalog.find((c) => c.providerKey === selectedKey) || null,
    [catalog, selectedKey],
  );

  async function load() {
    const [c, r] = await Promise.all([
      apiFetch<CatalogEntry[]>("/providers/catalog"),
      apiFetch<ProviderRow[]>("/providers"),
    ]);
    setCatalog(c);
    setRows(r);
    if (!selectedKey && c[0]) setSelectedKey(c[0].providerKey);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDisplayName(selected.displayNameAr);
    const next: Record<string, string> = {};
    for (const f of selected.credentialFields) next[f.key] = "";
    setCredentials(next);
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProvider() {
    if (!selected) return;
    setError("");
    setOk("");
    setLoading(true);
    try {
      await apiFetch("/providers", {
        method: "POST",
        body: JSON.stringify({
          providerKey: selected.providerKey,
          displayName: displayName.trim() || selected.displayNameAr,
          enabled: true,
          priority,
          credentials,
        }),
      });
      setOk(`تم حفظ مزود ${selected.displayNameAr}`);
      setCredentials((prev) => {
        const cleared = { ...prev };
        for (const k of Object.keys(cleared)) cleared[k] = "";
        return cleared;
      });
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

  return (
    <AppShell title="مزودو السفر">
      <div className="prc-suite">
        <section className="prc-hero">
          <div>
            <p className="prc-kicker">Travel Providers</p>
            <h3>مزودو السفر</h3>
            <p>
              جهّز ربط Amadeus وTravelport وTravelfusion وDuffel، ومزودي
              Hotelbeds للفنادق والمواصلات بشكل منفصل. الصلاحية المطلوبة: إدارة
              مزودي السفر.
            </p>
          </div>
        </section>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        <section className="prc-card">
          <div className="prc-card-head">
            <h4>كتالوج المزودين</h4>
            <p>كل API يظهر لوحده. اضغط البطاقة لإدخال المفاتيح أو التحديث</p>
          </div>
          <div className="prc-row prc-row-4" style={{ alignItems: "stretch" }}>
            {catalog.map((c) => {
              const saved = rows.find((r) => r.providerKey === c.providerKey);
              const active = selectedKey === c.providerKey;
              return (
                <button
                  key={c.providerKey}
                  type="button"
                  className="prc-card"
                  onClick={() => setSelectedKey(c.providerKey)}
                  style={{
                    textAlign: "start",
                    cursor: "pointer",
                    border: active ? "2px solid #0f3340" : undefined,
                    margin: 0,
                  }}
                >
                  <strong>{c.displayNameAr}</strong>
                  <p className="hint" style={{ margin: "0.35rem 0 0.5rem" }}>
                    {(c.capabilities || [])
                      .map((cap) => CAPABILITY_LABEL[cap] || cap)
                      .join(" · ")}
                  </p>
                  <span className={`wa-badge ${c.envConfigured ? "ok" : "warn"}`}>
                    {c.envConfigured ? "مفاتيح السيرفر جاهزة" : "بانتظار المفاتيح"}
                  </span>
                  {saved ? (
                    <span
                      className={`wa-badge ${saved.enabled ? "ok" : "warn"}`}
                      style={{ marginInlineStart: 6 }}
                    >
                      {saved.enabled ? "مفعّل" : "متوقف"}
                    </span>
                  ) : (
                    <span className="wa-badge warn" style={{ marginInlineStart: 6 }}>
                      غير مضاف
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="prc-card">
          <div className="prc-card-head">
            <h4>حفظ مفاتيح المزود المحدد</h4>
            <p>
              {selected
                ? `${selected.displayNameAr} — ${selected.description}`
                : "اختر مزودًا من البطاقات أعلاه"}
            </p>
          </div>
          <div className="prc-row prc-row-core">
            <label className="prc-field">
              <span>المزود</span>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                {catalog.map((c) => (
                  <option key={c.providerKey} value={c.providerKey}>
                    {c.displayNameAr} · {STATUS_LABEL[c.status] || c.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="prc-field">
              <span>الاسم المعروض</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label className="prc-field">
              <span>الأولوية</span>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          {selected ? (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                {selected.description}
                {selected.notes ? ` — ${selected.notes}` : ""}
              </p>
              <div className="prc-row prc-row-4">
                {selected.credentialFields.length === 0 ? (
                  <p className="hint">لا يحتاج مفاتيح إضافية.</p>
                ) : (
                  selected.credentialFields.map((f) => (
                    <label key={f.key} className="prc-field">
                      <span>
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      <input
                        type={f.secret ? "password" : "text"}
                        placeholder={f.placeholder || ""}
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
              <div className="cust-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={loading}
                  onClick={() => void saveProvider()}
                >
                  {loading ? "جارٍ الحفظ..." : "حفظ / تحديث المزود"}
                </button>
                <span className="hint">
                  الحالة: {STATUS_LABEL[selected.status]} · ENV:{" "}
                  {selected.envConfigured ? "مُعدّ على السيرفر" : "غير مُعدّ بعد"}
                </span>
              </div>
            </>
          ) : null}
        </section>

        <section className="prc-card">
          <div className="prc-list-head">
            <h4>المزودون المضافون للمؤسسة</h4>
            <span>{rows.length}</span>
          </div>
          {rows.length === 0 ? (
            <div className="cust-empty">
              <strong>لا مزودين بعد</strong>
              <p>أضف Amadeus أو Travelfusion من النموذج أعلاه.</p>
            </div>
          ) : (
            <div className="cust-table-scroll">
              <table className="cust-table prc-table">
                <thead>
                  <tr>
                    <th>المفتاح</th>
                    <th>الاسم</th>
                    <th>الحالة التقنية</th>
                    <th>مفاتيح</th>
                    <th>الأولوية</th>
                    <th>التفعيل</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="cust-mono">{row.providerKey}</td>
                      <td>
                        <strong>{row.displayName}</strong>
                        {row.capabilities?.length ? (
                          <div className="hint">
                            {row.capabilities.join(" · ")}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="wa-pill soft">
                          {STATUS_LABEL[row.catalogStatus || ""] ||
                            row.catalogStatus ||
                            "—"}
                        </span>
                      </td>
                      <td>
                        {row.hasCredentials || row.envConfigured
                          ? "موجودة"
                          : "ناقصة"}
                      </td>
                      <td>{row.priority}</td>
                      <td>
                        <span
                          className={`wa-badge ${row.enabled ? "ok" : "warn"}`}
                        >
                          {row.enabled ? "مفعّل" : "متوقف"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="wa-mini-btn"
                          onClick={() => void toggle(row)}
                        >
                          {row.enabled ? "إيقاف" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="prc-card">
          <div className="prc-card-head">
            <h4>تفعيل البحث الحي على السيرفر</h4>
            <p>
              بعد حفظ المفاتيح، عيّن المتغيرات ثم أعد تشغيل API. للطيران منخفض
              التكلفة والداخلي استخدم Travelfusion.
            </p>
          </div>
          <pre className="hint" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
{`# أمثلة .env
FLIGHT_PROVIDER=amadeus          # أو travelport | travelfusion | duffel | mock
HOTEL_PROVIDER=hotelbeds         # فنادق Hotelbeds فقط
HOTELBEDS_API_KEY=...
HOTELBEDS_API_SECRET=...
HOTELBEDS_BASE_URL=https://api.test.hotelbeds.com
TRANSFER_PROVIDER=hotelbeds-transfers   # مواصلات Hotelbeds — API منفصل
HOTELBEDS_TRANSFER_API_KEY=...
HOTELBEDS_TRANSFER_API_SECRET=...
HOTELBEDS_TRANSFER_BASE_URL=https://api.test.hotelbeds.com
ACTIVITY_PROVIDER=hotelbeds-activities  # أنشطة Hotelbeds — API منفصل
HOTELBEDS_ACTIVITY_API_KEY=...
HOTELBEDS_ACTIVITY_API_SECRET=...
HOTELBEDS_ACTIVITY_BASE_URL=https://api.test.hotelbeds.com
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
AMADEUS_HOSTNAME=test.api.amadeus.com
TRAVELPORT_USER=...
TRAVELPORT_PASSWORD=...
TRAVELPORT_TARGET_BRANCH=...
TRAVELFUSION_USERNAME=...
TRAVELFUSION_PASSWORD=...
DUFFEL_ACCESS_TOKEN=...`}
          </pre>
        </section>
      </div>
    </AppShell>
  );
}
