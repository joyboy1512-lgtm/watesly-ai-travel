"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StoreFront } from "@/components/shop/StoreFront";
import { useTripBuilder } from "@/components/trip-builder/TripBuilderProvider";
import { ruheltiEnabled } from "@/lib/trip-builder/flags";
import "../shop.css";
import "../platform.css";
import "../travela-skin.css";
import "@/components/trip-builder/trip-builder.css";

function TripBuilderEntry() {
  const sp = useSearchParams();
  const router = useRouter();
  const { openBoarding } = useTripBuilder();

  useEffect(() => {
    if (!ruheltiEnabled()) {
      router.replace("/");
      return;
    }
    openBoarding({
      origin: sp.get("origin") || undefined,
      originLabel: sp.get("originLabel") || undefined,
      destination: sp.get("destination") || undefined,
      destinationLabel: sp.get("destinationLabel") || undefined,
      departDate: sp.get("departDate") || sp.get("checkIn") || undefined,
      returnDate: sp.get("returnDate") || sp.get("checkOut") || undefined,
      tripType: (sp.get("tripType") as "roundtrip" | "oneway" | "multicity") || "roundtrip",
      adults: Number(sp.get("adults") || 1),
      children: Number(sp.get("children") || 0),
      infants: Number(sp.get("infants") || 0),
      cabinClass: sp.get("cabinClass") || "economy",
      directOnly: sp.get("directOnly") === "1",
    });
    router.replace("/");
  }, [openBoarding, router, sp]);

  return (
    <div className="wg-trip-flow">
      <p>جاري فتح رحلتي…</p>
    </div>
  );
}

export default function TripBuilderPage() {
  return (
    <StoreFront wide>
      <Suspense fallback={<p className="wg-trip-flow">جاري التحميل…</p>}>
        <TripBuilderEntry />
      </Suspense>
    </StoreFront>
  );
}
