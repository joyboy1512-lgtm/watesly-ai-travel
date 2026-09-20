"use client";

import "../../wa-suite.css";
import "../../customers-crm.css";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import {
  formatCommercePrice,
  type MetaCommerceProduct,
  type MetaCommerceState,
} from "@watesly-travel/shared";

const emptyProduct = {
  nameAr: "",
  nameEn: "",
  retailerId: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  currency: "KWD",
  image: "/media/destinations/dubai.jpg?v=1",
  url: "/catalog",
  category: "deal" as MetaCommerceProduct["category"],
  active: true,
};

export default function DashboardCatalogPage() {
  const [state, setState] = useState<MetaCommerceState | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<{
    ready?: boolean;
    issues?: string[];
    productCount?: number;
    catalogId?: string | null;
    mock?: boolean;
  } | null>(null);
  const [settings, setSettings] = useState({
    catalogNameAr: "",
    catalogNameEn: "",
    catalogLeadAr: "",
    catalogLeadEn: "",
    metaCatalogId: "",
    whatsappPhone: "",
  });

  async function load() {
    const next = await apiFetch<MetaCommerceState>("/shop/platform/admin/commerce");
    const ready = await apiFetch<{
      ready?: boolean;
      issues?: string[];
      productCount?: number;
      catalogId?: string | null;
      mock?: boolean;
    }>("/whatsapp/commerce/readiness").catch(() => null);
    setReadiness(ready);
    setState(next);
    setSettings({
      catalogNameAr: next.catalogNameAr,
      catalogNameEn: next.catalogNameEn,
      catalogLeadAr: next.catalogLeadAr,
      catalogLeadEn: next.catalogLeadEn,
      metaCatalogId: next.metaCatalogId,
      whatsappPhone: next.whatsappPhone,
    });
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const products = state?.products || [];
    return {
      all: products.length,
      active: products.filter((row) => row.active).length,
      synced: products.filter((row) => row.metaProductId).length,
      catalog: state?.metaCatalogId ? 1 : 0,
    };
  }, [state]);

  function flash(message: string) {
    setOk(message);
    setError("");
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    try {
      const next = await apiFetch<MetaCommerceState>("/shop/platform/commerce", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setState(next);
      flash("تم حفظ إعدادات الكتالوج");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    try {
      const next = await apiFetch<MetaCommerceState>("/shop/platform/commerce/products", {
        method: "POST",
        body: JSON.stringify({
          id: editingId || undefined,
          nameAr: form.nameAr,
          nameEn: form.nameEn,
          retailerId: form.retailerId,
          descriptionAr: form.descriptionAr,
          descriptionEn: form.descriptionEn,
          priceMinor: Math.round(Number(form.price || 0) * 1000),
          currency: form.currency,
          image: form.image,
          url: form.url,
          category: form.category,
          active: form.active,
        }),
      });
      setState(next);
      setEditingId(null);
      setForm(emptyProduct);
      flash(editingId ? "تم تحديث المنتج" : "تم إضافة المنتج");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ المنتج");
    }
  }

  async function importDeals() {
    try {
      const next = await apiFetch<MetaCommerceState>("/shop/platform/commerce/import-deals", {
        method: "POST",
      });
      setState(next);
      flash("تم استيراد العروض إلى الكتالوج");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاستيراد");
    }
  }

  async function syncMeta() {
    try {
      const next = await apiFetch<MetaCommerceState & { synced?: number; errors?: string[] }>(
        "/shop/platform/commerce/sync-meta",
        { method: "POST" },
      );
      setState(next);
      flash(
        next.errors?.length
          ? `تمت مزامنة ${next.synced || 0} منتجًا مع تنبيهات`
          : `تمت مزامنة ${next.synced || 0} منتجًا مع ميتا`,
      );
      if (next.lastSyncError) setError(next.lastSyncError);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل المزامنة");
    }
  }

  return (
    <AppShell title="كتالوج ميتا · واتساب">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">WhatsApp Commerce</p>
            <h3>كتالوج ميتا</h3>
            <p>
              أدر منتجات واتساب، اعرضها على الموقع، وأرسلها من صندوق الوارد. أنشئ
              الكتالوج في Commerce Manager، اربطه بحساب واتساب للأعمال، ثم الصق
              المعرّف هنا وزامن المنتجات.
            </p>
          </div>
          <div className="wa-hero-actions">
            <Link href="/catalog" className="cust-btn ghost" target="_blank">
              معاينة الموقع
            </Link>
            <button type="button" className="cust-btn" onClick={importDeals}>
              استيراد العروض
            </button>
            <button type="button" className="cust-btn primary" onClick={syncMeta}>
              مزامنة ميتا
            </button>
          </div>
        </section>

        <section className="wa-stats">
          <div className="wa-stat">
            <span>المنتجات</span>
            <strong>{stats.all}</strong>
          </div>
          <div className="wa-stat">
            <span>ظاهرة</span>
            <strong>{stats.active}</strong>
          </div>
          <div className="wa-stat">
            <span>مزامنة ميتا</span>
            <strong>{stats.synced}</strong>
          </div>
          <div className="wa-stat">
            <span>كتالوج مربوط</span>
            <strong>{stats.catalog ? "نعم" : "لا"}</strong>
          </div>
          <div className="wa-stat">
            <span>آخر مزامنة</span>
            <strong style={{ fontSize: "0.95rem" }}>
              {state?.lastSyncedAt ? state.lastSyncedAt.slice(0, 16).replace("T", " ") : "—"}
            </strong>
          </div>
        </section>

        {readiness ? (
          <div className="wa-banner">
            {readiness.ready
              ? `الكتالوج جاهز للمزامنة${readiness.mock ? " (وضع تجريبي)" : ""} · ${readiness.productCount || 0} منتج`
              : `غير جاهز: ${(readiness.issues || []).join(" · ") || "أكمل ربط واتساب ومعرّف الكتالوج"}`}
          </div>
        ) : null}
        {error ? <div className="wa-banner">{error}</div> : null}
        {ok ? <div className="wa-banner">{ok}</div> : null}
        {loading ? <p>جارٍ التحميل…</p> : null}

        <section className="wa-card">
          <h4>إعدادات الكتالوج</h4>
          <form onSubmit={saveSettings}>
            <div className="wa-form-grid">
              <label className="cust-field">
                <span>الاسم عربي</span>
                <input
                  value={settings.catalogNameAr}
                  onChange={(e) => setSettings((p) => ({ ...p, catalogNameAr: e.target.value }))}
                />
              </label>
              <label className="cust-field">
                <span>الاسم إنجليزي</span>
                <input
                  value={settings.catalogNameEn}
                  onChange={(e) => setSettings((p) => ({ ...p, catalogNameEn: e.target.value }))}
                />
              </label>
              <label className="cust-field">
                <span>معرّف كتالوج ميتا</span>
                <input
                  dir="ltr"
                  value={settings.metaCatalogId}
                  onChange={(e) => setSettings((p) => ({ ...p, metaCatalogId: e.target.value }))}
                  placeholder="Commerce Manager catalog ID"
                />
              </label>
              <label className="cust-field">
                <span>رقم واتساب</span>
                <input
                  dir="ltr"
                  value={settings.whatsappPhone}
                  onChange={(e) => setSettings((p) => ({ ...p, whatsappPhone: e.target.value }))}
                />
              </label>
              <label className="cust-field">
                <span>المقدمة عربي</span>
                <textarea
                  value={settings.catalogLeadAr}
                  onChange={(e) => setSettings((p) => ({ ...p, catalogLeadAr: e.target.value }))}
                />
              </label>
              <label className="cust-field">
                <span>المقدمة إنجليزي</span>
                <textarea
                  value={settings.catalogLeadEn}
                  onChange={(e) => setSettings((p) => ({ ...p, catalogLeadEn: e.target.value }))}
                />
              </label>
            </div>
            <div className="cust-actions" style={{ marginTop: "0.85rem" }}>
              <button type="submit" className="btn">
                حفظ الإعدادات
              </button>
            </div>
          </form>
        </section>

        <section className="wa-card">
          <h4>{editingId ? "تعديل منتج" : "منتج جديد"}</h4>
          <form onSubmit={saveProduct}>
            <div className="wa-form-grid">
              <label className="cust-field">
                <span>الاسم عربي</span>
                <input value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} required />
              </label>
              <label className="cust-field">
                <span>الاسم إنجليزي</span>
                <input value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>رمز المنتج retailer_id</span>
                <input
                  dir="ltr"
                  value={form.retailerId}
                  onChange={(e) => setForm((p) => ({ ...p, retailerId: e.target.value }))}
                  placeholder="dubai-weekend"
                />
              </label>
              <label className="cust-field">
                <span>السعر (د.ك)</span>
                <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>الصورة</span>
                <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>رابط الموقع</span>
                <input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>الوصف عربي</span>
                <textarea value={form.descriptionAr} onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>الوصف إنجليزي</span>
                <textarea value={form.descriptionEn} onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))} />
              </label>
              <label className="cust-field">
                <span>التصنيف</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value as MetaCommerceProduct["category"] }))
                  }
                >
                  <option value="deal">عرض</option>
                  <option value="flight">طيران</option>
                  <option value="hotel">فندق</option>
                  <option value="transfer">نقل</option>
                  <option value="activity">نشاط</option>
                  <option value="other">أخرى</option>
                </select>
              </label>
              <label className="cust-field">
                <span>الظهور</span>
                <select
                  value={form.active ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === "1" }))}
                >
                  <option value="1">ظاهر في الكتالوج</option>
                  <option value="0">مخفي</option>
                </select>
              </label>
            </div>
            <div className="cust-actions" style={{ marginTop: "0.85rem" }}>
              <button type="submit" className="btn">
                {editingId ? "تحديث المنتج" : "إضافة المنتج"}
              </button>
            </div>
          </form>
        </section>

        <section className="wa-card">
          <h4>منتجات الكتالوج</h4>
          <div className="cust-table-wrap">
            <table className="cust-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>السعر</th>
                  <th>retailer_id</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(state?.products || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nameAr}</strong>
                      <div style={{ color: "#5d7270", fontSize: "0.78rem" }}>
                        {row.category} · {row.active ? "ظاهر" : "مخفي"}
                        {row.metaProductId ? " · ميتا" : ""}
                      </div>
                    </td>
                    <td>{formatCommercePrice(row.priceMinor, row.currency)}</td>
                    <td dir="ltr">{row.retailerId}</td>
                    <td>
                      <div className="wa-hero-actions">
                        <button
                          type="button"
                          className="cust-btn"
                          onClick={() => {
                            setEditingId(row.id);
                            setForm({
                              nameAr: row.nameAr,
                              nameEn: row.nameEn,
                              retailerId: row.retailerId,
                              descriptionAr: row.descriptionAr,
                              descriptionEn: row.descriptionEn,
                              price: String(row.priceMinor / 1000),
                              currency: row.currency,
                              image: row.image,
                              url: row.url,
                              category: row.category,
                              active: row.active,
                            });
                          }}
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          className="cust-btn"
                          onClick={async () => {
                            const next = await apiFetch<MetaCommerceState>(
                              `/shop/platform/commerce/products/${encodeURIComponent(row.id)}`,
                              { method: "DELETE" },
                            );
                            setState(next);
                            flash("تم حذف المنتج");
                          }}
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
        </section>
      </div>
    </AppShell>
  );
}
