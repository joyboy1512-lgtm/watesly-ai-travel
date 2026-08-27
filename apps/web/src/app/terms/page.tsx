import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "الشروط والأحكام | WeekendGate",
  description: "الشروط والأحكام العامة لاستخدام منصة WeekendGate.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="الشروط والأحكام">
      <p>باستخدامك لموقع WeekendGate فإنك توافق على الشروط التالية:</p>
      <ol>
        <li>الأسعار والتوفر عرضة للتغيير حتى تأكيد الحجز.</li>
        <li>أنت مسؤول عن صحة بيانات المسافرين وجوازات السفر.</li>
        <li>قد نستخدم مزوّدين خارجيين لتنفيذ الحجز وفق سياساتهم.</li>
        <li>لا يجوز إساءة استخدام المنصة أو محاولة التلاعب بالأسعار.</li>
      </ol>
    </LegalPageShell>
  );
}
