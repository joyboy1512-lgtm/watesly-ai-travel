/** First-row hero search services — toggleable from dashboard CMS. */

import {
  DEFAULT_CMS_HERO_SERVICES,
  type CmsHeroService,
} from "@watesly-travel/shared";

export type HeroServiceKey = CmsHeroService["key"];
export type HeroServiceItem = CmsHeroService;

const STORAGE_KEY = "wg_hero_services_v1";

export const DEFAULT_HERO_SERVICES: HeroServiceItem[] = DEFAULT_CMS_HERO_SERVICES;

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
