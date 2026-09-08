/** Display-only airline catalog (mirrors mock provider; swap with API lookup later). */
export const AIRLINE_NAMES_AR: Record<string, string> = {
  KU: "الخطوط الكويتية",
  EK: "طيران الإمارات",
  QR: "الخطوط القطرية",
  TK: "الخطوط التركية",
  J9: "طيران الجزيرة",
  XY: "طيران ناس",
  MS: "مصر للطيران",
  J2: "أذربيجان للطيران",
  KE: "كوريا للطيران",
  BA: "الخطوط البريطانية",
  GF: "طيران الخليج",
  FZ: "فلاي دبي",
  SV: "الخطوط السعودية",
  EY: "الاتحاد للطيران",
};

export function normalizeAirlineCode(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = String(raw).trim().toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(trimmed)) return trimmed;
  const fromFlight = trimmed.match(/^([A-Z0-9]{2})\d/);
  if (fromFlight) return fromFlight[1]!;
  for (const code of Object.keys(AIRLINE_NAMES_AR)) {
    if (trimmed.includes(code)) return code;
  }
  return trimmed.slice(0, 2);
}

export function airlineNameAr(code?: string | null, fallback?: string | null): string {
  const c = normalizeAirlineCode(code);
  if (c && AIRLINE_NAMES_AR[c]) return AIRLINE_NAMES_AR[c]!;
  if (fallback && AIRLINE_NAMES_AR[normalizeAirlineCode(fallback)]) {
    return AIRLINE_NAMES_AR[normalizeAirlineCode(fallback)]!;
  }
  if (fallback && /[\u0600-\u06FF]/.test(fallback)) return fallback;
  if (c) return c;
  return fallback || "شركة طيران";
}
