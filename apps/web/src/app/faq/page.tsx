import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";
import { FaqBody } from "@/components/shop/FaqBody";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | FAQ — WeekendGate",
  description: "إجابات حول الطيران والفنادق والدفع والدعم في WeekendGate.",
};

const FAQ_JSON = [
  {
    q: "كيف أختار رحلة الذهاب والعودة؟",
    a: "يمكنك اختيار العرض كاملًا بزر «اختيار هذه الرحلة»، أو تحديد مربع الذهاب ومربع العودة لتكوين رحلة مخصصة تظهر أعلى النتائج.",
  },
  {
    q: "لماذا تظهر فنادق من مدينة مجاورة؟",
    a: "نستخدم الإحداثيات والمسافة. فعّل فلتر «داخل الوجهة فقط» لعرض فنادق المدينة المطلوبة بوضوح.",
  },
  {
    q: "هل الأسعار نهائية عند الظهور؟",
    a: "لا. نعيد التحقق (Reprice) قبل المراجعة والحجز. التأكيد النهائي يظهر فقط بعد تأكيد المزوّد.",
  },
  {
    q: "ما وسائل الدفع؟",
    a: "عند تفعيل حساب التاجر: بطاقات عبر صفحة مستضافة، KNET، وApple Pay. لا نخزّن أرقام البطاقات أو CVV.",
  },
  {
    q: "كيف أدير حجزي أو أطلب إلغاء؟",
    a: `استخدم صفحة إدارة حجزي أو واتساب ${COMPANY_LEGAL.phoneDisplay} أو ${COMPANY_LEGAL.supportEmail}. الإلغاء لا يُنفَّذ تلقائيًا دون تحقق.`,
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_JSON.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function FaqPage() {
  return (
    <LegalPageShell title="الأسئلة الشائعة" titleKey="navFaq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqBody />
    </LegalPageShell>
  );
}
