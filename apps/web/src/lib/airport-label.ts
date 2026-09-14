const COUNTRY_AR: Record<string, string> = {
  kuwait: "الكويت",
  "united arab emirates": "الإمارات",
  uae: "الإمارات",
  emirates: "الإمارات",
  qatar: "قطر",
  bahrain: "البحرين",
  oman: "عُمان",
  "saudi arabia": "السعودية",
  ksa: "السعودية",
  turkey: "تركيا",
  egypt: "مصر",
  jordan: "الأردن",
  lebanon: "لبنان",
  india: "الهند",
  "united kingdom": "بريطانيا",
  uk: "بريطانيا",
  "united states": "أمريكا",
  usa: "أمريكا",
  france: "فرنسا",
  germany: "ألمانيا",
  italy: "إيطاليا",
  spain: "إسبانيا",
  greece: "اليونان",
  morocco: "المغرب",
  tunisia: "تونس",
  georgia: "جورجيا",
  azerbaijan: "أذربيجان",
  malaysia: "ماليزيا",
  thailand: "تايلاند",
  indonesia: "إندونيسيا",
  maldives: "المالديف",
  singapore: "سنغافورة",
};

export function localizeCountryName(country?: string | null) {
  const raw = String(country || "").trim();
  if (!raw) return "";
  return COUNTRY_AR[raw.toLowerCase()] || raw;
}

export function formatAirportChoiceLabel(a: {
  iataCode?: string | null;
  city?: string | null;
  name?: string | null;
  country?: string | null;
}) {
  const code = String(a.iataCode || "").toUpperCase();
  const city = String(a.city || a.name || "").trim();
  const country = localizeCountryName(a.country);
  const place = country && country !== city ? `${city}، ${country}` : city || country;
  if (code && place) return `${code} · ${place}`;
  return code || place;
}
