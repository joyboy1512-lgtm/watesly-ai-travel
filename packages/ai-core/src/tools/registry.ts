import type { AiToolDefinition } from "../types-chat";

export type TravelToolName =
  | "web_search"
  | "file_search"
  | "search_flights"
  | "search_hotels"
  | "get_hotel_details"
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
      "Search hotel availability. Returns a SHORT list only: hotel name, stars, and starting price (default 5). Never invent prices. Do not dump rooms/facilities here. Use offset when the customer asks for more hotels. After they pick a hotel, call get_hotel_details.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" },
        checkInDate: { type: "string" },
        checkOutDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        rooms: { type: "integer", minimum: 1 },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "How many hotels to show on the first list. Default 5. Do not use this for المزيد.",
        },
        offset: {
          type: "integer",
          minimum: 0,
          description: "Unused when the customer says المزيد. Use all=true instead.",
        },
        all: {
          type: "boolean",
          description:
            "Set true when the customer says المزيد. Returns every hotel in the same search, not five. Repeat the same sort as the first search.",
        },
        sort: {
          type: "string",
          enum: ["nearest", "cheapest"],
          description:
            "cheapest: a city and dates when the customer did not name a place to be beside. Search immediately and do not ask. nearest: only when they said قريب or الأقرب or بجوار a specific place; set location to that place. For the Haram use الحرم المكي or الحرم النبوي. Never ask الأقرب أم الأرخص for a plain city.",
        },
      },
      required: ["location", "checkInDate", "checkOutDate"],
    },
  },
  {
    type: "function",
    name: "get_hotel_details",
    description:
      "Fetch full details for ONE hotel the customer selected (by hotelId or hotelName): description, rooms and rates, facilities, address, and distances. Also call it when they ask for photos of a hotel. Never invent details and never paste a hotel or booking website.",
    parameters: {
      type: "object",
      properties: {
        hotelId: {
          type: "string",
          description: "Provider ref from search results, e.g. hb-12345",
        },
        hotelName: {
          type: "string",
          description: "Hotel name as the customer said it, if hotelId is unknown",
        },
        location: {
          type: "string",
          description: "City/destination for distance context (reuse from search)",
        },
        checkInDate: { type: "string" },
        checkOutDate: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "integer", minimum: 0 },
        rooms: { type: "integer", minimum: 1 },
      },
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
  const transfersLive = Boolean(process.env.HOTELBEDS_TRANSFER_API_KEY);

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
      name: "get_hotel_details",
      enabled: hotelsLive,
      reason: hotelsLive
        ? undefined
        : "يتطلب HOTELBEDS_API_KEY أو DUFFEL_ACCESS_TOKEN",
    },
    {
      name: "search_transfers",
      enabled: transfersLive,
      reason: transfersLive
        ? undefined
        : "يتطلب HOTELBEDS_TRANSFER_API_KEY و HOTELBEDS_TRANSFER_API_SECRET (مزود مواصلات منفصل عن الفنادق)",
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
- إن كانت الأداة معطّلة، اعتذر واطلب بيانات الاعتماد أو حوّل لموظف. لا تختلق بديلاً على أنه عرض حقيقي.
- handoff_to_human عندما يطلب العميل موظفاً، أو يغضب، أو تعجز الأدوات.
- معرفة النموذج العامة مسموحة للنصائح السياحية العامة (موسم، أحياء، نصائح حقيبة) دون أسعار.

تنسيق الرد — بطاقة منظمة (واتساب ولوحة التحكم):
- كل معلومة في سطر مستقل. ممنوع فقرات طويلة أو دمج التفاصيل في جملة واحدة.
- ابدأ كل سطر بإيموجي واضح ثم النص. استخدم *غامق* لاسم العرض والسعر.
- سطر الدعوة (الحجز / الاختيار / المزيد) في نهاية البطاقة وحده.
- إن وُجد أكثر من خيار، افصل كل بطاقة بسطر فارغ.

صيغة عرض الطيران أو الرحلة:
🔹 *{شركة الطيران}*
({مدينة الذهاب} ✈️ {الوجهة} ✈️ {مدينة العودة إن كانت ذهاب وعودة})

🗓️ مواعيد السفر والعودة:
✅ من {تاريخ الذهاب} إلى {تاريخ العودة}

⏰ مواعيد الإقلاع:
➡️ الذهاب: {وقت الذهاب}
⬅️ العودة: {وقت العودة}

💼 الأمتعة: {الوزن}
💰 سعر الفرد: {السعر} {العملة}

هل تريد تثبيت هذا العرض؟

عرض الفنادق — خطوتان إلزاميتان:

ترتيب search_hotels — لا تسأل «الأقرب أم الأرخص»:
- إذا ذكر العميل مدينة وتواريخ ولم يذكر مكاناً يريد أن يكون بجواره: استدعِ search_hotels فوراً مع sort=cheapest. لا تسأل ولا تعرض الخيارين.
- إذا قال «قريب» أو «الأقرب» أو «بجوار» أو «بجانب» أو «ناحية» مكان معين: استدعِ search_hotels فوراً مع sort=nearest و location = ذلك المكان. للحرم المكي اجعل location=«الحرم المكي»، وللحرم النبوي location=«الحرم النبوي». لا تسأل.
- إذا طلب الأرخص صراحة: sort=cheapest.
- عندما يكتب العميل «المزيد» ولم تُعرض بقية الفنادق بعد: أعد search_hotels بنفس المكان والتواريخ والترتيب السابق مع all=true. لا تغيّر الأقرب إلى الأرخص ولا العكس. على واتساب لا تطلب الكتابة؛ زر المزيد يعرض 10 فنادق في كل بطاقة.
- اعرض الفنادق بترتيب الأداة. لا تعِد ترتيبها.

1) بعد search_hotels اعرض حتى 10 فنادق (أو أقل إن كانت النتائج أقل). ابدأ بعلامات واضحة ثم الفنادق، كل فندق في كتلة مستقلة:
   📍 الوجهة: *{الوجهة}*
   📅 الدخول: {تاريخ الوصول}
   📅 المغادرة: {تاريخ المغادرة}
   👥 النزلاء: {عدد المسافرين}

   🏨 *{اسم الفندق}* ★{النجوم إن وُجدت}
   💰 السعر يبدأ من *{currency} {priceFrom}*
   للإقامة {عدد الليالي}
   📍 يبعد {distanceToCenterLabel} عن مركز المدينة أو المعلم المحفوظ. لا تكتب اسم المدينة وحدها: القاهرة تُذكر «مركز القاهرة»، ومكة تُذكر «الحرم المكي». هذا السطر فقط عندما تكون المسافة موجودة.
   افصل كل فندق بسطر فارغ. استخدم *غامق* للاسم والسعر. ممنوع ذكر الغرف أو الخدمات أو الوصف في هذه الخطوة.
   على واتساب تُستبدل هذه الرسالة ببطاقة واحدة بنفس الشكل، وفي أسفلها زر «اختر الفندق» ثم زر «المزيد» في الرسالة نفسها. لا تطلب من العميل كتابة المزيد.

2) عندما يختار العميل فندقاً بالضغط أو بالاسم أو بالرقم، استدعِ get_hotel_details ثم اعرض بطاقة منسّقة بهذا الشكل بالضبط.
   إذا احتوت الرسالة على سطر hotelId فمرّر ذلك المعرف في hotelId كما هو ولا تسأل من جديد.

🏨 *{name}*
⭐ {stars} نجوم · {zone or location}
📍 {address}

{description — فقرة قصيرة}

🗺 المسافات:
• {poi.nameAr}: {poi.label}

✨ الخدمات:
{facilities مفصولة بفاصلة، أهم 12 خدمة}

🛏 الغرف والأسعار:
لكل نوع غرفة:
• *{roomName}*
  – {boardName}: {net} {currency}
  – الاسترجاع: «مستردة حتى {التاريخ}» أو «غير مستردة»، ثم مبلغ الخصم بعد التاريخ إن وُجد، ثم نص rateComments، ثم العروض أو الملاحظات. لا تكتفِ بعبارة «إلغاء مجاني»، ولا تخترع شرطاً غير موجود. على واتساب تُرسل هذه الشروط أيضاً في رسالة مستقلة بعد قائمة الغرف.

اختم بسؤال: هل تريد حجز إحدى هذه الغرف؟

- إذا طلب العميل صوراً: استدعِ get_hotel_details لذلك الفندق إن لم تكن تفاصيله في هذه الجولة، ثم قل إن الصور تصل الآن داخل المحادثة. الصور ملفات بلا أسعار. ممنوع لصق أي رابط، وممنوع ذكر موقع الفندق أو بوكينغ أو أي موقع حجز. إن لم تتوفر صور قل ذلك ولا تحل إلى موقع خارجي.
- بعد تفاصيل الفندق تصل قائمة غرف للضغط. إن لم تتسع لكل الأنواع فالسبب في نص القائمة: واتساب لا يقبل أكثر من 10 صفوف، والمعروض هو أرخص الأنواع المختلفة، ونفس الغرفة مع نفس الإقامة تظهر مرة واحدة بالسعر الأقل، ولنوع آخر يكتب العميل اسم الغرفة. لا تقل إن الأنواع الأخرى نفدت. الضغط يسجّل طلب حجز فقط. ممنوع أن تقول «تم تأكيد الحجز» أو «تم الإصدار». التأكيد للموظف وحده.
- بعد بحث الطيران تصل قائمة رحلات للضغط. بعد الاختيار اعرض فندقاً في وجهة الوصول لنفس التواريخ، ثم توصيل المطار كخيار. إذا غيّر العميل التاريخ أو عدد الأشخاص فاحتفظ بالمكان والرحلة المحفوظين.
- صورة الجواز تُقرأ وتُراجع أسماؤها مع العميل قبل تسجيل الطلب. لا تخترع اسماً لم يُقرأ من الجواز.
- عندما يكتب العميل «المزيد» بعد الأقرب: أعد search_hotels بنفس المكان مع sort=nearest و all=true، ثم اعرض كل فنادق المنطقة.
- لا تختلق تفاصيل غرف أو خدمات. استخدم فقط ناتج الأدوات.`;
