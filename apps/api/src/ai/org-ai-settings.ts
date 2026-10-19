import type { Prisma } from "@watesly-travel/database";

export type OrgAiSettings = {
  defaultThreadCreditUsd?: number | null;
  /** Absent means the public site assistant stays on. */
  assistantEnabled?: boolean;
};

function roundUsd(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function readOrgAiSettings(settings: unknown): OrgAiSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const ai = (settings as { ai?: unknown }).ai;
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return {};
  const raw = (ai as { defaultThreadCreditUsd?: unknown }).defaultThreadCreditUsd;
  const enabledRaw = (ai as { assistantEnabled?: unknown }).assistantEnabled;
  const parsed: OrgAiSettings = {};
  if (raw == null || raw === "") {
    parsed.defaultThreadCreditUsd = null;
  } else {
    const n = Number(raw);
    parsed.defaultThreadCreditUsd = Number.isFinite(n) && n >= 0 ? roundUsd(n) : null;
  }
  if (typeof enabledRaw === "boolean") parsed.assistantEnabled = enabledRaw;
  return parsed;
}

export function mergeOrgAiSettings(
  existing: unknown,
  ai: OrgAiSettings,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prevAi =
    base.ai && typeof base.ai === "object" && !Array.isArray(base.ai)
      ? { ...(base.ai as Record<string, unknown>) }
      : {};
  if (ai.defaultThreadCreditUsd === null) {
    delete prevAi.defaultThreadCreditUsd;
  } else if (ai.defaultThreadCreditUsd !== undefined) {
    prevAi.defaultThreadCreditUsd = ai.defaultThreadCreditUsd;
  }
  if (typeof ai.assistantEnabled === "boolean") {
    prevAi.assistantEnabled = ai.assistantEnabled;
  }
  base.ai = prevAi;
  return asJson(base);
}

export function publicAssistantEnabled(settings: unknown): boolean {
  return readOrgAiSettings(settings).assistantEnabled !== false;
}
