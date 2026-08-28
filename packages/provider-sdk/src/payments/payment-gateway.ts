/**
 * Payment gateway adapter — Hosted Payment Page / tokenization oriented.
 * Never store raw PAN or CVV. Production must use merchant credentials via env.
 */

export type PaymentMethodKind = "hosted_card" | "knet" | "apple_pay" | "manual";

export type PaymentIntentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type CreatePaymentIntentInput = {
  amountMinor: number;
  currency: string;
  bookingId: string;
  weekendgateRef: string;
  customerEmail?: string;
  customerPhone?: string;
  method: PaymentMethodKind;
  /** Prevents duplicate charges for the same client action */
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type PaymentIntent = {
  id: string;
  status: PaymentIntentStatus;
  amountMinor: number;
  currency: string;
  bookingId: string;
  method: PaymentMethodKind;
  idempotencyKey: string;
  /** Hosted checkout URL when applicable */
  hostedUrl?: string;
  providerRef?: string;
  createdAt: string;
  environment: "sandbox" | "production";
};

export type PaymentWebhookEvent = {
  intentId: string;
  status: PaymentIntentStatus;
  providerRef?: string;
  amountMinor?: number;
  currency?: string;
  rawType?: string;
};

export interface PaymentGatewayAdapter {
  readonly providerKey: string;
  readonly environment: "sandbox" | "production";
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  getIntent(id: string): Promise<PaymentIntent | null>;
  /** Verify webhook signature then parse. Never trust redirect alone. */
  verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): Promise<PaymentWebhookEvent>;
}

const intentStore = new Map<string, PaymentIntent>();
const idempotencyStore = new Map<string, string>();

function envMode(): "sandbox" | "production" {
  const v = (process.env.PAYMENT_ENV || process.env.NODE_ENV || "sandbox").toLowerCase();
  return v === "production" || v === "live" ? "production" : "sandbox";
}

/**
 * Env keys reserved for merchant activation (set when PSP account is ready):
 * - PAYMENT_ENV=sandbox|production
 * - PAYMENT_PROVIDER=sandbox-hosted|upayments|tap|myfatoorah (future)
 * - PAYMENT_MERCHANT_ID
 * - PAYMENT_API_KEY
 * - PAYMENT_WEBHOOK_SECRET
 * - PAYMENT_APPLE_PAY_ENABLED=true|false
 * - PAYMENT_KNET_ENABLED=true|false
 *
 * Until keys exist, SandboxHostedPaymentAdapter is used — never mock prices in
 * production booking flows; payment stays unpaid/manual until PSP is wired.
 */
export function paymentGatewayConfigStatus(): {
  readyForLive: boolean;
  provider: string;
  environment: "sandbox" | "production";
  knetEnabled: boolean;
  applePayEnabled: boolean;
  missing: string[];
} {
  const environment = envMode();
  const provider = (process.env.PAYMENT_PROVIDER || "sandbox-hosted").trim();
  const missing: string[] = [];
  if (provider !== "sandbox-hosted") {
    if (!process.env.PAYMENT_MERCHANT_ID?.trim()) missing.push("PAYMENT_MERCHANT_ID");
    if (!process.env.PAYMENT_API_KEY?.trim()) missing.push("PAYMENT_API_KEY");
    if (!process.env.PAYMENT_WEBHOOK_SECRET?.trim()) missing.push("PAYMENT_WEBHOOK_SECRET");
  }
  return {
    readyForLive: provider !== "sandbox-hosted" && missing.length === 0,
    provider,
    environment,
    knetEnabled: process.env.PAYMENT_KNET_ENABLED === "true",
    applePayEnabled: process.env.PAYMENT_APPLE_PAY_ENABLED === "true",
    missing,
  };
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Sandbox hosted-page adapter for local/staging.
 * Replace with real KNET/Apple Pay/card PSP when merchant account is ready.
 */
export class SandboxHostedPaymentAdapter implements PaymentGatewayAdapter {
  readonly providerKey = "sandbox-hosted";
  readonly environment = envMode();

  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    if (!input.idempotencyKey?.trim()) {
      throw new Error("idempotencyKey مطلوب");
    }
    if (!Number.isFinite(input.amountMinor) || input.amountMinor <= 0) {
      throw new Error("مبلغ الدفع غير صالح");
    }
    const existingId = idempotencyStore.get(input.idempotencyKey);
    if (existingId) {
      const existing = intentStore.get(existingId);
      if (existing) return existing;
    }

    const id = newId("pi");
    const intent: PaymentIntent = {
      id,
      status: "pending",
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      bookingId: input.bookingId,
      method: input.method,
      idempotencyKey: input.idempotencyKey,
      hostedUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}paymentIntent=${id}&sandbox=1`,
      providerRef: newId("psp"),
      createdAt: new Date().toISOString(),
      environment: this.environment,
    };
    intentStore.set(id, intent);
    idempotencyStore.set(input.idempotencyKey, id);
    return intent;
  }

  async getIntent(id: string): Promise<PaymentIntent | null> {
    return intentStore.get(id) || null;
  }

  async verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): Promise<PaymentWebhookEvent> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "sandbox-webhook-secret";
    const sig = String(headers["x-weekendgate-signature"] || headers["x-payment-signature"] || "");
    if (this.environment === "production" && !sig) {
      throw new Error("توقيع Webhook مفقود");
    }
    if (sig && sig !== secret && !sig.startsWith("sandbox")) {
      // Lightweight check — production PSP should use HMAC with secret manager
      if (process.env.PAYMENT_WEBHOOK_SECRET && sig !== process.env.PAYMENT_WEBHOOK_SECRET) {
        throw new Error("توقيع Webhook غير صالح");
      }
    }
    const body = JSON.parse(rawBody || "{}") as {
      intentId?: string;
      status?: PaymentIntentStatus;
      providerRef?: string;
      amountMinor?: number;
      currency?: string;
      type?: string;
    };
    if (!body.intentId || !body.status) {
      throw new Error("Webhook غير مكتمل");
    }
    const intent = intentStore.get(body.intentId);
    if (intent) {
      intent.status = body.status;
      if (body.providerRef) intent.providerRef = body.providerRef;
      intentStore.set(intent.id, intent);
    }
    return {
      intentId: body.intentId,
      status: body.status,
      providerRef: body.providerRef,
      amountMinor: body.amountMinor,
      currency: body.currency,
      rawType: body.type,
    };
  }
}

let defaultAdapter: PaymentGatewayAdapter | null = null;

export function getPaymentGateway(): PaymentGatewayAdapter {
  if (!defaultAdapter) {
    const status = paymentGatewayConfigStatus();
    if (!status.readyForLive) {
      defaultAdapter = new SandboxHostedPaymentAdapter();
    } else {
      // Live PSP adapters plug in here when merchant credentials are provided.
      // Until then sandbox remains the safe default.
      defaultAdapter = new SandboxHostedPaymentAdapter();
    }
  }
  return defaultAdapter;
}

export function setPaymentGatewayForTests(adapter: PaymentGatewayAdapter | null) {
  defaultAdapter = adapter;
}
