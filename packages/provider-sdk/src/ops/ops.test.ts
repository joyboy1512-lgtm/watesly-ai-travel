import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CircuitBreaker } from "./circuit-breaker";
import { isTransientProviderError, providerErrorCode } from "./errors";
import { singleflight, clearInflightForTests } from "./inflight";

describe("circuit-breaker", () => {
  it("opens after failures and recovers", () => {
    const c = new CircuitBreaker({ failureThreshold: 2, resetMs: 10, name: "t" });
    assert.equal(c.allow(), true);
    c.recordFailure();
    assert.equal(c.allow(), true);
    c.recordFailure();
    assert.equal(c.state, "open");
    assert.equal(c.allow(), false);
  });
});

describe("errors", () => {
  it("classifies transient vs quota", () => {
    assert.equal(isTransientProviderError(new Error("timeout")), true);
    assert.equal(isTransientProviderError(new Error("quota has been exceeded")), false);
    assert.equal(providerErrorCode(new Error("CIRCUIT_OPEN")), "CIRCUIT_OPEN");
  });
});

describe("singleflight", () => {
  it("dedupes concurrent calls", async () => {
    clearInflightForTests();
    let runs = 0;
    const a = singleflight("k", async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 7;
    });
    const b = singleflight("k", async () => {
      runs += 1;
      return 9;
    });
    const [ra, rb] = await Promise.all([a, b]);
    assert.equal(ra, 7);
    assert.equal(rb, 7);
    assert.equal(runs, 1);
  });
});
