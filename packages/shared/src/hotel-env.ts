/**
 * Central hotel environment mode: sandbox vs production.
 * Production booking must never run while mode is sandbox.
 */

export type HotelEnvironmentMode = "sandbox" | "production";

export function resolveHotelEnvironmentMode(input?: {
  hotelbedsBaseUrl?: string | null;
  hotelProvider?: string | null;
  explicitMode?: string | null;
}): HotelEnvironmentMode {
  const explicit = (input?.explicitMode || process.env.HOTEL_ENV_MODE || "")
    .trim()
    .toLowerCase();
  if (explicit === "production" || explicit === "prod" || explicit === "live") {
    return "production";
  }
  if (explicit === "sandbox" || explicit === "test") {
    return "sandbox";
  }

  const base =
    input?.hotelbedsBaseUrl ||
    process.env.HOTELBEDS_BASE_URL ||
    "https://api.test.hotelbeds.com";
  if (/test\.hotelbeds\.com/i.test(base) || /sandbox/i.test(base)) {
    return "sandbox";
  }

  const provider = (input?.hotelProvider || process.env.HOTEL_PROVIDER || "mock")
    .trim()
    .toLowerCase();
  if (provider === "mock") return "sandbox";

  return "production";
}

export function hotelSandboxBannerCopy(mode: HotelEnvironmentMode = resolveHotelEnvironmentMode()) {
  if (mode === "production") {
    return {
      badge: "عرض حي",
      title: "نتائج حية من مزود الفنادق",
      body: "الأسعار والتوفر لحظية وقد تتغير حتى تأكيد الحجز.",
    };
  }
  return {
    badge: "نتيجة تجريبية من Hotelbeds Sandbox",
    title: "نتائج تجريبية — مرحلة اختبار",
    body: "الأسعار والتوفر للاختبار فقط. لا يتم إنشاء حجز حقيقي. ستُستبدل البيانات بنتائج Production عند الإطلاق.",
  };
}

export function assertHotelBookingAllowed(mode: HotelEnvironmentMode = resolveHotelEnvironmentMode()) {
  if (mode === "sandbox") {
    return {
      allowed: false as const,
      reason: "sandbox_booking_blocked",
      message: "الحجز الحقيقي معطّل أثناء وضع Sandbox — يُحفظ طلب تجريبي فقط.",
    };
  }
  return { allowed: true as const };
}
