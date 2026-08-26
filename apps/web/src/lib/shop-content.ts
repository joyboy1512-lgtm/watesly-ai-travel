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
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1514282401047-d79ba59a82fa?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1580418827493-f2b062c0a640?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    priceLabel: "من 185 د.ك",
    mode: "stays",
    destination: "دبي",
  },
  {
    id: "offer-kwi-dxb",
    title: "الكويت ↔ دبي",
    subtitle: "ذهاب وعودة · اقتصادية",
    badge: "طيران",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
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
    image:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
    priceLabel: "من 18 د.ك",
    mode: "cars",
    destination: "الكويت",
  },
  {
    id: "offer-activity",
    title: "جولة بحرية وغروب",
    subtitle: "دبي · 3 ساعات",
    badge: "نشاط",
    image:
      "https://images.unsplash.com/photo-1544551763-77a415ccc845?auto=format&fit=crop&w=900&q=80",
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
    image: "/media/hero-travel-poster.jpg?v=3",
    video: "/media/hero-travel.mp4?v=3",
    kicker: "WEEKENDGATE TRAVEL",
    title: "الطبيعة العظيمة",
    subtitle: "سافر بمتعة",
    description:
      "اكتشف وجهات بحرية وثقافية مع بحث حي للطيران والفنادق والنقل — تجربة سفر كاملة بلمسة ماء البحر.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80",
    kicker: "SHORE & SKY",
    title: "شواطئ وسماء صافية",
    subtitle: "رحلات لا تُنسى",
    description:
      "من الكويت إلى العالم — احجز رحلتك بخطوات بسيطة واترك التأكيد لفريقنا المحترف.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1476514525535-07fb1097aaf6?auto=format&fit=crop&w=1800&q=80",
    kicker: "LIVE SEARCH",
    title: "عروض حية فورية",
    subtitle: "أسعار محدّثة",
    description:
      "طيران، إقامة، نقل من المطار، وأنشطة — كلها في منصة واحدة بتصميم عصري ومريح.",
  },
] as const;

export const SHOP_FEATURES = [
  {
    icon: "🌊",
    title: "أسعار حية",
    text: "طيران وفنادق ونقل وأنشطة من مزودين موثوقين بأسعار محدّثة.",
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
    text: "من البحث إلى الحجز والمتابعة — كل شيء في مكان واحد.",
  },
] as const;
