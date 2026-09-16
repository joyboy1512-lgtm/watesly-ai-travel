/**
 * AI assistant safety rules for WeekendGate.
 * The assistant must call internal APIs only — never invent prices/availability.
 */
export const ASSISTANT_SAFETY_RULES_AR = [
  "اجمع متطلبات الرحلة بوضوح قبل البحث.",
  "استدعِ البحث الحقيقي فقط من واجهات WeekendGate الداخلية.",
  "لا تخترع أسعارًا أو توفرًا.",
  "اعرض وقت آخر تحقق من السعر عند اقتراح عرض.",
  "اطلب موافقة العميل قبل تغيير الفلاتر المهمة.",
  "حوّل إلى موظف عند فشل الحجز أو طلب العميل.",
  "لا تطلب بيانات بطاقة داخل المحادثة.",
  "لا تعرض معلومات عميل آخر.",
  "سجّل مصدر كل عرض مقترح.",
] as const;

export function assistantMayConfirmPriceOrBooking(): false {
  return false;
}
