import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "سياسة الحجز والدفع | WeekendGate",
  description: "سياسة الحجز والتعديل والإلغاء والاسترداد والدفع في WeekendGate.",
};

export default function BookingPolicyPage() {
  return (
    <LegalPageShell title="سياسة الحجز والتعديل والإلغاء والدفع" titleKey="navPolicy">
      <h2>دور WeekendGate والمزوّد</h2>
      <p>{COMPANY_LEGAL.roleClarificationAr}</p>
      <h2>إعادة التسعير</h2>
      <p>
        قبل التأكيد نعيد التحقق من السعر والتوفر (Reprice). إذا تغيّر السعر أو
        انتهى العرض نطلب موافقتك أو نعيدك للنتائج. لا نعرض «تم التأكيد» قبل وصول
        تأكيد حقيقي من المزوّد.
      </p>
      <h2>الضرائب في الفندق</h2>
      <p>
        بعض الضرائب والرسوم تُدفع في مكان الإقامة (مثل ضريبة بلدية). نعرض ما
        يُدفع الآن وما يُدفع في الفندق عند توفر البيانات من المزوّد.
      </p>
      <h2>الدفع</h2>
      <p>
        ندعم صفحة دفع مستضافة و/أو ترميزًا. لا نخزّن أرقام البطاقات أو CVV.
        نجاح الدفع يُثبت عبر Webhook موقّع ومطابقة المبلغ مع آخر Reprice، مع
        Idempotency لمنع التكرار.
      </p>
      <h2>التعديل والإلغاء والاسترداد</h2>
      <p>
        تخضع لشروط شركة الطيران أو الفندق. طلبات التعديل/الإلغاء عبر{" "}
        <a href="/bookings/manage">إدارة حجزي</a> أو واتساب{" "}
        {COMPANY_LEGAL.phoneDisplay} — ولا تُنفَّذ تلقائيًا دون تحقق وصلاحية.
      </p>
    </LegalPageShell>
  );
}
