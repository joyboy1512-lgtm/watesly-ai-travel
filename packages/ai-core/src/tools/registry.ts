import type { AiToolDefinition } from "../types-chat";

export type TravelToolName =
  | "web_search"
  | "file_search"
  | "search_flights"
  | "search_hotels"
  | "search_transfers"
  | "search_flights_travelport"
  | "search_flights_travelfusion"
  | "handoff_to_human"
  | "extract_travel_intent";

export type ToolAvailability = {
  name: TravelToolName;
  enabled: boolean;
  reason?: string;
};

const FUNCTION_TOOLS: Extract<AiToolDefinition, { type: "function" }>[] = [
  {
    type: "function",
    name: "search_flights",
    description:
      "Search live or configured flight inventory. Never invent prices. Requires origin, destination, and departDate (YYYY-MM-DD).",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "IATA origin e.g. KWI" },
        destination: { type: "string", description: "IATA destination e.g. DXB" },
        departDate: { type: "string" },
        returnDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        cabinClass: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 20 },
        offset: { type: "integer", minimum: 0 },
      },
      required: ["origin", "destination", "departDate"],
    },
  },
  {
    type: "function",
    name: "search_hotels",
    description:
      "Search hotel availability for a city or hotel name. Never invent prices.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" },
        checkInDate: { type: "string" },
        checkOutDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        rooms: { type: "integer", minimum: 1 },
        limit: { type: "integer", minimum: 1, maximum: 20 },
        offset: { type: "integer", minimum: 0 },
      },
      required: ["location", "checkInDate", "checkOutDate"],
    },
  },
  {
    type: "function",
    name: "search_transfers",
    description:
      "Search airport/hotel/address transfers (Hotelbeds Transfers). Never invent prices.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        fromKind: { type: "string", enum: ["IATA", "ATLAS", "GPS"] },
        toKind: { type: "string", enum: ["IATA", "ATLAS", "GPS"] },
        outboundDate: { type: "string" },
        outboundTime: { type: "string" },
        inboundDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1, maximum: 20 },
        offset: { type: "integer", minimum: 0 },
      },
      required: ["city", "from", "to", "outboundDate"],
    },
  },
  {
    type: "function",
    name: "search_flights_travelport",
    description:
      "Travelport GDS flight search. Returns {disabled:true} until TRAVELPORT_* credentials are set. Never invent inventory.",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        departDate: { type: "string" },
        returnDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        cabinClass: { type: "string" },
      },
      required: ["origin", "destination", "departDate"],
    },
  },
  {
    type: "function",
    name: "search_flights_travelfusion",
    description:
      "Travelfusion LCC/domestic flight search. Returns {disabled:true} until TRAVELFUSION_* credentials are set. Never invent inventory.",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        departDate: { type: "string" },
        returnDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        cabinClass: { type: "string" },
      },
      required: ["origin", "destination", "departDate"],
    },
  },
  {
    type: "function",
    name: "extract_travel_intent",
    description:
      "Extract structured travel fields (origin, destination, dates, passengers) from the latest user message.",
    parameters: {
      type: "object",
      properties: {
        messageText: { type: "string" },
      },
      required: ["messageText"],
    },
  },
  {
    type: "function",
    name: "handoff_to_human",
    description:
      "Transfer the conversation to a human travel agent when the customer asks for a person, is angry, or the request cannot be completed by tools.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
];

export function listToolAvailability(): ToolAvailability[] {
  const web =
    process.env.OPENAI_WEB_SEARCH === "false"
      ? { enabled: false, reason: "OPENAI_WEB_SEARCH=false" }
      : { enabled: Boolean(process.env.OPENAI_API_KEY) };
  const vector = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  const flightsLive = Boolean(
    process.env.DUFFEL_ACCESS_TOKEN ||
      (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET),
  );
  const travelportLive = Boolean(
    process.env.TRAVELPORT_USER &&
      process.env.TRAVELPORT_PASSWORD &&
      process.env.TRAVELPORT_TARGET_BRANCH,
  );
  const travelfusionLive = Boolean(
    process.env.TRAVELFUSION_USERNAME && process.env.TRAVELFUSION_PASSWORD,
  );
  const hotelsLive = Boolean(
    process.env.HOTELBEDS_API_KEY || process.env.DUFFEL_ACCESS_TOKEN,
  );
  const transfersLive = Boolean(
    process.env.HOTELBEDS_TRANSFER_API_KEY || process.env.HOTELBEDS_API_KEY,
  );

  return [
    {
      name: "web_search",
      enabled: web.enabled,
      reason: web.enabled ? undefined : web.reason || "يتطلب OPENAI_API_KEY",
    },
    {
      name: "file_search",
      enabled: Boolean(vector),
      reason: vector ? undefined : "يتطلب OPENAI_VECTOR_STORE_ID",
    },
    {
      name: "search_flights",
      enabled: flightsLive,
      reason: flightsLive
        ? undefined
        : "يتطلب DUFFEL_ACCESS_TOKEN أو AMADEUS_CLIENT_ID/SECRET",
    },
    {
      name: "search_hotels",
      enabled: hotelsLive,
      reason: hotelsLive
        ? undefined
        : "يتطلب HOTELBEDS_API_KEY أو DUFFEL_ACCESS_TOKEN",
    },
    {
      name: "search_transfers",
      enabled: transfersLive,
      reason: transfersLive ? undefined : "يتطلب HOTELBEDS_TRANSFER_API_KEY",
    },
    {
      name: "search_flights_travelport",
      enabled: false,
      reason: travelportLive
        ? "المفاتيح موجودة لكن بحث Travelport XML غير مكتمل بعد"
        : "يتطلب TRAVELPORT_USER و TRAVELPORT_PASSWORD و TRAVELPORT_TARGET_BRANCH",
    },
    {
      name: "search_flights_travelfusion",
      enabled: false,
      reason: travelfusionLive
        ? "المفاتيح موجودة لكن بحث Travelfusion XML غير مكتمل بعد"
        : "يتطلب TRAVELFUSION_USERNAME و TRAVELFUSION_PASSWORD",
    },
    { name: "handoff_to_human", enabled: true },
    { name: "extract_travel_intent", enabled: true },
  ];
}

export function enabledOpenAiTools(): AiToolDefinition[] {
  const availability = listToolAvailability();
  const on = new Set(
    availability.filter((row) => row.enabled).map((row) => row.name),
  );
  const tools: AiToolDefinition[] = [];
  if (on.has("web_search")) tools.push({ type: "web_search" });
  const vector = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  if (on.has("file_search") && vector) {
    tools.push({ type: "file_search", vector_store_ids: [vector] });
  }
  // Bind every function adapter, including disabled ones. Executors return
  // {disabled:true} instead of mock inventory.
  tools.push(...FUNCTION_TOOLS);
  return tools;
}

export function enabledFunctionTools(): AiToolDefinition[] {
  return FUNCTION_TOOLS.slice();
}

export const TRAVEL_SYSTEM_INSTRUCTIONS = `أنت Travel AI لشركة سياحة. تتحدث بالعربية الفصحى المبسطة ما لم يطلب العميل لغة أخرى.

قواعد صارمة:
- لا تخترع أسعاراً أو توفّراً أو أرقام رحلات أو أسماء فنادق غير قادمة من أداة.
- استخدم الأدوات عندما يحتاج العميل أسعاراً أو توفّراً أو معلومات حديثة (طقس، تأشيرة، أخبار، أحداث).
- search_flights / search_hotels / search_transfers فقط عند توفر التواريخ والمدن اللازمة. إن نقص حقل، اسأل عنه.
- نتائج الأدوات تحتوي تعرفات/غرف/سياسات إلغاء — استخدمها كما هي ولا تختلق تفاصيلاً إضافية. إن ظهر hasMore=true يمكنك إعادة الاستدعاء مع offset.
- إن كانت الأداة معطّلة، اعتذر واطلب بيانات الاعتماد أو حوّل لموظف. لا تختلق بديلاً على أنه عرض حقيقي.
- handoff_to_human عندما يطلب العميل موظفاً، أو يغضب، أو تعجز الأدوات.
- معرفة النموذج العامة مسموحة للنصائح السياحية العامة (موسم، أحياء، نصائح حقيبة) دون أسعار.
- كن موجزاً وواضحاً، وقدّم خيارات مرقّمة عند وجود نتائج أدوات.`;
