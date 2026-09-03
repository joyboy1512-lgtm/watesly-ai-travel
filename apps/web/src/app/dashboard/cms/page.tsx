"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import type { WeekendDeal } from "@watesly-travel/shared";

/**
 * Staff CMS for platform deals and funnel stats.
 * Mutations require staff JWT (providers.manage / conversations.read).
 */
export default function DashboardCmsPage() {
  const [deals, setDeals] = useState<WeekendDeal[]>([]);
  const [titleAr, setTitleAr] = useState("");
  const [slug, setSlug] = useState("");
  const [sale, setSale] = useState("199");
  const [original, setOriginal] = useState("229");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{
    today: Record<string, number>;
    topDestinations: Array<{ label: string; count: number }>;
    funnel: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    apiFetch<WeekendDeal[]>("/shop/platform/deals")
      .then(setDeals)
      .catch((err: Error) => setError(err.message));
    apiFetch<typeof stats>("/shop/platform/admin/stats")
      .then(setStats)
      .catch(() => undefined);
  }, []);

  async function addDeal(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
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
      await apiFetch("/shop/platform/cms/deals", {
        method: "POST",
        body: JSON.stringify(deal),
      });
      setDeals((prev) => [deal, ...prev.filter((d) => d.slug !== deal.slug)]);
      setMsg("تم حفظ العرض — يظهر على /deals في الموقع");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }

  const funnel = stats?.funnel;

  return (
    <AppShell title="CMS · العروض والتحليلات">
      <p className="hint">
        إدارة محتوى WeekendGate من لوحة التحكم. العروض المحفوظة تظهر على صفحة{" "}
        <a href="/deals" target="_blank" rel="noreferrer">
          /deals
        </a>
        .
      </p>
      {error ? <p className="error">{error}</p> : null}

      {stats ? (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>اليوم</h2>
          <p>
            الحجوزات: {stats.today.bookings ?? 0} · المبيعات:{" "}
            {((stats.today.salesMinor ?? 0) / 1000).toFixed(3)} د.ك · العملاء:{" "}
            {stats.today.customers ?? 0} · الإلغاءات: {stats.today.cancellations ?? 0}
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

      <section className="card">
        <h2>إنشاء عرض Weekend</h2>
        <form onSubmit={addDeal} className="form-grid" style={{ maxWidth: 420 }}>
          <label>
            العنوان
            <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          </label>
          <label>
            slug (مثل dubai-weekend)
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label>
            السعر الأصلي
            <input value={original} onChange={(e) => setOriginal(e.target.value)} />
          </label>
          <label>
            سعر العرض
            <input value={sale} onChange={(e) => setSale(e.target.value)} />
          </label>
          <button type="submit" className="btn primary">
            حفظ العرض
          </button>
        </form>
        {msg ? <p className="hint">{msg}</p> : null}
        <ul>
          {deals.map((d) => (
            <li key={d.id}>
              {d.titleAr} — {(d.salePriceMinor / 1000).toFixed(3)} {d.currency}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
