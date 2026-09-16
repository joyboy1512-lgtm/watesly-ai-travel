"use client";

import "./cms-suite.css";

import { FormEvent, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import {
  writeHeroServices,
} from "@/lib/hero-services";
import type {
  CmsArticle,
  CmsBanner,
  CmsFaq,
  CmsHeroService,
  CmsState,
  DestinationGuide,
  WeekendDeal,
} from "@watesly-travel/shared";

type Tab = "overview" | "deals" | "banners" | "faqs" | "articles" | "search";

type AdminStats = {
  today: Record<string, number>;
  topDestinations: Array<{ label: string; count: number }>;
  funnel: Record<string, number>;
};

const INCLUDE_OPTS: Array<{ key: WeekendDeal["includes"][number]; label: string }> = [
  { key: "flight", label: "طيران" },
  { key: "hotel", label: "فندق" },
  { key: "transfer", label: "نقل" },
  { key: "activity", label: "نشاط" },
];

const FUNNEL_LABEL: Record<string, string> = {
  visits: "زيارات",
  searches: "بحث",
  selected: "اختيار",
  checkoutStarted: "بدء الدفع",
  paid: "مدفوع",
};

const emptyDeal = {
  titleAr: "",
  titleEn: "",
  slug: "",
  destinationSlug: "dubai",
  city: "دبي",
  countryFlag: "🇦🇪",
  image: "/media/destinations/dubai.jpg?v=1",
  includes: ["flight", "hotel"] as WeekendDeal["includes"],
  original: "229",
  sale: "199",
  nights: "3",
  currency: "KWD",
  active: true,
  startAt: "",
  endAt: "",
  descriptionAr: "",
  descriptionEn: "",
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function money(minor: number, currency = "KWD") {
  return `${(minor / 1000).toFixed(3)} ${currency}`;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export default function DashboardCmsPage() {
  const [tab, setTab] = useState<Tab>("deals");
  const [deals, setDeals] = useState<WeekendDeal[]>([]);
  const [cms, setCms] = useState<CmsState | null>(null);
  const [destinations, setDestinations] = useState<DestinationGuide[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [dealForm, setDealForm] = useState(emptyDeal);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    const [dealRows, cmsState, destRows] = await Promise.all([
      apiFetch<WeekendDeal[]>("/shop/platform/admin/deals").catch(() =>
        apiFetch<WeekendDeal[]>("/shop/platform/deals"),
      ),
      apiFetch<CmsState>("/shop/platform/cms"),
      apiFetch<DestinationGuide[]>("/shop/platform/destinations").catch(() => []),
    ]);
    setDeals(dealRows);
    setCms(cmsState);
    setDestinations(destRows);
    apiFetch<AdminStats>("/shop/platform/admin/stats")
      .then(setStats)
      .catch(() => undefined);
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      deals: deals.length,
      activeDeals: deals.filter((d) => d.active).length,
      banners: cms?.banners.length ?? 0,
      faqs: cms?.faqs.length ?? 0,
      articles: cms?.articles.filter((a) => a.published).length ?? 0,
    }),
    [deals, cms],
  );

  const filteredDeals = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return deals;
    return deals.filter((d) =>
      [d.titleAr, d.titleEn, d.slug, d.city, d.destinationSlug]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [deals, q]);

  function flash(message: string) {
    setOk(message);
    setError("");
  }

  function fail(err: unknown) {
    setError(err instanceof Error ? err.message : "فشل الحفظ");
    setOk("");
  }

  function applyDestination(slug: string) {
    const dest = destinations.find((d) => d.slug === slug);
    setDealForm((prev) => ({
      ...prev,
      destinationSlug: slug,
      city: dest?.nameAr || prev.city,
      countryFlag: dest?.flag || prev.countryFlag,
      image: dest?.image || prev.image,
      slug: prev.slug || (dest ? `${dest.slug}-weekend` : prev.slug),
      titleEn: prev.titleEn || (dest ? `${dest.nameEn} Weekend` : prev.titleEn),
    }));
  }

  function startCreateDeal() {
    const dest = destinations[0];
    setEditingSlug(null);
    setDealForm({
      ...emptyDeal,
      destinationSlug: dest?.slug || "dubai",
      city: dest?.nameAr || "دبي",
      countryFlag: dest?.flag || "🇦🇪",
      image: dest?.image || emptyDeal.image,
      slug: dest ? `${dest.slug}-weekend` : "",
    });
    setShowDealForm(true);
    setTab("deals");
  }

  function startEditDeal(deal: WeekendDeal) {
    setEditingSlug(deal.slug);
    setDealForm({
      titleAr: deal.titleAr,
      titleEn: deal.titleEn,
      slug: deal.slug,
      destinationSlug: deal.destinationSlug,
      city: deal.city,
      countryFlag: deal.countryFlag,
      image: deal.image,
      includes: deal.includes,
      original: String((deal.originalPriceMinor || 0) / 1000),
      sale: String((deal.salePriceMinor || 0) / 1000),
      nights: String(deal.nights || 1),
      currency: deal.currency || "KWD",
      active: deal.active,
      startAt: toDateInput(deal.startAt),
      endAt: toDateInput(deal.endAt),
      descriptionAr: deal.descriptionAr,
      descriptionEn: deal.descriptionEn,
    });
    setShowDealForm(true);
    setTab("deals");
  }

  async function saveDeal(e: FormEvent) {
    e.preventDefault();
    const slug = dealForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) {
      setError("أدخل slug بالإنجليزية مثل dubai-weekend");
      return;
    }
    const payload: WeekendDeal = {
      id: editingSlug ? deals.find((d) => d.slug === editingSlug)?.id || `deal-${slug}` : `deal-${slug}`,
      slug,
      destinationSlug: dealForm.destinationSlug,
      titleAr: dealForm.titleAr.trim(),
      titleEn: dealForm.titleEn.trim() || dealForm.titleAr.trim(),
      countryFlag: dealForm.countryFlag,
      city: dealForm.city.trim(),
      image: dealForm.image.trim(),
      includes: dealForm.includes,
      originalPriceMinor: Math.round(Number(dealForm.original || 0) * 1000),
      salePriceMinor: Math.round(Number(dealForm.sale || 0) * 1000),
      currency: dealForm.currency || "KWD",
      nights: Math.max(1, Number(dealForm.nights) || 1),
      active: dealForm.active,
      startAt: dealForm.startAt || undefined,
      endAt: dealForm.endAt || undefined,
      descriptionAr: dealForm.descriptionAr.trim() || dealForm.titleAr.trim(),
      descriptionEn: dealForm.descriptionEn.trim() || dealForm.titleEn.trim() || dealForm.titleAr.trim(),
    };
    try {
      const saved = await apiFetch<WeekendDeal>("/shop/platform/cms/deals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDeals((prev) => {
        const rest = prev.filter((d) => d.slug !== saved.slug && d.slug !== editingSlug);
        return [saved, ...rest];
      });
      setShowDealForm(false);
      flash(editingSlug ? "تم تحديث العرض" : "تم حفظ العرض — يظهر على /deals");
    } catch (err) {
      fail(err);
    }
  }

  async function toggleDeal(deal: WeekendDeal) {
    try {
      const saved = await apiFetch<WeekendDeal>("/shop/platform/cms/deals", {
        method: "POST",
        body: JSON.stringify({ ...deal, active: !deal.active }),
      });
      setDeals((prev) => prev.map((d) => (d.slug === saved.slug ? saved : d)));
      flash(saved.active ? "العرض ظاهر في الموقع" : "تم إخفاء العرض");
    } catch (err) {
      fail(err);
    }
  }

  async function removeDeal(slug: string) {
    if (!window.confirm("حذف هذا العرض؟")) return;
    try {
      await apiFetch(`/shop/platform/cms/deals/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      setDeals((prev) => prev.filter((d) => d.slug !== slug));
      flash("تم حذف العرض");
    } catch (err) {
      fail(err);
    }
  }

  async function saveCms(patch: Partial<CmsState>, message: string) {
    try {
      const next = await apiFetch<CmsState>("/shop/platform/cms", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setCms(next);
      if (next.heroServices?.length) writeHeroServices(next.heroServices);
      flash(message);
    } catch (err) {
      fail(err);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "نظرة عامة" },
    { id: "deals", label: "العروض" },
    { id: "banners", label: "البانرات" },
    { id: "faqs", label: "الأسئلة" },
    { id: "articles", label: "المقالات" },
    { id: "search", label: "تبويبات البحث" },
  ];

  return (
    <AppShell title="CMS · المحتوى">
      <div className="cms-suite">
        <section className="cms-hero">
          <div>
            <h3>محتوى WeekendGate</h3>
            <p>
              إدارة العروض والبانرات والأسئلة والمقالات وتبويبات البحث من مكان واحد.
              العروض المنشورة تظهر على{" "}
              <a href="/deals" target="_blank" rel="noreferrer">
                /deals
              </a>
              .
            </p>
          </div>
          <div className="cms-actions">
            <button type="button" className="cms-btn primary" onClick={startCreateDeal}>
              عرض جديد
            </button>
          </div>
        </section>

        <section className="cms-stats">
          <div className="cms-stat">
            <span>العروض</span>
            <strong>{counts.deals}</strong>
          </div>
          <div className="cms-stat">
            <span>منشورة</span>
            <strong>{counts.activeDeals}</strong>
          </div>
          <div className="cms-stat">
            <span>بانرات / أسئلة</span>
            <strong>
              {counts.banners} / {counts.faqs}
            </strong>
          </div>
          <div className="cms-stat">
            <span>مقالات منشورة</span>
            <strong>{counts.articles}</strong>
          </div>
        </section>

        {error ? <div className="cms-banner err">{error}</div> : null}
        {ok ? <div className="cms-banner ok">{ok}</div> : null}

        <nav className="cms-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cms-tab${tab === item.id ? " is-on" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {loading ? <p className="cms-empty">جارٍ تحميل المحتوى…</p> : null}

        {tab === "overview" && !loading ? (
          <OverviewPanel stats={stats} />
        ) : null}

        {tab === "deals" && !loading ? (
          <DealsPanel
            deals={filteredDeals}
            q={q}
            setQ={setQ}
            showForm={showDealForm}
            form={dealForm}
            setForm={setDealForm}
            destinations={destinations}
            editing={Boolean(editingSlug)}
            onCreate={startCreateDeal}
            onEdit={startEditDeal}
            onToggle={toggleDeal}
            onDelete={removeDeal}
            onDestination={applyDestination}
            onCancel={() => setShowDealForm(false)}
            onSave={saveDeal}
          />
        ) : null}

        {tab === "banners" && cms ? (
          <BannersPanel
            banners={cms.banners}
            destinations={destinations}
            onSave={(banners) => saveCms({ banners }, "تم حفظ البانرات")}
          />
        ) : null}

        {tab === "faqs" && cms ? (
          <FaqsPanel faqs={cms.faqs} onSave={(faqs) => saveCms({ faqs }, "تم حفظ الأسئلة")} />
        ) : null}

        {tab === "articles" && cms ? (
          <ArticlesPanel
            articles={cms.articles}
            onSave={(articles) => saveCms({ articles }, "تم حفظ المقالات")}
          />
        ) : null}

        {tab === "search" && cms ? (
          <HeroServicesPanel
            items={cms.heroServices || []}
            onSave={(heroServices) => saveCms({ heroServices }, "تم حفظ تبويبات البحث")}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function OverviewPanel({ stats }: { stats: AdminStats | null }) {
  const funnel = stats?.funnel;
  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>أرقام المنصة</h4>
          <p>ملخص الحجوزات والوجهات الأكثر طلباً.</p>
        </div>
      </div>
      {stats ? (
        <>
          <div className="cms-dest-list">
            <li>
              <span>الحجوزات</span>
              <strong>{stats.today.bookings ?? 0}</strong>
            </li>
            <li>
              <span>المبيعات</span>
              <strong>{money(stats.today.salesMinor ?? 0)}</strong>
            </li>
            <li>
              <span>العملاء</span>
              <strong>{stats.today.customers ?? 0}</strong>
            </li>
          </div>
          <div className="cms-panel-head">
            <h4>أكثر الوجهات</h4>
          </div>
          <ul className="cms-dest-list">
            {stats.topDestinations.map((d) => (
              <li key={d.label}>
                <span>{d.label}</span>
                <strong>{d.count}</strong>
              </li>
            ))}
          </ul>
          {funnel ? (
            <>
              <div className="cms-panel-head">
                <h4>قمع التحويل</h4>
              </div>
              <div className="cms-funnel">
                {Object.entries(funnel).map(([key, value]) => (
                  <div className="cms-funnel-row" key={key}>
                    <span>{FUNNEL_LABEL[key] || key}</span>
                    <i style={{ width: `${Math.max(8, (value / (funnel.visits || 1)) * 100)}%` }} />
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <p className="cms-empty">لا تتوفر أرقام التحليلات لهذه الجلسة.</p>
      )}
    </section>
  );
}

function DealsPanel(props: {
  deals: WeekendDeal[];
  q: string;
  setQ: (value: string) => void;
  showForm: boolean;
  form: typeof emptyDeal;
  setForm: Dispatch<SetStateAction<typeof emptyDeal>>;
  destinations: DestinationGuide[];
  editing: boolean;
  onCreate: () => void;
  onEdit: (deal: WeekendDeal) => void;
  onToggle: (deal: WeekendDeal) => void;
  onDelete: (slug: string) => void;
  onDestination: (slug: string) => void;
  onCancel: () => void;
  onSave: (e: FormEvent) => void;
}) {
  const { form, setForm } = props;
  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>{props.showForm ? (props.editing ? "تعديل عرض" : "عرض جديد") : "عروض نهاية الأسبوع"}</h4>
          <p>كل الحقول تظهر على صفحة العروض في الموقع.</p>
        </div>
        <div className="cms-actions">
          {!props.showForm ? (
            <>
              <input
                value={props.q}
                onChange={(e) => props.setQ(e.target.value)}
                placeholder="بحث في العروض"
                style={{ minWidth: 180 }}
              />
              <button type="button" className="cms-btn primary" onClick={props.onCreate}>
                عرض جديد
              </button>
            </>
          ) : (
            <button type="button" className="cms-btn ghost" onClick={props.onCancel}>
              رجوع للقائمة
            </button>
          )}
        </div>
      </div>

      {props.showForm ? (
        <form className="cms-form" onSubmit={props.onSave}>
          <label>
            العنوان بالعربي
            <input
              value={form.titleAr}
              onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))}
              required
            />
          </label>
          <label>
            العنوان بالإنجليزي
            <input
              value={form.titleEn}
              onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))}
            />
          </label>
          <label>
            الوجهة
            <select
              value={form.destinationSlug}
              onChange={(e) => props.onDestination(e.target.value)}
            >
              {props.destinations.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.flag} {d.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label>
            slug
            <input
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              required
              dir="ltr"
            />
          </label>
          <label>
            المدينة
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </label>
          <label>
            صورة العرض
            <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
          </label>
          <label>
            السعر الأصلي (د.ك)
            <input
              value={form.original}
              onChange={(e) => setForm((p) => ({ ...p, original: e.target.value }))}
            />
          </label>
          <label>
            سعر العرض (د.ك)
            <input value={form.sale} onChange={(e) => setForm((p) => ({ ...p, sale: e.target.value }))} />
          </label>
          <label>
            الليالي
            <input
              value={form.nights}
              onChange={(e) => setForm((p) => ({ ...p, nights: e.target.value }))}
            />
          </label>
          <label>
            من تاريخ
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
            />
          </label>
          <label>
            إلى تاريخ
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
            />
          </label>
          <label className="cms-span2">
            يشمل
            <div className="cms-checkrow">
              {INCLUDE_OPTS.map((opt) => (
                <label key={opt.key}>
                  <input
                    type="checkbox"
                    checked={form.includes.includes(opt.key)}
                    onChange={() =>
                      setForm((p) => ({
                        ...p,
                        includes: p.includes.includes(opt.key)
                          ? p.includes.filter((i) => i !== opt.key)
                          : [...p.includes, opt.key],
                      }))
                    }
                  />
                  {opt.label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                منشور على الموقع
              </label>
            </div>
          </label>
          <label>
            الوصف بالعربي
            <textarea
              value={form.descriptionAr}
              onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))}
            />
          </label>
          <label>
            الوصف بالإنجليزي
            <textarea
              value={form.descriptionEn}
              onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))}
            />
          </label>
          <div className="cms-span2 cms-actions">
            <button type="submit" className="cms-btn primary">
              حفظ العرض
            </button>
          </div>
        </form>
      ) : props.deals.length ? (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>العرض</th>
                <th>الوجهة</th>
                <th>السعر</th>
                <th>الليالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {props.deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <strong>{deal.titleAr}</strong>
                    <div style={{ color: "#5d7270", fontSize: "0.78rem" }}>{deal.slug}</div>
                  </td>
                  <td>
                    {deal.countryFlag} {deal.city || deal.destinationSlug}
                  </td>
                  <td>{money(deal.salePriceMinor, deal.currency)}</td>
                  <td>{deal.nights}</td>
                  <td>
                    <span className={`cms-pill${deal.active ? "" : " off"}`}>
                      {deal.active ? "منشور" : "مخفي"}
                    </span>
                  </td>
                  <td>
                    <div className="cms-actions">
                      <a className="cms-btn ghost" href={`/deals/${deal.slug}`} target="_blank" rel="noreferrer">
                        معاينة
                      </a>
                      <button type="button" className="cms-btn" onClick={() => props.onEdit(deal)}>
                        تعديل
                      </button>
                      <button type="button" className="cms-btn" onClick={() => props.onToggle(deal)}>
                        {deal.active ? "إخفاء" : "نشر"}
                      </button>
                      <button type="button" className="cms-btn danger" onClick={() => props.onDelete(deal.slug)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-empty">لا توجد عروض بعد.</p>
      )}
    </section>
  );
}

function BannersPanel({
  banners,
  destinations,
  onSave,
}: {
  banners: CmsBanner[];
  destinations: DestinationGuide[];
  onSave: (rows: CmsBanner[]) => void;
}) {
  const [form, setForm] = useState({
    titleAr: "",
    titleEn: "",
    image: destinations[0]?.image || "/media/destinations/dubai.jpg?v=1",
    href: "/deals",
    active: true,
  });

  function add(e: FormEvent) {
    e.preventDefault();
    onSave([
      {
        id: newId("bn"),
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim() || form.titleAr.trim(),
        image: form.image.trim(),
        href: form.href.trim() || "/deals",
        active: form.active,
      },
      ...banners,
    ]);
    setForm((p) => ({ ...p, titleAr: "", titleEn: "" }));
  }

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>بانرات الموقع</h4>
          <p>عناوين وصور ترويجية يمكن إظهارها أو إخفاؤها.</p>
        </div>
      </div>
      <form className="cms-form" onSubmit={add}>
        <label>
          العنوان بالعربي
          <input
            value={form.titleAr}
            onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))}
            required
          />
        </label>
        <label>
          العنوان بالإنجليزي
          <input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
        </label>
        <label>
          الصورة
          <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
        </label>
        <label>
          الرابط
          <input value={form.href} onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))} />
        </label>
        <label className="cms-span2">
          <span className="cms-checkrow">
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              نشط
            </label>
          </span>
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            إضافة بانر
          </button>
        </div>
      </form>
      {banners.length ? (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th></th>
                <th>العنوان</th>
                <th>الرابط</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {banners.map((row) => (
                <tr key={row.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="cms-thumb" src={row.image} alt="" />
                  </td>
                  <td>{row.titleAr}</td>
                  <td dir="ltr">{row.href}</td>
                  <td>
                    <span className={`cms-pill${row.active ? "" : " off"}`}>
                      {row.active ? "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td>
                    <div className="cms-actions">
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() =>
                          onSave(banners.map((b) => (b.id === row.id ? { ...b, active: !b.active } : b)))
                        }
                      >
                        {row.active ? "إيقاف" : "تفعيل"}
                      </button>
                      <button
                        type="button"
                        className="cms-btn danger"
                        onClick={() => onSave(banners.filter((b) => b.id !== row.id))}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-empty">لا توجد بانرات.</p>
      )}
    </section>
  );
}

function FaqsPanel({
  faqs,
  onSave,
}: {
  faqs: CmsFaq[];
  onSave: (rows: CmsFaq[]) => void;
}) {
  const [form, setForm] = useState({
    questionAr: "",
    questionEn: "",
    answerAr: "",
    answerEn: "",
  });

  function add(e: FormEvent) {
    e.preventDefault();
    onSave([
      {
        id: newId("faq"),
        questionAr: form.questionAr.trim(),
        questionEn: form.questionEn.trim() || form.questionAr.trim(),
        answerAr: form.answerAr.trim(),
        answerEn: form.answerEn.trim() || form.answerAr.trim(),
      },
      ...faqs,
    ]);
    setForm({ questionAr: "", questionEn: "", answerAr: "", answerEn: "" });
  }

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>الأسئلة الشائعة</h4>
          <p>أضف سؤالاً وجواباً بالعربي والإنجليزي.</p>
        </div>
      </div>
      <form className="cms-form" onSubmit={add}>
        <label>
          السؤال بالعربي
          <input
            value={form.questionAr}
            onChange={(e) => setForm((p) => ({ ...p, questionAr: e.target.value }))}
            required
          />
        </label>
        <label>
          السؤال بالإنجليزي
          <input
            value={form.questionEn}
            onChange={(e) => setForm((p) => ({ ...p, questionEn: e.target.value }))}
          />
        </label>
        <label>
          الجواب بالعربي
          <textarea
            value={form.answerAr}
            onChange={(e) => setForm((p) => ({ ...p, answerAr: e.target.value }))}
            required
          />
        </label>
        <label>
          الجواب بالإنجليزي
          <textarea
            value={form.answerEn}
            onChange={(e) => setForm((p) => ({ ...p, answerEn: e.target.value }))}
          />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            إضافة سؤال
          </button>
        </div>
      </form>
      {faqs.length ? (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>السؤال</th>
                <th>الجواب</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((row) => (
                <tr key={row.id}>
                  <td>{row.questionAr}</td>
                  <td>{row.answerAr}</td>
                  <td>
                    <button
                      type="button"
                      className="cms-btn danger"
                      onClick={() => onSave(faqs.filter((f) => f.id !== row.id))}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-empty">لا توجد أسئلة بعد.</p>
      )}
    </section>
  );
}

function ArticlesPanel({
  articles,
  onSave,
}: {
  articles: CmsArticle[];
  onSave: (rows: CmsArticle[]) => void;
}) {
  const [form, setForm] = useState({
    slug: "",
    titleAr: "",
    titleEn: "",
    bodyAr: "",
    bodyEn: "",
    published: true,
  });

  function add(e: FormEvent) {
    e.preventDefault();
    const slug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) return;
    onSave([
      {
        id: newId("art"),
        slug,
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim() || form.titleAr.trim(),
        bodyAr: form.bodyAr.trim(),
        bodyEn: form.bodyEn.trim() || form.bodyAr.trim(),
        published: form.published,
      },
      ...articles,
    ]);
    setForm({ slug: "", titleAr: "", titleEn: "", bodyAr: "", bodyEn: "", published: true });
  }

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>المقالات</h4>
          <p>محتوى يمكن نشره أو إبقاؤه كمسودة.</p>
        </div>
      </div>
      <form className="cms-form" onSubmit={add}>
        <label>
          العنوان بالعربي
          <input
            value={form.titleAr}
            onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))}
            required
          />
        </label>
        <label>
          slug
          <input
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            required
            dir="ltr"
          />
        </label>
        <label>
          العنوان بالإنجليزي
          <input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
        </label>
        <label>
          <span className="cms-checkrow">
            <label>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
              />
              منشور
            </label>
          </span>
        </label>
        <label>
          النص بالعربي
          <textarea
            value={form.bodyAr}
            onChange={(e) => setForm((p) => ({ ...p, bodyAr: e.target.value }))}
            required
          />
        </label>
        <label>
          النص بالإنجليزي
          <textarea value={form.bodyEn} onChange={(e) => setForm((p) => ({ ...p, bodyEn: e.target.value }))} />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            حفظ المقال
          </button>
        </div>
      </form>
      {articles.length ? (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>المقال</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.titleAr}</strong>
                    <div style={{ color: "#5d7270", fontSize: "0.78rem" }}>{row.slug}</div>
                  </td>
                  <td>
                    <span className={`cms-pill${row.published ? "" : " off"}`}>
                      {row.published ? "منشور" : "مسودة"}
                    </span>
                  </td>
                  <td>
                    <div className="cms-actions">
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() =>
                          onSave(
                            articles.map((a) =>
                              a.id === row.id ? { ...a, published: !a.published } : a,
                            ),
                          )
                        }
                      >
                        {row.published ? "تحويل لمسودة" : "نشر"}
                      </button>
                      <button
                        type="button"
                        className="cms-btn danger"
                        onClick={() => onSave(articles.filter((a) => a.id !== row.id))}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-empty">لا توجد مقالات بعد.</p>
      )}
    </section>
  );
}

function HeroServicesPanel({
  items,
  onSave,
}: {
  items: CmsHeroService[];
  onSave: (rows: CmsHeroService[]) => void;
}) {
  const [rows, setRows] = useState(items);
  const [customLabel, setCustomLabel] = useState("");
  const [customHref, setCustomHref] = useState("");

  useEffect(() => {
    setRows(items);
  }, [items]);

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>تبويبات صف البحث</h4>
          <p>تشغيل أو إيقاف فنادق، رحلات، سيارات، أنشطة، رحلتي. يُحفظ على السيرفر لكل الزوار.</p>
        </div>
        <button type="button" className="cms-btn primary" onClick={() => onSave(rows)}>
          حفظ التبويبات
        </button>
      </div>
      <div className="cms-dest-list">
        {rows.map((row) => (
          <li key={row.key}>
            <label className="cms-checkrow">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={() =>
                  setRows((prev) =>
                    prev.map((item) =>
                      item.key === row.key ? { ...item, enabled: !item.enabled } : item,
                    ),
                  )
                }
              />
              <strong>{row.labelAr}</strong>
              <span>{row.kind}</span>
            </label>
          </li>
        ))}
      </div>
      <form
        className="cms-form single"
        onSubmit={(e) => {
          e.preventDefault();
          if (!customLabel.trim()) return;
          setRows((prev) => [
            ...prev,
            {
              key: newId("custom"),
              labelAr: customLabel.trim(),
              labelEn: customLabel.trim(),
              enabled: true,
              kind: "link",
              href: customHref.trim() || "#",
            },
          ]);
          setCustomLabel("");
          setCustomHref("");
        }}
      >
        <label>
          خدمة مخصّصة
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="مثال: تأمين سفر"
          />
        </label>
        <label>
          رابط
          <input
            value={customHref}
            onChange={(e) => setCustomHref(e.target.value)}
            placeholder="/insurance"
          />
        </label>
        <div>
          <button type="submit" className="cms-btn">
            إضافة خدمة
          </button>
        </div>
      </form>
    </section>
  );
}
