import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "تواصل معنا | WeekendGate",
  description: "تواصل مع فريق WeekendGate — هاتف، بريد، ودعم عبر المساعد الذكي.",
};

export default function ContactPage() {
  return (
    <LegalPageShell title="تواصل معنا">
      <p className="shop-legal-note">
        بيانات الاتصال أدناه مؤقتة أثناء مرحلة الاختبار وسيتم تحديثها قبل الإطلاق.
      </p>
      <ul className="shop-contact-list">
        <li>
          <strong>الهاتف:</strong> يُعلن قريبًا
        </li>
        <li>
          <strong>البريد:</strong> support@weekendgate.com
        </li>
        <li>
          <strong>العنوان:</strong> الكويت
        </li>
        <li>
          <strong>ساعات الدعم:</strong> عبر المساعد الذكي داخل الموقع
        </li>
      </ul>
      <p>
        للاستفسارات أثناء الاختبار، استخدم المساعد الذكي أو البريد الإلكتروني
        أعلاه مع رقم الطلب إن وُجد.
      </p>
    </LegalPageShell>
  );
}
