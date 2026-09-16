export type HeroTickerAirline = {
  code: string;
  ar: string;
  en: string;
};

/** Official vector lockup (logo + wordmark) for the hero ticker. */
export function heroTickerLogoSrc(
  code: string,
  variant: "lockup" | "logo" = "lockup",
): string {
  return `https://assets.duffel.com/img/airlines/for-light-background/full-color-${variant}/${code.trim().toUpperCase()}.svg`;
}

/** Partner marks shown in the homepage hero ticker (official IATA logos). */
export const HERO_TICKER_AIRLINES: HeroTickerAirline[] = [
  { code: "KU", ar: "الخطوط الكويتية", en: "Kuwait Airways" },
  { code: "J9", ar: "طيران الجزيرة", en: "Jazeera Airways" },
  { code: "EK", ar: "طيران الإمارات", en: "Emirates" },
  { code: "EY", ar: "الاتحاد للطيران", en: "Etihad" },
  { code: "QR", ar: "الخطوط القطرية", en: "Qatar Airways" },
  { code: "SV", ar: "الخطوط السعودية", en: "Saudia" },
  { code: "FZ", ar: "فلاي دبي", en: "flydubai" },
  { code: "GF", ar: "طيران الخليج", en: "Gulf Air" },
  { code: "XY", ar: "طيران ناس", en: "flynas" },
  { code: "G9", ar: "العربية للطيران", en: "Air Arabia" },
  { code: "MS", ar: "مصر للطيران", en: "Egyptair" },
  { code: "WY", ar: "الطيران العماني", en: "Oman Air" },
  { code: "RJ", ar: "الملكية الأردنية", en: "Royal Jordanian" },
  { code: "TK", ar: "الخطوط التركية", en: "Turkish Airlines" },
  { code: "BA", ar: "الخطوط البريطانية", en: "British Airways" },
  { code: "LH", ar: "لوفتهانزا", en: "Lufthansa" },
];
