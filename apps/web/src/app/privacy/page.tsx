import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | WeekendGate",
  description: "كيف تجمع WeekendGate بياناتك وتستخدمها وتحميها.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="سياسة الخصوصية">
      <p>
        تشغّل {COMPANY_LEGAL.legalNameAr} منصة WeekendGate. توضح هذه السياسة كيف
        نتعامل مع بياناتك الشخصية.
      </p>
      <h2>البيانات التي نجمعها</h2>
      <p>
        قد نجمع الاسم، رقم الجوال، البريد الإلكتروني، تفضيلات البحث، وبيانات
        المسافرين/الضيوف اللازمة لتنفيذ الحجز. لا نخزّن أرقام البطاقات أو CVV.
      </p>
      <h2>حماية الدفع</h2>
      <p>
        عند تفعيل الدفع الإلكتروني تتم المعالجة عبر صفحة استضافة للبوابة أو
        ترميز (tokenization). التحقق من نجاح الدفع يعتمد على Webhook موقّع وليس
        على إعادة التوجيه وحدها.
      </p>
      <h2>مشاركة البيانات</h2>
      <p>
        نشارك الحد الأدنى اللازم مع مزوّدي الطيران والفنادق وبوابات الدفع لتنفيذ
        طلبك. لا نبيع بياناتك لأطراف تسويقية.
      </p>
      <h2>حقوقك</h2>
      <p>
        يمكنك طلب نسخة من بياناتك أو حذف الحساب عبر{" "}
        <a href={`mailto:${COMPANY_LEGAL.supportEmail}`}>{COMPANY_LEGAL.supportEmail}</a>{" "}
        أو واتساب {COMPANY_LEGAL.phoneDisplay}.
      </p>
    </LegalPageShell>
  );
}
