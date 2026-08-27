import { Suspense } from "react";
import type { Metadata } from "next";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopHotelResultsClient } from "@/components/shop/ShopHotelResultsClient";

export const metadata: Metadata = {
  title: "نتائج الفنادق",
  description: "قارن الفنادق والإقامات واختر أفضل عرض — WeekendGate",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://www.weekendgate.com/hotels/results",
  },
};

export default function HotelResultsPage() {
  return (
    <StoreFront wide>
      <h1 className="shop-flight-results-h1">نتائج البحث عن الفنادق والإقامات</h1>
      <Suspense
        fallback={
          <div className="shop-flight-results-loading">
            <div className="shop-flight-spinner" aria-hidden />
            <p>جاري تحميل صفحة النتائج…</p>
          </div>
        }
      >
        <ShopHotelResultsClient />
      </Suspense>
    </StoreFront>
  );
}
