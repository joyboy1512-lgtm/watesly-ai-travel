"use client";

import { StoreFront } from "@/components/shop/StoreFront";
import { TripTravelersForm } from "@/components/trip-builder/TripTravelersForm";

export default function TripTravelersPage() {
  return (
    <StoreFront wide>
      <TripTravelersForm />
    </StoreFront>
  );
}
