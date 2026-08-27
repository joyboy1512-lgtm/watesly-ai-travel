import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "الشروط والأحكام | WeekendGate",
  description: "الشروط والأحكام العامة لاستخدام منصة WeekendGate.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="الشروط والأحكام">
      <p>
        باستخدامك لموقع WeekendGate التابع لـ{COMPANY_LEGAL.legalNameAr} فإنك
        توافق على ما يلي:
      </p>
      <ol>
        <li>الأسعار والتوفر عرضة للتغيير حتى تأكيد الحجز بعد إعادة التسعير.</li>
        <li>أنت مسؤول عن صحة بيانات المسافرين وجوازات السفر كما في الوثيقة.</li>
        <li>
          WeekendGate واجهة حجز؛ تنفيذ الخدمة يتم عبر مزوّدين خارجيين وفق
          سياساتهم، وقد تُدفع ضرائب/رسوم في مكان الإقامة.
        </li>
        <li>لا يجوز إساءة استخدام المنصة أو محاولة التلاعب بالأسعار أو الأنظمة.</li>
        <li>
          وسائل الدفع المعتمدة عند التفعيل: بطاقات عبر صفحة مستضافة، KNET، وApple
          Pay — حسب حساب التاجر المتاح.
        </li>
      </ol>
      <p>
        للتواصل: {COMPANY_LEGAL.supportEmail} · {COMPANY_LEGAL.phoneDisplay} ·{" "}
        {COMPANY_LEGAL.addressAr}
      </p>
    </LegalPageShell>
  );
}
