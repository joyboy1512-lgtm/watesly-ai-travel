import { Suspense } from "react";
import type { Metadata } from "next";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopFlightResultsClient } from "@/components/shop/ShopFlightResultsClient";

export const metadata: Metadata = {
  title: "نتائج الطيران",
  description: "قارن رحلات الطيران واختر أفضل عرض — WeekendGate",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://www.weekendgate.com/flights/results",
  },
};

export default function FlightResultsPage() {
  return (
    <StoreFront wide>
      <h1 className="shop-flight-results-h1">نتائج البحث عن رحلات الطيران</h1>
      <Suspense
        fallback={
          <div className="shop-flight-results-loading">
            <div className="shop-flight-spinner" aria-hidden />
            <p>جاري تحميل صفحة النتائج…</p>
          </div>
        }
      >
        <ShopFlightResultsClient />
      </Suspense>
    </StoreFront>
  );
}
