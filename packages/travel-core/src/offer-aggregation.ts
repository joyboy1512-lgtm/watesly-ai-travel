import type {
  AggregationMeta,
  CapabilityAggregation,
  FlightOffer,
  HotelOffer,
  HotelRateOption,
  InternalPriceBreakdown,
  SupplierQuote,
} from "@watesly-travel/shared";
import {
  aggregationScore,
  fareFamilyKey,
  hotelPropertyFingerprint,
  extractFareFamilyFromRaw,
  toFlightFareOption,
} from "@watesly-travel/shared";

type PricedHotel = {
  offer: HotelOffer;
  serviceType: "flight" | "hotel";
  pricing: InternalPriceBreakdown;
  customerVisible: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function tagRates(
  rates: unknown,
  providerKey: string,
  hotelCode: string,
  displayName: string,
): HotelRateOption[] {
  if (!Array.isArray(rates)) return [];
  return rates.map((rate) => {
    const rec = asRecord(rate);
    return {
      ...(rec as unknown as HotelRateOption),
      sourceProvider: String(rec.sourceProvider || providerKey),
      sourceProviderLabel: String(rec.sourceProviderLabel || displayName || providerKey),
      sourceHotelCode: String(rec.sourceHotelCode || hotelCode || ""),
    };
  });
}

function uniqStrings(values: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function mergeStringLists(...lists: unknown[]): string[] {
  return uniqStrings(lists.flatMap((list) => (Array.isArray(list) ? list : [])));
}

function mergePoiDistances(...lists: unknown[]): Array<{ nameAr: string; km: number; label: string }> {
  const map = new Map<string, { nameAr: string; km: number; label: string }>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const rec = asRecord(raw);
      const nameAr = String(rec.nameAr || rec.name || "").trim();
      if (!nameAr) continue;
      const km = Number(rec.km);
      const next = {
        nameAr,
        km: Number.isFinite(km) ? km : 0,
        label: String(rec.label || nameAr),
      };
      const existing = map.get(nameAr);
      if (!existing || next.km < existing.km) map.set(nameAr, next);
    }
  }
  return [...map.values()];
}

function mergeRoomLists(...lists: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const room = asRecord(raw);
      const key = String(room.code || room.name || "");
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...room });
        continue;
      }
      map.set(key, {
        ...existing,
        ...room,
        facilities: mergeStringLists(existing.facilities, room.facilities),
        imageUrl: existing.imageUrl || room.imageUrl,
        images:
          (Array.isArray(existing.images) && existing.images.length
            ? existing.images
            : room.images) || [],
        rates: existing.rates,
      });
    }
  }
  return [...map.values()];
}

function mergeRaw(
  winner: Record<string, unknown>,
  others: Array<{ raw: Record<string, unknown>; providerKey: string; displayName: string }>,
  meta: AggregationMeta,
): Record<string, unknown> {
  const winnerCode = String(winner.hotelCode || "");
  const winnerName = String(winner.providerLabel || winner.provider || meta.winnerProvider);
  const allRates = [
    ...tagRates(winner.rateOptions, meta.winnerProvider, winnerCode, winnerName),
  ];
  const otherRaws = others.map((other) => other.raw);

  for (const other of others) {
    const code = String(other.raw.hotelCode || "");
    allRates.push(
      ...tagRates(other.raw.rateOptions, other.providerKey, code, other.displayName),
    );
  }

  const images = [winner.images, ...otherRaws.map((raw) => raw.images)].reduce<unknown[]>(
    (best, next) => (Array.isArray(next) && next.length > best.length ? next : best),
    Array.isArray(winner.images) ? [...winner.images] : [],
  );
  const rooms = mergeRoomLists(winner.rooms, ...otherRaws.map((raw) => raw.rooms));

  const nets = allRates
    .map((r) => Number(r.net))
    .filter((n) => Number.isFinite(n) && n > 0);
  const minRate = nets.length ? Math.min(...nets) : winner.minRate;
  const maxRate = nets.length ? Math.max(...nets) : winner.maxRate;
  const richerType = [winner.propertyType, ...otherRaws.map((raw) => raw.propertyType)]
    .map((value) => String(value || ""))
    .find((value) => value && value !== "hotel");

  return {
    ...winner,
    rateOptions: allRates.sort((a, b) => Number(a.net || 0) - Number(b.net || 0)),
    rooms,
    images,
    minRate,
    maxRate,
    facilities: mergeStringLists(winner.facilities, ...otherRaws.map((raw) => raw.facilities)),
    facilityLabels: mergeStringLists(
      winner.facilityLabels,
      ...otherRaws.map((raw) => raw.facilityLabels),
    ),
    boardCodes: mergeStringLists(winner.boardCodes, ...otherRaws.map((raw) => raw.boardCodes)),
    boards: mergeStringLists(winner.boards, ...otherRaws.map((raw) => raw.boards)),
    paymentTypes: mergeStringLists(winner.paymentTypes, ...otherRaws.map((raw) => raw.paymentTypes)),
    rateTypes: mergeStringLists(winner.rateTypes, ...otherRaws.map((raw) => raw.rateTypes)),
    zones: mergeStringLists(winner.zones, ...otherRaws.map((raw) => raw.zones)),
    poiDistances: mergePoiDistances(
      winner.poiDistances,
      ...otherRaws.map((raw) => raw.poiDistances),
    ),
    propertyType: richerType || winner.propertyType,
    aggregation: meta,
    supplierCount: meta.supplierCount,
    sourceProviders: meta.suppliers.map((s) => s.providerKey),
  };
}

function rankHotel(
  row: PricedHotel,
  spec: CapabilityAggregation,
  priorityByProvider: Record<string, number>,
): number {
  return aggregationScore(
    row.offer.providerKey,
    row.pricing.sellAmountMinor,
    spec,
    priorityByProvider,
  );
}

/** Merge same-property hotel rows from several suppliers into one shop card. */
export function aggregateHotelOffers(
  rows: PricedHotel[],
  spec: CapabilityAggregation,
  priorityByProvider: Record<string, number> = {},
): PricedHotel[] {
  const groups = new Map<string, PricedHotel[]>();
  for (const row of rows) {
    const key = hotelPropertyFingerprint({
      providerKey: row.offer.providerKey,
      providerOfferRef: row.offer.providerOfferRef,
      description: row.offer.description,
      raw: asRecord(row.offer.raw),
    });
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const merged: PricedHotel[] = [];
  for (const [matchKey, group] of groups) {
    const ranked = [...group].sort(
      (a, b) => rankHotel(a, spec, priorityByProvider) - rankHotel(b, spec, priorityByProvider),
    );
    const winner = ranked[0]!;
    const suppliers: SupplierQuote[] = ranked.map((row) => ({
      providerKey: row.offer.providerKey,
      providerOfferRef: row.offer.providerOfferRef,
      sellAmountMinor: row.pricing.sellAmountMinor,
      costAmountMinor: row.pricing.costAmountMinor,
      currency: row.pricing.currency,
    }));
    const meta: AggregationMeta = {
      matchKey,
      mode: spec.mode,
      winnerProvider: winner.offer.providerKey,
      supplierCount: suppliers.length,
      suppliers,
    };
    if (ranked.length === 1) {
      merged.push({
        ...winner,
        offer: {
          ...winner.offer,
          raw: { ...asRecord(winner.offer.raw), aggregation: meta, supplierCount: 1 },
        },
      });
      continue;
    }
    const others = ranked.slice(1).map((row) => ({
      raw: asRecord(row.offer.raw),
      providerKey: row.offer.providerKey,
      displayName: String(asRecord(row.offer.raw).providerLabel || row.offer.providerKey),
    }));
    merged.push({
      ...winner,
      offer: {
        ...winner.offer,
        raw: mergeRaw(asRecord(winner.offer.raw), others, meta),
      },
    });
  }

  return merged.sort(
    (a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor,
  );
}

export function aggregateByFingerprint<
  T extends {
    offer: { providerKey: string };
    pricing: { sellAmountMinor: number };
  },
>(
  rows: T[],
  fingerprint: (row: T) => string,
  spec: CapabilityAggregation,
  priorityByProvider: Record<string, number> = {},
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = fingerprint(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const out: T[] = [];
  for (const group of groups.values()) {
    const ranked = [...group].sort((a, b) => {
      return (
        aggregationScore(
          a.offer.providerKey,
          a.pricing.sellAmountMinor,
          spec,
          priorityByProvider,
        ) -
        aggregationScore(
          b.offer.providerKey,
          b.pricing.sellAmountMinor,
          spec,
          priorityByProvider,
        )
      );
    });
    out.push(ranked[0]!);
  }
  return out.sort((a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor);
}

type PricedFlight = {
  offer: FlightOffer;
  pricing: InternalPriceBreakdown;
};

/**
 * One shop card per itinerary, but keep each airline fare family
 * (Saver / Flex / Comfort / Business) instead of collapsing them.
 */
export function aggregateFlightsKeepFareFamilies<T extends PricedFlight>(
  rows: T[],
  fingerprint: (row: T) => string,
  spec: CapabilityAggregation,
  priorityByProvider: Record<string, number> = {},
  requestedCabin?: string,
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = fingerprint(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const wantedCabin = requestedCabin ? requestedCabin.toLowerCase() : "";
  const out: T[] = [];

  for (const group of groups.values()) {
    const byFamily = new Map<string, T[]>();
    for (const row of group) {
      const extracted = extractFareFamilyFromRaw(asRecord(row.offer.raw));
      const family = fareFamilyKey(extracted.cabin, extracted.brandKey);
      const list = byFamily.get(family) || [];
      list.push(row);
      byFamily.set(family, list);
    }

    const familyWinners: T[] = [];
    for (const familyRows of byFamily.values()) {
      const ranked = [...familyRows].sort(
        (a, b) =>
          aggregationScore(
            a.offer.providerKey,
            a.pricing.sellAmountMinor,
            spec,
            priorityByProvider,
          ) -
          aggregationScore(
            b.offer.providerKey,
            b.pricing.sellAmountMinor,
            spec,
            priorityByProvider,
          ),
      );
      familyWinners.push(ranked[0]!);
    }

    familyWinners.sort((a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor);

    const matchingCabin = wantedCabin
      ? familyWinners.filter((row) => {
          const cabin = extractFareFamilyFromRaw(asRecord(row.offer.raw)).cabin;
          return cabin === wantedCabin || (wantedCabin.includes("business") && cabin === "business");
        })
      : familyWinners;
    const primary = (matchingCabin[0] || familyWinners[0])!;

    const fareOptions = familyWinners.map((row) =>
      toFlightFareOption({
        id: row.offer.providerOfferRef,
        providerKey: row.offer.providerKey,
        sellAmountMinor: row.pricing.sellAmountMinor,
        currency: row.pricing.currency,
        raw: asRecord(row.offer.raw),
      }),
    );

    out.push({
      ...primary,
      offer: {
        ...primary.offer,
        raw: {
          ...asRecord(primary.offer.raw),
          fareOptions,
          fareOptionCount: fareOptions.length,
        },
      },
    });
  }

  return out.sort((a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor);
}
