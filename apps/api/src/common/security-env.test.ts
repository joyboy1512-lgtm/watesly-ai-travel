import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromRequest } from "./security-env";

describe("clientIpFromRequest", () => {
  it("ignores X-Forwarded-For from public peers", () => {
    const ip = clientIpFromRequest({
      ip: "203.0.113.10",
      socket: { remoteAddress: "203.0.113.10" },
      headers: { "x-forwarded-for": "198.51.100.1" },
    });
    assert.equal(ip, "203.0.113.10");
  });

  it("trusts X-Forwarded-For from loopback/private peers", () => {
    const ip = clientIpFromRequest({
      socket: { remoteAddress: "127.0.0.1" },
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
    });
    assert.equal(ip, "198.51.100.7");
  });
});
