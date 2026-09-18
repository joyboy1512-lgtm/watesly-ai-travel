import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPricingRule,
  isCompletePricingRule,
  priceCostWithRules,
  selectPricingRule,
  type PricingRuleInput,
} from "./index";

function rule(partial: Partial<PricingRuleInput>): PricingRuleInput {
  return {
    id: partial.id || "r1",
    name: partial.name || "rule",
    serviceType: partial.serviceType || "flight",
    ruleType: partial.ruleType || "percent",
    percentValue: partial.percentValue ?? null,
    fixedAmount: partial.fixedAmount ?? null,
    minProfitAmount: partial.minProfitAmount ?? null,
    currency: partial.currency || "KWD",
    isActive: partial.isActive ?? true,
    priority: partial.priority ?? 100,
    conditions: partial.conditions,
  };
}

describe("isCompletePricingRule", () => {
  it("rejects a fixed rule with no amount", () => {
    assert.equal(
      isCompletePricingRule(rule({ ruleType: "fixed", percentValue: 0 })),
      false,
    );
  });

  it("accepts a percent rule", () => {
    assert.equal(
      isCompletePricingRule(rule({ ruleType: "percent", percentValue: 12 })),
      true,
    );
  });
});

describe("selectPricingRule", () => {
  it("skips an incomplete fixed all-rule so the flight percent applies", () => {
    const selected = selectPricingRule(
      [
        rule({
          id: "broken",
          serviceType: "all",
          ruleType: "fixed",
          percentValue: 0,
          priority: 50,
        }),
        rule({
          id: "flight-12",
          serviceType: "flight",
          ruleType: "percent_with_min",
          percentValue: 12,
          minProfitAmount: 1500,
          priority: 100,
        }),
      ],
      "flight",
      { costAmountMinor: 40_000 },
    );
    assert.equal(selected?.id, "flight-12");
  });

  it("prefers a specific service rule over all at the same priority", () => {
    const selected = selectPricingRule(
      [
        rule({ id: "all-10", serviceType: "all", percentValue: 10, priority: 1 }),
        rule({ id: "hotel-15", serviceType: "hotel", percentValue: 15, priority: 1 }),
      ],
      "hotel",
    );
    assert.equal(selected?.id, "hotel-15");
  });
});

describe("priceCostWithRules", () => {
  it("marks up a transfer with an all percent rule", () => {
    const priced = priceCostWithRules({
      costAmountMinor: 20_000,
      currency: "KWD",
      serviceType: "transfer",
      rules: [rule({ id: "all", serviceType: "all", percentValue: 20, priority: 1 })],
    });
    assert.equal(priced.sellAmountMinor, 24_000);
    assert.equal(priced.costAmountMinor, 20_000);
  });

  it("applies 12 percent on a flight", () => {
    const priced = applyPricingRule({
      costAmountMinor: 100_000,
      currency: "KWD",
      serviceType: "flight",
      rule: rule({ ruleType: "percent_with_min", percentValue: 12, minProfitAmount: 1500 }),
    });
    assert.equal(priced.sellAmountMinor, 112_000);
  });

  it("applies min profit per ticket, not on the booking total", () => {
    const priced = applyPricingRule({
      costAmountMinor: 30_000,
      currency: "KWD",
      serviceType: "flight",
      units: 3,
      rule: rule({
        ruleType: "percent_with_min",
        percentValue: 1,
        minProfitAmount: 1500,
      }),
    });
    // 1% of 30.000 = 0.300; min 1.500 × 3 tickets = 4.500
    assert.equal(priced.profitAmountMinor, 4_500);
    assert.equal(priced.sellAmountMinor, 34_500);
  });

  it("applies a fixed rule per hotel room", () => {
    const priced = applyPricingRule({
      costAmountMinor: 80_000,
      currency: "KWD",
      serviceType: "hotel",
      rooms: 2,
      rule: rule({
        serviceType: "hotel",
        ruleType: "fixed",
        fixedAmount: 2000,
      }),
    });
    assert.equal(priced.profitAmountMinor, 4_000);
  });

  it("adds overall booking commission once on top of per-unit markup", () => {
    const priced = applyPricingRule({
      costAmountMinor: 100_000,
      currency: "KWD",
      serviceType: "flight",
      units: 2,
      rule: rule({
        ruleType: "percent",
        percentValue: 10,
        conditions: { bookingCommissionPercent: 2, bookingCommissionAmount: 1 },
      }),
    });
    // 10% of 100.000 = 10.000; + 2% = 2.000; + 1.000 KWD once
    assert.equal(priced.profitAmountMinor, 13_000);
  });

  it("applies a booking-basis rule once even with three tickets", () => {
    const priced = applyPricingRule({
      costAmountMinor: 90_000,
      currency: "KWD",
      serviceType: "flight",
      units: 3,
      rule: rule({
        ruleType: "fixed",
        fixedAmount: 5000,
        conditions: { applyBasis: "booking" },
      }),
    });
    assert.equal(priced.profitAmountMinor, 5_000);
  });
});
