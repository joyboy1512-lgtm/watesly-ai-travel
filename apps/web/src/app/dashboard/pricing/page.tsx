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

type Airport = {
  iataCode?: string | null;
  city?: string | null;
  name?: string | null;
  country?: string | null;
};

type CityRow = {
  city?: string | null;
  country?: string | null;
  iataCode?: string | null;
};

type Option = { value: string; label: string };

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

const CABIN_OPTIONS: Option[] = [
  { value: "ECONOMY", label: "اقتصادي" },
  { value: "PREMIUM_ECONOMY", label: "اقتصادي مميز" },
  { value: "BUSINESS", label: "رجال أعمال" },
  { value: "FIRST", label: "أولى" },
];

const STAR_OPTIONS: Option[] = [
  { value: "1", label: "★ 1" },
  { value: "2", label: "★★ 2" },
  { value: "3", label: "★★★ 3" },
  { value: "4", label: "★★★★ 4" },
  { value: "5", label: "★★★★★ 5" },
];

const FALLBACK_AIRPORTS: Option[] = [
  { value: "KWI", label: "KWI · الكويت" },
  { value: "DXB", label: "DXB · دبي" },
  { value: "AUH", label: "AUH · أبوظبي" },
  { value: "DOH", label: "DOH · الدوحة" },
  { value: "BAH", label: "BAH · البحرين" },
  { value: "RUH", label: "RUH · الرياض" },
  { value: "JED", label: "JED · جدة" },
  { value: "CAI", label: "CAI · القاهرة" },
  { value: "IST", label: "IST · إسطنبول" },
  { value: "LHR", label: "LHR · لندن" },
  { value: "CDG", label: "CDG · باريس" },
  { value: "FRA", label: "FRA · فرانكفورت" },
  { value: "AMM", label: "AMM · عمّان" },
  { value: "BEY", label: "BEY · بيروت" },
  { value: "MCT", label: "MCT · مسقط" },
];

const FALLBACK_CITIES: Option[] = [
  { value: "KUWAIT", label: "الكويت" },
  { value: "DUBAI", label: "دبي" },
  { value: "ABU DHABI", label: "أبوظبي" },
  { value: "DOHA", label: "الدوحة" },
  { value: "MANAMA", label: "المنامة" },
  { value: "RIYADH", label: "الرياض" },
  { value: "JEDDAH", label: "جدة" },
  { value: "CAIRO", label: "القاهرة" },
  { value: "ISTANBUL", label: "إسطنبول" },
  { value: "LONDON", label: "لندن" },
  { value: "PARIS", label: "باريس" },
  { value: "AMMAN", label: "عمّان" },
  { value: "BEIRUT", label: "بيروت" },
  { value: "MUSCAT", label: "مسقط" },
];

const emptyForm = {
  name: "قاعدة جديدة",
  serviceType: "flight",
  ruleType: "percent_with_min",
  percentValue: 12,
  minProfitMajor: 1.5,
  currency: "KWD",
  priority: 50,
  origins: [] as string[],
  destinations: [] as string[],
  cabinClasses: [] as string[],
  hotelStars: [] as string[],
  providers: [] as string[],
  minPrice: "",
  maxPrice: "",
  dateFrom: "",
  dateTo: "",
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function optionLabel(options: Option[], value: string) {
  return options.find((o) => o.value === value)?.label || value;
}

function conditionsSummary(
  c: Conditions | null | undefined,
  airportOpts: Option[],
  cityOpts: Option[],
): string {
  if (!c) return "—";
  const parts: string[] = [];
  if (c.origins?.length) {
    parts.push(
      `من ${c.origins.map((v) => optionLabel(airportOpts, v)).join(" / ")}`,
    );
  }
  if (c.destinations?.length) {
    parts.push(
      `إلى ${c.destinations
        .map((v) => optionLabel([...airportOpts, ...cityOpts], v))
        .join(" / ")}`,
    );
  }
  if (c.cabinClasses?.length) {
    parts.push(
      c.cabinClasses
        .map((v) => CABIN_OPTIONS.find((o) => o.value === v)?.label || v)
        .join("/"),
    );
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

function SelectChips({
  label,
  placeholder,
  options,
  selected,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  selected: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  return (
    <label className="prc-field">
      <span>{label}</span>
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          onAdd(v);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            disabled={selected.includes(o.value)}
          >
            {o.label}
          </option>
        ))}
      </select>
      {selected.length ? (
        <div className="prc-chips">
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              className="prc-chip"
              onClick={() => onRemove(v)}
            >
              {optionLabel(options, v)} ×
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

export default function PricingPage() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [airports, setAirports] = useState<Option[]>(FALLBACK_AIRPORTS);
  const [cities, setCities] = useState<Option[]>(FALLBACK_CITIES);
  const [form, setForm] = useState({
    ...emptyForm,
    currency: getPreferredCurrency(),
  });
  const [showConditions, setShowConditions] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMeta() {
    const [airportRows, cityRows] = await Promise.all([
      apiFetch<Airport[]>("/travel-meta/airports?limit=60").catch(() => []),
      apiFetch<CityRow[]>("/travel-meta/cities").catch(() => []),
    ]);

    if (airportRows.length) {
      const opts = airportRows
        .filter((a) => a.iataCode)
        .map((a) => ({
          value: String(a.iataCode).toUpperCase(),
          label: `${String(a.iataCode).toUpperCase()} · ${a.city || a.name || a.iataCode}`,
        }));
      const seen = new Set<string>();
      setAirports(
        opts.filter((o) => {
          if (seen.has(o.value)) return false;
          seen.add(o.value);
          return true;
        }),
      );
    }

    if (cityRows.length) {
      const opts = cityRows
        .filter((c) => c.city)
        .map((c) => ({
          value: String(c.city).trim().toUpperCase(),
          label: c.country ? `${c.city} · ${c.country}` : String(c.city),
        }));
      const seen = new Set<string>();
      setCities(
        opts.filter((o) => {
          if (seen.has(o.value)) return false;
          seen.add(o.value);
          return true;
        }),
      );
    }
  }

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
    loadMeta().catch(() => undefined);
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

  const isFlight = form.serviceType === "flight";
  const isHotel = form.serviceType === "hotel";
  const isAll = form.serviceType === "all";
  const showOrigins = isFlight || isAll;
  const showCabin = isFlight || isAll;
  const showStars = isHotel || isAll;
  const destinationOptions = isHotel ? cities : airports;
  const destinationLabel = isHotel
    ? "وجهة الفندق (مدينة)"
    : isAll
      ? "الوجهات (مطارات)"
      : "مطارات الوصول";
  const destinationPlaceholder = isHotel
    ? "اختر مدينة..."
    : "اختر مطار وصول...";

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
    if (showOrigins && form.origins.length) conditions.origins = form.origins;
    if (form.destinations.length) conditions.destinations = form.destinations;
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
      origins: serviceType === "hotel" ? [] : prev.origins,
      destinations: [],
      cabinClasses: serviceType === "hotel" ? [] : prev.cabinClasses,
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
                {showOrigins ? (
                  <SelectChips
                    label="مطارات المغادرة"
                    placeholder="اختر مطار مغادرة..."
                    options={airports}
                    selected={form.origins}
                    onAdd={(v) =>
                      setForm({
                        ...form,
                        origins: toggleInList(form.origins, v),
                      })
                    }
                    onRemove={(v) =>
                      setForm({
                        ...form,
                        origins: form.origins.filter((x) => x !== v),
                      })
                    }
                  />
                ) : null}

                <SelectChips
                  label={destinationLabel}
                  placeholder={destinationPlaceholder}
                  options={destinationOptions}
                  selected={form.destinations}
                  onAdd={(v) =>
                    setForm({
                      ...form,
                      destinations: toggleInList(form.destinations, v),
                    })
                  }
                  onRemove={(v) =>
                    setForm({
                      ...form,
                      destinations: form.destinations.filter((x) => x !== v),
                    })
                  }
                />

                {showCabin ? (
                  <SelectChips
                    label="درجات السفر"
                    placeholder="اختر درجة..."
                    options={CABIN_OPTIONS}
                    selected={form.cabinClasses}
                    onAdd={(v) =>
                      setForm({
                        ...form,
                        cabinClasses: toggleInList(form.cabinClasses, v),
                      })
                    }
                    onRemove={(v) =>
                      setForm({
                        ...form,
                        cabinClasses: form.cabinClasses.filter((x) => x !== v),
                      })
                    }
                  />
                ) : null}

                {showStars ? (
                  <SelectChips
                    label="تقييم الفندق (نجوم)"
                    placeholder="اختر النجوم..."
                    options={STAR_OPTIONS}
                    selected={form.hotelStars}
                    onAdd={(v) =>
                      setForm({
                        ...form,
                        hotelStars: toggleInList(form.hotelStars, v),
                      })
                    }
                    onRemove={(v) =>
                      setForm({
                        ...form,
                        hotelStars: form.hotelStars.filter((x) => x !== v),
                      })
                    }
                  />
                ) : null}

                <SelectChips
                  label="المزودون"
                  placeholder="اختر مزودًا..."
                  options={providerOptions}
                  selected={form.providers}
                  onAdd={(v) =>
                    setForm({
                      ...form,
                      providers: toggleInList(form.providers, v),
                    })
                  }
                  onRemove={(v) =>
                    setForm({
                      ...form,
                      providers: form.providers.filter((x) => x !== v),
                    })
                  }
                />
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
                    <tr
                      key={row.id}
                      className={row.isActive ? "" : "prc-row-off"}
                    >
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
                        {conditionsSummary(row.conditions, airports, cities)}
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
