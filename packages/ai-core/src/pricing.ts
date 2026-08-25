import type { TokenUsage } from "./types-chat";

/** USD per 1M tokens. Update when OpenAI publishes new list prices. */
const MODEL_RATES: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  default: { input: 2.5, cachedInput: 0.25, output: 10 },
  "gpt-4.1": { input: 2.0, cachedInput: 0.5, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, output: 1.6 },
  "gpt-4o": { input: 2.5, cachedInput: 1.25, output: 10 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5.6-luna": { input: 2.5, cachedInput: 0.25, output: 10 },
};

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const key = model.trim().toLowerCase();
  const rates =
    MODEL_RATES[key] ||
    MODEL_RATES[key.split("-").slice(0, 2).join("-")] ||
    MODEL_RATES.default!;
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const usd =
    (uncachedInput / 1_000_000) * rates.input +
    (usage.cachedInputTokens / 1_000_000) * rates.cachedInput +
    (usage.outputTokens / 1_000_000) * rates.output;
  return Math.round(usd * 1_000_000) / 1_000_000;
}
