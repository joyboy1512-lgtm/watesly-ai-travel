import type { TravelInquiryFields } from "@watesly-travel/shared";

export type AiChannel =
  | "dashboard"
  | "web_chat"
  | "whatsapp"
  | "telegram"
  | "other";

export interface AiExtractInput {
  messageText: string;
  current?: TravelInquiryFields;
}

export interface AiExtractResult {
  fields: TravelInquiryFields;
  missingFields: string[];
  nextQuestion: string | null;
  readyToSearch: boolean;
  summary: string;
  /** Always empty — AI must never invent prices. */
  prices: never[];
  provider: string;
  model: string;
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
};

export type AiFunctionCall = {
  callId: string;
  name: string;
  arguments: string;
};

export type AiToolDefinition =
  | { type: "web_search" }
  | { type: "file_search"; vector_store_ids: string[] }
  | {
      type: "function";
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };

export type AiChatTurnInput = {
  system: string;
  userText?: string;
  imageUrls?: string[];
  previousResponseId?: string;
  tools: AiToolDefinition[];
  functionOutputs?: Array<{ callId: string; output: string }>;
};

export type AiChatTurnResult = {
  text: string;
  responseId?: string;
  model: string;
  usage: TokenUsage;
  functionCalls: AiFunctionCall[];
};

export interface AiProvider {
  readonly name: string;
  extractTravelIntent(input: AiExtractInput): Promise<AiExtractResult>;
  respond(input: AiChatTurnInput): Promise<AiChatTurnResult>;
}

export const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  totalTokens: 0,
};

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}
