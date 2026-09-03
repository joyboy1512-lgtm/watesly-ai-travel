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
      <Suspense
        fallback={
          <div className="shop-flight-results-loading">
            <div className="shop-flight-spinner" aria-hidden />
            <p>…</p>
          </div>
        }
      >
        <ShopHotelResultsClient />
      </Suspense>
    </StoreFront>
  );
}
