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
import {
  canConvertHotelbedsCurrency,
  convertHotelbedsAmount,
  hotelbedsDisplayCurrency,
} from "./hotelbeds-currency";
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

function mapTaxes(
  taxes?: HbTaxes,
  providerCurrency = "EUR",
  displayCurrency = "KWD",
) {
  if (!taxes?.taxes?.length) return undefined;
  return {
    allIncluded: taxes.allIncluded,
    items: taxes.taxes.map((t) => ({
      type: t.type,
      amount: convertHotelbedsAmount(
        Number(t.amount ?? t.clientAmount ?? 0),
        String(t.currency ?? t.clientCurrency ?? providerCurrency),
        displayCurrency,
      ),
      currency: displayCurrency,
      included: Boolean(t.included),
    })),
  };
}

function addDaysIso(iso: string, offset: number): string | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function mapDailyRates(rate: HbRate, checkIn?: string, convert?: (value: number) => number) {
  if (!rate.dailyRates?.length) return undefined;
  return rate.dailyRates.map((d) => {
    const offset = Number(d.offset ?? 0);
    const net = Number(d.dailyNet ?? 0);
    const value = Number.isFinite(net) ? net : undefined;
    return {
      offset: Number.isFinite(offset) ? offset : 0,
      date: addDaysIso(checkIn || "", Number.isFinite(offset) ? offset : 0),
      net: value == null ? undefined : convert ? convert(value) : value,
    };
  });
}

function mapPromotions(rate: HbRate) {
  const fromPromos = (rate.promotions || []).map((p) => ({
    code: p.code,
    name: p.name,
    remark: p.remark,
  }));
  const fromOffers = (rate.offers || []).map((o) => ({
    code: o.code,
    name: o.name,
    remark:
      o.amount != null && Number(o.amount) !== 0 ? `خصم ${o.amount}` : o.name,
  }));
  return [...fromPromos, ...fromOffers].filter((p) => p.name || p.remark);
}

function commentsText(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const text = Array.isArray(value) ? value.filter(Boolean).join("\n") : value;
  return text.trim() || undefined;
}

function mapRate(
  rate: HbRate,
  room: HbRoom,
  hotel: HbHotel,
  providerCurrency: string,
  displayCurrency: string,
  checkIn?: string,
): HotelRateOption | null {
  if (!rate.rateKey) return null;
  const netRaw = rateMajor(rate, hotel);
  if (netRaw <= 0) return null;
  const convert = (value: number, from = providerCurrency) =>
    convertHotelbedsAmount(value, from, displayCurrency);
  const boardCode = String(rate.boardCode || "RO");
  const boardName = boardLabelAr(boardCode, rate.boardName);
  const selling = rate.sellingRate ? Number(rate.sellingRate) : undefined;
  return {
    rateKey: rate.rateKey,
    rateType: String(rate.rateType || "BOOKABLE"),
    rateClass: rate.rateClass,
    roomCode: String(room.code || ""),
    roomName: String(room.name || room.code || "غرفة"),
    boardCode,
    boardName,
    net: convert(netRaw),
    netBasis: "stay",
    sellingRate: Number.isFinite(selling) ? convert(selling as number) : undefined,
    currency: displayCurrency,
    paymentType: rate.paymentType,
    packaging: rate.packaging,
    allotment: rate.allotment,
    freeCancellation: hasFreeCancellation(rate.cancellationPolicies),
    cancellationPolicies: (rate.cancellationPolicies || []).map((p) => ({
      amount: convert(Number(p.amount ?? p.hotelAmount ?? 0), String(p.hotelCurrency ?? providerCurrency)),
      currency: displayCurrency,
      from: String(p.from || ""),
    })),
    taxes: mapTaxes(rate.taxes, providerCurrency, displayCurrency),
    promotions: mapPromotions(rate),
    adults: rate.adults,
    children: rate.children,
    rooms: rate.rooms,
    rateCommentsId: rate.rateCommentsId,
    rateComments: commentsText(rate.rateComments),
    dailyRates: mapDailyRates(rate, checkIn, convert),
  };
}

export function extractHotelbedsRateOptions(
  hotel: HbHotel,
  providerCurrency: string,
  displayCurrency: string,
  checkIn?: string,
): { rooms: HotelRoomOption[]; rateOptions: HotelRateOption[] } {
  const rooms: HotelRoomOption[] = [];
  const rateOptions: HotelRateOption[] = [];

  for (const room of hotel.rooms || []) {
    const mappedRates: HotelRateOption[] = [];
    for (const rate of room.rates || []) {
      const mapped = mapRate(
        rate,
        room,
        hotel,
        providerCurrency,
        displayCurrency,
        checkIn,
      );
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

function sourceMeta(liveMode: boolean, baseUrl?: string) {
  const sandbox = /test\.hotelbeds\.com/i.test(baseUrl || process.env.HOTELBEDS_BASE_URL || "");
  if (!liveMode) {
    return { source: "mock", sourceLabel: "تجريبي" };
  }
  return sandbox
    ? { source: "hotelbeds-sandbox" as const, sourceLabel: "نتيجة تجريبية من Hotelbeds Sandbox" }
    : { source: "hotelbeds-live" as const, sourceLabel: "Hotelbeds Live" };
}

export function mapHotelbedsToOffer(input: {
  hotel: HbHotel;
  params: HotelSearchParams;
  geoLabel?: string;
  liveMode: boolean;
  expiresAt: string;
  content?: HbContentHotel;
  searchCenter?: GeoCenter;
  facilityCatalog?: Map<string, string>;
}): HotelOffer | null {
  const { hotel, params, geoLabel, liveMode, expiresAt, content, searchCenter, facilityCatalog } =
    input;
  const providerCurrency = String(hotel.currency || "EUR").toUpperCase();
  const requested = hotelbedsDisplayCurrency(params.currency);
  const displayCurrency = canConvertHotelbedsCurrency(providerCurrency, requested)
    ? requested
    : providerCurrency;
  const checkIn = hotel.checkIn || params.checkInDate;
  const checkOut = hotel.checkOut || params.checkOutDate;
  const { rooms, rateOptions } = extractHotelbedsRateOptions(
    hotel,
    providerCurrency,
    displayCurrency,
    checkIn,
  );
  if (!rateOptions.length) return null;

  const cheapest = rateOptions[0]!;
  const nights = nightsBetween(checkIn, checkOut);
  const stars = parseStars(hotel.categoryCode);
  const hotelCode = String(hotel.code || "");
  const boards = [...new Set(rateOptions.map((r) => r.boardName))];
  const boardCodes = [...new Set(rateOptions.map((r) => r.boardCode))];
  const paymentTypes = [
    ...new Set(rateOptions.map((r) => r.paymentType).filter(Boolean)),
  ] as string[];
  const rateTypes = [...new Set(rateOptions.map((r) => r.rateType))];
  const zones = hotel.zoneName ? [String(hotel.zoneName)] : [];
  const promotions = [
    ...new Set(
      rateOptions.flatMap((r) =>
        r.promotions.map((p) => p.name || p.remark || "").filter(Boolean),
      ),
    ),
  ];
  const src = sourceMeta(liveMode);

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
    currency: displayCurrency,
    providerCurrency,
    minRate,
    maxRate,
    nights,
    checkInDate: checkIn,
    checkOutDate: checkOut,
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
    fetchedAt: new Date().toISOString(),
    source: src.source,
    sourceLabel: src.sourceLabel,
  };

  const enriched = enrichDetailsFromContent({ details, content, searchCenter, facilityCatalog });
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
    costAmountMinor: amountToMinor(cheapest.net, displayCurrency),
    currency: displayCurrency,
    revalidationToken: JSON.stringify({
      hotelCode,
      rateKey: cheapest.rateKey,
      checkIn,
      checkOut,
      rateType: cheapest.rateType,
    }),
    expiresAt,
    raw: enriched as unknown as Record<string, unknown>,
  };
}

type RoomLike = HotelRoomOption & Record<string, unknown>;

function mergeRooms(
  previous: unknown,
  next: unknown,
): HotelRoomOption[] {
  const prevRooms = Array.isArray(previous) ? (previous as RoomLike[]) : [];
  const nextRooms = Array.isArray(next) ? (next as RoomLike[]) : [];
  return nextRooms.map((room) => {
    const old = prevRooms.find((r) => r.code === room.code);
    if (!old) return room;
    return {
      ...old,
      ...room,
      imageUrl: room.imageUrl || old.imageUrl,
      images: room.images?.length ? room.images : old.images,
      facilities: room.facilities?.length ? room.facilities : old.facilities,
      description: room.description || old.description,
      occupancy: room.occupancy || old.occupancy,
    };
  });
}

export function mapCheckratesToOffer(
  offer: HotelOffer,
  hotel: HbHotel,
  selectedRateKey?: string,
): HotelOffer {
  const prev = offer.raw || {};
  const params = {
    checkInDate: String(hotel.checkIn || prev.checkInDate || ""),
    checkOutDate: String(hotel.checkOut || prev.checkOutDate || ""),
    location: String(prev.location || ""),
    adults: Number(prev.adults || 2),
    currency: offer.currency,
  } as HotelSearchParams;

  const remapped = mapHotelbedsToOffer({
    hotel,
    params,
    geoLabel: String(prev.location || ""),
    liveMode: Boolean(prev.liveMode),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  });
  if (!remapped) return offer;

  const nextRaw = remapped.raw || {};
  const rates = (Array.isArray(nextRaw.rateOptions)
    ? nextRaw.rateOptions
    : []) as HotelRateOption[];
  const selected =
    rates.find((r) => r.rateKey === selectedRateKey) || rates[0];
  const mergedRooms = mergeRooms(prev.rooms, nextRaw.rooms);

  let token: Record<string, unknown> = {};
  try {
    token = JSON.parse(offer.revalidationToken || "{}") as Record<string, unknown>;
  } catch {
    token = {};
  }

  return {
    ...remapped,
    providerOfferRef: offer.providerOfferRef,
    costAmountMinor: selected
      ? amountToMinor(selected.net, offer.currency)
      : remapped.costAmountMinor,
    revalidationToken: JSON.stringify({
      ...token,
      rateKey: selected?.rateKey || selectedRateKey,
      rateType: selected?.rateType,
      checkIn: params.checkInDate,
      checkOut: params.checkOutDate,
    }),
    raw: {
      ...prev,
      ...nextRaw,
      rooms: mergedRooms,
      images: prev.images || nextRaw.images,
      description: prev.description || nextRaw.description,
      facilityLabels: prev.facilityLabels || nextRaw.facilityLabels,
      ranking: prev.ranking ?? nextRaw.ranking,
      imageUrl: prev.imageUrl || nextRaw.imageUrl,
      mapUrl: prev.mapUrl || nextRaw.mapUrl,
      poiDistances: prev.poiDistances || nextRaw.poiDistances,
      source: prev.source || nextRaw.source,
      sourceLabel: prev.sourceLabel || nextRaw.sourceLabel,
      revalidatedAt: new Date().toISOString(),
    },
  };
}

export function findMappedRate(
  offer: HotelOffer,
  rateKey?: string,
): HotelRateOption | undefined {
  const rates = (Array.isArray(offer.raw?.rateOptions)
    ? offer.raw?.rateOptions
    : []) as HotelRateOption[];
  if (rateKey) {
    const match = rates.find((r) => r.rateKey === rateKey);
    if (match) return match;
  }
  return rates[0];
}
