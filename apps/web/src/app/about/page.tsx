import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "من نحن | WeekendGate",
  description: `${COMPANY_LEGAL.legalNameAr} — منصة WeekendGate لحجز الطيران والفنادق.`,
};

export default function AboutPage() {
  return (
    <LegalPageShell title="من نحن">
      <p>
        <strong>{COMPANY_LEGAL.brandName}</strong> منصة حجز تابعة لـ
        {COMPANY_LEGAL.legalNameAr}. نساعد المسافرين من الكويت على البحث عن
        رحلات الطيران والإقامة والنقل والأنشطة في تجربة واحدة مبسّطة.
      </p>
      <p>{COMPANY_LEGAL.roleClarificationAr}</p>
      <h2>البيانات القانونية</h2>
      <ul>
        <li>
          <strong>الشركة:</strong> {COMPANY_LEGAL.legalNameAr}
        </li>
        <li>
          <strong>العنوان:</strong> {COMPANY_LEGAL.addressAr}
        </li>
        <li>
          <strong>الهاتف:</strong> {COMPANY_LEGAL.phoneDisplay}
        </li>
        <li>
          <strong>واتساب:</strong> {COMPANY_LEGAL.phoneDisplay}
        </li>
        <li>
          <strong>البريد:</strong> {COMPANY_LEGAL.supportEmail}
        </li>
        <li>
          <strong>ساعات العمل:</strong> {COMPANY_LEGAL.hoursAr}
        </li>
      </ul>
      <p>
        رقم الترخيص السياحي يُعرض في تذييل الموقع وصفحة التواصل فور اعتماده
        رسميًا في السجلات التجارية — لا نعرض عبارة «يحدث قبل الإطلاق» في بيئة
        الإنتاج.
      </p>
    </LegalPageShell>
  );
}
