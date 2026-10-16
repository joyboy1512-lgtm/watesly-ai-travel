"use client";

import { useShopCopy } from "@/components/shop/ShopI18nProvider";

/** Shared demo/mock notice — flights vs hotels copy. */
export function ShopMockBanner({
  compact = false,
  kind = "flight",
}: {
  compact?: boolean;
  kind?: "flight" | "hotel";
}) {
  const { locale } = useShopCopy();
  if (kind === "hotel") {
    return (
      <div
        className={`shop-flight-mock-banner shop-hotel-sandbox-banner${compact ? " compact" : ""}`}
        role="status"
      >
        <strong>
          {locale === "en"
            ? "Sample result from Hotelbeds Sandbox"
            : "نتيجة تجريبية من Hotelbeds Sandbox"}
        </strong>
        <span>
          {compact
            ? locale === "en"
              ? "Prices and availability are for testing — no real booking is created."
              : "الأسعار والتوفر للاختبار — لا يتم إنشاء حجز حقيقي."
            : locale === "en"
              ? "Prices and availability are for testing only. No real booking is created. Production data will replace these results at launch."
              : "الأسعار والتوفر للاختبار فقط. لا يتم إنشاء حجز حقيقي. ستُستبدل البيانات بنتائج Production عند الإطلاق."}
        </span>
      </div>
    );
  }

  return (
    <div className={`shop-flight-mock-banner${compact ? " compact" : ""}`} role="status">
      <strong>{locale === "en" ? "Sample results" : "نتائج تجريبية"}</strong>
      <span>
        {compact
          ? locale === "en"
            ? "This is a test stage — prices and providers are not live yet."
            : "هذه مرحلة اختبار — الأسعار والمزوّدون غير حقيقيين حتى ربط الخدمة."
          : locale === "en"
            ? "The displayed fares, flights, and providers are for testing only and will be replaced by live offers when the flight provider is connected."
            : "الأسعار والرحلات والمزوّدون المعروضون للاختبار فقط — سيتم استبدالهم بعروض حية عند ربط مزوّد الطيران."}
      </span>
    </div>
  );
}
