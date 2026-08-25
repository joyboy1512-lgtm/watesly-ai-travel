/** Known travel provider adapters available in the platform. */
export type ProviderCapability = "flight" | "hotel" | "transfer" | "activity";

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
    displayName: "Hotelbeds Hotels",
    displayNameAr: "Hotelbeds فنادق",
    description:
      "API فنادق Hotelbeds APItude فقط (Availability + Content). لا يشمل المواصلات.",
    capabilities: ["hotel"],
    status: "ready",
    envKeys: [
      "HOTELBEDS_API_KEY",
      "HOTELBEDS_API_SECRET",
      "HOTELBEDS_BASE_URL",
    ],
    credentialFields: [
      {
        key: "apiKey",
        label: "Hotels API Key",
        secret: true,
        required: true,
        placeholder: "مفتاح Hotel API من developer.hotelbeds.com",
      },
      {
        key: "apiSecret",
        label: "Hotels API Secret",
        secret: true,
        required: true,
      },
      {
        key: "baseUrl",
        label: "Hotels Base URL",
        placeholder: "https://api.test.hotelbeds.com",
      },
    ],
    notes:
      "فعّل HOTEL_PROVIDER=hotelbeds مع HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET. مواصلات Hotelbeds مزود منفصل.",
  },
  {
    providerKey: "hotelbeds-transfers",
    displayName: "Hotelbeds Transfers",
    displayNameAr: "Hotelbeds مواصلات",
    description:
      "API مواصلات Hotelbeds Transfers فقط. يعمل بمفاتيح مستقلة عن الفنادق.",
    capabilities: ["transfer"],
    status: "ready",
    envKeys: [
      "HOTELBEDS_TRANSFER_API_KEY",
      "HOTELBEDS_TRANSFER_API_SECRET",
      "HOTELBEDS_TRANSFER_BASE_URL",
    ],
    credentialFields: [
      {
        key: "apiKey",
        label: "Transfers API Key",
        secret: true,
        required: true,
        placeholder: "مفتاح Transfer API منفصل عن الفنادق",
      },
      {
        key: "apiSecret",
        label: "Transfers API Secret",
        secret: true,
        required: true,
      },
      {
        key: "baseUrl",
        label: "Transfers Base URL",
        placeholder: "https://api.test.hotelbeds.com",
      },
    ],
    notes:
      "فعّل TRANSFER_PROVIDER=hotelbeds-transfers مع HOTELBEDS_TRANSFER_API_KEY / SECRET. لا يستخدم مفاتيح الفنادق.",
  },
  {
    providerKey: "hotelbeds-activities",
    displayName: "Hotelbeds Activities",
    displayNameAr: "Hotelbeds أنشطة",
    description:
      "API أنشطة ومعالم Hotelbeds Activities فقط. يعمل بمفاتيح مستقلة عن الفنادق والمواصلات.",
    capabilities: ["activity"],
    status: "ready",
    envKeys: [
      "HOTELBEDS_ACTIVITY_API_KEY",
      "HOTELBEDS_ACTIVITY_API_SECRET",
      "HOTELBEDS_ACTIVITY_BASE_URL",
    ],
    credentialFields: [
      {
        key: "apiKey",
        label: "Activities API Key",
        secret: true,
        required: true,
        placeholder: "مفتاح Activity API منفصل عن الفنادق والنقل",
      },
      {
        key: "apiSecret",
        label: "Activities API Secret",
        secret: true,
        required: true,
      },
      {
        key: "baseUrl",
        label: "Activities Base URL",
        placeholder: "https://api.test.hotelbeds.com",
      },
    ],
    notes:
      "فعّل ACTIVITY_PROVIDER=hotelbeds-activities مع HOTELBEDS_ACTIVITY_API_KEY / SECRET.",
  },
];

export function getCatalogEntry(providerKey: string) {
  const key = providerKey.trim().toLowerCase();
  const alias =
    key === "real"
      ? "duffel"
      : key === "hotelbeds_transfers" ||
          key === "hotelbeds-transfer" ||
          key === "hotelbeds_transfer"
        ? "hotelbeds-transfers"
        : key === "hotelbeds_activities" ||
            key === "hotelbeds-activity" ||
            key === "hotelbeds_activity"
          ? "hotelbeds-activities"
          : key;
  return PROVIDER_CATALOG.find((p) => p.providerKey === alias) || null;
}
