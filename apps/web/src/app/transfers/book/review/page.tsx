"use client";

import "../../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AncillaryBookReview } from "@/components/shop/AncillaryBookReview";

export default function TransferBookReviewPage() {
  return (
    <StoreFront>
      <AncillaryBookReview kind="transfer" />
    </StoreFront>
  );
}
