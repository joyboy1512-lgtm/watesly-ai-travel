import { Suspense } from "react";
import type { Metadata } from "next";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopActivityResultsClient } from "@/components/shop/ShopActivityResultsClient";

export const metadata: Metadata = {
  title: "نتائج الأنشطة",
  description: "اختر نشاطاً يناسب رحلتك — WeekendGate",
  robots: { index: false, follow: false },
};

export default function ActivityResultsPage() {
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
        <ShopActivityResultsClient />
      </Suspense>
    </StoreFront>
  );
}
