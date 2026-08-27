import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "تواصل معنا | WeekendGate",
  description: "تواصل مع فريق WeekendGate — هاتف، بريد، ودعم عبر المساعد الذكي.",
};

export default function ContactPage() {
  return (
    <LegalPageShell title="تواصل معنا">
      <ul className="shop-contact-list">
        <li>
          <strong>الهاتف:</strong> +965 2222 0000
        </li>
        <li>
          <strong>البريد:</strong> support@weekendgate.com
        </li>
        <li>
          <strong>العنوان:</strong> الكويت — شارع الخليج، برج WeekendGate
        </li>
        <li>
          <strong>ساعات الدعم:</strong> 24/7 عبر المساعد الذكي
        </li>
      </ul>
      <p>
        للاستفسارات العاجلة عن حجز قائم، يرجى تجهيز رقم الطلب أو رقم الجوال
        المستخدم في البحث.
      </p>
    </LegalPageShell>
  );
}
