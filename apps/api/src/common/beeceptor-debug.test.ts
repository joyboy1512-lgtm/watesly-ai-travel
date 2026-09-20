import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDebugPayload } from "./beeceptor-debug";

describe("sanitizeDebugPayload", () => {
  it("drops secrets and truncates strings", () => {
    const out = sanitizeDebugPayload({
      destination: "DXB",
      hotelCount: 30,
      HOTELBEDS_API_KEY: "abc",
      accessToken: "tok",
      error: "x".repeat(300),
      hotels: [{ id: 1 }, { id: 2 }],
    });
    assert.equal(out.destination, "DXB");
    assert.equal(out.hotelCount, 30);
    assert.equal(out.hotels, 2);
    assert.equal((out.error as string).length, 240);
    assert.equal(out.HOTELBEDS_API_KEY, undefined);
    assert.equal(out.accessToken, undefined);
  });
});
