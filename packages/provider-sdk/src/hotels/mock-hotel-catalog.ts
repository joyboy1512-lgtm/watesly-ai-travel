/**
 * Realistic mock hotel catalog for MockHotelProvider.
 * Nightly rates are major currency units (KWD); callers convert to minor.
 */

import { MOCK_DESTINATION_LABELS } from "../flights/mock-flight-catalog";

export type MockHotelTemplate = {
  id: string;
  nameAr: string;
  nameEn: string;
  stars: 3 | 4 | 5;
  rating: number;
  reviewCount: number;
  neighborhood: string;
  propertyType: "hotel" | "apartment" | "resort" | "guest_house";
  roomType: string;
  board: string;
  facilities: string[];
  freeCancellation: boolean;
  noPrepayment: boolean;
  /** Nightly rate in KWD major */
  nightRateKwd: number;
  roomsAvailable: number;
  imageUrl: string;
  scenario?: "normal" | "price_change" | "sold_out" | "unavailable";
};

const PLACEHOLDER = (seed: string) =>
  `https://placehold.co/640x420/0b3d4a/e8c27a?text=${encodeURIComponent(seed)}`;

export function hotelsForDestination(destCode: string, label: string): MockHotelTemplate[] {
  const city = label || MOCK_DESTINATION_LABELS[destCode] || destCode;
  return [
    {
      id: "htl-3-biz",
      nameAr: `فندق ${city} بيزنس`,
      nameEn: `${city} Business Hotel`,
      stars: 3,
      rating: 7.4,
      reviewCount: 612,
      neighborhood: "وسط المدينة",
      propertyType: "hotel",
      roomType: "غرفة مزدوجة قياسية",
      board: "غرفة فقط",
      facilities: ["wifi", "parking"],
      freeCancellation: false,
      noPrepayment: true,
      nightRateKwd: 22,
      roomsAvailable: 6,
      imageUrl: PLACEHOLDER(`${city}+3*`),
    },
    {
      id: "htl-3-guest",
      nameAr: `دار ضيافة ${city}`,
      nameEn: `${city} Guest House`,
      stars: 3,
      rating: 7.9,
      reviewCount: 288,
      neighborhood: "حي تاريخي",
      propertyType: "guest_house",
      roomType: "غرفة توين",
      board: "إفطار",
      facilities: ["wifi"],
      freeCancellation: true,
      noPrepayment: true,
      nightRateKwd: 18,
      roomsAvailable: 3,
      imageUrl: PLACEHOLDER(`${city}+Guest`),
    },
    {
      id: "htl-4-central",
      nameAr: `فندق ${city} سنترال`,
      nameEn: `${city} Central Hotel`,
      stars: 4,
      rating: 8.5,
      reviewCount: 1540,
      neighborhood: "المنطقة التجارية",
      propertyType: "hotel",
      roomType: "غرفة ديلوكس كينج",
      board: "إفطار",
      facilities: ["wifi", "parking", "pool", "gym"],
      freeCancellation: true,
      noPrepayment: true,
      nightRateKwd: 38,
      roomsAvailable: 12,
      imageUrl: PLACEHOLDER(`${city}+4*`),
    },
    {
      id: "htl-4-apt",
      nameAr: `شقق ${city} ريزيدنس`,
      nameEn: `${city} Residences`,
      stars: 4,
      rating: 8.2,
      reviewCount: 890,
      neighborhood: "قرب المطار",
      propertyType: "apartment",
      roomType: "استوديو بمطبخ",
      board: "غرفة فقط",
      facilities: ["wifi", "parking", "kitchenette"],
      freeCancellation: true,
      noPrepayment: false,
      nightRateKwd: 42,
      roomsAvailable: 4,
      imageUrl: PLACEHOLDER(`${city}+Apt`),
    },
    {
      id: "htl-5-plaza",
      nameAr: `منتجع ${city} بلازا`,
      nameEn: `${city} Plaza Resort`,
      stars: 5,
      rating: 9.2,
      reviewCount: 3210,
      neighborhood: "واجهة مائية",
      propertyType: "resort",
      roomType: "جناح بإطلالة",
      board: "إفطار",
      facilities: ["wifi", "parking", "pool", "spa", "gym"],
      freeCancellation: true,
      noPrepayment: false,
      nightRateKwd: 78,
      roomsAvailable: 8,
      imageUrl: PLACEHOLDER(`${city}+5*`),
    },
    {
      id: "htl-5-price-change",
      nameAr: `أوتيل ${city} غراند`,
      nameEn: `${city} Grand Hotel`,
      stars: 5,
      rating: 8.9,
      reviewCount: 2104,
      neighborhood: "وسط المدينة",
      propertyType: "hotel",
      roomType: "غرفة تنفيذية",
      board: "نصف إقامة",
      facilities: ["wifi", "parking", "pool", "spa", "gym"],
      freeCancellation: true,
      noPrepayment: false,
      nightRateKwd: 95,
      roomsAvailable: 2,
      imageUrl: PLACEHOLDER(`${city}+Grand`),
      scenario: "price_change",
    },
    {
      id: "htl-sold-out",
      nameAr: `فندق ${city} سكايلاين`,
      nameEn: `${city} Skyline`,
      stars: 4,
      rating: 8.7,
      reviewCount: 990,
      neighborhood: "وسط المدينة",
      propertyType: "hotel",
      roomType: "غرفة ديلوكس",
      board: "إفطار",
      facilities: ["wifi", "pool"],
      freeCancellation: false,
      noPrepayment: false,
      nightRateKwd: 48,
      roomsAvailable: 0,
      imageUrl: PLACEHOLDER(`${city}+SoldOut`),
      scenario: "sold_out",
    },
    {
      id: "htl-unavailable",
      nameAr: `إقامة ${city} ليمتد`,
      nameEn: `${city} Limited Stay`,
      stars: 3,
      rating: 7.1,
      reviewCount: 140,
      neighborhood: "ضاحية",
      propertyType: "apartment",
      roomType: "غرفة مزدوجة",
      board: "غرفة فقط",
      facilities: ["wifi"],
      freeCancellation: false,
      noPrepayment: true,
      nightRateKwd: 16,
      roomsAvailable: 0,
      imageUrl: PLACEHOLDER(`${city}+NA`),
      scenario: "unavailable",
    },
  ];
}
