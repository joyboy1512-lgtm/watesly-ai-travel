"use client";

import { useEffect, useMemo, useState } from "react";
import { SUPPORTED_CURRENCIES } from "@watesly-travel/shared";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { getPreferredCurrency } from "@/lib/currency";
import { formatMoneyMinor } from "@/lib/format";

type Conditions = {
  origins?: string[];
  destinations?: string[];
  cabinClasses?: string[];
  hotelStars?: string[];
  providers?: string[];
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
};

type Rule = {
  id: string;
  name: string;
  serviceType: string;
  ruleType: string;
  percentValue?: number | null;
  fixedAmount?: number | null;
  minProfitAmount?: number | null;
  currency?: string;
  isActive: boolean;
  priority: number;
  conditions?: Conditions | null;
};

type Provider = {
  id: string;
  providerKey: string;
  displayName: string;
  enabled: boolean;
};

const SERVICE_LABEL: Record<string, string> = {
  flight: "طيران",
  hotel: "فنادق",
  all: "الكل",
  car: "سيارات",
};

const RULE_LABEL: Record<string, string> = {
  percent: "نسبة",
  percent_with_min: "نسبة + حد أدنى",
  fixed: "مبلغ ثابت",
};

const CABIN_OPTIONS = [
  { value: "ECONOMY", label: "اقتصادي" },
  { value: "PREMIUM_ECONOMY", label: "اقتصادي مميز" },
  { value: "BUSINESS", label: "رجال أعمال" },
  { value: "FIRST", label: "أولى" },
];

const STAR_OPTIONS = [
  { value: "1", label: "★ 1" },
  { value: "2", label: "★★ 2" },
  { value: "3", label: "★★★ 3" },
  { value: "4", label: "★★★★ 4" },
  { value: "5", label: "★★★★★ 5" },
];

const emptyForm = {
  name: "قاعدة جديدة",
  serviceType: "flight",
  ruleType: "percent_with_min",
  percentValue: 12,
  minProfitMajor: 1.5,
  currency: "KWD",
  priority: 50,
  origins: "",
  destinations: "",
  cabinClasses: [] as string[],
  hotelStars: [] as string[],
  providers: [] as string[],
  minPrice: "",
  maxPrice: "",
  dateFrom: "",
  dateTo: "",
};

function csvToList(value: string): string[] {
  return value
    .split(/[,،\s]+/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function conditionsSummary(c?: Conditions | null): string {
  if (!c) return "—";
  const parts: string[] = [];
  if (c.origins?.length) parts.push(`من ${c.origins.join("/")}`);
  if (c.destinations?.length) parts.push(`إلى ${c.destinations.join("/")}`);
  if (c.cabinClasses?.length) {
    const labels = c.cabinClasses.map(
      (v) => CABIN_OPTIONS.find((o) => o.value === v)?.label || v,
    );
    parts.push(labels.join("/"));
  }
  if (c.hotelStars?.length) {
    parts.push(c.hotelStars.map((s) => `${s}★`).join("/"));
  }
  if (c.providers?.length) parts.push(c.providers.join("/"));
  if (c.minPrice != null) parts.push(`≥ ${c.minPrice}`);
  if (c.maxPrice != null) parts.push(`≤ ${c.maxPrice}`);
  if (c.dateFrom || c.dateTo) {
    parts.push(`${c.dateFrom || "…"} → ${c.dateTo || "…"}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export default function PricingPage() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState({
    ...emptyForm,
    currency: getPreferredCurrency(),
  });
  const [showConditions, setShowConditions] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [rules, providerRows] = await Promise.all([
      apiFetch<Rule[]>("/pricing-rules"),
      apiFetch<Provider[]>("/providers").catch(() => []),
    ]);
    setRows(rules);
    setProviders(providerRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const flight = rows.filter((r) => r.serviceType === "flight").length;
    const hotel = rows.filter((r) => r.serviceType === "hotel").length;
    return { total, active, flight, hotel };
  }, [rows]);

  const providerOptions = useMemo(() => {
    if (providers.length) {
      return providers.map((p) => ({
        value: p.providerKey.toUpperCase(),
        label: p.displayName || p.providerKey,
      }));
    }
    return [
      { value: "MOCK", label: "Mock" },
      { value: "DUFFEL", label: "Duffel" },
    ];
  }, [providers]);

  const showCabin = form.serviceType === "flight" || form.serviceType === "all";
  const showStars = form.serviceType === "hotel" || form.serviceType === "all";

  function minorFromMajor(major: number, currency: string) {
    const exp =
      currency === "KWD" ||
      currency === "BHD" ||
      currency === "OMR" ||
      currency === "JOD"
        ? 3
        : 2;
    return Math.round(major * 10 ** exp);
  }

  function buildConditions(): Conditions | null {
    const conditions: Conditions = {};
    const origins = csvToList(form.origins);
    const destinations = csvToList(form.destinations);
    if (origins.length) conditions.origins = origins;
    if (destinations.length) conditions.destinations = destinations;
    if (showCabin && form.cabinClasses.length) {
      conditions.cabinClasses = form.cabinClasses;
    }
    if (showStars && form.hotelStars.length) {
      conditions.hotelStars = form.hotelStars;
    }
    if (form.providers.length) conditions.providers = form.providers;
    if (form.minPrice !== "") conditions.minPrice = Number(form.minPrice);
    if (form.maxPrice !== "") conditions.maxPrice = Number(form.maxPrice);
    if (form.dateFrom) conditions.dateFrom = form.dateFrom;
    if (form.dateTo) conditions.dateTo = form.dateTo;
    return Object.keys(conditions).length ? conditions : null;
  }

  async function create() {
    setError("");
    setOk("");
    if (!form.name.trim()) {
      setError("اسم القاعدة مطلوب");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/pricing-rules", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          serviceType: form.serviceType,
          ruleType: form.ruleType,
          percentValue: form.percentValue,
          minProfitAmount: minorFromMajor(form.minProfitMajor, form.currency),
          currency: form.currency,
          priority: form.priority,
          conditions: buildConditions(),
        }),
      });
      setOk("تمت إضافة قاعدة التسعير");
      setForm({ ...emptyForm, currency: getPreferredCurrency() });
      setShowConditions(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإنشاء");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(row: Rule) {
    setError("");
    try {
      await apiFetch(`/pricing-rules/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحديث");
    }
  }

  async function syncCurrency() {
    setError("");
    setOk("");
    try {
      const result = await apiFetch<{ currency: string; updated: number }>(
        "/pricing-rules/sync-currency",
        {
          method: "POST",
          body: JSON.stringify({ currency: getPreferredCurrency() }),
        },
      );
      setForm((prev) => ({ ...prev, currency: result.currency }));
      setOk(`تم تحديث عملة ${result.updated} قاعدة إلى ${result.currency}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل مزامنة العملة");
    }
  }

  function onServiceChange(serviceType: string) {
    setForm((prev) => ({
      ...prev,
      serviceType,
      cabinClasses:
        serviceType === "hotel" ? [] : prev.cabinClasses,
      hotelStars: serviceType === "flight" ? [] : prev.hotelStars,
    }));
  }

  return (
    <AppShell title="قواعد التسعير">
      <div className="prc-suite">
        <section className="prc-hero">
          <div>
            <p className="prc-kicker">Pricing Rules</p>
            <h3>قواعد التسعير والأرباح</h3>
            <p>
              أول قاعدة مطابقة حسب الأولوية تُطبَّق على نتيجة الاستعلام: المسار،
              الدرجة أو النجوم، والمزود.
            </p>
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void syncCurrency()}
          >
            مزامنة العملة
          </button>
        </section>

        <section className="prc-stats">
          <article className="prc-stat">
            <span>الإجمالي</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="prc-stat">
            <span>نشطة</span>
            <strong>{stats.active}</strong>
          </article>
          <article className="prc-stat">
            <span>طيران</span>
            <strong>{stats.flight}</strong>
          </article>
          <article className="prc-stat">
            <span>فنادق</span>
            <strong>{stats.hotel}</strong>
          </article>
        </section>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        <section className="prc-card prc-new">
          <div className="prc-card-head">
            <h4>قاعدة جديدة</h4>
            <p>أدخل الأساسيات في صف واحد ثم احفظ</p>
          </div>

          <div className="prc-row prc-row-name">
            <label className="prc-field grow">
              <span>اسم القاعدة</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="قاعدة طيران عامة"
              />
            </label>
            <label className="prc-field sm">
              <span>الأولوية</span>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) || 0 })
                }
              />
            </label>
          </div>

          <div className="prc-row prc-row-core">
            <label className="prc-field">
              <span>نوع الخدمة</span>
              <select
                value={form.serviceType}
                onChange={(e) => onServiceChange(e.target.value)}
              >
                <option value="flight">طيران</option>
                <option value="hotel">فنادق</option>
                <option value="all">الكل</option>
              </select>
            </label>
            <label className="prc-field">
              <span>نوع القاعدة</span>
              <select
                value={form.ruleType}
                onChange={(e) =>
                  setForm({ ...form, ruleType: e.target.value })
                }
              >
                <option value="percent">نسبة فقط</option>
                <option value="percent_with_min">نسبة + حد أدنى</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </label>
            <label className="prc-field">
              <span>نسبة الهامش %</span>
              <input
                type="number"
                value={form.percentValue}
                onChange={(e) =>
                  setForm({
                    ...form,
                    percentValue: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
          </div>

          <div className="prc-row prc-row-money">
            <label className="prc-field">
              <span>الحد الأدنى للربح</span>
              <input
                type="number"
                step="0.001"
                value={form.minProfitMajor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minProfitMajor: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label className="prc-field">
              <span>العملة</span>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="prc-field prc-actions-inline">
              <span>&nbsp;</span>
              <div className="prc-inline-btns">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowConditions((v) => !v)}
                >
                  {showConditions ? "إخفاء الشروط" : "شروط اختيارية"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={loading}
                  onClick={() => void create()}
                >
                  {loading ? "جارٍ الإضافة..." : "إضافة قاعدة"}
                </button>
              </div>
            </div>
          </div>

          {showConditions ? (
            <div className="prc-conditions">
              <div className="prc-row prc-row-4">
                <label className="prc-field">
                  <span>مطارات المغادرة</span>
                  <input
                    placeholder="KWI, DXB"
                    value={form.origins}
                    onChange={(e) =>
                      setForm({ ...form, origins: e.target.value })
                    }
                  />
                </label>
                <label className="prc-field">
                  <span>الوجهات</span>
                  <input
                    placeholder="IST, CAI"
                    value={form.destinations}
                    onChange={(e) =>
                      setForm({ ...form, destinations: e.target.value })
                    }
                  />
                </label>

                {showCabin ? (
                  <label className="prc-field">
                    <span>درجات السفر</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        setForm({
                          ...form,
                          cabinClasses: toggleInList(form.cabinClasses, v),
                        });
                      }}
                    >
                      <option value="">اختر درجة...</option>
                      {CABIN_OPTIONS.map((o) => (
                        <option
                          key={o.value}
                          value={o.value}
                          disabled={form.cabinClasses.includes(o.value)}
                        >
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {form.cabinClasses.length ? (
                      <div className="prc-chips">
                        {form.cabinClasses.map((v) => (
                          <button
                            key={v}
                            type="button"
                            className="prc-chip"
                            onClick={() =>
                              setForm({
                                ...form,
                                cabinClasses: form.cabinClasses.filter(
                                  (x) => x !== v,
                                ),
                              })
                            }
                          >
                            {CABIN_OPTIONS.find((o) => o.value === v)?.label ||
                              v}{" "}
                            ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                ) : null}

                {showStars ? (
                  <label className="prc-field">
                    <span>تقييم الفندق (نجوم)</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        setForm({
                          ...form,
                          hotelStars: toggleInList(form.hotelStars, v),
                        });
                      }}
                    >
                      <option value="">اختر النجوم...</option>
                      {STAR_OPTIONS.map((o) => (
                        <option
                          key={o.value}
                          value={o.value}
                          disabled={form.hotelStars.includes(o.value)}
                        >
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {form.hotelStars.length ? (
                      <div className="prc-chips">
                        {form.hotelStars.map((v) => (
                          <button
                            key={v}
                            type="button"
                            className="prc-chip"
                            onClick={() =>
                              setForm({
                                ...form,
                                hotelStars: form.hotelStars.filter(
                                  (x) => x !== v,
                                ),
                              })
                            }
                          >
                            {v}★ ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                ) : null}

                <label className="prc-field">
                  <span>المزودون</span>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      setForm({
                        ...form,
                        providers: toggleInList(form.providers, v),
                      });
                    }}
                  >
                    <option value="">اختر مزودًا...</option>
                    {providerOptions.map((o) => (
                      <option
                        key={o.value}
                        value={o.value}
                        disabled={form.providers.includes(o.value)}
                      >
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {form.providers.length ? (
                    <div className="prc-chips">
                      {form.providers.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="prc-chip"
                          onClick={() =>
                            setForm({
                              ...form,
                              providers: form.providers.filter((x) => x !== v),
                            })
                          }
                        >
                          {providerOptions.find((o) => o.value === v)?.label ||
                            v}{" "}
                          ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
              </div>

              <div className="prc-row prc-row-4">
                <label className="prc-field">
                  <span>أقل سعر تكلفة</span>
                  <input
                    type="number"
                    step="0.001"
                    value={form.minPrice}
                    onChange={(e) =>
                      setForm({ ...form, minPrice: e.target.value })
                    }
                  />
                </label>
                <label className="prc-field">
                  <span>أعلى سعر تكلفة</span>
                  <input
                    type="number"
                    step="0.001"
                    value={form.maxPrice}
                    onChange={(e) =>
                      setForm({ ...form, maxPrice: e.target.value })
                    }
                  />
                </label>
                <label className="prc-field">
                  <span>من تاريخ</span>
                  <input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) =>
                      setForm({ ...form, dateFrom: e.target.value })
                    }
                  />
                </label>
                <label className="prc-field">
                  <span>إلى تاريخ</span>
                  <input
                    type="date"
                    value={form.dateTo}
                    onChange={(e) =>
                      setForm({ ...form, dateTo: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}
        </section>

        <section className="prc-card">
          <div className="prc-list-head">
            <h4>القواعد الحالية</h4>
            <span>{rows.length} قاعدة</span>
          </div>

          {rows.length === 0 ? (
            <div className="cust-empty">
              <strong>لا قواعد بعد</strong>
              <p>أضف أول قاعدة من النموذج أعلاه.</p>
            </div>
          ) : (
            <div className="cust-table-scroll">
              <table className="cust-table prc-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الخدمة</th>
                    <th>النوع</th>
                    <th>الهامش</th>
                    <th>حد أدنى</th>
                    <th>الشروط</th>
                    <th>الأولوية</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.isActive ? "" : "prc-row-off"}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>
                        {SERVICE_LABEL[row.serviceType] || row.serviceType}
                      </td>
                      <td>{RULE_LABEL[row.ruleType] || row.ruleType}</td>
                      <td>
                        {row.percentValue != null
                          ? `${row.percentValue}%`
                          : "—"}
                      </td>
                      <td>
                        {row.minProfitAmount != null
                          ? formatMoneyMinor(
                              row.minProfitAmount,
                              row.currency || "KWD",
                            )
                          : "—"}
                      </td>
                      <td className="prc-cond-cell">
                        {conditionsSummary(row.conditions)}
                      </td>
                      <td>{row.priority}</td>
                      <td>
                        <span
                          className={`wa-badge ${row.isActive ? "ok" : "warn"}`}
                        >
                          {row.isActive ? "نشطة" : "معطّلة"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="wa-mini-btn"
                          onClick={() => void toggle(row)}
                        >
                          {row.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
