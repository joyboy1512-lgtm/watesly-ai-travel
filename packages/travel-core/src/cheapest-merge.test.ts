import { describe, expect, it } from "vitest";
import {
  dedupeFlightsByCheapest,
  flightItineraryFingerprint,
} from "../src/index";
import type { FlightOffer } from "@watesly-travel/shared";

function offer(
  partial: Partial<FlightOffer> & { sell?: number },
): {
  offer: FlightOffer;
  serviceType: "flight";
  pricing: {
    costAmountMinor: number;
    sellAmountMinor: number;
    profitAmountMinor: number;
    currency: string;
  };
  customerVisible: {
    sellAmountMinor: number;
    currency: string;
    summary: string;
  };
} {
  const cost = partial.costAmountMinor ?? 100000;
  const sell = partial.sell ?? cost + 10000;
  const o: FlightOffer = {
    providerKey: partial.providerKey || "duffel",
    providerOfferRef: partial.providerOfferRef || "x",
    description: partial.description || "Test",
    costAmountMinor: cost,
    currency: (partial.currency || "KWD") as FlightOffer["currency"],
    revalidationToken: "t",
    expiresAt: new Date().toISOString(),
    raw: partial.raw || {},
  };
  return {
    offer: o,
    serviceType: "flight",
    pricing: {
      costAmountMinor: cost,
      sellAmountMinor: sell,
      profitAmountMinor: sell - cost,
      currency: o.currency,
    },
    customerVisible: {
      sellAmountMinor: sell,
      currency: o.currency,
      summary: o.description,
    },
  };
}

describe("flight cheapest aggregation", () => {
  it("fingerprints duffel slices by carrier+flight+time", () => {
    const a = offer({
      raw: {
        offer: {
          slices: [
            {
              segments: [
                {
                  marketing_carrier: { iata_code: "KU" },
                  marketing_carrier_flight_number: "413",
                  departing_at: "2026-10-01T08:40:00",
                  origin: { iata_code: "KWI" },
                  destination: { iata_code: "DXB" },
                },
              ],
            },
          ],
        },
      },
    });
    const b = offer({
      providerKey: "amadeus",
      raw: {
        offer: {
          slices: [
            {
              segments: [
                {
                  marketing_carrier: { iata_code: "KU" },
                  marketing_carrier_flight_number: "413",
                  departing_at: "2026-10-01T08:40:00",
                  origin: { iata_code: "KWI" },
                  destination: { iata_code: "DXB" },
                },
              ],
            },
          ],
        },
      },
    });
    expect(flightItineraryFingerprint(a.offer)).toBe(
      flightItineraryFingerprint(b.offer),
    );
  });

  it("keeps the cheapest offer for the same itinerary", () => {
    const expensive = offer({
      providerKey: "duffel",
      providerOfferRef: "d1",
      sell: 200000,
      raw: {
        segments: [
          {
            airlineCode: "KU",
            flightNumber: "413",
            departAt: "2026-10-01T08:40:00",
            from: "KWI",
            to: "DXB",
          },
        ],
      },
    });
    const cheap = offer({
      providerKey: "travelfusion",
      providerOfferRef: "t1",
      sell: 150000,
      raw: {
        segments: [
          {
            airlineCode: "KU",
            flightNumber: "413",
            departAt: "2026-10-01T08:40:00",
            from: "KWI",
            to: "DXB",
          },
        ],
      },
    });
    const out = dedupeFlightsByCheapest([expensive, cheap]);
    expect(out).toHaveLength(1);
    expect(out[0]?.offer.providerKey).toBe("travelfusion");
    expect(out[0]?.pricing.sellAmountMinor).toBe(150000);
  });
});
