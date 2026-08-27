import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | WeekendGate",
  description: "إجابات حول الطيران والفنادق والدفع والدعم في WeekendGate.",
};

const FAQ = [
  {
    cat: "طيران",
    q: "كيف أختار رحلة الذهاب والعودة؟",
    a: "نعرض الرحلة كاملة (الذهاب والعودة معًا) في بطاقة واحدة. اضغط «اختيار هذه الرحلة» ثم اختر فئة السعر المناسبة.",
  },
  {
    cat: "فنادق",
    q: "لماذا تظهر فنادق من مدينة مجاورة؟",
    a: "نستخدم الإحداثيات والمسافة. فعّل فلتر «داخل الوجهة فقط» لعرض فنادق المدينة المطلوبة بوضوح.",
  },
  {
    cat: "دفع",
    q: "هل الأسعار نهائية عند الظهور؟",
    a: "لا. نعيد التحقق (Reprice) قبل المراجعة والحجز. التأكيد النهائي يظهر فقط بعد تأكيد المزوّد.",
  },
  {
    cat: "دفع",
    q: "ما وسائل الدفع؟",
    a: "عند تفعيل حساب التاجر: بطاقات عبر صفحة مستضافة، KNET، وApple Pay. لا نخزّن أرقام البطاقات أو CVV.",
  },
  {
    cat: "دعم",
    q: "كيف أدير حجزي أو أطلب إلغاء؟",
    a: `استخدم صفحة إدارة حجزي أو واتساب ${COMPANY_LEGAL.phoneDisplay} أو ${COMPANY_LEGAL.supportEmail}. الإلغاء لا يُنفَّذ تلقائيًا دون تحقق.`,
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function FaqPage() {
  return (
    <LegalPageShell title="الأسئلة الشائعة">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {FAQ.map((item) => (
        <details key={item.q} className="shop-faq-item">
          <summary>
            <span className="shop-faq-cat">{item.cat}</span> {item.q}
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
      <p>
        مساعدة إضافية:{" "}
        <a href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
          واتساب
        </a>{" "}
        · <a href="/bookings/manage">إدارة حجزي</a> ·{" "}
        <a href="/contact">تواصل</a>
      </p>
    </LegalPageShell>
  );
}
