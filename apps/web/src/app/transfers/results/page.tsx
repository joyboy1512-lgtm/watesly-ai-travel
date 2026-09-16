import { Suspense } from "react";
import type { Metadata } from "next";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopTransferResultsClient } from "@/components/shop/ShopTransferResultsClient";

export const metadata: Metadata = {
  title: "نتائج النقل",
  description: "قارن خيارات النقل من المطار واختر الأنسب — WeekendGate",
  robots: { index: false, follow: false },
};

export default function TransferResultsPage() {
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
        <ShopTransferResultsClient />
      </Suspense>
    </StoreFront>
  );
}
