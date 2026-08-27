import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "تواصل معنا | WeekendGate",
  description: `تواصل مع ${COMPANY_LEGAL.legalNameAr} عبر الهاتف أو واتساب أو البريد.`,
};

export default function ContactPage() {
  return (
    <LegalPageShell title="تواصل معنا">
      <ul className="shop-contact-list">
        <li>
          <strong>الشركة:</strong> {COMPANY_LEGAL.legalNameAr}
        </li>
        <li>
          <strong>الهاتف:</strong>{" "}
          <a href={`tel:${COMPANY_LEGAL.phoneE164}`}>{COMPANY_LEGAL.phoneDisplay}</a>
        </li>
        <li>
          <strong>واتساب:</strong>{" "}
          <a href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
            {COMPANY_LEGAL.phoneDisplay}
          </a>
        </li>
        <li>
          <strong>البريد:</strong>{" "}
          <a href={`mailto:${COMPANY_LEGAL.supportEmail}`}>{COMPANY_LEGAL.supportEmail}</a>
        </li>
        <li>
          <strong>العنوان:</strong> {COMPANY_LEGAL.addressAr}
        </li>
        <li>
          <strong>ساعات العمل:</strong> {COMPANY_LEGAL.hoursAr}
        </li>
      </ul>
      <p>
        للاستفسار عن حجز، أرفق رقم حجز WeekendGate. يمكنك أيضًا استخدام صفحة{" "}
        <a href="/bookings/manage">إدارة حجزي</a> أو المساعد الذكي — والذي لا يؤكد
        سعرًا أو حجزًا دون الرجوع إلى النظام.
      </p>
    </LegalPageShell>
  );
}
