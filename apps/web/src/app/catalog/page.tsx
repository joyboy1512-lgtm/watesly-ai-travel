import type { Metadata } from "next";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { CatalogIndexClient } from "@/components/shop/CatalogIndexClient";

export const metadata: Metadata = {
  title: "الكتالوج | WhatsApp Catalog — WeekendGate",
  description: "كتالوج عروض WeekendGate للطلب عبر واتساب وميتا.",
  alternates: { canonical: "https://www.weekendgate.com/catalog" },
};

export default function CatalogPage() {
  return (
    <StoreFront wide>
      <CatalogIndexClient />
    </StoreFront>
  );
}
