import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockFlightProvider } from "./mock-flight-provider";
import type { FlightOffer } from "@watesly-travel/shared";

function offer(ref: string, extras?: Record<string, unknown>): FlightOffer {
  return {
    providerKey: "mock",
    providerOfferRef: ref,
    description: "KWI → DXB",
    costAmountMinor: 50000,
    currency: "KWD",
    revalidationToken: ref,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    raw: { scenario: extras?.scenario, baggage: extras?.baggage, ...extras },
  };
}

describe("MockFlightProvider booking stages", () => {
  const provider = new MockFlightProvider();

  it("keeps a normal offer available without inventing a guaranteed hold", async () => {
    const result = await provider.revalidateOffer(offer("MOCK-NORMAL"));
    assert.equal(result.available, true);
    assert.equal(result.priceChanged, false);
    assert.equal(result.offer.raw?.holdGuaranteed, false);
  });

  it("reports a price change scenario", async () => {
    const result = await provider.revalidateOffer(
      offer("MOCK-PRICE-CHANGE", { scenario: "price_change" }),
    );
    assert.equal(result.available, true);
    assert.equal(result.priceChanged, true);
    assert.ok(result.offer.costAmountMinor > 50000);
  });

  it("blocks a sold-out offer", async () => {
    const result = await provider.revalidateOffer(
      offer("MOCK-SOLD-OUT", { scenario: "sold_out" }),
    );
    assert.equal(result.available, false);
  });

  it("issues ticket numbers only after a successful mock booking", async () => {
    const created = await provider.createBooking(offer("MOCK-OK"), [
      { firstName: "AHMED", lastName: "ALI" },
    ]);
    assert.equal(created.status, "confirmed");
    assert.match(created.providerBookingRef, /^PNR-MOCK-/);
    assert.match(created.tickets?.[0]?.ticketNumber || "", /^176-\d{10}$/);
  });

  it("fails issuance for provider_fail without a ticket number", async () => {
    await assert.rejects(
      () => provider.createBooking(offer("MOCK-PROVIDER-FAIL")),
      /فشل مزود/,
    );
  });
});
