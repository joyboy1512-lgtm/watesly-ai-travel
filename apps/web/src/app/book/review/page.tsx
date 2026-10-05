"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { HotelBookReview } from "@/components/shop/HotelBookReview";
import { FlightBookReview } from "@/components/shop/FlightBookReview";
import {
  getBookingDraft,
  type BookingDraft,
} from "@/lib/booking-draft";

export default function BookReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    const loaded = getBookingDraft();
    if (!loaded || (loaded.serviceType !== "flight" && loaded.serviceType !== "hotel")) {
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
      {draft.serviceType === "hotel" ? (
        <HotelBookReview booking={draft} />
      ) : draft.serviceType === "flight" ? (
        <FlightBookReview booking={draft} />
      ) : null}
    </StoreFront>
  );
}
