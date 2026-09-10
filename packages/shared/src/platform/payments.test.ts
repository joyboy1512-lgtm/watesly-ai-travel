import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCapturedPaymentStatus,
  normalizeShopPaymentStatus,
} from "./payments";

describe("shop payment status security", () => {
  it("treats authorized as pending (not paid)", () => {
    assert.equal(normalizeShopPaymentStatus("authorized"), "pending");
    assert.equal(normalizeShopPaymentStatus("authorised"), "pending");
    assert.equal(isCapturedPaymentStatus("authorized"), false);
  });

  it("treats captured/success/paid as captured", () => {
    assert.equal(normalizeShopPaymentStatus("captured"), "paid");
    assert.equal(normalizeShopPaymentStatus("success"), "paid");
    assert.equal(normalizeShopPaymentStatus("paid"), "paid");
    assert.equal(isCapturedPaymentStatus("captured"), true);
    assert.equal(isCapturedPaymentStatus("paid"), true);
  });
});
