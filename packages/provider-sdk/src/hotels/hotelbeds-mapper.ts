import type { HotelOffer } from "@watesly-travel/shared";
import type {
  HotelPropertyDetails,
  HotelRateOption,
  HotelRoomOption,
} from "@watesly-travel/shared";
import { boardLabelAr } from "@watesly-travel/shared";
import type { HotelSearchParams } from "../types";
import { amountToMinor } from "../types";
import { enrichDetailsFromContent } from "./hotelbeds-content-mapper";
import type { HbContentHotel } from "./hotelbeds-content-types";
import type { GeoCenter } from "./hotelbeds-geo";
import type {
  HbCancellationPolicy,
  HbHotel,
  HbRate,
  HbRoom,
  HbTaxes,
} from "./hotelbeds-types";

function parseStars(categoryCode?: string): number | undefined {
  if (!categoryCode) return undefined;
  const match = categoryCode.match(/^(\d)/);
  return match ? Number(match[1]) : undefined;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function rateMajor(rate: HbRate, hotel: HbHotel): number {
  const raw = rate.net ?? rate.sellingRate ?? rate.hotelSellingRate ?? hotel.minRate;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hasFreeCancellation(policies?: HbCancellationPolicy[]): boolean {
  if (!policies?.length) return false;
  return policies.some((p) => Number(p.amount || 0) === 0);
}

function mapTaxes(taxes?: HbTaxes, currency = "EUR") {
  if (!taxes?.taxes?.length) return undefined;
  return {
    allIncluded: taxes.allIncluded,
    items: taxes.taxes.map((t) => ({
      type: t.type,
      amount: Number(t.amount ?? t.clientAmount ?? 0),
      currency: String(t.currency ?? t.clientCurrency ?? currency),
      included: Boolean(t.included),
    })),
  };
}

function mapRate(
  rate: HbRate,
  room: HbRoom,
  hotel: HbHotel,
  currency: string,
): HotelRateOption | null {
  if (!rate.rateKey) return null;
  const net = rateMajor(rate, hotel);
  if (net <= 0) return null;
  const boardCode = String(rate.boardCode || "RO");
  const boardName = boardLabelAr(boardCode, rate.boardName);
  return {
    rateKey: rate.rateKey,
    rateType: String(rate.rateType || "BOOKABLE"),
    rateClass: rate.rateClass,
    roomCode: String(room.code || ""),
    roomName: String(room.name || room.code || "غرفة"),
    boardCode,
    boardName,
    net,
    sellingRate: rate.sellingRate ? Number(rate.sellingRate) : undefined,
    currency,
    paymentType: rate.paymentType,
    packaging: rate.packaging,
    allotment: rate.allotment,
    freeCancellation: hasFreeCancellation(rate.cancellationPolicies),
    cancellationPolicies: (rate.cancellationPolicies || []).map((p) => ({
      amount: Number(p.amount ?? p.hotelAmount ?? 0),
      currency: String(p.hotelCurrency ?? currency),
      from: String(p.from || ""),
    })),
    taxes: mapTaxes(rate.taxes, currency),
    promotions: (rate.promotions || []).map((p) => ({
      code: p.code,
      name: p.name,
      remark: p.remark,
    })),
    adults: rate.adults,
    children: rate.children,
    rooms: rate.rooms,
    rateCommentsId: rate.rateCommentsId,
  };
}

export function extractHotelbedsRateOptions(
  hotel: HbHotel,
  currency: string,
): { rooms: HotelRoomOption[]; rateOptions: HotelRateOption[] } {
  const rooms: HotelRoomOption[] = [];
  const rateOptions: HotelRateOption[] = [];

  for (const room of hotel.rooms || []) {
    const mappedRates: HotelRateOption[] = [];
    for (const rate of room.rates || []) {
      const mapped = mapRate(rate, room, hotel, currency);
      if (mapped) {
        mappedRates.push(mapped);
        rateOptions.push(mapped);
      }
    }
    if (mappedRates.length) {
      rooms.push({
        code: String(room.code || ""),
        name: String(room.name || room.code || "غرفة"),
        rates: mappedRates.sort((a, b) => a.net - b.net),
      });
    }
  }

  rateOptions.sort((a, b) => a.net - b.net);
  rooms.sort(
    (a, b) => (a.rates[0]?.net ?? Infinity) - (b.rates[0]?.net ?? Infinity),
  );

  return { rooms, rateOptions };
}

export function mapHotelbedsToOffer(input: {
  hotel: HbHotel;
  params: HotelSearchParams;
  geoLabel?: string;
  liveMode: boolean;
  expiresAt: string;
  content?: HbContentHotel;
  searchCenter?: GeoCenter;
}): HotelOffer | null {
  const { hotel, params, geoLabel, liveMode, expiresAt, content, searchCenter } = input;
  const hotelCurrency = String(hotel.currency || params.currency || "EUR").toUpperCase();
  const { rooms, rateOptions } = extractHotelbedsRateOptions(hotel, hotelCurrency);
  if (!rateOptions.length) return null;

  const cheapest = rateOptions[0]!;
  const nights = nightsBetween(params.checkInDate, params.checkOutDate);
  const stars = parseStars(hotel.categoryCode);
  const hotelCode = String(hotel.code || "");
  const boards = [...new Set(rateOptions.map((r) => r.boardName))];
  const boardCodes = [...new Set(rateOptions.map((r) => r.boardCode))];
  const paymentTypes = [...new Set(rateOptions.map((r) => r.paymentType).filter(Boolean))] as string[];
  const rateTypes = [...new Set(rateOptions.map((r) => r.rateType))];
  const zones = hotel.zoneName ? [String(hotel.zoneName)] : [];
  const promotions = [
    ...new Set(
      rateOptions.flatMap((r) => r.promotions.map((p) => p.name || p.remark || "").filter(Boolean)),
    ),
  ];

  const minRate = rateOptions[0]!.net;
  const maxRate = rateOptions[rateOptions.length - 1]!.net;

  const details: HotelPropertyDetails = {
    provider: "hotelbeds",
    liveMode,
    hotelCode,
    name: String(hotel.name || "فندق"),
    stars,
    categoryCode: hotel.categoryCode,
    categoryName: hotel.categoryName,
    destinationCode: hotel.destinationCode,
    destinationName: hotel.destinationName,
    zoneCode: hotel.zoneCode != null ? String(hotel.zoneCode) : undefined,
    zoneName: hotel.zoneName,
    location: geoLabel || hotel.destinationName || params.location,
    neighborhood: hotel.zoneName,
    address: [hotel.zoneName, hotel.destinationName].filter(Boolean).join(" · "),
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    currency: hotelCurrency,
    minRate,
    maxRate,
    nights,
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    board: cheapest.boardName,
    boardCode: cheapest.boardCode,
    roomType: cheapest.roomName,
    roomCode: cheapest.roomCode,
    rateType: cheapest.rateType,
    paymentType: cheapest.paymentType,
    freeCancellation: cheapest.freeCancellation,
    noPrepayment: cheapest.paymentType === "AT_HOTEL",
    rooms,
    rateOptions,
    boards,
    boardCodes,
    paymentTypes,
    rateTypes,
    zones,
    promotions,
    roomsAvailable: Math.max(...rateOptions.map((r) => r.allotment ?? 0), 0) || undefined,
    propertyType: "hotel",
  };

  const enriched = enrichDetailsFromContent({ details, content, searchCenter });
  if (enriched.latitude != null && enriched.longitude != null) {
    enriched.mapUrl = `https://www.openstreetmap.org/?mlat=${enriched.latitude}&mlon=${enriched.longitude}#map=15/${enriched.latitude}/${enriched.longitude}`;
  }

  const description = [
    enriched.name,
    stars ? `${stars}★` : enriched.categoryName,
    `${rateOptions.length} تعرفة · ${rooms.length} غرفة`,
    cheapest.boardName,
    `${nights} ليلة`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    providerKey: "hotelbeds",
    providerOfferRef: `hb-${hotelCode}`,
    description,
    costAmountMinor: amountToMinor(cheapest.net, hotelCurrency),
    currency: hotelCurrency,
    revalidationToken: JSON.stringify({
      hotelCode,
      rateKey: cheapest.rateKey,
      checkIn: params.checkInDate,
      checkOut: params.checkOutDate,
      rateType: cheapest.rateType,
    }),
    expiresAt,
    raw: enriched as unknown as Record<string, unknown>,
  };
}

export function mapCheckratesToOffer(
  offer: HotelOffer,
  hotel: HbHotel,
): HotelOffer {
  const params = {
    checkInDate: String(offer.raw?.checkInDate || ""),
    checkOutDate: String(offer.raw?.checkOutDate || ""),
    location: String(offer.raw?.location || ""),
    adults: Number(offer.raw?.adults || 2),
  } as HotelSearchParams;

  const remapped = mapHotelbedsToOffer({
    hotel,
    params,
    geoLabel: String(offer.raw?.location || ""),
    liveMode: Boolean(offer.raw?.liveMode),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  });
  if (!remapped) return offer;
  return {
    ...remapped,
    providerOfferRef: offer.providerOfferRef,
    revalidationToken: offer.revalidationToken,
    raw: {
      ...remapped.raw,
      revalidatedAt: new Date().toISOString(),
    },
  };
}
