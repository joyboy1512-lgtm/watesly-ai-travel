/** Known travel provider adapters available in the platform. */
export type ProviderCapability = "flight" | "hotel" | "transfer";

export type ProviderCredentialField = {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
};

export type ProviderCatalogEntry = {
  providerKey: string;
  displayName: string;
  displayNameAr: string;
  description: string;
  capabilities: ProviderCapability[];
  status: "live" | "ready" | "scaffold";
  /** Env vars that activate this provider globally */
  envKeys: string[];
  credentialFields: ProviderCredentialField[];
  notes?: string;
};

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    providerKey: "mock",
    displayName: "Mock",
    displayNameAr: "تجريبي (Mock)",
    description: "مزود تجريبي للاختبار بدون API خارجي",
    capabilities: ["flight", "hotel"],
    status: "live",
    envKeys: ["TRAVEL_MOCK_ENABLED"],
    credentialFields: [],
  },
  {
    providerKey: "duffel",
    displayName: "Duffel",
    displayNameAr: "Duffel",
    description: "مزود حي للطيران والفنادق عبر Duffel",
    capabilities: ["flight", "hotel"],
    status: "live",
    envKeys: ["DUFFEL_ACCESS_TOKEN"],
    credentialFields: [
      {
        key: "accessToken",
        label: "Access Token",
        secret: true,
        required: true,
        placeholder: "duffel_test_… أو duffel_live_…",
      },
    ],
  },
  {
    providerKey: "amadeus",
    displayName: "Amadeus",
    displayNameAr: "Amadeus",
    description: "بحث عروض الطيران عبر Amadeus Self-Service API",
    capabilities: ["flight"],
    status: "ready",
    envKeys: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET", "AMADEUS_HOSTNAME"],
    credentialFields: [
      {
        key: "clientId",
        label: "Client ID",
        required: true,
        placeholder: "Amadeus API Key",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        secret: true,
        required: true,
      },
      {
        key: "hostname",
        label: "Hostname",
        placeholder: "test.api.amadeus.com أو api.amadeus.com",
      },
    ],
    notes: "فعّل FLIGHT_PROVIDER=amadeus بعد إدخال المفاتيح",
  },
  {
    providerKey: "travelport",
    displayName: "Travelport",
    displayNameAr: "Travelport",
    description: "ربط GDS (Galileo/Worldspan/Apollo) — هيكل جاهز للتفعيل",
    capabilities: ["flight"],
    status: "scaffold",
    envKeys: [
      "TRAVELPORT_USER",
      "TRAVELPORT_PASSWORD",
      "TRAVELPORT_TARGET_BRANCH",
      "TRAVELPORT_ENDPOINT",
    ],
    credentialFields: [
      { key: "username", label: "Username", required: true },
      { key: "password", label: "Password", secret: true, required: true },
      { key: "targetBranch", label: "Target Branch", required: true },
      {
        key: "endpoint",
        label: "API Endpoint",
        placeholder: "https://…",
      },
    ],
    notes: "يحتاج بيانات اعتماد Travelport Enterprise لإكمال البحث الحي",
  },
  {
    providerKey: "travelfusion",
    displayName: "Travelfusion",
    displayNameAr: "Travelfusion",
    description:
      "مجمّع للطيران منخفض التكلفة والداخلي (LCC + Domestic) مثل Ryanair وغيرها",
    capabilities: ["flight"],
    status: "scaffold",
    envKeys: [
      "TRAVELFUSION_USERNAME",
      "TRAVELFUSION_PASSWORD",
      "TRAVELFUSION_LOGIN_ID",
    ],
    credentialFields: [
      { key: "username", label: "Username", required: true },
      { key: "password", label: "Password", secret: true, required: true },
      { key: "loginId", label: "Login ID", placeholder: "اختياري" },
    ],
    notes:
      "Travelfusion يغطي معظم شركات الطيران منخفض التكلفة والداخلي عبر XML API",
  },
  {
    providerKey: "hotelbeds",
    displayName: "Hotelbeds",
    displayNameAr: "Hotelbeds",
    description:
      "مزود فنادق عبر Hotelbeds APItude (Sandbox للتطوير — حد ~50 طلب/يوم)",
    capabilities: ["hotel", "transfer"],
    status: "ready",
    envKeys: [
      "HOTELBEDS_API_KEY",
      "HOTELBEDS_API_SECRET",
      "HOTELBEDS_TRANSFER_API_KEY",
      "HOTELBEDS_TRANSFER_API_SECRET",
    ],
    credentialFields: [
      {
        key: "apiKey",
        label: "API Key",
        secret: true,
        required: true,
        placeholder: "مفتاح Hotelbeds من developer.hotelbeds.com",
      },
      {
        key: "apiSecret",
        label: "API Secret",
        secret: true,
        required: true,
      },
      {
        key: "baseUrl",
        label: "Base URL",
        placeholder: "https://api.test.hotelbeds.com",
      },
      {
        key: "transferApiKey",
        label: "Transfers API Key",
        secret: true,
        placeholder: "مفتاح Transfers منفصل عن الفنادق",
      },
      {
        key: "transferApiSecret",
        label: "Transfers API Secret",
        secret: true,
      },
    ],
    notes:
      "فنادق: HOTEL_PROVIDER=hotelbeds. مواصلات: TRANSFER_PROVIDER=hotelbeds مع HOTELBEDS_TRANSFER_API_KEY / SECRET. Sandbox: api.test.hotelbeds.com",
  },
];

export function getCatalogEntry(providerKey: string) {
  const key = providerKey.trim().toLowerCase();
  const alias = key === "real" ? "duffel" : key;
  return PROVIDER_CATALOG.find((p) => p.providerKey === alias) || null;
}
