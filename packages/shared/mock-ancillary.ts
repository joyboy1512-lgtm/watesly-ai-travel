/**
 * Mock cars / transfers / tours / packages for demo UIs.
 * Prices are major KWD units (convert with currency helpers as needed).
 */

export type MockAncillaryOffer = {
  id: string;
  serviceType: "car" | "transfer" | "tour" | "package";
  nameAr: string;
  descriptionAr: string;
  priceKwd: number;
  meta: Record<string, unknown>;
};

export function buildMockAncillaryOffers(input: {
  destinationLabel: string;
  adults: number;
  nights: number;
}): MockAncillaryOffer[] {
  const dest = input.destinationLabel || "الوجهة";
  const adults = Math.max(1, input.adults);
  const nights = Math.max(1, input.nights);

  return [
    {
      id: "car-eco",
      serviceType: "car",
      nameAr: "اقتصادية · Toyota Yaris",
      descriptionAr: "أوتوماتيك · تكييف · 4 أبواب · تأمين أساسي",
      priceKwd: 9 + adults,
      meta: { category: "economy", transmission: "automatic", seats: 4 },
    },
    {
      id: "car-suv",
      serviceType: "car",
      nameAr: "عائلية · Hyundai Tucson",
      descriptionAr: "SUV · أمتعة كبيرة · تأمين شامل",
      priceKwd: 16 + adults * 1.5,
      meta: { category: "suv", transmission: "automatic", seats: 5 },
    },
    {
      id: "car-lux",
      serviceType: "car",
      nameAr: "فاخرة · Mercedes C-Class",
      descriptionAr: "فاخر · ملاحة · سائق اختياري",
      priceKwd: 28 + adults * 2,
      meta: { category: "luxury", transmission: "automatic", seats: 4 },
    },
    {
      id: "trf-airport",
      serviceType: "transfer",
      nameAr: `نقل مطار ${dest}`,
      descriptionAr: "سيارة خاصة · استقبال بالاسم · حتى 3 مسافرين",
      priceKwd: 12,
      meta: { vehicle: "private_sedan", direction: "airport_round" },
    },
    {
      id: "trf-van",
      serviceType: "transfer",
      nameAr: `فان عائلي — ${dest}`,
      descriptionAr: "فان 7 مقاعد · أمتعة إضافية · سائق يتحدث العربية",
      priceKwd: 18,
      meta: { vehicle: "van", seats: 7 },
    },
    {
      id: "tour-city",
      serviceType: "tour",
      nameAr: `جولة مدينة ${dest} نصف يوم`,
      descriptionAr: "مرشد عربي · مواصلات · تذاكر معالم أساسية",
      priceKwd: 22 * adults,
      meta: { durationHours: 4, guide: "ar" },
    },
    {
      id: "tour-full",
      serviceType: "tour",
      nameAr: `جولة شاملة ${dest}`,
      descriptionAr: "يوم كامل · غداء · تصوير اختياري",
      priceKwd: 45 * adults,
      meta: { durationHours: 8, meals: "lunch" },
    },
    {
      id: "pkg-classic",
      serviceType: "package",
      nameAr: `باقة ${dest} الكلاسيكية`,
      descriptionAr: `طيران + فندق 4★ + نقل مطار · ${nights} ليالٍ · ${adults} بالغ`,
      priceKwd: 95 * nights * 0.55 + 40 * adults,
      meta: { includes: ["flight", "hotel", "transfer"], nights, adults },
    },
    {
      id: "pkg-premium",
      serviceType: "package",
      nameAr: `باقة ${dest} بريميوم`,
      descriptionAr: `طيران رجال أعمال + منتجع 5★ + جولة مدينة · ${nights} ليالٍ`,
      priceKwd: 180 * nights * 0.5 + 90 * adults,
      meta: { includes: ["flight", "hotel", "tour"], nights, adults, cabin: "business" },
    },
  ];
}
