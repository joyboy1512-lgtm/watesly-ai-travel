export type DestinationGuide = {
  slug: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  airportCode: string;
  countryAr: string;
  countryEn: string;
  image: string;
  whyAr: string;
  whyEn: string;
  bestTimeAr: string;
  bestTimeEn: string;
  costHintAr: string;
  costHintEn: string;
  hotelsAr: string[];
  hotelsEn: string[];
  activitiesAr: string[];
  activitiesEn: string[];
  flightHintAr: string;
  flightHintEn: string;
  seoTitleAr: string;
  seoTitleEn: string;
  seoDescriptionAr: string;
  seoDescriptionEn: string;
};

export const DESTINATION_GUIDES: DestinationGuide[] = [
  {
    slug: "dubai",
    nameAr: "دبي",
    nameEn: "Dubai",
    flag: "🇦🇪",
    airportCode: "DXB",
    countryAr: "الإمارات",
    countryEn: "UAE",
    image: "/media/destinations/dubai.jpg?v=1",
    whyAr: "مدينة لا تنام: تسوق، شواطئ، معالم عالمية، وقربها من الكويت يجعلها مثالية لنهاية الأسبوع.",
    whyEn: "A city that never sleeps — shopping, beaches, icons — perfect for a Kuwait weekend.",
    bestTimeAr: "أكتوبر إلى أبريل (أجواء لطيفة).",
    bestTimeEn: "October to April (mild weather).",
    costHintAr: "عطلة 3 ليالٍ عادة من ~199 د.ك للطيران+فندق حسب الموسم.",
    costHintEn: "3-night packages often from ~199 KWD flight+hotel by season.",
    hotelsAr: ["فنادق ديرة الاقتصادية", "مارينا 4★", "داون تاون بإطلالة برج خليفة"],
    hotelsEn: ["Deira value hotels", "Marina 4★", "Downtown Burj views"],
    activitiesAr: ["دبي مول", "نافورة دبي", "صحراء سفاري", "المراكب في المرسى"],
    activitiesEn: ["Dubai Mall", "Dubai Fountain", "Desert safari", "Marina cruise"],
    flightHintAr: "رحلات مباشرة متعددة يومياً من الكويت (KWI → DXB) خلال ~1.5–2 ساعة.",
    flightHintEn: "Multiple daily directs KWI→DXB (~1.5–2h).",
    seoTitleAr: "رحلات من الكويت إلى دبي | عروض نهاية الأسبوع — WeekendGate",
    seoTitleEn: "Flights Kuwait to Dubai | Weekend Deals — WeekendGate",
    seoDescriptionAr: "قارن أرخص رحلات الكويت–دبي، أفضل الفنادق، عروض Weekend، وخطط رحلتك.",
    seoDescriptionEn: "Compare Kuwait–Dubai flights, hotels, weekend deals, and plan your trip.",
  },
  {
    slug: "istanbul",
    nameAr: "إسطنبول",
    nameEn: "Istanbul",
    flag: "🇹🇷",
    airportCode: "IST",
    countryAr: "تركيا",
    countryEn: "Turkey",
    image: "/media/destinations/istanbul.jpg?v=1",
    whyAr: "تاريخ وثقافة ومطبخ لا يُقاوم بين آسيا وأوروبا.",
    whyEn: "History, culture, and food between Asia and Europe.",
    bestTimeAr: "أبريل–يونيو وسبتمبر–نوفمبر.",
    bestTimeEn: "April–June and September–November.",
    costHintAr: "باقات نهاية أسبوع غالباً من ~189 د.ك.",
    costHintEn: "Weekend packages often from ~189 KWD.",
    hotelsAr: ["سلطان أحمد", "تقسيم", "البوسفور"],
    hotelsEn: ["Sultanahmet", "Taksim", "Bosphorus"],
    activitiesAr: ["آيا صوفيا", "البازار", "رحلة البوسفور"],
    activitiesEn: ["Hagia Sophia", "Grand Bazaar", "Bosphorus cruise"],
    flightHintAr: "رحلات من الكويت إلى IST/SAW يومياً تقريباً.",
    flightHintEn: "Near-daily flights KWI to IST/SAW.",
    seoTitleAr: "رحلات الكويت إلى إسطنبول | WeekendGate",
    seoTitleEn: "Kuwait to Istanbul Flights | WeekendGate",
    seoDescriptionAr: "أفضل وقت لزيارة إسطنبول، الفنادق، الأنشطة، وعروض السفر من الكويت.",
    seoDescriptionEn: "Best time, hotels, activities, and Kuwait travel deals to Istanbul.",
  },
  {
    slug: "doha",
    nameAr: "الدوحة",
    nameEn: "Doha",
    flag: "🇶🇦",
    airportCode: "DOH",
    countryAr: "قطر",
    countryEn: "Qatar",
    image: "/media/destinations/doha.jpg?v=1",
    whyAr: "متاحف عالمية، كورنيش، وسوق واقف — قريبة وسريعة.",
    whyEn: "World-class museums, Corniche, Souq Waqif — close and quick.",
    bestTimeAr: "نوفمبر إلى مارس.",
    bestTimeEn: "November to March.",
    costHintAr: "باقات من ~165 د.ك لعطلة قصيرة.",
    costHintEn: "Packages from ~165 KWD for a short break.",
    hotelsAr: ["الخليج الغربي", "اللؤلؤة", "المطار"],
    hotelsEn: ["West Bay", "The Pearl", "Airport area"],
    activitiesAr: ["متحف قطر", "سوق واقف", "كتارا"],
    activitiesEn: ["Museum of Islamic Art", "Souq Waqif", "Katara"],
    flightHintAr: "رحلات قصيرة مباشرة من الكويت.",
    flightHintEn: "Short direct flights from Kuwait.",
    seoTitleAr: "رحلات الكويت إلى الدوحة | WeekendGate",
    seoTitleEn: "Kuwait to Doha Flights | WeekendGate",
    seoDescriptionAr: "عطلات نهاية الأسبوع إلى الدوحة: طيران، فنادق، أنشطة.",
    seoDescriptionEn: "Doha weekends: flights, hotels, activities.",
  },
  {
    slug: "bahrain",
    nameAr: "البحرين",
    nameEn: "Bahrain",
    flag: "🇧🇭",
    airportCode: "BAH",
    countryAr: "البحرين",
    countryEn: "Bahrain",
    image: "/media/destinations/doha.jpg?v=1",
    whyAr: "أقرب وجهة خليجية لنهاية أسبوع خفيفة.",
    whyEn: "Closest Gulf weekend escape.",
    bestTimeAr: "طوال العام تقريباً؛ الأفضل شتاءً.",
    bestTimeEn: "Year-round; best in winter.",
    costHintAr: "من ~129 د.ك للطيران+فندق.",
    costHintEn: "From ~129 KWD flight+hotel.",
    hotelsAr: ["المنامة", "الجفير", "الريف"],
    hotelsEn: ["Manama", "Juffair", "Reef"],
    activitiesAr: ["قلعة البحرين", "المدينة القديمة", "المطاعم"],
    activitiesEn: ["Bahrain Fort", "Old town", "Dining"],
    flightHintAr: "رحلات قصيرة جداً من KWI.",
    flightHintEn: "Very short flights from KWI.",
    seoTitleAr: "رحلات الكويت إلى البحرين | WeekendGate",
    seoTitleEn: "Kuwait to Bahrain | WeekendGate",
    seoDescriptionAr: "عروض البحرين لنهاية الأسبوع من الكويت.",
    seoDescriptionEn: "Bahrain weekend deals from Kuwait.",
  },
  {
    slug: "riyadh",
    nameAr: "الرياض",
    nameEn: "Riyadh",
    flag: "🇸🇦",
    airportCode: "RUH",
    countryAr: "السعودية",
    countryEn: "Saudi Arabia",
    image: "/media/destinations/dubai.jpg?v=1",
    whyAr: "عاصمة الفعاليات والترفيه والمؤتمرات.",
    whyEn: "Capital of events, entertainment, and business.",
    bestTimeAr: "نوفمبر إلى مارس.",
    bestTimeEn: "November to March.",
    costHintAr: "باقات من ~155 د.ك.",
    costHintEn: "Packages from ~155 KWD.",
    hotelsAr: ["العليا", "المطار", "البوابة"],
    hotelsEn: ["Olaya", "Airport", "Diplomatic Quarter"],
    activitiesAr: ["البوليفارد", "الدرعية", "المتحف الوطني"],
    activitiesEn: ["Boulevard", "Diriyah", "National Museum"],
    flightHintAr: "رحلات متعددة يومياً KWI→RUH.",
    flightHintEn: "Multiple daily KWI→RUH flights.",
    seoTitleAr: "رحلات الكويت إلى الرياض | WeekendGate",
    seoTitleEn: "Kuwait to Riyadh | WeekendGate",
    seoDescriptionAr: "خطط رحلتك إلى الرياض: طيران، فنادق، أنشطة.",
    seoDescriptionEn: "Plan Riyadh: flights, hotels, activities.",
  },
  {
    slug: "muscat",
    nameAr: "مسقط",
    nameEn: "Muscat",
    flag: "🇴🇲",
    airportCode: "MCT",
    countryAr: "عُمان",
    countryEn: "Oman",
    image: "/media/destinations/maldives.jpg?v=1",
    whyAr: "طبيعة هادئة وشواطئ وجبال قريبة.",
    whyEn: "Calm nature, beaches, and nearby mountains.",
    bestTimeAr: "أكتوبر إلى أبريل.",
    bestTimeEn: "October to April.",
    costHintAr: "باقات من ~149 د.ك.",
    costHintEn: "Packages from ~149 KWD.",
    hotelsAr: ["القرم", "مطرح", "الشاطئ"],
    hotelsEn: ["Al Khuwair", "Mutrah", "Beach resorts"],
    activitiesAr: ["مسجد السلطان", "سوق مطرح", "وادي شاب"],
    activitiesEn: ["Grand Mosque", "Mutrah Souq", "Wadi Shab"],
    flightHintAr: "رحلات مباشرة موسمية/أسبوعية حسب الناقل.",
    flightHintEn: "Direct flights vary by carrier/season.",
    seoTitleAr: "رحلات الكويت إلى مسقط | WeekendGate",
    seoTitleEn: "Kuwait to Muscat | WeekendGate",
    seoDescriptionAr: "عطلة عُمان من الكويت — طيران وفنادق.",
    seoDescriptionEn: "Oman getaways from Kuwait — flights and hotels.",
  },
];

export function getDestination(slug: string): DestinationGuide | undefined {
  return DESTINATION_GUIDES.find((d) => d.slug === slug);
}
