"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  emptyDestinationGuide,
  type CmsSitePages,
  type DestinationGuide,
} from "@watesly-travel/shared";

function lines(value: string[]) {
  return value.join("\n");
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);
}

export function SitePagesPanel({
  value,
  onSave,
}: {
  value: CmsSitePages;
  onSave: (next: CmsSitePages) => void;
}) {
  const [form, setForm] = useState(value);
  useEffect(() => setForm(value), [value]);

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>صفحات الموقع والتواصل</h4>
          <p>من نحن، تواصل معنا، التذييل، ومقدمة الأسئلة — تظهر مباشرة للزائر بعد الحفظ.</p>
        </div>
      </div>
      <form
        className="cms-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <label>
          مقدمة من نحن عربي
          <textarea value={form.aboutLeadAr} onChange={(e) => setForm((p) => ({ ...p, aboutLeadAr: e.target.value }))} />
        </label>
        <label>
          مقدمة من نحن إنجليزي
          <textarea value={form.aboutLeadEn} onChange={(e) => setForm((p) => ({ ...p, aboutLeadEn: e.target.value }))} />
        </label>
        <label>
          نص من نحن عربي
          <textarea value={form.aboutBodyAr} onChange={(e) => setForm((p) => ({ ...p, aboutBodyAr: e.target.value }))} />
        </label>
        <label>
          نص من نحن إنجليزي
          <textarea value={form.aboutBodyEn} onChange={(e) => setForm((p) => ({ ...p, aboutBodyEn: e.target.value }))} />
        </label>
        <label>
          مقدمة التواصل عربي
          <textarea value={form.contactIntroAr} onChange={(e) => setForm((p) => ({ ...p, contactIntroAr: e.target.value }))} />
        </label>
        <label>
          مقدمة التواصل إنجليزي
          <textarea value={form.contactIntroEn} onChange={(e) => setForm((p) => ({ ...p, contactIntroEn: e.target.value }))} />
        </label>
        <label>
          مقدمة الأسئلة عربي
          <textarea value={form.faqIntroAr} onChange={(e) => setForm((p) => ({ ...p, faqIntroAr: e.target.value }))} />
        </label>
        <label>
          مقدمة الأسئلة إنجليزي
          <textarea value={form.faqIntroEn} onChange={(e) => setForm((p) => ({ ...p, faqIntroEn: e.target.value }))} />
        </label>
        <label>
          جملة التذييل عربي
          <textarea value={form.footerTaglineAr} onChange={(e) => setForm((p) => ({ ...p, footerTaglineAr: e.target.value }))} />
        </label>
        <label>
          جملة التذييل إنجليزي
          <textarea value={form.footerTaglineEn} onChange={(e) => setForm((p) => ({ ...p, footerTaglineEn: e.target.value }))} />
        </label>
        <label>
          مقدمة صفحة الوجهات عربي
          <textarea value={form.destinationsLeadAr} onChange={(e) => setForm((p) => ({ ...p, destinationsLeadAr: e.target.value }))} />
        </label>
        <label>
          مقدمة صفحة الوجهات إنجليزي
          <textarea value={form.destinationsLeadEn} onChange={(e) => setForm((p) => ({ ...p, destinationsLeadEn: e.target.value }))} />
        </label>
        <label>
          الاسم القانوني عربي
          <input value={form.legalNameAr} onChange={(e) => setForm((p) => ({ ...p, legalNameAr: e.target.value }))} />
        </label>
        <label>
          الاسم القانوني إنجليزي
          <input value={form.legalNameEn} onChange={(e) => setForm((p) => ({ ...p, legalNameEn: e.target.value }))} />
        </label>
        <label>
          العنوان عربي
          <input value={form.addressAr} onChange={(e) => setForm((p) => ({ ...p, addressAr: e.target.value }))} />
        </label>
        <label>
          العنوان إنجليزي
          <input value={form.addressEn} onChange={(e) => setForm((p) => ({ ...p, addressEn: e.target.value }))} />
        </label>
        <label>
          ساعات العمل عربي
          <input value={form.hoursAr} onChange={(e) => setForm((p) => ({ ...p, hoursAr: e.target.value }))} />
        </label>
        <label>
          ساعات العمل إنجليزي
          <input value={form.hoursEn} onChange={(e) => setForm((p) => ({ ...p, hoursEn: e.target.value }))} />
        </label>
        <label>
          الهاتف
          <input value={form.phoneDisplay} onChange={(e) => setForm((p) => ({ ...p, phoneDisplay: e.target.value }))} dir="ltr" />
        </label>
        <label>
          الهاتف الدولي
          <input value={form.phoneE164} onChange={(e) => setForm((p) => ({ ...p, phoneE164: e.target.value }))} dir="ltr" />
        </label>
        <label>
          واتساب
          <input value={form.whatsappUrl} onChange={(e) => setForm((p) => ({ ...p, whatsappUrl: e.target.value }))} dir="ltr" />
        </label>
        <label>
          البريد
          <input value={form.supportEmail} onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))} dir="ltr" />
        </label>
        <label className="cms-span2">
          رقم الترخيص السياحي
          <input value={form.tourismLicense} onChange={(e) => setForm((p) => ({ ...p, tourismLicense: e.target.value }))} dir="ltr" />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            حفظ الصفحات والتواصل
          </button>
        </div>
      </form>
    </section>
  );
}

export function DestinationGuidesPanel({
  guides,
  onSave,
}: {
  guides: DestinationGuide[];
  onSave: (rows: DestinationGuide[]) => void;
}) {
  const [form, setForm] = useState<DestinationGuide>(emptyDestinationGuide());
  const [editing, setEditing] = useState<string | null>(null);

  function startEdit(row: DestinationGuide) {
    setEditing(row.slug);
    setForm(row);
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyDestinationGuide());
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const slug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) return;
    const next: DestinationGuide = {
      ...form,
      slug,
      nameEn: form.nameEn || form.nameAr,
      countryEn: form.countryEn || form.countryAr,
      whyEn: form.whyEn || form.whyAr,
      bestTimeEn: form.bestTimeEn || form.bestTimeAr,
      costHintEn: form.costHintEn || form.costHintAr,
      flightHintEn: form.flightHintEn || form.flightHintAr,
      seoTitleEn: form.seoTitleEn || form.seoTitleAr,
      seoDescriptionEn: form.seoDescriptionEn || form.seoDescriptionAr,
    };
    const rest = guides.filter((row) => row.slug !== slug && row.slug !== editing);
    onSave([next, ...rest]);
    setEditing(slug);
  }

  return (
    <section className="cms-panel">
      <div className="cms-panel-head">
        <div>
          <h4>أدلة الوجهات</h4>
          <p>صفحات /destinations — أضف وجهة أو عدّل النص والفنادق والأنشطة.</p>
        </div>
        <button type="button" className="cms-btn primary" onClick={startCreate}>
          وجهة جديدة
        </button>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>الوجهة</th>
              <th>المطار</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {guides.map((row) => (
              <tr key={row.slug}>
                <td>
                  {row.flag} {row.nameAr}
                </td>
                <td dir="ltr">{row.airportCode}</td>
                <td>
                  <div className="cms-actions">
                    <a className="cms-btn ghost" href={`/destinations/${row.slug}`} target="_blank" rel="noreferrer">
                      معاينة
                    </a>
                    <button type="button" className="cms-btn" onClick={() => startEdit(row)}>
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="cms-btn danger"
                      onClick={() => onSave(guides.filter((item) => item.slug !== row.slug))}
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
          slug
          <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} required dir="ltr" />
        </label>
        <label>
          رمز المطار
          <input value={form.airportCode} onChange={(e) => setForm((p) => ({ ...p, airportCode: e.target.value.toUpperCase() }))} dir="ltr" />
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
          العلم
          <input value={form.flag} onChange={(e) => setForm((p) => ({ ...p, flag: e.target.value }))} />
        </label>
        <label>
          الصورة
          <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
        </label>
        <label>
          لماذا نزور عربي
          <textarea value={form.whyAr} onChange={(e) => setForm((p) => ({ ...p, whyAr: e.target.value }))} />
        </label>
        <label>
          لماذا نزور إنجليزي
          <textarea value={form.whyEn} onChange={(e) => setForm((p) => ({ ...p, whyEn: e.target.value }))} />
        </label>
        <label>
          أفضل وقت عربي
          <input value={form.bestTimeAr} onChange={(e) => setForm((p) => ({ ...p, bestTimeAr: e.target.value }))} />
        </label>
        <label>
          أفضل وقت إنجليزي
          <input value={form.bestTimeEn} onChange={(e) => setForm((p) => ({ ...p, bestTimeEn: e.target.value }))} />
        </label>
        <label>
          التكلفة عربي
          <textarea value={form.costHintAr} onChange={(e) => setForm((p) => ({ ...p, costHintAr: e.target.value }))} />
        </label>
        <label>
          التكلفة إنجليزي
          <textarea value={form.costHintEn} onChange={(e) => setForm((p) => ({ ...p, costHintEn: e.target.value }))} />
        </label>
        <label>
          الفنادق عربي (سطر لكل فندق)
          <textarea value={lines(form.hotelsAr)} onChange={(e) => setForm((p) => ({ ...p, hotelsAr: splitLines(e.target.value) }))} />
        </label>
        <label>
          الفنادق إنجليزي
          <textarea value={lines(form.hotelsEn)} onChange={(e) => setForm((p) => ({ ...p, hotelsEn: splitLines(e.target.value) }))} />
        </label>
        <label>
          الأنشطة عربي
          <textarea value={lines(form.activitiesAr)} onChange={(e) => setForm((p) => ({ ...p, activitiesAr: splitLines(e.target.value) }))} />
        </label>
        <label>
          الأنشطة إنجليزي
          <textarea value={lines(form.activitiesEn)} onChange={(e) => setForm((p) => ({ ...p, activitiesEn: splitLines(e.target.value) }))} />
        </label>
        <label>
          تلميح الطيران عربي
          <textarea value={form.flightHintAr} onChange={(e) => setForm((p) => ({ ...p, flightHintAr: e.target.value }))} />
        </label>
        <label>
          تلميح الطيران إنجليزي
          <textarea value={form.flightHintEn} onChange={(e) => setForm((p) => ({ ...p, flightHintEn: e.target.value }))} />
        </label>
        <label>
          عنوان SEO عربي
          <input value={form.seoTitleAr} onChange={(e) => setForm((p) => ({ ...p, seoTitleAr: e.target.value }))} />
        </label>
        <label>
          عنوان SEO إنجليزي
          <input value={form.seoTitleEn} onChange={(e) => setForm((p) => ({ ...p, seoTitleEn: e.target.value }))} />
        </label>
        <label>
          وصف SEO عربي
          <textarea value={form.seoDescriptionAr} onChange={(e) => setForm((p) => ({ ...p, seoDescriptionAr: e.target.value }))} />
        </label>
        <label>
          وصف SEO إنجليزي
          <textarea value={form.seoDescriptionEn} onChange={(e) => setForm((p) => ({ ...p, seoDescriptionEn: e.target.value }))} />
        </label>
        <div className="cms-span2">
          <button type="submit" className="cms-btn primary">
            {editing ? "تحديث الدليل" : "حفظ الدليل"}
          </button>
        </div>
      </form>
    </section>
  );
}
