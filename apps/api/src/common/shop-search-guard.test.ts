import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resetSharedKvMemoryForTests } from "./shared-kv";
import {
  guardShopSearch,
  releaseSearchSlot,
  searchMaxInflight,
  tryAcquireSearchSlot,
} from "./shop-search-guard";

describe("shop-search-guard", () => {
  beforeEach(() => {
    resetSharedKvMemoryForTests();
    delete process.env.SEARCH_MAX_INFLIGHT;
  });

  it("runs the original search function unchanged", async () => {
    const out = await guardShopSearch("flights", async () => ({ ok: true, n: 3 }));
    assert.deepEqual(out, { ok: true, n: 3 });
  });

  it("sheds when the global inflight cap is reached", async () => {
    process.env.SEARCH_MAX_INFLIGHT = "1";
    assert.equal(searchMaxInflight(), 1);
    assert.equal(await tryAcquireSearchSlot(), true);
    assert.equal(await tryAcquireSearchSlot(), false);
    await releaseSearchSlot();
  });
});
