import type { FlightOffer, InternalPriceBreakdown } from "@watesly-travel/shared";
import {
  extractFareFamilyFromRaw,
  fareFamilyKey,
  toFlightFareOption,
} from "@watesly-travel/shared";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

type PricedFlight = {
  offer: FlightOffer;
  pricing: InternalPriceBreakdown;
};

/** One shop card per itinerary, keeping each airline fare family. */
export function aggregateFlightsKeepFareFamilies<T extends PricedFlight>(
  rows: T[],
  fingerprint: (row: T) => string,
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
        (a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor,
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
