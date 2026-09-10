import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateUnlockProof,
  newGuestPhone,
  otpMatches,
  hashOtp,
  type UnlockOtpEntry,
} from "./shop-unlock-security";

describe("shop unlock security", () => {
  it("rejects disabled accounts", () => {
    const result = evaluateUnlockProof({
      hasExisting: true,
      accountActive: false,
      passwordValid: false,
      otpDeliveryReady: true,
      production: true,
      requireOtp: true,
      codePresent: true,
      otpValid: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "disabled");
  });

  it("accepts password proof", () => {
    const result = evaluateUnlockProof({
      hasExisting: true,
      accountActive: true,
      passwordValid: true,
      otpDeliveryReady: false,
      production: true,
      requireOtp: true,
      codePresent: false,
      otpValid: false,
    });
    assert.deepEqual(result, { ok: true, via: "password" });
  });

  it("requires password when OTP delivery is unavailable", () => {
    const result = evaluateUnlockProof({
      hasExisting: true,
      accountActive: true,
      passwordValid: false,
      otpDeliveryReady: false,
      production: true,
      requireOtp: false,
      codePresent: false,
      otpValid: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "password_required");
  });

  it("blocks create without proof in production", () => {
    const result = evaluateUnlockProof({
      hasExisting: false,
      accountActive: true,
      passwordValid: false,
      otpDeliveryReady: false,
      production: true,
      requireOtp: false,
      codePresent: false,
      otpValid: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "cannot_create_without_proof");
  });

  it("creates random guest phones", () => {
    const a = newGuestPhone();
    const b = newGuestPhone();
    assert.match(a, /^guest_[a-f0-9]{32}$/);
    assert.notEqual(a, b);
  });

  it("matches OTP hashes safely", () => {
    const phone = "+96550000000";
    const code = "123456";
    const entry: UnlockOtpEntry = {
      codeHash: hashOtp(phone, code),
      expiresAt: Date.now() + 60_000,
      attempts: 0,
    };
    assert.equal(otpMatches(phone, code, entry), true);
    assert.equal(otpMatches(phone, "000000", entry), false);
  });
});
