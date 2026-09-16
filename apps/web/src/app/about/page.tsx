import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";
import { AboutBody } from "@/components/shop/AboutBody";

export const metadata: Metadata = {
  title: "من نحن | About — WeekendGate",
  description: `${COMPANY_LEGAL.legalNameAr} — WeekendGate flights and hotels.`,
};

export default function AboutPage() {
  return (
    <LegalPageShell title="من نحن" titleKey="navAbout">
      <AboutBody />
    </LegalPageShell>
  );
}
