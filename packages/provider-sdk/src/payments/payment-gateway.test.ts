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
    const event = await gw.verifyAndParseWebhook(
      { "x-weekendgate-signature": "sandbox" },
      JSON.stringify({ intentId: a.id, status: "captured" }),
    );
    assert.equal(event.status, "captured");
    const got = await gw.getIntent(a.id);
    assert.equal(got?.status, "captured");
  });
});
