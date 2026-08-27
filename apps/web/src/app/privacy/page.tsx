import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | WeekendGate",
  description: "كيف تجمع WeekendGate بياناتك وتستخدمها وتحميها.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="سياسة الخصوصية">
      <h2>البيانات التي نجمعها</h2>
      <p>
        قد نجمع اسمك، رقم جوالك، بريدك الإلكتروني، وتفاصيل البحث والحجز لتقديم
        الخدمة ومتابعة طلبك.
      </p>
      <h2>حماية الدفع والبيانات</h2>
      <p>
        عند تفعيل الدفع الإلكتروني، تتم معالجة بيانات البطاقة عبر بوابة دفع
        معتمدة ولا تُخزَّن بيانات CVV على خوادمنا.
      </p>
      <h2>مشاركة البيانات</h2>
      <p>
        نشارك البيانات الضرورية فقط مع شركات الطيران والفنادق والمزوّدين
        لتنفيذ حجزك.
      </p>
    </LegalPageShell>
  );
}
