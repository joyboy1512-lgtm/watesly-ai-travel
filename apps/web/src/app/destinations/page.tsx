import type { Metadata } from "next";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { DestinationsIndexClient } from "@/components/platform/DestinationsIndexClient";

export const metadata: Metadata = {
  title: "الوجهات | Destinations — WeekendGate",
  description: "صفحات وجهات احترافية من الكويت: دبي، إسطنبول، الدوحة، البحرين، الرياض، مسقط.",
  alternates: { canonical: "https://www.weekendgate.com/destinations" },
};

export default function DestinationsIndexPage() {
  return (
    <StoreFront wide>
      <DestinationsIndexClient />
    </StoreFront>
  );
}
