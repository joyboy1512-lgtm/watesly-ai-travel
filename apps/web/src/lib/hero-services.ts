/** First-row hero search services — toggleable from dashboard. */

export type HeroServiceKey =
  | "stays"
  | "flights"
  | "cars"
  | "activities"
  | "myTrip"
  | string;

export type HeroServiceItem = {
  key: HeroServiceKey;
  labelAr: string;
  labelEn: string;
  hintAr?: string;
  hintEn?: string;
  enabled: boolean;
  /** Built-in modes map to search accordion; custom keys open href or myTrip */
  href?: string;
  kind: "mode" | "myTrip" | "link";
};

const STORAGE_KEY = "wg_hero_services_v1";

export const DEFAULT_HERO_SERVICES: HeroServiceItem[] = [
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

export function loadHeroServices(): HeroServiceItem[] {
  if (typeof window === "undefined") return DEFAULT_HERO_SERVICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HERO_SERVICES;
    const parsed = JSON.parse(raw) as HeroServiceItem[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_HERO_SERVICES;
    return parsed;
  } catch {
    return DEFAULT_HERO_SERVICES;
  }
}

export function saveHeroServices(items: HeroServiceItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wg-hero-services-changed"));
}

export const readHeroServices = loadHeroServices;
export const writeHeroServices = saveHeroServices;
