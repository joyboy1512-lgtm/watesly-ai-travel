/** Shared demo/mock notice — flights vs hotels copy. */
export function ShopMockBanner({
  compact = false,
  kind = "flight",
}: {
  compact?: boolean;
  kind?: "flight" | "hotel";
}) {
  if (kind === "hotel") {
    return (
      <div
        className={`shop-flight-mock-banner shop-hotel-sandbox-banner${compact ? " compact" : ""}`}
        role="status"
      >
        <strong>نتيجة تجريبية من Hotelbeds Sandbox</strong>
        <span>
          {compact
            ? "الأسعار والتوفر للاختبار — لا يتم إنشاء حجز حقيقي."
            : "الأسعار والتوفر للاختبار فقط. لا يتم إنشاء حجز حقيقي. ستُستبدل البيانات بنتائج Production عند الإطلاق."}
        </span>
      </div>
    );
  }

  return (
    <div className={`shop-flight-mock-banner${compact ? " compact" : ""}`} role="status">
      <strong>نتائج تجريبية</strong>
      <span>
        {compact
          ? "هذه مرحلة اختبار — الأسعار والمزوّدون غير حقيقيين حتى ربط الخدمة."
          : "الأسعار والرحلات والمزوّدون المعروضون للاختبار فقط — سيتم استبدالهم بعروض حية عند ربط مزوّد الطيران."}
      </span>
    </div>
  );
}
