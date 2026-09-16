"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { HotelBookReview } from "@/components/shop/HotelBookReview";
import { getBookingDraft, type HotelBookingDraft } from "@/lib/booking-draft";

export default function HotelBookReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelBookingDraft | null>(null);

  useEffect(() => {
    const loaded = getBookingDraft();
    if (!loaded || loaded.serviceType !== "hotel") {
      router.replace("/");
      return;
    }
    setDraft(loaded);
  }, [router]);

  if (!draft) {
    return (
      <StoreFront>
        <div className="shop-flight-review-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>جاري تحميل مراجعة الحجز…</p>
        </div>
      </StoreFront>
    );
  }

  return (
    <StoreFront>
      <HotelBookReview booking={draft} />
    </StoreFront>
  );
}
