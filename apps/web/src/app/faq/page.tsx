import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | WeekendGate",
  description: "إجابات على الأسئلة الشائعة حول الحجز والدفع والدعم في WeekendGate.",
};

const FAQ = [
  {
    q: "هل الأسعار المعروضة نهائية؟",
    a: "أثناء الاختبار تظهر نتائج تجريبية. السعر النهائي يُؤكَّد بعد مراجعة الطلب وربط المزوّد الحقيقي.",
  },
  {
    q: "هل أدفع مباشرة من الموقع؟",
    a: "لا. حاليًا يتم حفظ طلبك ومتابعته مع فريق الحجز قبل أي دفع.",
  },
  {
    q: "هل يمكنني تعديل رحلة الذهاب والعودة بشكل منفصل؟",
    a: "نعم، في نتائج الطيران يمكنك اختيار الذهاب من عرض والعودة من عرض آخر ثم مراجعة السعر الإجمالي.",
  },
  {
    q: "ما وسائل الدفع المقبولة؟",
    a: "K-Net وبطاقات Visa/Mastercard (عند تفعيل الدفع الإلكتروني). يتم إعلامك بالخيارات المتاحة قبل إتمام الحجز.",
  },
];

export default function FaqPage() {
  return (
    <LegalPageShell title="الأسئلة الشائعة">
      {FAQ.map((item) => (
        <details key={item.q} className="shop-faq-item">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </LegalPageShell>
  );
}
