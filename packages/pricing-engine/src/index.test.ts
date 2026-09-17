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
});
