"use client";

import { FormEvent, useEffect, useState } from "react";
import { shopFetch } from "@/lib/shop-session";
import type { WeekendDeal } from "@watesly-travel/shared";

/**
 * Admin CMS for platform content. Additive dashboard page — does not alter
 * existing ops screens. Requires staff session in production; here uses shop
 * platform CMS endpoints (in-memory until DB migration).
 */
export default function DashboardCmsPage() {
  const [deals, setDeals] = useState<WeekendDeal[]>([]);
  const [titleAr, setTitleAr] = useState("");
  const [slug, setSlug] = useState("");
  const [sale, setSale] = useState("199");
  const [original, setOriginal] = useState("229");
  const [msg, setMsg] = useState("");
  const [stats, setStats] = useState<{
    today: Record<string, number>;
    topDestinations: Array<{ label: string; count: number }>;
    funnel: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    shopFetch<WeekendDeal[]>("/shop/platform/deals")
      .then(setDeals)
      .catch(() => undefined);
    shopFetch<typeof stats>("/shop/platform/admin/stats")
      .then(setStats)
      .catch(() => undefined);
  }, []);

  async function addDeal(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const deal: WeekendDeal = {
      id: `deal-${slug}`,
      slug,
      destinationSlug: slug.split("-")[0] || "dubai",
      titleAr,
      titleEn: titleAr,
      countryFlag: "✈️",
      city: titleAr,
      image: "/media/destinations/dubai.jpg?v=1",
      includes: ["flight", "hotel"],
      originalPriceMinor: Math.round(Number(original) * 1000),
      salePriceMinor: Math.round(Number(sale) * 1000),
      currency: "KWD",
      nights: 3,
      active: true,
      descriptionAr: titleAr,
      descriptionEn: titleAr,
    };
    try {
      await shopFetch("/shop/platform/cms/deals", {
        method: "POST",
        body: JSON.stringify(deal),
      });
      setDeals((prev) => [deal, ...prev.filter((d) => d.slug !== deal.slug)]);
      setMsg("تم حفظ العرض — سيظهر على /deals بعد التفعيل");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }

  const funnel = stats?.funnel;

  return (
    <main style={{ padding: "1.25rem", maxWidth: 960, margin: "0 auto", direction: "rtl" }}>
      <h1>CMS · العروض والتحليلات</h1>
      <p style={{ color: "#64748b" }}>
        إدارة محتوى المنصّة دون تعديل كود الموقع. لا يؤثر على الإنتاج حتى تُفعَّل المنصّة وتُنشر.
      </p>

      {stats ? (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2>اليوم</h2>
          <p>
            الحجوزات: {stats.today.bookings ?? 0} · المبيعات:{" "}
            {((stats.today.salesMinor ?? 0) / 1000).toFixed(3)} د.ك · العملاء:{" "}
            {stats.today.customers ?? 0} · الإلغاءات: {stats.today.cancellations ?? 0} · Refunds:{" "}
            {stats.today.refunds ?? 0}
          </p>
          <h3>أكثر الوجهات</h3>
          <ul>
            {stats.topDestinations.map((d) => (
              <li key={d.label}>
                {d.label}: {d.count}
              </li>
            ))}
          </ul>
          {funnel ? (
            <>
              <h3>قمع التحويل</h3>
              <div className="wg-funnel" style={{ maxWidth: 480 }}>
                {Object.entries(funnel).map(([k, v]) => (
                  <div className="bar" key={k}>
                    <span>{k}</span>
                    <i style={{ width: `${Math.max(8, (v / (funnel.visits || 1)) * 100)}%` }} />
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2>إنشاء عرض Weekend</h2>
        <form onSubmit={addDeal} style={{ display: "grid", gap: "0.5rem", maxWidth: 420 }}>
          <input placeholder="العنوان" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          <input placeholder="slug مثل dubai-weekend" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          <input placeholder="السعر الأصلي" value={original} onChange={(e) => setOriginal(e.target.value)} />
          <input placeholder="سعر العرض" value={sale} onChange={(e) => setSale(e.target.value)} />
          <button type="submit">حفظ العرض</button>
        </form>
        {msg ? <p>{msg}</p> : null}
        <ul>
          {deals.map((d) => (
            <li key={d.id}>
              {d.titleAr} — {(d.salePriceMinor / 1000).toFixed(3)} {d.currency}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
