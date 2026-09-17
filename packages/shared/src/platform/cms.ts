/** Lightweight CMS content store shapes (admin-editable; seeded defaults). */

import { COMPANY_LEGAL } from "../company-legal";
import { DESTINATION_GUIDES, type DestinationGuide } from "./destinations";

export type CmsBanner = {
  id: string;
  titleAr: string;
  titleEn: string;
  image: string;
  href: string;
  active: boolean;
};

export type CmsFaq = {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  categoryAr?: string;
  categoryEn?: string;
};

export type CmsArticle = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  published: boolean;
};

export type CmsHeroService = {
  key: string;
  labelAr: string;
  labelEn: string;
  hintAr?: string;
  hintEn?: string;
  enabled: boolean;
  href?: string;
  kind: "mode" | "myTrip" | "link";
};

export type CmsHeroSlide = {
  id: string;
  image: string;
  kickerAr: string;
  kickerEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  active: boolean;
};

export type CmsHomeDestination = {
  id: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  code: string;
  tagAr: string;
  tagEn: string;
  image: string;
  fromPriceAr: string;
  fromPriceEn: string;
  rating: number;
  reviews: number;
  active: boolean;
};

export type CmsHomeOffer = {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  badgeAr: string;
  badgeEn: string;
  image: string;
  priceLabelAr: string;
  priceLabelEn: string;
  mode: "flights" | "stays" | "cars" | "activities";
  destinationAr?: string;
  destinationEn?: string;
  code?: string;
  active: boolean;
};

export type CmsReview = {
  id: string;
  name: string;
  cityAr: string;
  cityEn: string;
  rating: number;
  textAr: string;
  textEn: string;
  tripAr: string;
  tripEn: string;
  avatar: string;
  active: boolean;
};

export type CmsFeature = {
  id: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
};

export type CmsStat = {
  id: string;
  value: string;
  labelAr: string;
  labelEn: string;
};

export type CmsHomeCopy = {
  destKickerAr: string;
  destKickerEn: string;
  destTitleAr: string;
  destTitleEn: string;
  destLeadAr: string;
  destLeadEn: string;
  offersKickerAr: string;
  offersKickerEn: string;
  offersTitleAr: string;
  offersTitleEn: string;
  whyKickerAr: string;
  whyKickerEn: string;
  whyTitleAr: string;
  whyTitleEn: string;
  reviewsKickerAr: string;
  reviewsKickerEn: string;
  reviewsHeadingAr: string;
  reviewsHeadingEn: string;
  reviewsDisclaimerAr: string;
  reviewsDisclaimerEn: string;
  ctaKickerAr: string;
  ctaKickerEn: string;
  ctaTitleAr: string;
  ctaTitleEn: string;
  ctaLeadAr: string;
  ctaLeadEn: string;
};

export type CmsSitePages = {
  aboutLeadAr: string;
  aboutLeadEn: string;
  aboutBodyAr: string;
  aboutBodyEn: string;
  contactIntroAr: string;
  contactIntroEn: string;
  faqIntroAr: string;
  faqIntroEn: string;
  footerTaglineAr: string;
  footerTaglineEn: string;
  destinationsLeadAr: string;
  destinationsLeadEn: string;
  legalNameAr: string;
  legalNameEn: string;
  addressAr: string;
  addressEn: string;
  hoursAr: string;
  hoursEn: string;
  phoneDisplay: string;
  phoneE164: string;
  whatsappUrl: string;
  supportEmail: string;
  tourismLicense: string;
};

export type CmsState = {
  banners: CmsBanner[];
  faqs: CmsFaq[];
  articles: CmsArticle[];
  heroServices: CmsHeroService[];
  heroSlides: CmsHeroSlide[];
  homeDestinations: CmsHomeDestination[];
  homeOffers: CmsHomeOffer[];
  reviews: CmsReview[];
  features: CmsFeature[];
  stats: CmsStat[];
  homeCopy: CmsHomeCopy;
  sitePages: CmsSitePages;
  destinationGuides: DestinationGuide[];
  updatedAt: string;
};

export const DEFAULT_CMS_HERO_SERVICES: CmsHeroService[] = [
  {
    key: "stays",
    labelAr: "فنادق",
    labelEn: "Hotels",
    hintAr: "إقامة مميزة",
    hintEn: "Find a stay",
    enabled: true,
    kind: "mode",
  },
  {
    key: "flights",
    labelAr: "رحلات",
    labelEn: "Flights",
    hintAr: "طيران",
    hintEn: "Book flights",
    enabled: true,
    kind: "mode",
  },
  {
    key: "cars",
    labelAr: "سيارات",
    labelEn: "Cars",
    hintAr: "نقل",
    hintEn: "Transfers",
    enabled: true,
    kind: "mode",
  },
  {
    key: "activities",
    labelAr: "أنشطة",
    labelEn: "Activities",
    hintAr: "تجارب",
    hintEn: "Experiences",
    enabled: true,
    kind: "mode",
  },
  {
    key: "myTrip",
    labelAr: "رحلتي",
    labelEn: "My trip",
    hintAr: "منشئ الرحلة",
    hintEn: "Trip builder",
    enabled: true,
    kind: "myTrip",
  },
];

export const DEFAULT_CMS_HERO_SLIDES: CmsHeroSlide[] = [
  {
    id: "slide-1",
    image: "/media/hero/brand-sky-wing.jpg?v=1",
    kickerAr: "اكتشف العالم",
    kickerEn: "Discover the world",
    titleAr: "لنسافر معاً",
    titleEn: "Let’s travel together",
    subtitleAr: "سافر بمتعة",
    subtitleEn: "Travel with joy",
    descriptionAr:
      "اكتشف وجهات بحرية وثقافية — بحث موحّد للطيران والفنادق والنقل في تجربة واحدة.",
    descriptionEn:
      "Coastal and cultural destinations — unified search for flights, hotels, and transfers.",
    active: true,
  },
  {
    id: "slide-2",
    image: "/media/hero/brand-city-flight.jpg?v=1",
    kickerAr: "WeekendGate",
    kickerEn: "WeekendGate",
    titleAr: "اعثر على رحلتك المثالية",
    titleEn: "Find your perfect trip",
    subtitleAr: "طيران وفنادق",
    subtitleEn: "Flights and hotels",
    descriptionAr: "من الكويت إلى العالم — خطط رحلتك بخطوات بسيطة وواضحة.",
    descriptionEn: "From Kuwait to the world — plan in simple, clear steps.",
    active: true,
  },
  {
    id: "slide-3",
    image: "/media/hero/brand-blue-hour.jpg?v=1",
    kickerAr: "إلى أين تريد الذهاب؟",
    kickerEn: "Where do you want to go?",
    titleAr: "كل رحلتك من مكان واحد",
    titleEn: "Your whole trip in one place",
    subtitleAr: "حجز ذكي",
    subtitleEn: "Smart booking",
    descriptionAr: "طيران، فنادق، نقل، وأنشطة — مع مساعد سفر يتحدث معك بالعربية والإنجليزية.",
    descriptionEn:
      "Flights, hotels, transfers, and activities — with an assistant in Arabic and English.",
    active: true,
  },
];

export const DEFAULT_CMS_HOME_DESTINATIONS: CmsHomeDestination[] = [
  {
    id: "dubai",
    nameAr: "دبي",
    nameEn: "Dubai",
    countryAr: "الإمارات",
    countryEn: "UAE",
    code: "DXB",
    tagAr: "الأكثر طلباً",
    tagEn: "Most booked",
    image: "/media/destinations/dubai.jpg?v=1",
    fromPriceAr: "من 89 د.ك",
    fromPriceEn: "From 89 KWD",
    rating: 4.9,
    reviews: 1240,
    active: true,
  },
  {
    id: "istanbul",
    nameAr: "إسطنبول",
    nameEn: "Istanbul",
    countryAr: "تركيا",
    countryEn: "Turkey",
    code: "IST",
    tagAr: "ثقافة وتاريخ",
    tagEn: "Culture & history",
    image: "/media/destinations/istanbul.jpg?v=1",
    fromPriceAr: "من 72 د.ك",
    fromPriceEn: "From 72 KWD",
    rating: 4.8,
    reviews: 980,
    active: true,
  },
  {
    id: "maldives",
    nameAr: "المالديف",
    nameEn: "Maldives",
    countryAr: "جزر المحيط",
    countryEn: "Indian Ocean",
    code: "MLE",
    tagAr: "شاطئ واسترخاء",
    tagEn: "Beach & relax",
    image: "/media/destinations/maldives.jpg?v=1",
    fromPriceAr: "من 210 د.ك",
    fromPriceEn: "From 210 KWD",
    rating: 5,
    reviews: 640,
    active: true,
  },
  {
    id: "london",
    nameAr: "لندن",
    nameEn: "London",
    countryAr: "بريطانيا",
    countryEn: "United Kingdom",
    code: "LHR",
    tagAr: "عائلات",
    tagEn: "Families",
    image: "/media/destinations/london.jpg?v=1",
    fromPriceAr: "من 145 د.ك",
    fromPriceEn: "From 145 KWD",
    rating: 4.7,
    reviews: 720,
    active: true,
  },
  {
    id: "paris",
    nameAr: "باريس",
    nameEn: "Paris",
    countryAr: "فرنسا",
    countryEn: "France",
    code: "CDG",
    tagAr: "رومانسية",
    tagEn: "Romance",
    image: "/media/destinations/paris.jpg?v=1",
    fromPriceAr: "من 138 د.ك",
    fromPriceEn: "From 138 KWD",
    rating: 4.8,
    reviews: 860,
    active: true,
  },
  {
    id: "doha",
    nameAr: "الدوحة",
    nameEn: "Doha",
    countryAr: "قطر",
    countryEn: "Qatar",
    code: "DOH",
    tagAr: "قريبة من الكويت",
    tagEn: "Near Kuwait",
    image: "/media/destinations/doha.jpg?v=1",
    fromPriceAr: "من 45 د.ك",
    fromPriceEn: "From 45 KWD",
    rating: 4.9,
    reviews: 510,
    active: true,
  },
];

export const DEFAULT_CMS_HOME_OFFERS: CmsHomeOffer[] = [
  {
    id: "offer-dxb-stay",
    titleAr: "إقامة 3 ليالٍ في دبي",
    titleEn: "3 nights in Dubai",
    subtitleAr: "فندق 5 نجوم + إفطار",
    subtitleEn: "5-star hotel + breakfast",
    badgeAr: "عرض فندقي",
    badgeEn: "Hotel offer",
    image: "/media/offers/hotel.jpg?v=1",
    priceLabelAr: "من 185 د.ك",
    priceLabelEn: "From 185 KWD",
    mode: "stays",
    destinationAr: "دبي",
    destinationEn: "Dubai",
    active: true,
  },
  {
    id: "offer-kwi-dxb",
    titleAr: "الكويت ↔ دبي",
    titleEn: "Kuwait ↔ Dubai",
    subtitleAr: "ذهاب وعودة · اقتصادية",
    subtitleEn: "Round trip · Economy",
    badgeAr: "طيران",
    badgeEn: "Flights",
    image: "/media/offers/flight.jpg?v=1",
    priceLabelAr: "من 89 د.ك",
    priceLabelEn: "From 89 KWD",
    mode: "flights",
    code: "DXB",
    destinationAr: "دبي",
    destinationEn: "Dubai",
    active: true,
  },
  {
    id: "offer-transfer",
    titleAr: "نقل VIP من المطار",
    titleEn: "VIP airport transfer",
    subtitleAr: "KWI → فندقك في الكويت",
    subtitleEn: "KWI → your hotel in Kuwait",
    badgeAr: "نقل",
    badgeEn: "Transfer",
    image: "/media/offers/transfer.jpg?v=1",
    priceLabelAr: "من 18 د.ك",
    priceLabelEn: "From 18 KWD",
    mode: "cars",
    destinationAr: "الكويت",
    destinationEn: "Kuwait",
    active: true,
  },
  {
    id: "offer-activity",
    titleAr: "جولة بحرية وغروب",
    titleEn: "Sunset boat tour",
    subtitleAr: "دبي · 3 ساعات",
    subtitleEn: "Dubai · 3 hours",
    badgeAr: "نشاط",
    badgeEn: "Activity",
    image: "/media/offers/boat-sunset.jpg?v=1",
    priceLabelAr: "من 32 د.ك",
    priceLabelEn: "From 32 KWD",
    mode: "activities",
    code: "DXB",
    destinationAr: "دبي",
    destinationEn: "Dubai",
    active: true,
  },
];

export const DEFAULT_CMS_REVIEWS: CmsReview[] = [
  {
    id: "r1",
    name: "نورة العجمي",
    cityAr: "الكويت",
    cityEn: "Kuwait",
    rating: 5,
    textAr:
      "حجزت رحلة العائلة إلى دبي من الموقع مباشرة. البحث واضح والأسعار شفافة، والفريق أكّد الحجز خلال ساعات.",
    textEn:
      "I booked our family trip to Dubai on the site. Search is clear, prices are transparent, and the team confirmed within hours.",
    tripAr: "طيران + فندق · دبي",
    tripEn: "Flight + hotel · Dubai",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    active: true,
  },
  {
    id: "r2",
    name: "محمد الشمري",
    cityAr: "الأحمدي",
    cityEn: "Ahmadi",
    rating: 5,
    textAr:
      "خدمة النقل من المطار كانت ممتازة. أحببت أن الطلب يُحفظ ويتابعه الموظفون بدون ضغط دفع فوري.",
    textEn:
      "Airport transfer was excellent. I liked that the request is saved and followed without forcing instant payment.",
    tripAr: "نقل مطار · الكويت",
    tripEn: "Airport transfer · Kuwait",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    active: true,
  },
  {
    id: "r3",
    name: "سارة الحربي",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    rating: 4,
    textAr:
      "المساعد الذكي ساعدني أختار تواريخ مناسبة للعطلة. تجربة سلسة من البحث حتى تأكيد الطلب.",
    textEn:
      "The assistant helped me pick the right holiday dates. Smooth from search to confirmation.",
    tripAr: "أنشطة · إسطنبول",
    tripEn: "Activities · Istanbul",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80",
    active: true,
  },
];

export const DEFAULT_CMS_FEATURES: CmsFeature[] = [
  {
    id: "feat-search",
    icon: "🌊",
    titleAr: "بحث موحّد",
    titleEn: "Unified search",
    textAr: "طيران وفنادق ونقل وأنشطة في تجربة واحدة — مع نتائج تجريبية حتى اكتمال الربط الحي.",
    textEn: "Flights, hotels, transfers, and activities in one experience.",
  },
  {
    id: "feat-safe",
    icon: "🛡️",
    titleAr: "حجز آمن",
    titleEn: "Secure booking",
    textAr: "طلبك يُحفظ في نظامنا ويتابعه فريق محترف قبل التأكيد النهائي.",
    textEn: "Your request is saved and followed by the team before final confirmation.",
  },
  {
    id: "feat-ai",
    icon: "💬",
    titleAr: "مساعد ذكي",
    titleEn: "AI assistant",
    textAr: "خطط رحلتك بالمحادثة بعد إدخال جوالك — بدون ازدحام.",
    textEn: "Plan by chat after entering your mobile — without the clutter.",
  },
  {
    id: "feat-one",
    icon: "✈️",
    titleAr: "رحلة واحدة",
    titleEn: "One trip",
    textAr: "كل رحلتك تبدأ من مكان واحد — من البحث إلى المراجعة والمتابعة.",
    textEn: "Your whole trip starts in one place — from search to follow-up.",
  },
];

export const DEFAULT_CMS_STATS: CmsStat[] = [
  { id: "stat-happy", value: "+12K", labelAr: "مسافر سعيد", labelEn: "Happy travelers" },
  { id: "stat-rating", value: "4.9", labelAr: "تقييم العملاء", labelEn: "Customer rating" },
  { id: "stat-dest", value: "48", labelAr: "وجهة مباشرة", labelEn: "Direct destinations" },
  { id: "stat-support", value: "24/7", labelAr: "دعم ومساعد ذكي", labelEn: "Support & AI assistant" },
];

export const DEFAULT_CMS_HOME_COPY: CmsHomeCopy = {
  destKickerAr: "وجهات مميزة",
  destKickerEn: "Featured destinations",
  destTitleAr: "اكتشف العالم بطريقتك",
  destTitleEn: "Discover the world your way",
  destLeadAr: "وجهات مختارة بصور حقيقية وتقييمات مسافرين — اضغط على أي وجهة لملء البحث فوراً.",
  destLeadEn: "Hand-picked destinations with real photos — tap any destination to fill the search.",
  offersKickerAr: "عروض الأسبوع",
  offersKickerEn: "This week’s offers",
  offersTitleAr: "باقات جاهزة بأسعار تبدأ من",
  offersTitleEn: "Ready packages starting from",
  whyKickerAr: "لماذا WeekendGate؟",
  whyKickerEn: "Why WeekendGate?",
  whyTitleAr: "تجربة حجز كاملة بلمسة بحرية هادئة",
  whyTitleEn: "A complete booking experience",
  reviewsKickerAr: "آراء المسافرين",
  reviewsKickerEn: "Traveler reviews",
  reviewsHeadingAr: "نماذج تقييمات توضيحية",
  reviewsHeadingEn: "Sample reviews",
  reviewsDisclaimerAr: "هذه تقييمات توضيحية للعرض وليست شهادات عملاء موثّقة بعد.",
  reviewsDisclaimerEn: "These are illustrative sample reviews, not verified customer testimonials yet.",
  ctaKickerAr: "جاهز للانطلاق؟",
  ctaKickerEn: "Ready to go?",
  ctaTitleAr: "خطّط رحلتك مع مساعد WeekendGate",
  ctaTitleEn: "Plan your trip with the WeekendGate assistant",
  ctaLeadAr: "أدخل جوالك وابدأ محادثة ذكية — أو ابحث مباشرة من الأعلى.",
  ctaLeadEn: "Enter your mobile number to chat — or search from the top.",
};

export const DEFAULT_CMS_SITE_PAGES: CmsSitePages = {
  aboutLeadAr:
    "{brand} منصة حجز تابعة لـ{legal}. نساعد المسافرين من الكويت على البحث عن رحلات الطيران والإقامة والنقل والأنشطة في تجربة واحدة مبسّطة.",
  aboutLeadEn:
    "{brand} is a booking platform of {legal}. We help travelers from Kuwait search flights, stays, transfers, and activities in one simple experience.",
  aboutBodyAr: COMPANY_LEGAL.roleClarificationAr,
  aboutBodyEn: COMPANY_LEGAL.roleClarificationEn,
  contactIntroAr:
    "للاستفسار عن حجز، أرفق رقم حجز WeekendGate. يمكنك أيضًا استخدام صفحة إدارة حجزي أو المساعد الذكي — والذي لا يؤكد سعراً أو حجزاً دون الرجوع إلى النظام.",
  contactIntroEn:
    "For a booking question, include your WeekendGate reference. You can also use Manage booking or the assistant — it never confirms a price or booking without the system.",
  faqIntroAr: "",
  faqIntroEn: "",
  footerTaglineAr: "منصة حجز تابعة لـ{legal}: طيران، فنادق، نقل، وأنشطة.",
  footerTaglineEn: "A booking platform of {legal}: flights, hotels, transfers, and activities.",
  destinationsLeadAr:
    "اكتشف لماذا تسافر، أفضل وقت، التكلفة، والفنادق والأنشطة — ثم خطّط رحلتك.",
  destinationsLeadEn:
    "See why to go, the best time, costs, hotels, and activities — then plan your trip.",
  legalNameAr: COMPANY_LEGAL.legalNameAr,
  legalNameEn: COMPANY_LEGAL.legalNameEn,
  addressAr: COMPANY_LEGAL.addressAr,
  addressEn: COMPANY_LEGAL.addressEn,
  hoursAr: COMPANY_LEGAL.hoursAr,
  hoursEn: COMPANY_LEGAL.hoursEn,
  phoneDisplay: COMPANY_LEGAL.phoneDisplay,
  phoneE164: COMPANY_LEGAL.phoneE164,
  whatsappUrl: COMPANY_LEGAL.whatsappUrl,
  supportEmail: COMPANY_LEGAL.supportEmail,
  tourismLicense: COMPANY_LEGAL.tourismLicense,
};

export const DEFAULT_CMS_FAQS: CmsFaq[] = [
  {
    id: "faq-flights-pick",
    categoryAr: "طيران",
    categoryEn: "Flights",
    questionAr: "كيف أختار رحلة الذهاب والعودة؟",
    questionEn: "How do I choose outbound and return flights?",
    answerAr:
      "يمكنك اختيار العرض كاملًا بزر «اختيار هذه الرحلة»، أو تحديد مربع الذهاب ومربع العودة لتكوين رحلة مخصصة تظهر أعلى النتائج.",
    answerEn:
      "Select the full offer with “Choose this flight”, or tick outbound and return boxes to mix a custom trip shown above the results.",
  },
  {
    id: "faq-hotels-nearby",
    categoryAr: "فنادق",
    categoryEn: "Hotels",
    questionAr: "لماذا تظهر فنادق من مدينة مجاورة؟",
    questionEn: "Why do nearby-city hotels appear?",
    answerAr:
      "نستخدم الإحداثيات والمسافة. فعّل فلتر «داخل الوجهة فقط» لعرض فنادق المدينة المطلوبة بوضوح.",
    answerEn:
      "We use coordinates and distance. Turn on “Inside destination only” to show hotels in the selected city.",
  },
  {
    id: "faq-price-final",
    categoryAr: "دفع",
    categoryEn: "Payment",
    questionAr: "هل الأسعار نهائية عند الظهور؟",
    questionEn: "Are displayed prices final?",
    answerAr:
      "لا. نعيد التحقق (Reprice) قبل المراجعة والحجز. التأكيد النهائي يظهر فقط بعد تأكيد المزوّد.",
    answerEn:
      "No. We reprice before review and booking. Final confirmation appears only after the supplier confirms.",
  },
  {
    id: "faq-pay-methods",
    categoryAr: "دفع",
    categoryEn: "Payment",
    questionAr: "ما وسائل الدفع؟",
    questionEn: "What payment methods are available?",
    answerAr:
      "عند تفعيل حساب التاجر: بطاقات عبر صفحة مستضافة، KNET، وApple Pay. لا نخزّن أرقام البطاقات أو CVV.",
    answerEn:
      "When the merchant account is live: hosted card payments, KNET, and Apple Pay. We never store card numbers or CVV.",
  },
  {
    id: "faq-manage",
    categoryAr: "دعم",
    categoryEn: "Support",
    questionAr: "كيف أدير حجزي أو أطلب إلغاء؟",
    questionEn: "How do I manage or cancel a booking?",
    answerAr: `استخدم صفحة إدارة حجزي أو واتساب ${COMPANY_LEGAL.phoneDisplay} أو ${COMPANY_LEGAL.supportEmail}. الإلغاء لا يُنفَّذ تلقائيًا دون تحقق.`,
    answerEn: `Use Manage booking, WhatsApp ${COMPANY_LEGAL.phoneDisplay}, or ${COMPANY_LEGAL.supportEmail}. Cancellations are not automatic without verification.`,
  },
];

export const DEFAULT_CMS: CmsState = {
  banners: [
    {
      id: "bn-1",
      titleAr: "عروض نهاية الأسبوع من الكويت",
      titleEn: "Weekend deals from Kuwait",
      image: "/media/destinations/dubai.jpg?v=1",
      href: "/deals",
      active: true,
    },
  ],
  faqs: DEFAULT_CMS_FAQS,
  articles: [],
  heroServices: DEFAULT_CMS_HERO_SERVICES,
  heroSlides: DEFAULT_CMS_HERO_SLIDES,
  homeDestinations: DEFAULT_CMS_HOME_DESTINATIONS,
  homeOffers: DEFAULT_CMS_HOME_OFFERS,
  reviews: DEFAULT_CMS_REVIEWS,
  features: DEFAULT_CMS_FEATURES,
  stats: DEFAULT_CMS_STATS,
  homeCopy: DEFAULT_CMS_HOME_COPY,
  sitePages: DEFAULT_CMS_SITE_PAGES,
  destinationGuides: DESTINATION_GUIDES,
  updatedAt: new Date(0).toISOString(),
};

function mergeRecord<T extends Record<string, string>>(defaults: T, raw: unknown): T {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const val = src[key as string];
    if (typeof val === "string" && val.trim()) out[key] = val as T[typeof key];
  }
  return out;
}

function takeArray<T>(raw: unknown, fallback: T[]): T[] {
  return Array.isArray(raw) && raw.length ? (raw as T[]) : fallback;
}

export function emptyDestinationGuide(slug = ""): DestinationGuide {
  return {
    slug,
    nameAr: "",
    nameEn: "",
    flag: "🌍",
    airportCode: "",
    countryAr: "",
    countryEn: "",
    image: "/media/destinations/dubai.jpg?v=1",
    whyAr: "",
    whyEn: "",
    bestTimeAr: "",
    bestTimeEn: "",
    costHintAr: "",
    costHintEn: "",
    hotelsAr: [],
    hotelsEn: [],
    activitiesAr: [],
    activitiesEn: [],
    flightHintAr: "",
    flightHintEn: "",
    seoTitleAr: "",
    seoTitleEn: "",
    seoDescriptionAr: "",
    seoDescriptionEn: "",
  };
}

export function normalizeCmsState(raw: unknown): CmsState {
  const src = raw && typeof raw === "object" ? (raw as Partial<CmsState>) : {};
  return {
    banners: Array.isArray(src.banners) ? src.banners : DEFAULT_CMS.banners,
    faqs: takeArray(src.faqs, DEFAULT_CMS_FAQS),
    articles: Array.isArray(src.articles) ? src.articles : [],
    heroServices:
      Array.isArray(src.heroServices) && src.heroServices.length
        ? src.heroServices
        : DEFAULT_CMS_HERO_SERVICES,
    heroSlides: takeArray(src.heroSlides, DEFAULT_CMS_HERO_SLIDES),
    homeDestinations: takeArray(src.homeDestinations, DEFAULT_CMS_HOME_DESTINATIONS),
    homeOffers: takeArray(src.homeOffers, DEFAULT_CMS_HOME_OFFERS),
    reviews: takeArray(src.reviews, DEFAULT_CMS_REVIEWS),
    features: takeArray(src.features, DEFAULT_CMS_FEATURES),
    stats: takeArray(src.stats, DEFAULT_CMS_STATS),
    homeCopy: mergeRecord(DEFAULT_CMS_HOME_COPY, src.homeCopy),
    sitePages: mergeRecord(DEFAULT_CMS_SITE_PAGES, src.sitePages),
    destinationGuides: takeArray(src.destinationGuides, DESTINATION_GUIDES),
    updatedAt:
      typeof src.updatedAt === "string" && src.updatedAt
        ? src.updatedAt
        : new Date().toISOString(),
  };
}

export function applyCmsVars(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function cmsContactOf(cms: CmsState) {
  const pages = cms.sitePages;
  return {
    legalNameAr: pages.legalNameAr || COMPANY_LEGAL.legalNameAr,
    legalNameEn: pages.legalNameEn || COMPANY_LEGAL.legalNameEn,
    addressAr: pages.addressAr || COMPANY_LEGAL.addressAr,
    addressEn: pages.addressEn || COMPANY_LEGAL.addressEn,
    hoursAr: pages.hoursAr || COMPANY_LEGAL.hoursAr,
    hoursEn: pages.hoursEn || COMPANY_LEGAL.hoursEn,
    phoneDisplay: pages.phoneDisplay || COMPANY_LEGAL.phoneDisplay,
    phoneE164: pages.phoneE164 || COMPANY_LEGAL.phoneE164,
    whatsappUrl: pages.whatsappUrl || COMPANY_LEGAL.whatsappUrl,
    supportEmail: pages.supportEmail || COMPANY_LEGAL.supportEmail,
    tourismLicense: pages.tourismLicense || COMPANY_LEGAL.tourismLicense,
  };
}
