/** Prefer useful amenity highlights; drop payment brands and building trivia. */

const PREFERRED: Array<{ match: RegExp; label: string }> = [
  { match: /wifi|wi-?fi|wireless|إنترنت|واي\s*فاي/i, label: "واي فاي" },
  { match: /pool|مسبح|swimming/i, label: "مسبح" },
  { match: /breakfast|إفطار|bb\b|board/i, label: "إفطار" },
  { match: /parking|موقف|garage|car park/i, label: "موقف سيارات" },
  { match: /\bspa\b|ساونا|ساونا|جакуزي|ساونا|سبا/i, label: "سبا" },
  {
    match: /wheelchair|accessible|disability|ذوي|إعاق|كراسي\s*متحرك/i,
    label: "مهيأ لذوي الإعاقة",
  },
  { match: /airport|مطار/i, label: "قريب من المطار" },
  { match: /center|centre|مركز|downtown/i, label: "قريب من المركز" },
  { match: /gym|fitness|نادي\s*رياضي/i, label: "نادي رياضي" },
  { match: /restaurant|مطعم/i, label: "مطعم" },
  { match: /air.?condition|تكييف/i, label: "تكييف" },
];

const BLOCKED =
  /visa|master\s*card|mastercard|american\s*express|amex|number of floors|طوابق|floors?|double rooms?|غرف\s*دوبل|credit card|بطاقة\s*ائتمان|payment|suite|سوبيريور|superior|junior|جونيور|deluxe room|دوبلكس/i;

export function pickHotelHighlightFacilities(
  labels: string[] | undefined,
  limit = 4,
): string[] {
  if (!labels?.length) return [];
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const rule of PREFERRED) {
    const hit = labels.find((l) => rule.match.test(l) && !BLOCKED.test(l));
    if (!hit) continue;
    if (seen.has(rule.label)) continue;
    seen.add(rule.label);
    picked.push(rule.label);
    if (picked.length >= limit) return picked;
  }

  for (const label of labels) {
    if (BLOCKED.test(label)) continue;
    const normalized = label.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    picked.push(normalized);
    if (picked.length >= limit) break;
  }
  return picked;
}
