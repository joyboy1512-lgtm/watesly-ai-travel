/** بيانات عرض رحلتي — مطابقة للتصاميم (دبي) */

export const BRAND = "#13357b";

export type MockupTier = "budget" | "balanced" | "comfort";

export const MOCKUP_TRIP = {
  destinationAr: "دبي",
  originAr: "الكويت",
  originCode: "KWI",
  destCode: "DXB",
  nights: 7,
  days: 7,
  dateFromAr: "25 مايو",
  dateToAr: "1 يونيو",
  dateFromIso: "2026-05-25",
  dateToIso: "2026-06-01",
  travelers: 1,
  bookingRef: "TRP-250525-DXB",
  currency: "د.ك",
  prices: {
    flight: 95,
    hotel: 210,
    transfer: 28,
    activities: 42,
    total: 375,
    saveSuggestion: 22,
  },
  flight: {
    airline: "الخطوط الكويتية",
    outbound: {
      from: "KWI",
      to: "DXB",
      depart: "08:30",
      arrive: "11:15",
      duration: "2س 45د",
      dateAr: "الأحد 25 مايو",
    },
    inbound: {
      from: "DXB",
      to: "KWI",
      depart: "18:40",
      arrive: "21:20",
      duration: "2س 40د",
      dateAr: "الأحد 1 يونيو",
    },
    badge: "الأفضل سعراً",
  },
  hotel: {
    name: "Atlantis The Palm",
    stars: 5,
    nights: 7,
    board: "إفطار كامل",
    refundable: true,
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80",
  },
  transfer: {
    legs: [
      { title: "وصول من مطار دبي", detail: "سيارة خاصة · حقيبتان" },
      { title: "توصيل إلى مطار دبي", detail: "سيارة خاصة · حقيبتان" },
    ],
  },
  activities: [
    {
      day: 2,
      dateAr: "26 مايو",
      time: "18:00",
      title: "برج خليفة",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
    },
    {
      day: 3,
      dateAr: "27 مايو",
      time: "09:00",
      title: "جولة دبي",
      image:
        "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&q=80",
    },
    {
      day: 5,
      dateAr: "29 مايو",
      time: "15:30",
      title: "سفاري صحراوي",
      image:
        "https://images.unsplash.com/photo-1451337512447-0f0d1e4d8853?w=400&q=80",
    },
  ],
  tiers: [
    {
      id: "balanced" as MockupTier,
      title: "الخيار المتوازن",
      desc: "أفضل توازن بين السعر والراحة",
      icon: "⚖️",
    },
    {
      id: "budget" as MockupTier,
      title: "الأقل سعراً",
      desc: "خيار اقتصادي موفّر",
      icon: "🏷️",
    },
    {
      id: "comfort" as MockupTier,
      title: "الأكثر راحة",
      desc: "تجربة فاخرة ومميزة",
      icon: "👑",
    },
  ],
  dayTabs: [
    "25 مايو",
    "26 مايو",
    "27 مايو",
    "28 مايو",
    "29 مايو",
    "30 مايو",
    "31 مايو",
    "1 يونيو",
  ],
};

export function money(n: number) {
  return `${n} ${MOCKUP_TRIP.currency}`;
}
