/** Shared demo/mock notice shown across booking flow pages. */
export function ShopMockBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
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
