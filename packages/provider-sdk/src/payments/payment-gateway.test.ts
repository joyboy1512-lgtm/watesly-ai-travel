import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SandboxHostedPaymentAdapter,
  setPaymentGatewayForTests,
} from "./payment-gateway";

describe("payment-gateway sandbox", () => {
  it("creates idempotent intents and verifies webhook", async () => {
    const gw = new SandboxHostedPaymentAdapter();
    setPaymentGatewayForTests(gw);
    const a = await gw.createIntent({
      amountMinor: 15000,
      currency: "KWD",
      bookingId: "b1",
      weekendgateRef: "WG1",
      method: "hosted_card",
      idempotencyKey: "idem-test-1",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    const b = await gw.createIntent({
      amountMinor: 15000,
      currency: "KWD",
      bookingId: "b1",
      weekendgateRef: "WG1",
      method: "hosted_card",
      idempotencyKey: "idem-test-1",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    assert.equal(a.id, b.id);
    const { createHmac } = await import("node:crypto");
    const rawBody = JSON.stringify({ intentId: a.id, status: "captured" });
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "sandbox-webhook-secret";
    const sig = createHmac("sha256", secret).update(rawBody).digest("hex");
    const event = await gw.verifyAndParseWebhook(
      { "x-weekendgate-signature": sig },
      rawBody,
    );
    assert.equal(event.status, "captured");
    const got = await gw.getIntent(a.id);
    assert.equal(got?.status, "captured");
  });
});
