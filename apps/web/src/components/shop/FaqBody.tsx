"use client";

import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

const FAQ = {
  ar: [
    {
      cat: "طيران",
      q: "كيف أختار رحلة الذهاب والعودة؟",
      a: "يمكنك اختيار العرض كاملًا بزر «اختيار هذه الرحلة»، أو تحديد مربع الذهاب ومربع العودة لتكوين رحلة مخصصة تظهر أعلى النتائج.",
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
  ],
  en: [
    {
      cat: "Flights",
      q: "How do I choose outbound and return flights?",
      a: "Select the full offer with “Choose this flight”, or tick outbound and return boxes to mix a custom trip shown above the results.",
    },
    {
      cat: "Hotels",
      q: "Why do nearby-city hotels appear?",
      a: "We use coordinates and distance. Turn on “Inside destination only” to show hotels in the selected city.",
    },
    {
      cat: "Payment",
      q: "Are displayed prices final?",
      a: "No. We reprice before review and booking. Final confirmation appears only after the supplier confirms.",
    },
    {
      cat: "Payment",
      q: "What payment methods are available?",
      a: "When the merchant account is live: hosted card payments, KNET, and Apple Pay. We never store card numbers or CVV.",
    },
    {
      cat: "Support",
      q: "How do I manage or cancel a booking?",
      a: `Use Manage booking, WhatsApp ${COMPANY_LEGAL.phoneDisplay}, or ${COMPANY_LEGAL.supportEmail}. Cancellations are not automatic without verification.`,
    },
  ],
};

export function FaqBody() {
  const { t, locale } = useShopI18n();
  const items = FAQ[locale];
  return (
    <>
      {items.map((item) => (
        <details key={item.q} className="shop-faq-item">
          <summary>
            <span className="shop-faq-cat">{item.cat}</span> {item.q}
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
      <p>
        {t("moreHelp")}:{" "}
        <a href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
          {t("whatsapp")}
        </a>{" "}
        · <a href="/bookings/manage">{t("manageBooking")}</a> ·{" "}
        <a href="/contact">{t("navContact")}</a>
      </p>
    </>
  );
}
