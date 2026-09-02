import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { DESTINATION_GUIDES, WEEKEND_DEALS, getDestination } from "@watesly-travel/shared";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DESTINATION_GUIDES.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return { title: "وجهة" };
  return {
    title: d.seoTitleAr,
    description: d.seoDescriptionAr,
    alternates: { canonical: `https://www.weekendgate.com/destinations/${d.slug}` },
    openGraph: {
      title: d.seoTitleAr,
      description: d.seoDescriptionAr,
      images: [{ url: d.image }],
    },
  };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();
  const deals = WEEKEND_DEALS.filter((x) => x.destinationSlug === d.slug && x.active);

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <nav aria-label="breadcrumb" style={{ fontSize: "0.85rem", marginBottom: "0.75rem", color: "#64748b" }}>
          <Link href="/">الرئيسية</Link> / <Link href="/destinations">الوجهات</Link> / <span>{d.nameAr}</span>
        </nav>
        <div className="wg-dest-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image} alt={d.nameAr} />
          <div className="caption">
            <h1 style={{ color: "#fff", margin: 0 }}>
              {d.flag} {d.nameAr}
            </h1>
            <p style={{ margin: "0.25rem 0 0" }}>{d.countryAr} · {d.airportCode}</p>
          </div>
        </div>

        <div className="wg-dest-sections">
          <section>
            <h2>لماذا {d.nameAr}؟</h2>
            <p style={{ margin: 0 }}>{d.whyAr}</p>
          </section>
          <section>
            <h2>أفضل وقت للزيارة</h2>
            <p style={{ margin: 0 }}>{d.bestTimeAr}</p>
          </section>
          <section>
            <h2>تكلفة الرحلة</h2>
            <p style={{ margin: 0 }}>{d.costHintAr}</p>
          </section>
          <section>
            <h2>أفضل الفنادق</h2>
            <ul>{d.hotelsAr.map((h) => <li key={h}>{h}</li>)}</ul>
          </section>
          <section>
            <h2>أفضل الأنشطة</h2>
            <ul>{d.activitiesAr.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
          <section>
            <h2>رحلات الطيران</h2>
            <p style={{ margin: 0 }}>{d.flightHintAr}</p>
            <p>
              <Link className="wg-btn secondary" href={`/flights/results?origin=KWI&destination=${d.airportCode}&tripType=roundtrip&adults=1`}>
                بحث رحلات إلى {d.nameAr}
              </Link>
            </p>
          </section>
          {deals.length ? (
            <section>
              <h2>Weekend Deals</h2>
              <ul>
                {deals.map((deal) => (
                  <li key={deal.id}>
                    <Link href={`/deals/${deal.slug}`}>{deal.titleAr}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2>برامج مقترحة</h2>
            <p style={{ margin: 0 }}>عطلة 3 ليالٍ: طيران + فندق + نقل — أو ابنِ برنامجك بالكامل.</p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <Link className="wg-btn" href={`/trip-builder?destination=${d.slug}`}>
                ✨ خطط رحلتي إلى {d.nameAr}
              </Link>
              <Link className="wg-btn secondary" href="/deals">
                كل العروض
              </Link>
            </div>
          </section>
        </div>
      </div>
    </StoreFront>
  );
}
