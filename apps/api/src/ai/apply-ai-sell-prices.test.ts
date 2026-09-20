import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyAiSellPrices } from "./apply-ai-sell-prices";

describe("applyAiSellPrices", () => {
  it("returns sell price after percent markup and never exposes a lower sell than cost+rule", () => {
    const priced = applyAiSellPrices(
      [
        {
          costAmountMinor: 100_000,
          currency: "KWD",
          providerKey: "duffel",
        },
      ],
      [
        {
          id: "r1",
          name: "طيران 10%",
          serviceType: "flight",
          ruleType: "percent",
          percentValue: 10,
          currency: "KWD",
          isActive: true,
          priority: 1,
        },
      ],
      "flight",
      { origin: "KWI", destination: "DXB" },
    );
    assert.equal(priced[0]?.sellAmountMinor, 110_000);
    assert.equal(priced[0]?.costAmountMinor, 100_000);
  });
});
