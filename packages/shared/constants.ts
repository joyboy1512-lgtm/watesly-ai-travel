export const APP_NAME = "Watesly Travel AI" as const;

export { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "./currency";

export const SERVICE_TYPES = [
  "flight",
  "hotel",
  "insurance",
  "car",
  "transfer",
  "transport",
] as const;

export const SYSTEM_ROLES = ["owner", "admin", "agent", "viewer"] as const;

export const SENSITIVE_PERMISSIONS = [
  "pricing.manage",
  "pricing.override",
  "pricing.view_cost",
  "quotes.send",
  "bookings.create",
  "bookings.issue",
  "payments.manage",
  "providers.manage",
  "users.manage",
  "whatsapp.manage",
  "campaigns.manage",
  "audit.read",
] as const;

export const QUEUE_NAMES = {
  health: "health",
  inboundWhatsapp: "inbound-whatsapp",
  outboundWhatsapp: "outbound-whatsapp",
  aiExtract: "ai-extract",
  searchQuote: "search-quote",
  revalidate: "revalidate",
  campaignSend: "campaign-send",
} as const;

export const INQUIRY_REQUIRED_FIELDS = [
  "origin",
  "destination",
  "departDate",
  "adults",
] as const;
