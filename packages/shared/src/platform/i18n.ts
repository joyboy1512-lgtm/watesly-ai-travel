export type ShopLocale = "ar" | "en";

export const SHOP_LOCALES: ShopLocale[] = ["ar", "en"];

export const SHOP_LOCALE_LABEL: Record<ShopLocale, string> = {
  ar: "العربية",
  en: "English",
};

/** UI dictionary — shop shell + common CTAs */
export const SHOP_UI = {
  ar: {
    brand: "WeekendGate",
    navDeals: "عروض نهاية الأسبوع",
    navDestinations: "الوجهات",
    navTripBuilder: "رحّلتي",
    navAbout: "من نحن",
    navPolicy: "سياسة الحجز",
    navFaq: "الأسئلة الشائعة",
    navContact: "تواصل معنا",
    navAccount: "حسابي",
    navLogin: "دخول",
    navLogout: "خروج",
    navMenu: "القائمة",
    currency: "العملة",
    language: "اللغة",
    searchFlights: "الطيران",
    searchHotels: "الفنادق",
    searchCars: "النقل",
    searchActivities: "الأنشطة",
    tripBuilderCta: "ابدأ بناء رحلتي",
    tripBuilderHint: "اجمع طيران + فندق + نقل في باقة واحدة",
    bookNow: "احجز الآن",
    explore: "استكشف",
    fromPrice: "من",
    save: "وفّر",
    nights: "ليالٍ",
    includes: "يشمل",
    trustLicense: "ترخيص سياحي",
    trustWhatsapp: "واتساب مباشر",
    trustNoHidden: "بدون خصم قبل التأكيد",
    reviewsTitle: "آراء المسافرين",
    reviewsNote: "نماذج تقييمات توضيحية — نعرض تجارب حقيقية بعد التفعيل الكامل للحجوزات.",
    myTrips: "رحلاتي",
    points: "نقاطي",
    alerts: "تنبيهات الأسعار",
    referrals: "الإحالات",
    notifications: "الإشعارات",
    paySecure: "ادفع بأمان",
    continue: "متابعة",
    loading: "جارٍ التحميل…",
  },
  en: {
    brand: "WeekendGate",
    navDeals: "Weekend Deals",
    navDestinations: "Destinations",
    navTripBuilder: "Trip Builder",
    navAbout: "About",
    navPolicy: "Booking Policy",
    navFaq: "FAQ",
    navContact: "Contact",
    navAccount: "Account",
    navLogin: "Sign in",
    navLogout: "Sign out",
    navMenu: "Menu",
    currency: "Currency",
    language: "Language",
    searchFlights: "Flights",
    searchHotels: "Hotels",
    searchCars: "Transfers",
    searchActivities: "Activities",
    tripBuilderCta: "Start building my trip",
    tripBuilderHint: "Combine flight + hotel + transfer in one package",
    bookNow: "Book now",
    explore: "Explore",
    fromPrice: "From",
    save: "Save",
    nights: "nights",
    includes: "Includes",
    trustLicense: "Tourism license",
    trustWhatsapp: "Direct WhatsApp",
    trustNoHidden: "No charge before confirmation",
    reviewsTitle: "Traveler reviews",
    reviewsNote: "Illustrative sample reviews — live guest reviews appear after full booking go-live.",
    myTrips: "My trips",
    points: "Points",
    alerts: "Price alerts",
    referrals: "Referrals",
    notifications: "Notifications",
    paySecure: "Pay securely",
    continue: "Continue",
    loading: "Loading…",
  },
} as const;

export type ShopUiKey = keyof (typeof SHOP_UI)["ar"];

export function tShop(locale: ShopLocale, key: ShopUiKey): string {
  return SHOP_UI[locale][key] ?? SHOP_UI.ar[key] ?? key;
}

export function localeDir(locale: ShopLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function pickLocalized<T extends { ar: string; en: string }>(
  locale: ShopLocale,
  ar: string,
  en: string,
): string {
  return locale === "en" ? en || ar : ar || en;
}
