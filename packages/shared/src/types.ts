import type {
  DEFAULT_CURRENCY,
  SERVICE_TYPES,
  SYSTEM_ROLES,
  SENSITIVE_PERMISSIONS,
} from "./constants";

export type CurrencyCode = typeof DEFAULT_CURRENCY | (string & {});

export type ServiceType = (typeof SERVICE_TYPES)[number];

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export type SensitivePermission = (typeof SENSITIVE_PERMISSIONS)[number];

/** Money amounts are stored as integer minor units (fils/cents by currency). */
export type MoneyMinor = number;

export interface Money {
  amountMinor: MoneyMinor;
  currency: CurrencyCode;
}

export interface TenantContext {
  organizationId: string;
}

export type ConversationAssigneeType = "bot" | "human";

export type InquiryStatus =
  | "collecting"
  | "ready_to_search"
  | "searched"
  | "quoted"
  | "handed_off"
  | "closed";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "superseded"
  | "canceled";

export type BookingStatus =
  | "draft"
  | "on_hold"
  | "confirmed"
  | "ticketed"
  | "failed"
  | "canceled";

export type BookingRequestStatus =
  | "pending_revalidation"
  | "price_changed"
  | "ready_to_book"
  | "submitted"
  | "rejected"
  | "canceled";

export interface InternalPriceBreakdown {
  costAmountMinor: MoneyMinor;
  sellAmountMinor: MoneyMinor;
  profitAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  pricingRuleId?: string;
  pricingRuleName?: string;
}

/** Payload safe to show/send to the end customer. Never includes cost/profit. */
export interface CustomerVisibleQuote {
  sellAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  summary: string;
  expiresAt?: string;
}

export interface TravelInquiryFields {
  origin?: string | null;
  destination?: string | null;
  departDate?: string | null;
  returnDate?: string | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  cabinClass?: string | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  preferences?: string | null;
  serviceTypes?: ServiceType[] | null;
}

export interface FlightOffer {
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  revalidationToken: string;
  expiresAt: string;
  raw: Record<string, unknown>;
}

export interface HotelOffer {
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  revalidationToken: string;
  expiresAt: string;
  raw: Record<string, unknown>;
}

export interface TransferOffer {
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  revalidationToken: string;
  expiresAt: string;
  raw: Record<string, unknown>;
}

export interface ActivityOffer {
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: MoneyMinor;
  currency: CurrencyCode;
  revalidationToken: string;
  expiresAt: string;
  raw: Record<string, unknown>;
}

export type TravelOffer = FlightOffer | HotelOffer | TransferOffer | ActivityOffer;
