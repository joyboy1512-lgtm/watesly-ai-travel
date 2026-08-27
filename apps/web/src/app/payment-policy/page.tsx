import type { Metadata } from "next";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { LegalPageShell } from "@/components/shop/LegalPageShell";

export const metadata: Metadata = {
  title: "سياسة الدفع | WeekendGate",
  description: "وسائل الدفع وحماية المعاملات في WeekendGate.",
};

export default function PaymentPolicyPage() {
  return (
    <LegalPageShell title="سياسة الدفع">
      <p>
        تشغّل {COMPANY_LEGAL.legalNameAr} المدفوعات عبر بوابات معتمدة عند تفعيل
        حساب التاجر. في وضع Sandbox لا تُخصم مبالغ حقيقية.
      </p>
      <ul>
        <li>بطاقات عبر Hosted Payment Page أو Tokenization</li>
        <li>KNET عند توفر الحساب</li>
        <li>Apple Pay عند توفر الحساب</li>
      </ul>
      <p>
        لا تُعتبر عملية الدفع ناجحة اعتمادًا على Redirect فقط. نطابق المبلغ مع
        آخر تسعير للحجز ونستخدم مفتاح Idempotency.
      </p>
      <p>
        هيكل الدفع جاهز (Payment Intent + Idempotency + Webhook موقّع). عند توفر
        حساب التاجر تُضبط المتغيرات: PAYMENT_MERCHANT_ID و PAYMENT_API_KEY و
        PAYMENT_WEBHOOK_SECRET مع تفعيل KNET / Apple Pay. حتى ذلك الحين يبقى
        الدفع في وضع إعداد آمن دون خصم حقيقي تلقائي.
      </p>
      <p>
        للاستفسار:{" "}
        <a href={`mailto:${COMPANY_LEGAL.supportEmail}`}>{COMPANY_LEGAL.supportEmail}</a>
      </p>
    </LegalPageShell>
  );
}
