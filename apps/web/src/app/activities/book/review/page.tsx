"use client";

import "../../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AncillaryBookReview } from "@/components/shop/AncillaryBookReview";

export default function ActivityBookReviewPage() {
  return (
    <StoreFront>
      <AncillaryBookReview kind="activity" />
    </StoreFront>
  );
}
