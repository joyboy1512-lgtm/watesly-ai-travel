import {
  EMPTY_USAGE,
  type AiChatTurnInput,
  type AiChatTurnResult,
  type AiExtractInput,
  type AiExtractResult,
  type AiProvider,
  type TokenUsage,
} from "./types-chat";

type ResponsesJson = {
  id?: string;
  model?: string;
  error?: { message?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
  output?: Array<{
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  output_text?: string;
};

function usageFrom(json: ResponsesJson): TokenUsage {
  const inputTokens = Number(json.usage?.input_tokens || 0);
  const outputTokens = Number(json.usage?.output_tokens || 0);
  const cachedInputTokens = Number(
    json.usage?.input_tokens_details?.cached_tokens || 0,
  );
  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens: Number(json.usage?.total_tokens || inputTokens + outputTokens),
  };
}

const EXTRACT_INSTRUCTIONS = `Extract travel booking fields from the user message.
Return JSON only with keys: origin, destination, departDate, returnDate, adults, children, infants, cabinClass, budgetAmount, budgetCurrency, serviceTypes, summary, nextQuestion.
Use IATA codes when possible. Dates must be YYYY-MM-DD. Never invent prices.`;

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY?.trim() || "";
    this.baseUrl = (
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    this.model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
  }

  get liveMode() {
    return Boolean(this.apiKey);
  }

  async respond(input: AiChatTurnInput): Promise<AiChatTurnResult> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY غير مُعدّ على السيرفر");
    }

    const payload: Record<string, unknown> = {
      model: this.model,
      instructions: input.system,
      tools: input.tools,
      store: true,
    };
    if (input.previousResponseId) {
      payload.previous_response_id = input.previousResponseId;
    }

    if (input.functionOutputs?.length) {
      payload.input = input.functionOutputs.map((row) => ({
        type: "function_call_output",
        call_id: row.callId,
        output: row.output,
      }));
    } else if (input.imageUrls?.length) {
      payload.input = [
        {
          role: "user",
          content: [
            { type: "input_text", text: input.userText || "انظر إلى المرفق" },
            ...input.imageUrls.map((url) => ({
              type: "input_image",
              image_url: url,
            })),
          ],
        },
      ];
    } else {
      payload.input = input.userText || "";
    }

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await response.json().catch(() => ({}))) as ResponsesJson;
    if (!response.ok) {
      throw new Error(
        json.error?.message || `OpenAI Responses HTTP ${response.status}`,
      );
    }

    const functionCalls = (json.output || [])
      .filter((item) => item.type === "function_call" && item.call_id && item.name)
      .map((item) => ({
        callId: String(item.call_id),
        name: String(item.name),
        arguments: String(item.arguments || "{}"),
      }));

    const textFromOutput = (json.output || [])
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text" && part.text)
      .map((part) => String(part.text))
      .join("\n")
      .trim();

    return {
      text: String(json.output_text || textFromOutput || "").trim(),
      responseId: json.id,
      model: json.model || this.model,
      usage: usageFrom(json) || EMPTY_USAGE,
      functionCalls,
    };
  }

  async extractTravelIntent(input: AiExtractInput): Promise<AiExtractResult> {
    const result = await this.respond({
      system: EXTRACT_INSTRUCTIONS,
      userText: JSON.stringify({
        messageText: input.messageText,
        current: input.current || {},
      }),
      tools: [],
    });
    const parsed = parseExtractJson(result.text);
    const fields = {
      ...(input.current || {}),
      ...parsed.fields,
    };
    const missingFields = Array.isArray(parsed.missingFields)
      ? parsed.missingFields
      : [];
    return {
      fields,
      missingFields,
      nextQuestion: parsed.nextQuestion,
      readyToSearch: missingFields.length === 0 && Boolean(fields.origin && fields.destination && fields.departDate),
      summary: parsed.summary || "استعلام سفر",
      prices: [],
      provider: this.name,
      model: result.model || this.model,
    };
  }
}

function parseExtractJson(raw: string): {
  fields: AiExtractResult["fields"];
  missingFields?: string[];
  nextQuestion: string | null;
  summary?: string;
} {
  const stripped = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const json = JSON.parse(stripped) as Record<string, unknown>;
    const serviceTypes = Array.isArray(json.serviceTypes)
      ? (json.serviceTypes as string[])
      : undefined;
    return {
      fields: {
        origin: strOrUndef(json.origin),
        destination: strOrUndef(json.destination),
        departDate: strOrUndef(json.departDate),
        returnDate: strOrUndef(json.returnDate),
        adults: numOrUndef(json.adults),
        children: numOrUndef(json.children),
        infants: numOrUndef(json.infants),
        cabinClass: strOrUndef(json.cabinClass),
        budgetAmount: numOrUndef(json.budgetAmount),
        budgetCurrency: strOrUndef(json.budgetCurrency),
        serviceTypes: serviceTypes as AiExtractResult["fields"]["serviceTypes"],
      },
      missingFields: Array.isArray(json.missingFields)
        ? (json.missingFields as string[])
        : undefined,
      nextQuestion: strOrUndef(json.nextQuestion) || null,
      summary: strOrUndef(json.summary),
    };
  } catch {
    return { fields: {}, nextQuestion: null };
  }
}

function strOrUndef(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function numOrUndef(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
