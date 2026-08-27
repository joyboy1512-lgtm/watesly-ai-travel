import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "من نحن | WeekendGate",
  description: "تعرف على WeekendGate — منصة سفر كويتية لحجز الطيران والفنادق والنقل.",
};

export default function AboutPage() {
  return (
    <LegalPageShell title="من نحن">
      <p>
        WeekendGate منصة سفر كويتية تساعدك على البحث عن رحلات الطيران والإقامة
        والنقل والأنشطة في تجربة واحدة مبسّطة.
      </p>
      <p>
        نعمل حاليًا على ربط مزوّدين حقيقيين للطيران والفنادق. أثناء مرحلة
        الاختبار، قد تظهر نتائج تجريبية بوضوح في واجهة البحث.
      </p>
      <h2>البيانات القانونية</h2>
      <p>
        رقم الترخيص والعنوان التجاري سيُعرضان بشكل رسمي قبل الإطلاق. أثناء
        الاختبار تُعرض بيانات مؤقتة فقط.
      </p>
    </LegalPageShell>
  );
}
