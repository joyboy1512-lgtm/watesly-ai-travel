import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";
import { ArticlesIndexClient } from "@/components/shop/ArticlesIndexClient";

export const metadata: Metadata = {
  title: "المقالات | Journal — WeekendGate",
  description: "مقالات ونصائح سفر من WeekendGate.",
};

export default function ArticlesPage() {
  return (
    <LegalPageShell title="المقالات">
      <ArticlesIndexClient />
    </LegalPageShell>
  );
}
