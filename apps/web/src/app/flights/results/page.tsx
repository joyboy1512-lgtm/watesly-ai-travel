import { Suspense } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopFlightResultsClient } from "@/components/shop/ShopFlightResultsClient";

export const metadata = {
  title: "نتائج الطيران | WeekendGate",
  description: "قارن رحلات الطيران واختر أفضل عرض",
};

export default function FlightResultsPage() {
  return (
    <StoreFront wide>
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
