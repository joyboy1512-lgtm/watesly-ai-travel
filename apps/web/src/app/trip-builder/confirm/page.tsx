"use client";

import { StoreFront } from "@/components/shop/StoreFront";
import { TripConfirmView } from "@/components/trip-builder/TripConfirmView";

export default function TripConfirmPage() {
  return (
    <StoreFront wide>
      <TripConfirmView />
    </StoreFront>
  );
}
