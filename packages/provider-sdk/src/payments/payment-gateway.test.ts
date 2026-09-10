import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it, beforeEach } from "node:test";
import {
  SandboxHostedPaymentAdapter,
  resetSandboxPaymentStoresForTests,
  setPaymentGatewayForTests,
} from "./payment-gateway";

describe("payment-gateway security", () => {
  beforeEach(() => {
    resetSandboxPaymentStoresForTests();
    process.env.PAYMENT_ENV = "sandbox";
    process.env.PAYMENT_WEBHOOK_SECRET = "sandbox-webhook-secret";
  });

  it("creates idempotent intents", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const a = await gw.createIntent({
      amountMinor: 15000,
      currency: "KWD",
      bookingId: "b1",
      weekendgateRef: "WG1",
      method: "hosted_card",
      idempotencyKey: "idem-sec-1",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    const b = await gw.createIntent({
      amountMinor: 15000,
      currency: "KWD",
      bookingId: "b1",
      weekendgateRef: "WG1",
      method: "hosted_card",
      idempotencyKey: "idem-sec-1",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    assert.equal(a.id, b.id);
  });

  it("rejects raw secret used as signature", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const intent = await gw.createIntent({
      amountMinor: 1000,
      currency: "KWD",
      bookingId: "b2",
      weekendgateRef: "WG2",
      method: "hosted_card",
      idempotencyKey: "idem-sec-2",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    const rawBody = JSON.stringify({ intentId: intent.id, status: "captured" });
    await assert.rejects(
      () =>
        gw.verifyAndParseWebhook(
          { "x-weekendgate-signature": "sandbox-webhook-secret" },
          rawBody,
        ),
      /غير صالح|invalid|توقيع/i,
    );
  });

  it("rejects unknown intents (no bookingId from body alone)", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const rawBody = JSON.stringify({
      intentId: "pi_unknown",
      status: "captured",
      bookingId: "attacker-booking",
    });
    const sig = createHmac("sha256", "sandbox-webhook-secret")
      .update(rawBody)
      .digest("hex");
    await assert.rejects(
      () =>
        gw.verifyAndParseWebhook(
          { "x-weekendgate-signature": sig },
          rawBody,
        ),
      /غير معروف|unknown|رفض/i,
    );
  });

  it("rejects amount mismatch against stored intent", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const intent = await gw.createIntent({
      amountMinor: 5000,
      currency: "KWD",
      bookingId: "b3",
      weekendgateRef: "WG3",
      method: "hosted_card",
      idempotencyKey: "idem-sec-3",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    const rawBody = JSON.stringify({
      intentId: intent.id,
      status: "captured",
      amountMinor: 1,
    });
    const sig = createHmac("sha256", "sandbox-webhook-secret")
      .update(rawBody)
      .digest("hex");
    await assert.rejects(
      () =>
        gw.verifyAndParseWebhook(
          { "x-weekendgate-signature": sig },
          rawBody,
        ),
      /مبلغ|amount/i,
    );
  });

  it("accepts valid HMAC and returns intent amount/currency", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const intent = await gw.createIntent({
      amountMinor: 7777,
      currency: "KWD",
      bookingId: "b4",
      weekendgateRef: "WG4",
      method: "hosted_card",
      idempotencyKey: "idem-sec-4",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    const rawBody = JSON.stringify({ intentId: intent.id, status: "captured" });
    const sig = createHmac("sha256", "sandbox-webhook-secret")
      .update(rawBody)
      .digest("hex");
    const event = await gw.verifyAndParseWebhook(
      { "x-weekendgate-signature": sig },
      rawBody,
    );
    assert.equal(event.status, "captured");
    assert.equal(event.amountMinor, 7777);
    assert.equal(event.currency, "KWD");
  });
});
