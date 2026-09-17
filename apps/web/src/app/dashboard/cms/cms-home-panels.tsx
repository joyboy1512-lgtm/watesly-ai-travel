"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  CmsFeature,
  CmsHeroSlide,
  CmsHomeCopy,
  CmsHomeDestination,
  CmsHomeOffer,
  CmsReview,
  CmsStat,
} from "@watesly-travel/shared";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

type HomeSub = "copy" | "destinations" | "offers" | "reviews" | "features" | "stats";

const HOME_TABS: Array<{ id: HomeSub; label: string }> = [
  { id: "copy", label: "عناوين الأقسام" },
  { id: "destinations", label: "بطاقات الوجهات" },
  { id: "offers", label: "عروض الصفحة" },
  { id: "reviews", label: "التقييمات" },
  { id: "features", label: "المميزات" },
  { id: "stats", label: "الأرقام" },
];

export function HomepagePanel({
  homeCopy,
  destinations,
  offers,
  reviews,
  features,
  stats,
  onSaveCopy,
  onSaveDestinations,
  onSaveOffers,
  onSaveReviews,
  onSaveFeatures,
  onSaveStats,
}: {
  homeCopy: CmsHomeCopy;
  destinations: CmsHomeDestination[];
  offers: CmsHomeOffer[];
  reviews: CmsReview[];
  features: CmsFeature[];
  stats: CmsStat[];
  onSaveCopy: (value: CmsHomeCopy) => void;
  onSaveDestinations: (rows: CmsHomeDestination[]) => void;
  onSaveOffers: (rows: CmsHomeOffer[]) => void;
  onSaveReviews: (rows: CmsReview[]) => void;
  onSaveFeatures: (rows: CmsFeature[]) => void;
  onSaveStats: (rows: CmsStat[]) => void;
}) {
  const [sub, setSub] = useState<HomeSub>("copy");
  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>محتوى الصفحة الرئيسية</h4>
          <p>عدّل العناوين والبطاقات والتقييمات والأرقام كما تظهر للزائر.</p>
        </div>
      </div>
      <nav className="cms-subtabs">
        {HOME_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`cms-tab${sub === item.id ? " is-on" : ""}`}
            onClick={() => setSub(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {sub === "copy" ? <HomeCopyForm value={homeCopy} onSave={onSaveCopy} /> : null}
      {sub === "destinations" ? (
        <HomeDestinationsEditor items={destinations} onSave={onSaveDestinations} />
      ) : null}
      {sub === "offers" ? <HomeOffersEditor items={offers} onSave={onSaveOffers} /> : null}
      {sub === "reviews" ? <ReviewsEditor items={reviews} onSave={onSaveReviews} /> : null}
      {sub === "features" ? <FeaturesEditor items={features} onSave={onSaveFeatures} /> : null}
      {sub === "stats" ? <StatsEditor items={stats} onSave={onSaveStats} /> : null}
    </section>
  );
}

export function HeroSlidesPanel({
  slides,
  onSave,
}: {
  slides: CmsHeroSlide[];
  onSave: (rows: CmsHeroSlide[]) => void;
}) {
  const empty: CmsHeroSlide = {
    id: "",
    image: "/media/hero/brand-sky-wing.jpg?v=1",
    kickerAr: "",
    kickerEn: "",
    titleAr: "",
    titleEn: "",
    subtitleAr: "",
    subtitleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function startEdit(row: CmsHeroSlide) {
    setEditing(row.id);
    setForm(row);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: CmsHeroSlide = {
      ...form,
      id: editing || newId("slide"),
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim() || form.titleAr.trim(),
    };
    onSave(editing ? slides.map((row) => (row.id === editing ? next : row)) : [next, ...slides]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>شرائح الهيرو</h4>
          <p>الصور والنصوص فوق محرك البحث. لا يغيّر شريط شركات الطيران.</p>
        </div>
        {editing ? (
          <button type="button" className="cms-btn ghost" onClick={() => { setEditing(null); setForm(empty); }}>
            إلغاء التعديل
          </button>
        ) : null}
      </div>
      <form className="cms-form" onSubmit={submit}>
        <label>
          العنوان بالعربي
          <input value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} required />
        </label>
        <label>
          العنوان بالإنجليزي
          <input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
        </label>
        <label>
          السطر العلوي عربي
          <input value={form.kickerAr} onChange={(e) => setForm((p) => ({ ...p, kickerAr: e.target.value }))} />
        </label>
        <label>
          السطر العلوي إنجليزي
          <input value={form.kickerEn} onChange={(e) => setForm((p) => ({ ...p, kickerEn: e.target.value }))} />
        </label>
        <label>
          العنوان الفرعي عربي
          <input value={form.subtitleAr} onChange={(e) => setForm((p) => ({ ...p, subtitleAr: e.target.value }))} />
        </label>
        <label>
          العنوان الفرعي إنجليزي
          <input value={form.subtitleEn} onChange={(e) => setForm((p) => ({ ...p, subtitleEn: e.target.value }))} />
        </label>
        <label className="cms-span2">
          الصورة
          <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
        </label>
        <label>
          الوصف عربي
          <textarea value={form.descriptionAr} onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))} />
        </label>
        <label>
          الوصف إنجليزي
          <textarea value={form.descriptionEn} onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))} />
        </label>
        <label className="cms-span2">
          <span className="cms-checkrow">
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              ظاهرة على الموقع
            </label>
          </span>
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث الشريحة" : "إضافة شريحة"}
          </button>
        </div>
      </form>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th></th>
              <th>العنوان</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slides.map((row) => (
              <tr key={row.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="cms-thumb" src={row.image} alt="" />
                </td>
                <td>
                  <strong>{row.titleAr}</strong>
                  <div style={{ color: "#5d7270", fontSize: "0.78rem" }}>{row.kickerAr}</div>
                </td>
                <td>
                  <span className={`cms-pill${row.active ? "" : " off"}`}>{row.active ? "ظاهرة" : "مخفية"}</span>
                </td>
                <td>
                  <div className="cms-actions">
                    <button type="button" className="cms-btn" onClick={() => startEdit(row)}>
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="cms-btn"
                      onClick={() => onSave(slides.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)))}
                    >
                      {row.active ? "إخفاء" : "إظهار"}
                    </button>
                    <button type="button" className="cms-btn danger" onClick={() => onSave(slides.filter((item) => item.id !== row.id))}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HomeCopyForm({ value, onSave }: { value: CmsHomeCopy; onSave: (value: CmsHomeCopy) => void }) {
  const [form, setForm] = useState(value);
  useEffect(() => setForm(value), [value]);
  const fields: Array<[keyof CmsHomeCopy, string]> = [
    ["destKickerAr", "تسمية الوجهات عربي"],
    ["destKickerEn", "تسمية الوجهات إنجليزي"],
    ["destTitleAr", "عنوان الوجهات عربي"],
    ["destTitleEn", "عنوان الوجهات إنجليزي"],
    ["destLeadAr", "مقدمة الوجهات عربي"],
    ["destLeadEn", "مقدمة الوجهات إنجليزي"],
    ["offersKickerAr", "تسمية العروض عربي"],
    ["offersKickerEn", "تسمية العروض إنجليزي"],
    ["offersTitleAr", "عنوان العروض عربي"],
    ["offersTitleEn", "عنوان العروض إنجليزي"],
    ["whyKickerAr", "تسمية المميزات عربي"],
    ["whyKickerEn", "تسمية المميزات إنجليزي"],
    ["whyTitleAr", "عنوان المميزات عربي"],
    ["whyTitleEn", "عنوان المميزات إنجليزي"],
    ["reviewsKickerAr", "تسمية التقييمات عربي"],
    ["reviewsKickerEn", "تسمية التقييمات إنجليزي"],
    ["reviewsHeadingAr", "عنوان التقييمات عربي"],
    ["reviewsHeadingEn", "عنوان التقييمات إنجليزي"],
    ["reviewsDisclaimerAr", "تنويه التقييمات عربي"],
    ["reviewsDisclaimerEn", "تنويه التقييمات إنجليزي"],
    ["ctaKickerAr", "تسمية الدعوة عربي"],
    ["ctaKickerEn", "تسمية الدعوة إنجليزي"],
    ["ctaTitleAr", "عنوان الدعوة عربي"],
    ["ctaTitleEn", "عنوان الدعوة إنجليزي"],
    ["ctaLeadAr", "نص الدعوة عربي"],
    ["ctaLeadEn", "نص الدعوة إنجليزي"],
  ];
  return (
    <form
      className="cms-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      {fields.map(([key, label]) => (
        <label key={key} className={key.includes("Lead") || key.includes("Disclaimer") || key.includes("ctaLead") ? "cms-span2" : undefined}>
          {label}
          {key.includes("Lead") || key.includes("Disclaimer") ? (
            <textarea value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
          ) : (
            <input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
          )}
        </label>
      ))}
      <div className="cms-span2">
        <button type="submit" className="cms-btn primary">
          حفظ العناوين
        </button>
      </div>
    </form>
  );
}

function HomeDestinationsEditor({
  items,
  onSave,
}: {
  items: CmsHomeDestination[];
  onSave: (rows: CmsHomeDestination[]) => void;
}) {
  const empty: CmsHomeDestination = {
    id: "",
    nameAr: "",
    nameEn: "",
    countryAr: "",
    countryEn: "",
    code: "",
    tagAr: "",
    tagEn: "",
    image: "/media/destinations/dubai.jpg?v=1",
    fromPriceAr: "",
    fromPriceEn: "",
    rating: 4.9,
    reviews: 100,
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      ...form,
      id: editing || form.id || newId("dest"),
      nameEn: form.nameEn || form.nameAr,
      countryEn: form.countryEn || form.countryAr,
      tagEn: form.tagEn || form.tagAr,
      fromPriceEn: form.fromPriceEn || form.fromPriceAr,
    };
    onSave(editing ? items.map((row) => (row.id === editing ? next : row)) : [next, ...items]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <>
      <form className="cms-form" onSubmit={submit}>
        <label>
          الاسم عربي
          <input value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} required />
        </label>
        <label>
          الاسم إنجليزي
          <input value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} />
        </label>
        <label>
          الدولة عربي
          <input value={form.countryAr} onChange={(e) => setForm((p) => ({ ...p, countryAr: e.target.value }))} />
        </label>
        <label>
          الدولة إنجليزي
          <input value={form.countryEn} onChange={(e) => setForm((p) => ({ ...p, countryEn: e.target.value }))} />
        </label>
        <label>
          رمز المطار
          <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} dir="ltr" />
        </label>
        <label>
          الوسم عربي
          <input value={form.tagAr} onChange={(e) => setForm((p) => ({ ...p, tagAr: e.target.value }))} />
        </label>
        <label>
          الوسم إنجليزي
          <input value={form.tagEn} onChange={(e) => setForm((p) => ({ ...p, tagEn: e.target.value }))} />
        </label>
        <label>
          السعر عربي
          <input value={form.fromPriceAr} onChange={(e) => setForm((p) => ({ ...p, fromPriceAr: e.target.value }))} />
        </label>
        <label>
          السعر إنجليزي
          <input value={form.fromPriceEn} onChange={(e) => setForm((p) => ({ ...p, fromPriceEn: e.target.value }))} />
        </label>
        <label className="cms-span2">
          الصورة
          <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
        </label>
        <div className="cms-span2 cms-actions">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث الوجهة" : "إضافة وجهة"}
          </button>
          {editing ? (
            <button type="button" className="cms-btn ghost" onClick={() => { setEditing(null); setForm(empty); }}>
              إلغاء
            </button>
          ) : null}
        </div>
      </form>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>الوجهة</th>
              <th>المطار</th>
              <th>السعر</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.nameAr} · {row.countryAr}
                </td>
                <td dir="ltr">{row.code}</td>
                <td>{row.fromPriceAr}</td>
                <td>
                  <div className="cms-actions">
                    <button type="button" className="cms-btn" onClick={() => { setEditing(row.id); setForm(row); }}>
                      تعديل
                    </button>
                    <button type="button" className="cms-btn danger" onClick={() => onSave(items.filter((item) => item.id !== row.id))}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HomeOffersEditor({
  items,
  onSave,
}: {
  items: CmsHomeOffer[];
  onSave: (rows: CmsHomeOffer[]) => void;
}) {
  const empty: CmsHomeOffer = {
    id: "",
    titleAr: "",
    titleEn: "",
    subtitleAr: "",
    subtitleEn: "",
    badgeAr: "",
    badgeEn: "",
    image: "/media/offers/hotel.jpg?v=1",
    priceLabelAr: "",
    priceLabelEn: "",
    mode: "stays",
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      ...form,
      id: editing || newId("offer"),
      titleEn: form.titleEn || form.titleAr,
      subtitleEn: form.subtitleEn || form.subtitleAr,
      badgeEn: form.badgeEn || form.badgeAr,
      priceLabelEn: form.priceLabelEn || form.priceLabelAr,
    };
    onSave(editing ? items.map((row) => (row.id === editing ? next : row)) : [next, ...items]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <>
      <form className="cms-form" onSubmit={submit}>
        <label>
          العنوان عربي
          <input value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} required />
        </label>
        <label>
          العنوان إنجليزي
          <input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
        </label>
        <label>
          الوصف عربي
          <input value={form.subtitleAr} onChange={(e) => setForm((p) => ({ ...p, subtitleAr: e.target.value }))} />
        </label>
        <label>
          الوصف إنجليزي
          <input value={form.subtitleEn} onChange={(e) => setForm((p) => ({ ...p, subtitleEn: e.target.value }))} />
        </label>
        <label>
          الوسم عربي
          <input value={form.badgeAr} onChange={(e) => setForm((p) => ({ ...p, badgeAr: e.target.value }))} />
        </label>
        <label>
          الوسم إنجليزي
          <input value={form.badgeEn} onChange={(e) => setForm((p) => ({ ...p, badgeEn: e.target.value }))} />
        </label>
        <label>
          السعر عربي
          <input value={form.priceLabelAr} onChange={(e) => setForm((p) => ({ ...p, priceLabelAr: e.target.value }))} />
        </label>
        <label>
          النوع
          <select
            value={form.mode}
            onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as CmsHomeOffer["mode"] }))}
          >
            <option value="flights">طيران</option>
            <option value="stays">فنادق</option>
            <option value="cars">نقل</option>
            <option value="activities">أنشطة</option>
          </select>
        </label>
        <label className="cms-span2">
          الصورة
          <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
        </label>
        <div className="cms-span2 cms-actions">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث العرض" : "إضافة عرض"}
          </button>
        </div>
      </form>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>العرض</th>
              <th>النوع</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.titleAr}</td>
                <td>{row.mode}</td>
                <td>
                  <div className="cms-actions">
                    <button type="button" className="cms-btn" onClick={() => { setEditing(row.id); setForm(row); }}>
                      تعديل
                    </button>
                    <button type="button" className="cms-btn danger" onClick={() => onSave(items.filter((item) => item.id !== row.id))}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReviewsEditor({
  items,
  onSave,
}: {
  items: CmsReview[];
  onSave: (rows: CmsReview[]) => void;
}) {
  const empty: CmsReview = {
    id: "",
    name: "",
    cityAr: "",
    cityEn: "",
    rating: 5,
    textAr: "",
    textEn: "",
    tripAr: "",
    tripEn: "",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...form, id: editing || newId("rev"), textEn: form.textEn || form.textAr };
    onSave(editing ? items.map((row) => (row.id === editing ? next : row)) : [next, ...items]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <>
      <form className="cms-form" onSubmit={submit}>
        <label>
          الاسم
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        </label>
        <label>
          المدينة عربي
          <input value={form.cityAr} onChange={(e) => setForm((p) => ({ ...p, cityAr: e.target.value }))} />
        </label>
        <label>
          التقييم
          <input
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) || 5 }))}
          />
        </label>
        <label>
          نوع الرحلة عربي
          <input value={form.tripAr} onChange={(e) => setForm((p) => ({ ...p, tripAr: e.target.value }))} />
        </label>
        <label>
          النص عربي
          <textarea value={form.textAr} onChange={(e) => setForm((p) => ({ ...p, textAr: e.target.value }))} required />
        </label>
        <label>
          النص إنجليزي
          <textarea value={form.textEn} onChange={(e) => setForm((p) => ({ ...p, textEn: e.target.value }))} />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث التقييم" : "إضافة تقييم"}
          </button>
        </div>
      </form>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>التقييم</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <div style={{ color: "#5d7270", fontSize: "0.78rem" }}>{row.textAr.slice(0, 80)}</div>
                </td>
                <td>{row.rating}</td>
                <td>
                  <div className="cms-actions">
                    <button type="button" className="cms-btn" onClick={() => { setEditing(row.id); setForm(row); }}>
                      تعديل
                    </button>
                    <button type="button" className="cms-btn danger" onClick={() => onSave(items.filter((item) => item.id !== row.id))}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FeaturesEditor({
  items,
  onSave,
}: {
  items: CmsFeature[];
  onSave: (rows: CmsFeature[]) => void;
}) {
  const empty: CmsFeature = { id: "", icon: "✨", titleAr: "", titleEn: "", textAr: "", textEn: "" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...form, id: editing || newId("feat"), titleEn: form.titleEn || form.titleAr, textEn: form.textEn || form.textAr };
    onSave(editing ? items.map((row) => (row.id === editing ? next : row)) : [next, ...items]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <>
      <form className="cms-form" onSubmit={submit}>
        <label>
          الأيقونة
          <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} />
        </label>
        <label>
          العنوان عربي
          <input value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} required />
        </label>
        <label>
          النص عربي
          <textarea value={form.textAr} onChange={(e) => setForm((p) => ({ ...p, textAr: e.target.value }))} required />
        </label>
        <label>
          النص إنجليزي
          <textarea value={form.textEn} onChange={(e) => setForm((p) => ({ ...p, textEn: e.target.value }))} />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث الميزة" : "إضافة ميزة"}
          </button>
        </div>
      </form>
      <ul className="cms-dest-list">
        {items.map((row) => (
          <li key={row.id}>
            <span>
              {row.icon} {row.titleAr}
            </span>
            <div className="cms-actions">
              <button type="button" className="cms-btn" onClick={() => { setEditing(row.id); setForm(row); }}>
                تعديل
              </button>
              <button type="button" className="cms-btn danger" onClick={() => onSave(items.filter((item) => item.id !== row.id))}>
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function StatsEditor({
  items,
  onSave,
}: {
  items: CmsStat[];
  onSave: (rows: CmsStat[]) => void;
}) {
  const empty: CmsStat = { id: "", value: "", labelAr: "", labelEn: "" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...form, id: editing || newId("stat"), labelEn: form.labelEn || form.labelAr };
    onSave(editing ? items.map((row) => (row.id === editing ? next : row)) : [...items, next]);
    setEditing(null);
    setForm(empty);
  }

  return (
    <>
      <form className="cms-form" onSubmit={submit}>
        <label>
          الرقم
          <input value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} required />
        </label>
        <label>
          التسمية عربي
          <input value={form.labelAr} onChange={(e) => setForm((p) => ({ ...p, labelAr: e.target.value }))} required />
        </label>
        <label>
          التسمية إنجليزي
          <input value={form.labelEn} onChange={(e) => setForm((p) => ({ ...p, labelEn: e.target.value }))} />
        </label>
        <div>
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث الرقم" : "إضافة رقم"}
          </button>
        </div>
      </form>
      <ul className="cms-dest-list">
        {items.map((row) => (
          <li key={row.id}>
            <span>
              <strong>{row.value}</strong> {row.labelAr}
            </span>
            <div className="cms-actions">
              <button type="button" className="cms-btn" onClick={() => { setEditing(row.id); setForm(row); }}>
                تعديل
              </button>
              <button type="button" className="cms-btn danger" onClick={() => onSave(items.filter((item) => item.id !== row.id))}>
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
