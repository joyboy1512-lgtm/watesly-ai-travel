"use client";

import { StoreFront } from "@/components/shop/StoreFront";
import { TripResultsView } from "@/components/trip-builder/TripResultsView";

export default function TripResultsPage() {
  return (
    <StoreFront wide>
      <TripResultsView />
    </StoreFront>
  );
}
