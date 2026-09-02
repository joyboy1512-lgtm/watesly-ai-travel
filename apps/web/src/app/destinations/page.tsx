import type { Metadata } from "next";
import Link from "next/link";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { DESTINATION_GUIDES } from "@watesly-travel/shared";

export const metadata: Metadata = {
  title: "الوجهات | Destinations — WeekendGate",
  description: "صفحات وجهات احترافية من الكويت: دبي، إسطنبول، الدوحة، البحرين، الرياض، مسقط.",
  alternates: { canonical: "https://www.weekendgate.com/destinations" },
};

export default function DestinationsIndexPage() {
  return (
    <StoreFront wide>
      <div className="wg-platform">
        <h1>🌍 الوجهات</h1>
        <p className="lead">اكتشف لماذا تسافر، أفضل وقت، التكلفة، والفنادق والأنشطة — ثم خطّط رحلتك.</p>
        <div className="wg-platform-grid">
          {DESTINATION_GUIDES.map((d) => (
            <article key={d.slug} className="wg-platform-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.image} alt={d.nameAr} />
              <div className="body">
                <h2>
                  {d.flag} {d.nameAr}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>{d.whyAr.slice(0, 90)}…</p>
                <Link className="wg-btn" href={`/destinations/${d.slug}`}>
                  استكشف {d.nameAr}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </StoreFront>
  );
}
