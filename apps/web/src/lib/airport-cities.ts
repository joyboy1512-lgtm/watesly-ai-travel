/** Display cities for common IATA codes (Arabic). Falls back to the code alone. */
const AIRPORT_CITY_AR: Record<string, string> = {
  KWI: "الكويت",
  DXB: "دبي",
  AUH: "أبوظبي",
  SHJ: "الشارقة",
  DOH: "الدوحة",
  BAH: "المنامة",
  MCT: "مسقط",
  RUH: "الرياض",
  JED: "جدة",
  DMM: "الدمام",
  MED: "المدينة",
  AHB: "أبها",
  TIF: "الطائف",
  ELQ: "القصيم",
  GIZ: "جازان",
  TUU: "تبوك",
  HAS: "حائل",
  CAI: "القاهرة",
  HBE: "الإسكندرية",
  IST: "إسطنبول",
  SAW: "إسطنبول",
  AYT: "أنطاليا",
  ADB: "إزمير",
  ESB: "أنقرة",
  AMM: "عمّان",
  BEY: "بيروت",
  LHR: "لندن",
  LGW: "لندن",
  STN: "لندن",
  CDG: "باريس",
  ORY: "باريس",
  FRA: "فرانكفورت",
  MUC: "ميونخ",
  AMS: "أمستردام",
  FCO: "روما",
  MXP: "ميلانو",
  BCN: "برشلونة",
  MAD: "مدريد",
  JFK: "نيويورك",
  EWR: "نيويورك",
  LAX: "لوس أنجلوس",
  ORD: "شيكاغو",
  IAD: "واشنطن",
  SFO: "سان فرانسيسكو",
  BOS: "بوسطن",
  MIA: "ميامي",
  DEL: "دلهي",
  BOM: "مومباي",
  BKK: "بانكوك",
  SIN: "سنغافورة",
  KUL: "كوالالمبور",
  CGK: "جاكرتا",
  HKG: "هونغ كونغ",
  NRT: "طوكيو",
  HND: "طوكيو",
  ICN: "سيول",
  SYD: "سيدني",
  MEL: "ملبورن",
  CMB: "كولومبو",
  DAC: "دكا",
  ISB: "إسلام آباد",
  LHE: "لاهور",
  KHI: "كراتشي",
  CLT: "شارلوت",
  ATL: "أتلانتا",
};

export function airportCityAr(code?: string | null): string {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!c) return "";
  return AIRPORT_CITY_AR[c] || "";
}

/** e.g. "دبي (DXB)" or just "DXB" when city unknown */
export function airportPlaceLabel(code?: string | null): string {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!c) return "—";
  const city = airportCityAr(c);
  return city ? `${city} (${c})` : c;
}
