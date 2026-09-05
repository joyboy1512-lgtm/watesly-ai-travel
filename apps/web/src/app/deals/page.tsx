import type { Metadata } from "next";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { fetchShopDeals } from "@/lib/shop-server";
import { DealsIndexClient } from "@/components/platform/DealsIndexClient";

export const metadata: Metadata = {
  title: "Weekend Deals | عروض نهاية الأسبوع — WeekendGate",
  description: "عروض طيران + فندق + نقل من الكويت: دبي، البحرين، الدوحة، إسطنبول والمزيد.",
  alternates: { canonical: "https://www.weekendgate.com/deals" },
};

export default async function DealsPage() {
  const deals = await fetchShopDeals();
  return (
    <StoreFront wide>
      <DealsIndexClient deals={deals} />
    </StoreFront>
  );
}
