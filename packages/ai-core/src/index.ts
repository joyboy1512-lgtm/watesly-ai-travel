import {
  type TravelInquiryFields,
} from "@watesly-travel/shared";
import type {
  AiChatTurnInput,
  AiChatTurnResult,
  AiExtractInput,
  AiExtractResult,
  AiFunctionCall,
  AiProvider,
} from "./types-chat";
import { EMPTY_USAGE } from "./types-chat";
import { OpenAiProvider } from "./openai-provider";
import {
  hasExplicitServiceTypes,
  mergeServiceTypes,
  parseServiceTypesFromText,
} from "./service-intent";
import {
  buildInquirySummary,
  computeInquiryMissing,
  nextInquiryQuestion,
  parseRelativeDate,
  wantsFlight,
  wantsHotel,
} from "./inquiry-slots";

const CITY_ALIASES: Record<string, string> = {
  الرياض: "RUH",
  جدة: "JED",
  دبي: "DXB",
  القاهرة: "CAI",
  الدوحة: "DOH",
  الدمام: "DMM",
  دمام: "DMM",
  الكويت: "KWI",
  عمان: "AMM",
  بيروت: "BEY",
  اسطنبول: "IST",
  إسطنبول: "IST",
  لندن: "LHR",
  باريس: "CDG",
  ruh: "RUH",
  jed: "JED",
  dxb: "DXB",
  cai: "CAI",
  dmm: "DMM",
};

function normalizeCity(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return CITY_ALIASES[trimmed] || CITY_ALIASES[lower] || trimmed.toUpperCase();
}

function parseDateToken(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const dmy = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  return parseRelativeDate(text);
}

function isServiceTypeOnlyReply(text: string): boolean {
  return mergeServiceTypes(text, null) !== null && text.trim().length <= 24;
}

/**
 * Mock AI extractor — rule-based Arabic/English parsing.
 * Never returns prices or availability.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async extractTravelIntent(input: AiExtractInput): Promise<AiExtractResult> {
    const text = input.messageText.trim();
    const lower = text.toLowerCase();
    const fields: TravelInquiryFields = { ...(input.current ?? {}) };

    const mergedServiceTypes = mergeServiceTypes(text, input.current?.serviceTypes);
    fields.serviceTypes = mergedServiceTypes ?? null;

    const serviceOnly = isServiceTypeOnlyReply(text);

    if (!serviceOnly) {
      const routeMatch = text.match(
        /من\s+([A-Za-z\u0600-\u06FF]+)\s+(?:إلى|الى|إلي)\s+([A-Za-z\u0600-\u06FF]+)/i,
      );
      if (routeMatch) {
        fields.origin = normalizeCity(routeMatch[1]);
        fields.destination = normalizeCity(routeMatch[2]);
      }

      const fromMatch =
        text.match(/(?:من مدينة|مغادرة|from)\s+([A-Za-z\u0600-\u06FF]+)/i);
      const toMatch =
        text.match(/(?:إلى|الى|إلي|destination|to|في)\s+([A-Za-z\u0600-\u06FF]+)/i);

      if (!fields.origin && fromMatch?.[1]) fields.origin = normalizeCity(fromMatch[1]);
      if (!fields.destination && toMatch?.[1]) {
        fields.destination = normalizeCity(toMatch[1]);
      }

      if (!fields.origin || !fields.destination) {
        const pair = text.match(
          /([A-Za-z\u0600-\u06FF]{2,})\s+(?:إلى|الى|إلي|to|-|–)\s+([A-Za-z\u0600-\u06FF]{2,})/i,
        );
        if (pair) {
          fields.origin = fields.origin || normalizeCity(pair[1]);
          fields.destination = fields.destination || normalizeCity(pair[2]);
        }
      }

      if (!fields.origin || !fields.destination) {
        const found: string[] = [];
        for (const alias of Object.keys(CITY_ALIASES)) {
          if (alias.length < 2) continue;
          if (text.includes(alias) || lower.includes(alias.toLowerCase())) {
            const code = CITY_ALIASES[alias]!;
            if (!found.includes(code)) found.push(code);
          }
        }
        const hotelHint = wantsHotel(fields.serviceTypes) && !wantsFlight(fields.serviceTypes);
        if (!fields.destination && found[0]) {
          fields.destination = found[0];
          if (!hotelHint && !fields.origin && found[1]) {
            fields.origin = found[0];
            fields.destination = found[1];
          }
        } else if (!fields.origin && found[0]) {
          fields.origin = found[0];
        }
        if (!fields.destination && found[1]) fields.destination = found[1];
      }

      const date = parseDateToken(text);
      if (date) fields.departDate = date;
      const allDates = text.match(/20\d{2}-\d{2}-\d{2}/g) || [];
      if (allDates[0]) fields.departDate = allDates[0];
      if (allDates[1]) fields.returnDate = allDates[1];

      const returnHint = text.match(
        /(?:عودة|رجوع|مغادرة\s*الفندق|check\s*out|return)\s*(?:في|:)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}|[^\s،.]+)/i,
      );
      if (returnHint?.[1]) {
        fields.returnDate = parseDateToken(returnHint[1]) || returnHint[1];
      }
      if (!fields.returnDate && /(?:ذهاب\s*و\s*عودة|round\s*trip)/i.test(text)) {
        const relReturn = parseRelativeDate(text);
        if (relReturn && fields.departDate) {
          const d = new Date(`${fields.departDate}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 3);
          fields.returnDate = d.toISOString().slice(0, 10);
        }
      }

      const adultsMatch = text.match(/(?:بالغ|بالغين|adults?)\s*[:=]?\s*(\d+)/i);
      if (adultsMatch?.[1]) fields.adults = Number(adultsMatch[1]);
      if (/^(?:1|[\u0661]|شخص(?:\s|$)|واحد)$/i.test(text.trim())) fields.adults = 1;
      if (/^(?:2|[\u0662]|شخصين|اثنين|ثنين)$/i.test(text.trim())) fields.adults = 2;
      if (/^(?:3|[\u0663]|ثلاث(?:ة)?)$/i.test(text.trim())) fields.adults = 3;
      if (/^(?:4|[\u0664]|أربع(?:ة)?)$/i.test(text.trim())) fields.adults = 4;
      if (text.includes("شخصين") || text.includes("اثنين") || text.includes("ثنين")) {
        fields.adults = 2;
      }
      if (text.includes("ثلاثة") || text.includes("3 أشخاص")) {
        fields.adults = 3;
      }

      const childrenMatch = text.match(/(?:طفل|أطفال|children)\s*[:=]?\s*(\d+)/i);
      if (childrenMatch?.[1]) fields.children = Number(childrenMatch[1]);

      if (/(اقتصادي|economy)/i.test(text)) fields.cabinClass = "economy";
      if (/(رجال أعمال|business)/i.test(text)) fields.cabinClass = "business";
      if (/(أولى|first)/i.test(text)) fields.cabinClass = "first";

      const budgetMatch = text.match(/(?:ميزانية|budget)\s*[:=]?\s*(\d+)/i);
      if (budgetMatch?.[1]) {
        fields.budgetAmount = Number(budgetMatch[1]) * 100;
        fields.budgetCurrency = "KWD";
      }

      const pending = computeInquiryMissing({ ...fields, adults: fields.adults ?? null });
      const nextSlot = pending[0];
      if (
        (CITY_ALIASES[text] || CITY_ALIASES[lower]) &&
        (nextSlot === "origin" || nextSlot === "destination")
      ) {
        const city = normalizeCity(text);
        if (nextSlot === "origin") fields.origin = city;
        else fields.destination = city;
      } else if (/^\d+$/.test(text.trim()) && nextSlot === "adults") {
        fields.adults = Math.max(1, Number(text.trim()));
      } else if (nextSlot === "departDate" || nextSlot === "returnDate") {
        const rel = parseRelativeDate(text);
        if (rel) {
          if (nextSlot === "departDate") fields.departDate = rel;
          else fields.returnDate = rel;
        }
      }
    }

    if (!fields.adults) fields.adults = null;

    const missingFields = computeInquiryMissing(fields);
    const readyToSearch = missingFields.length === 0;
    if (readyToSearch && !fields.adults) fields.adults = 1;
    const summary = buildInquirySummary(fields);

    return {
      fields,
      missingFields,
      nextQuestion: nextInquiryQuestion(missingFields, fields),
      readyToSearch,
      summary: summary || "استعلام سفر قيد الاستكمال",
      prices: [],
      provider: this.name,
      model: "mock-rules-v1",
    };
  }

  async respond(input: AiChatTurnInput): Promise<AiChatTurnResult> {
    if (input.functionOutputs?.length) {
      return {
        text: summarizeMockToolOutputs(input.functionOutputs),
        model: "mock-rules-v1",
        usage: EMPTY_USAGE,
        functionCalls: [],
      };
    }

    if (/(موظف|بشري|خدمة\s*عملاء|human|agent|support)/i.test(input.userText || "")) {
      return {
        text: "",
        model: "mock-rules-v1",
        usage: EMPTY_USAGE,
        functionCalls: [
          {
            callId: "mock_handoff",
            name: "handoff_to_human",
            arguments: JSON.stringify({ reason: "طلب العميل موظفاً" }),
          },
        ],
      };
    }

    const extraction = await this.extractTravelIntent({
      messageText: input.userText || "",
      current: input.inquiryContext,
    });
    const functionCalls = mockSearchCalls(extraction, input.tools);
    if (functionCalls.length) {
      return {
        text: "",
        model: "mock-rules-v1",
        usage: EMPTY_USAGE,
        functionCalls,
      };
    }

    const text =
      extraction.nextQuestion ||
      (extraction.readyToSearch
        ? `${extraction.summary}. استخدم أدوات البحث للحصول على أسعار حقيقية.`
        : "كيف يمكنني مساعدتك في تخطيط رحلتك؟");
    return {
      text,
      model: "mock-rules-v1",
      usage: EMPTY_USAGE,
      functionCalls: [],
    };
  }
}

function mockSearchCalls(
  extraction: AiExtractResult,
  tools: AiChatTurnInput["tools"],
): AiFunctionCall[] {
  const allowed = new Set(
    tools.filter((tool) => tool.type === "function").map((tool) => tool.name),
  );
  const services: string[] = hasExplicitServiceTypes(extraction.fields.serviceTypes)
    ? [...extraction.fields.serviceTypes!]
    : [];
  const calls: AiFunctionCall[] = [];
  if (
    extraction.readyToSearch &&
    allowed.has("search_flights") &&
    (services.includes("flight") || services.includes("package")) &&
    extraction.fields.origin &&
    extraction.fields.destination &&
    extraction.fields.departDate
  ) {
    calls.push({
      callId: "mock_search_flights",
      name: "search_flights",
      arguments: JSON.stringify({
        origin: extraction.fields.origin,
        destination: extraction.fields.destination,
        departDate: extraction.fields.departDate,
        returnDate: extraction.fields.returnDate,
        adults: extraction.fields.adults || 1,
        children: extraction.fields.children || 0,
        cabinClass: extraction.fields.cabinClass || "economy",
      }),
    });
  }
  if (
    allowed.has("search_hotels") &&
    (services.includes("hotel") || services.includes("package")) &&
    extraction.fields.destination &&
    extraction.fields.departDate
  ) {
    const checkOut =
      extraction.fields.returnDate &&
      extraction.fields.returnDate > extraction.fields.departDate
        ? extraction.fields.returnDate
        : (() => {
            const d = new Date(`${extraction.fields.departDate}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() + 1);
            return d.toISOString().slice(0, 10);
          })();
    calls.push({
      callId: "mock_search_hotels",
      name: "search_hotels",
      arguments: JSON.stringify({
        location: extraction.fields.destination,
        checkInDate: extraction.fields.departDate,
        checkOutDate: checkOut,
        adults: extraction.fields.adults || 1,
        children: extraction.fields.children || 0,
        rooms: 1,
      }),
    });
  }
  return calls;
}

function summarizeMockToolOutputs(
  outputs: Array<{ callId: string; output: string }>,
): string {
  const lines: string[] = [];
  for (const row of outputs) {
    try {
      const parsed = JSON.parse(row.output) as {
        disabled?: boolean;
        reason?: string;
        error?: string;
        ok?: boolean;
        count?: number;
        provider?: string;
        items?: Array<{
          description?: string;
          currency?: string;
          name?: string;
          priceFromLabel?: string;
          stars?: number;
        }>;
        presentAs?: string;
        hasMore?: boolean;
        nextOffset?: number;
      };
      if (parsed.ok && parsed.reason) {
        lines.push(`تم تسجيل التحويل إلى موظف: ${parsed.reason}`);
        continue;
      }
      if (parsed.disabled || parsed.error) {
        lines.push(parsed.reason || parsed.error || "الأداة غير متاحة حالياً.");
        continue;
      }
      if (parsed.items?.length) {
        if (parsed.presentAs === "short_list") {
          lines.push("هذه بعض الفنادق المتاحة:");
          parsed.items.slice(0, 5).forEach((item, index) => {
            const stars = item.stars ? ` ★${item.stars}` : "";
            lines.push(
              `${index + 1}. ${item.name || item.description || "فندق"}${stars}`,
            );
            if (item.priceFromLabel) {
              lines.push(`   السعر ${item.priceFromLabel}`);
            }
          });
          if (parsed.hasMore) {
            lines.push("إذا أردت خيارات أكثر اكتب: المزيد");
          }
          lines.push("اختر اسم الفندق لعرض الغرف والخدمات والموقع.");
          continue;
        }
        lines.push(
          `${parsed.provider || "نتائج"} (${parsed.count ?? parsed.items.length}):`,
        );
        parsed.items.slice(0, 5).forEach((item, index) => {
          lines.push(`${index + 1}. ${item.description || "عرض"}`);
        });
        continue;
      }
      lines.push("لا توجد نتائج من الأداة.");
    } catch {
      lines.push(row.output.slice(0, 400));
    }
  }
  return lines.join("\n") || "تم تنفيذ الأدوات. هل تريد تفاصيل إضافية؟";
}

export function createAiProvider(
  provider = process.env.AI_PROVIDER || "mock",
): AiProvider {
  const key = provider.trim().toLowerCase();
  if (key === "openai") {
    const live = new OpenAiProvider();
    if (live.liveMode) return live;
    // eslint-disable-next-line no-console
    console.warn("[ai-core] AI_PROVIDER=openai بدون OPENAI_API_KEY — استخدام Mock");
    return new MockAiProvider();
  }
  return new MockAiProvider();
}

export { OpenAiProvider } from "./openai-provider";
export { estimateCostUsd } from "./pricing";
export {
  enabledFunctionTools,
  enabledOpenAiTools,
  listToolAvailability,
  TRAVEL_SYSTEM_INSTRUCTIONS,
} from "./tools/registry";
export type { ToolAvailability } from "./tools/registry";
export * from "./types-chat";

export {
  buildInquirySummary,
  computeInquiryMissing,
  nextInquiryQuestion,
  parseRelativeDate,
  wantsFlight,
  wantsHotel,
  wantsTransfer,
} from "./inquiry-slots";
export type { InquirySlot } from "./inquiry-slots";
export {
  SERVICE_TYPE_CLARIFY_QUESTION,
  hasExplicitServiceTypes,
  mergeServiceTypes,
  parseServiceTypesFromText,
} from "./service-intent";
export {
  extractPassportFromImage,
  parseMrzText,
  type PassportScanFields,
  type PassportScanInput,
  type PassportScanResult,
} from "./passport";
