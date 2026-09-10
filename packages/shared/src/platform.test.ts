/**
 * Run: node --import tsx --test packages/shared/src/platform.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTripPriceBreakdown,
  computeBundleDiscount,
  emptyTripDraft,
  upsertComponent,
  normalizeShopPaymentStatus,
  dealSavingsMinor,
  WEEKEND_DEALS,
  pointsEarnedFromSpend,
  shouldFirePriceAlert,
  isPlatformEnabled,
  getInventoryMode,
  isLiveBookingReady,
} from "./index";

describe("platform trip builder", () => {
  it("applies bundle discount for 2+ services", () => {
    let draft = emptyTripDraft("t1");
    draft = upsertComponent(draft, {
      kind: "flight",
      offerId: "f",
      status: "selected",
      sellAmountMinor: 100_000,
      currency: "KWD",
      label: "flight",
    });
    draft = upsertComponent(draft, {
      kind: "hotel",
      offerId: "h",
      status: "selected",
      sellAmountMinor: 100_000,
      currency: "KWD",
      label: "hotel",
    });
    assert.equal(computeBundleDiscount(draft.components), 10_000);
    const price = buildTripPriceBreakdown(draft.components, { taxesMinor: 0, feesMinor: 0 });
    assert.equal(price.originalMinor, 200_000);
    assert.equal(price.discountMinor, 10_000);
    assert.equal(price.finalMinor, 190_000);
  });
});

describe("platform payments", () => {
  it("normalizes statuses including partially_refunded", () => {
    assert.equal(normalizeShopPaymentStatus("captured"), "paid");
    assert.equal(normalizeShopPaymentStatus("partial_refund"), "partially_refunded");
    assert.equal(normalizeShopPaymentStatus("failed"), "failed");
  });
});

describe("platform deals & loyalty & alerts", () => {
  it("computes deal savings", () => {
    const deal = WEEKEND_DEALS[0]!;
    assert.equal(dealSavingsMinor(deal), deal.originalPriceMinor - deal.salePriceMinor);
  });

  it("earns points from spend", () => {
    assert.equal(pointsEarnedFromSpend(199_000), 199);
  });

  it("fires price alert at or below target", () => {
    assert.equal(
      shouldFirePriceAlert(
        {
          id: "a",
          customerId: "c",
          origin: "KWI",
          destination: "DXB",
          currentPriceMinor: 150_000,
          targetPriceMinor: 120_000,
          currency: "KWD",
          active: true,
          createdAt: new Date().toISOString(),
        },
        119_000,
      ),
      true,
    );
  });
});

describe("platform feature flag", () => {
  it("is off by default", () => {
    assert.equal(isPlatformEnabled({}), false);
    assert.equal(isPlatformEnabled({ NEXT_PUBLIC_WG_PLATFORM: "1" }), true);
  });
});

describe("inventory mode", () => {
  it("defaults to mock/sandbox not live-ready", () => {
    const mode = getInventoryMode();
    assert.equal(mode.flightProvider, "mock");
    assert.equal(mode.hotelProvider, "mock");
    assert.equal(mode.paymentEnv, "sandbox");
    assert.equal(isLiveBookingReady(), false);
  });
});
