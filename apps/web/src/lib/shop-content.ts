import { tShop, type ShopLocale, type ShopUiKey } from "@watesly-travel/shared";

export type ShopDestination = {
  id: string;
  name: string;
  country: string;
  code: string;
  tag: string;
  image: string;
  fromPrice: string;
  rating: number;
  reviews: number;
};

export type ShopOffer = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  priceLabel: string;
  mode: "flights" | "stays" | "cars" | "activities";
  destination?: string;
  code?: string;
};

export type ShopReview = {
  id: string;
  name: string;
  city: string;
  rating: number;
  text: string;
  trip: string;
  avatar: string;
};

export const SHOP_STATS = [
  { value: "+12K", label: "مسافر سعيد" },
  { value: "4.9", label: "تقييم العملاء" },
  { value: "48", label: "وجهة مباشرة" },
  { value: "24/7", label: "دعم ومساعد ذكي" },
] as const;

export const SHOP_DESTINATIONS: ShopDestination[] = [
  {
    id: "dubai",
    name: "دبي",
    country: "الإمارات",
    code: "DXB",
    tag: "الأكثر طلباً",
    image: "/media/destinations/dubai.jpg?v=1",
    fromPrice: "من 89 د.ك",
    rating: 4.9,
    reviews: 1240,
  },
  {
    id: "istanbul",
    name: "إسطنبول",
    country: "تركيا",
    code: "IST",
    tag: "ثقافة وتاريخ",
    image: "/media/destinations/istanbul.jpg?v=1",
    fromPrice: "من 72 د.ك",
    rating: 4.8,
    reviews: 980,
  },
  {
    id: "maldives",
    name: "المالديف",
    country: "جزر المحيط",
    code: "MLE",
    tag: "شاطئ واسترخاء",
    image: "/media/destinations/maldives.jpg?v=1",
    fromPrice: "من 210 د.ك",
    rating: 5,
    reviews: 640,
  },
  {
    id: "london",
    name: "لندن",
    country: "بريطانيا",
    code: "LHR",
    tag: "عائلات",
    image: "/media/destinations/london.jpg?v=1",
    fromPrice: "من 145 د.ك",
    rating: 4.7,
    reviews: 720,
  },
  {
    id: "paris",
    name: "باريس",
    country: "فرنسا",
    code: "CDG",
    tag: "رومانسية",
    image: "/media/destinations/paris.jpg?v=1",
    fromPrice: "من 138 د.ك",
    rating: 4.8,
    reviews: 860,
  },
  {
    id: "doha",
    name: "الدوحة",
    country: "قطر",
    code: "DOH",
    tag: "قريبة من الكويت",
    image: "/media/destinations/doha.jpg?v=1",
    fromPrice: "من 45 د.ك",
    rating: 4.9,
    reviews: 510,
  },
];

export const SHOP_OFFERS: ShopOffer[] = [
  {
    id: "offer-dxb-stay",
    title: "إقامة 3 ليالٍ في دبي",
    subtitle: "فندق 5 نجوم + إفطار",
    badge: "عرض فندقي",
    image: "/media/offers/hotel.jpg?v=1",
    priceLabel: "من 185 د.ك",
    mode: "stays",
    destination: "دبي",
  },
  {
    id: "offer-kwi-dxb",
    title: "الكويت ↔ دبي",
    subtitle: "ذهاب وعودة · اقتصادية",
    badge: "طيران",
    image: "/media/offers/flight.jpg?v=1",
    priceLabel: "من 89 د.ك",
    mode: "flights",
    code: "DXB",
    destination: "دبي",
  },
  {
    id: "offer-transfer",
    title: "نقل VIP من المطار",
    subtitle: "KWI → فندقك في الكويت",
    badge: "نقل",
    image: "/media/offers/transfer.jpg?v=1",
    priceLabel: "من 18 د.ك",
    mode: "cars",
    destination: "الكويت",
  },
  {
    id: "offer-activity",
    title: "جولة بحرية وغروب",
    subtitle: "دبي · 3 ساعات",
    badge: "نشاط",
    image: "/media/offers/boat-sunset.jpg?v=1",
    priceLabel: "من 32 د.ك",
    mode: "activities",
    code: "DXB",
    destination: "دبي",
  },
];

export const SHOP_REVIEWS: ShopReview[] = [
  {
    id: "r1",
    name: "نورة العجمي",
    city: "الكويت",
    rating: 5,
    text: "حجزت رحلة العائلة إلى دبي من الموقع مباشرة. البحث واضح والأسعار شفافة، والفريق أكّد الحجز خلال ساعات.",
    trip: "طيران + فندق · دبي",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "r2",
    name: "محمد الشمري",
    city: "الأحمدي",
    rating: 5,
    text: "خدمة النقل من المطار كانت ممتازة. أحببت أن الطلب يُحفظ ويتابعه الموظفون بدون ضغط دفع فوري.",
    trip: "نقل مطار · الكويت",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "r3",
    name: "سارة الحربي",
    city: "الرياض",
    rating: 4,
    text: "المساعد الذكي ساعدني أختار تواريخ مناسبة للعطلة. تجربة سلسة من البحث حتى تأكيد الطلب.",
    trip: "أنشطة · إسطنبول",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80",
  },
];

export const HERO_SLIDES = [
  {
    image: "/media/travela/carousel-2.jpg",
    kicker: "اكتشف العالم",
    title: "لنسافر معاً",
    subtitle: "سافر بمتعة",
    description:
      "اكتشف وجهات بحرية وثقافية — بحث موحّد للطيران والفنادق والنقل في تجربة واحدة.",
  },
  {
    image: "/media/travela/carousel-1.jpg",
    kicker: "WeekendGate",
    title: "اعثر على رحلتك المثالية",
    subtitle: "طيران وفنادق",
    description: "من الكويت إلى العالم — خطط رحلتك بخطوات بسيطة وواضحة.",
  },
  {
    image: "/media/travela/carousel-3.jpg",
    kicker: "إلى أين تريد الذهاب؟",
    title: "كل رحلتك من مكان واحد",
    subtitle: "حجز ذكي",
    description: "طيران، فنادق، نقل، وأنشطة — مع مساعد سفر يتحدث معك بالعربية.",
  },
] as const;

export const SHOP_FEATURES = [
  {
    icon: "🌊",
    title: "بحث موحّد",
    text: "طيران وفنادق ونقل وأنشطة في تجربة واحدة — مع نتائج تجريبية حتى اكتمال الربط الحي.",
  },
  {
    icon: "🛡️",
    title: "حجز آمن",
    text: "طلبك يُحفظ في نظامنا ويتابعه فريق محترف قبل التأكيد النهائي.",
  },
  {
    icon: "💬",
    title: "مساعد ذكي",
    text: "خطط رحلتك بالمحادثة بعد إدخال جوالك — بدون ازدحام.",
  },
  {
    icon: "✈️",
    title: "رحلة واحدة",
    text: "كل رحلتك تبدأ من مكان واحد — من البحث إلى المراجعة والمتابعة.",
  },
] as const;

export function shopStatsFor(locale: ShopLocale) {
  return [
    { value: "+12K", label: tShop(locale, "statHappy") },
    { value: "4.9", label: tShop(locale, "statRating") },
    { value: "48", label: tShop(locale, "statDest") },
    { value: "24/7", label: tShop(locale, "statSupport") },
  ];
}

const DEST_I18N: Record<string, { name: ShopUiKey; country: ShopUiKey; tag: ShopUiKey; n: number }> = {
  dubai: { name: "destDubai", country: "countryAE", tag: "tagPopular", n: 89 },
  istanbul: { name: "destIstanbul", country: "countryTR", tag: "tagCulture", n: 72 },
  maldives: { name: "destMaldives", country: "countryMV", tag: "tagBeach", n: 210 },
  london: { name: "destLondon", country: "countryGB", tag: "tagFamilies", n: 145 },
  paris: { name: "destParis", country: "countryFR", tag: "tagRomance", n: 138 },
  doha: { name: "destDoha", country: "countryQA", tag: "tagNearby", n: 45 },
};

export function shopDestinationsFor(locale: ShopLocale): ShopDestination[] {
  return SHOP_DESTINATIONS.map((d) => {
    const keys = DEST_I18N[d.id];
    if (!keys) return d;
    return {
      ...d,
      name: tShop(locale, keys.name),
      country: tShop(locale, keys.country),
      tag: tShop(locale, keys.tag),
      fromPrice: tShop(locale, "fromPriceKwd", { n: keys.n }),
    };
  });
}

const OFFER_I18N: Record<
  string,
  { title: ShopUiKey; subtitle: ShopUiKey; badge: ShopUiKey; n: number; dest?: ShopUiKey }
> = {
  "offer-dxb-stay": {
    title: "offerStayTitle",
    subtitle: "offerStaySub",
    badge: "offerStayBadge",
    n: 185,
    dest: "destDubai",
  },
  "offer-kwi-dxb": {
    title: "offerFlightTitle",
    subtitle: "offerFlightSub",
    badge: "offerFlightBadge",
    n: 89,
    dest: "destDubai",
  },
  "offer-transfer": {
    title: "offerTransferTitle",
    subtitle: "offerTransferSub",
    badge: "offerTransferBadge",
    n: 18,
    dest: "countryKW",
  },
  "offer-activity": {
    title: "offerActivityTitle",
    subtitle: "offerActivitySub",
    badge: "offerActivityBadge",
    n: 32,
    dest: "destDubai",
  },
};

export function shopOffersFor(locale: ShopLocale): ShopOffer[] {
  return SHOP_OFFERS.map((offer) => {
    const keys = OFFER_I18N[offer.id];
    if (!keys) return offer;
    return {
      ...offer,
      title: tShop(locale, keys.title),
      subtitle: tShop(locale, keys.subtitle),
      badge: tShop(locale, keys.badge),
      priceLabel: tShop(locale, "fromPriceKwd", { n: keys.n }),
      destination: keys.dest ? tShop(locale, keys.dest) : offer.destination,
    };
  });
}

export function shopReviewsFor(locale: ShopLocale): ShopReview[] {
  const cities: ShopUiKey[] = ["countryKW", "cityAhmadi", "cityRiyadh"];
  const texts: ShopUiKey[] = ["review1Text", "review2Text", "review3Text"];
  const trips: ShopUiKey[] = ["review1Trip", "review2Trip", "review3Trip"];
  return SHOP_REVIEWS.map((review, i) => ({
    ...review,
    city: tShop(locale, cities[i] || "countryKW"),
    text: tShop(locale, texts[i] || "review1Text"),
    trip: tShop(locale, trips[i] || "review1Trip"),
  }));
}

export function heroSlidesFor(locale: ShopLocale) {
  const keys = [
    {
      kicker: "hero1Kicker",
      title: "hero1Title",
      subtitle: "hero1Subtitle",
      description: "hero1Desc",
    },
    {
      kicker: "hero2Kicker",
      title: "hero2Title",
      subtitle: "hero2Subtitle",
      description: "hero2Desc",
    },
    {
      kicker: "hero3Kicker",
      title: "hero3Title",
      subtitle: "hero3Subtitle",
      description: "hero3Desc",
    },
  ] as const;
  return HERO_SLIDES.map((slide, i) => ({
    ...slide,
    kicker: tShop(locale, keys[i]!.kicker),
    title: tShop(locale, keys[i]!.title),
    subtitle: tShop(locale, keys[i]!.subtitle),
    description: tShop(locale, keys[i]!.description),
  }));
}

export function shopFeaturesFor(locale: ShopLocale) {
  return [
    {
      icon: "🌊",
      title: tShop(locale, "featureSearchTitle"),
      text: tShop(locale, "featureSearchText"),
    },
    {
      icon: "🛡️",
      title: tShop(locale, "featureSafeTitle"),
      text: tShop(locale, "featureSafeText"),
    },
    {
      icon: "💬",
      title: tShop(locale, "featureAiTitle"),
      text: tShop(locale, "featureAiText"),
    },
    {
      icon: "✈️",
      title: tShop(locale, "featureOneTitle"),
      text: tShop(locale, "featureOneText"),
    },
  ];
}
