"use client";

import { StoreFront } from "@/components/shop/StoreFront";
import { TripPaymentView } from "@/components/trip-builder/TripPaymentView";

export default function TripPaymentPage() {
  return (
    <StoreFront wide>
      <TripPaymentView />
    </StoreFront>
  );
}
