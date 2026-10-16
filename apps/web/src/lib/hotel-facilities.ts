/** Prefer useful amenity highlights; drop payment brands and building trivia. */

const PREFERRED: Array<{ match: RegExp; ar: string; en: string }> = [
  { match: /wifi|wi-?fi|wireless|إنترنت|واي\s*فاي/i, ar: "واي فاي", en: "Wi-Fi" },
  { match: /pool|مسبح|swimming/i, ar: "مسبح", en: "Pool" },
  { match: /breakfast|إفطار|bb\b|board/i, ar: "إفطار", en: "Breakfast" },
  { match: /parking|موقف|garage|car park/i, ar: "موقف سيارات", en: "Parking" },
  { match: /\bspa\b|ساونا|جакуزي|سبا/i, ar: "سبا", en: "Spa" },
  {
    match: /wheelchair|accessible|disability|ذوي|إعاق|كراسي\s*متحرك/i,
    ar: "مهيأ لذوي الإعاقة",
    en: "Accessible",
  },
  { match: /airport|مطار/i, ar: "قريب من المطار", en: "Near airport" },
  { match: /center|centre|مركز|downtown/i, ar: "قريب من المركز", en: "Near city center" },
  { match: /gym|fitness|نادي\s*رياضي/i, ar: "نادي رياضي", en: "Gym" },
  { match: /restaurant|مطعم/i, ar: "مطعم", en: "Restaurant" },
  { match: /air.?condition|تكييف/i, ar: "تكييف", en: "Air conditioning" },
];

const BLOCKED =
  /visa|master\s*card|mastercard|american\s*express|amex|number of floors|طوابق|floors?|double rooms?|غرف\s*دوبل|credit card|بطاقة\s*ائتمان|payment|suite|سوبيريور|superior|junior|جونيور|deluxe room|دوبلكس/i;

export function pickHotelHighlightFacilities(
  labels: string[] | undefined,
  limit = 4,
  locale: "ar" | "en" = "ar",
): string[] {
  if (!labels?.length) return [];
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const rule of PREFERRED) {
    const hit = labels.find((l) => rule.match.test(l) && !BLOCKED.test(l));
    if (!hit) continue;
    const label = rule[locale];
    if (seen.has(label)) continue;
    seen.add(label);
    picked.push(label);
    if (picked.length >= limit) return picked;
  }

  for (const label of labels) {
    if (BLOCKED.test(label)) continue;
    const normalized = label.trim();
    if (locale === "en" && /[\u0600-\u06FF]/.test(normalized)) continue;
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    picked.push(normalized);
    if (picked.length >= limit) break;
  }
  return picked;
}
