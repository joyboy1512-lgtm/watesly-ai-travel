"use client";

import { use } from "react";
import { StoreFront } from "@/components/shop/StoreFront";
import { TripFileView } from "@/components/trip-builder/TripFileView";

export default function MyTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <StoreFront wide>
      <TripFileView tripId={id} />
    </StoreFront>
  );
}
