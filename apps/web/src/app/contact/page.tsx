import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";
import { ContactBody } from "@/components/shop/ContactBody";

export const metadata: Metadata = {
  title: "تواصل معنا | WeekendGate",
  description: `تواصل مع ${COMPANY_LEGAL.legalNameAr} عبر الهاتف أو واتساب أو البريد.`,
};

export default function ContactPage() {
  return (
    <LegalPageShell title="تواصل معنا" titleKey="navContact">
      <ContactBody />
    </LegalPageShell>
  );
}
