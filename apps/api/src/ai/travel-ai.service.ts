import { Injectable } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  addUsage,
  createAiProvider,
  enabledFunctionTools,
  enabledOpenAiTools,
  EMPTY_USAGE,
  estimateCostUsd,
  HOTEL_UPSELL_PROMPT,
  listToolAvailability,
  MockAiProvider,
  TRAVEL_SYSTEM_INSTRUCTIONS,
  wantsFlight,
  wantsHotel,
  type AiChannel,
  type AiChatTurnResult,
  type AiTravelContext,
  type TokenUsage,
} from "@watesly-travel/ai-core";
import {
  TravelfusionFlightProvider,
  TravelportFlightProvider,
} from "@watesly-travel/provider-sdk";
import { PrismaService } from "../prisma/prisma.service";
import {
  getFlightProviderForOrg,
  getHotelProviderForOrg,
  getTransferProviderForOrg,
} from "../common/provider-runtime";
import { hotelCatalogEntry, serializeHotelDetailsForAi, serializeSearchResult } from "./tool-result-serializers";
import type { HotelOffer, TravelInquiryFields } from "@watesly-travel/shared";
import { chatTextForAi, parseChatAttachments } from "@watesly-travel/shared";

type HotelCatalogEntry = {
  id: string;
  name?: string;
  stars?: number;
  priceFrom?: number;
  currency?: string;
};

type HotelSearchContext = {
  location?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  hotelIds?: string[];
  hotels?: HotelCatalogEntry[];
  lastShownOffset?: number;
};

function readHotelSearchContext(metadata: unknown): HotelSearchContext {
  if (!metadata || typeof metadata !== "object") return {};
  const row = metadata as { lastHotelSearch?: HotelSearchContext };
  return row.lastHotelSearch || {};
}

function readTravelInquiry(metadata: unknown): AiTravelContext {
  if (!metadata || typeof metadata !== "object") return {};
  const row = metadata as { travelInquiry?: AiTravelContext };
  return row.travelInquiry || {};
}

function normalizeHotelName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .trim();
}

function looksLikeHotelId(value: string): boolean {
  return /^hb-\d+$/i.test(value) || /^\d{3,}$/.test(value);
}

function matchHotelFromCatalog(
  catalog: HotelCatalogEntry[],
  query: string,
): { id?: string; matches: HotelCatalogEntry[] } {
  const q = normalizeHotelName(query);
  if (!q) return { matches: [] };
  const exact = catalog.filter((h) => normalizeHotelName(h.name || "") === q);
  if (exact.length === 1) return { id: exact[0]!.id, matches: exact };
  const partial = catalog.filter((h) => {
    const n = normalizeHotelName(h.name || "");
    return n.includes(q) || q.includes(n);
  });
  if (partial.length === 1) return { id: partial[0]!.id, matches: partial };
  return { matches: partial.length ? partial : exact };
}

export type TravelAiTurnInput = {
  organizationId: string;
  channel: AiChannel;
  text: string;
  threadId?: string;
  userId?: string;
  contactId?: string;
  conversationId?: string;
  externalRef?: string;
};

export type TravelAiTurnResult = {
  threadId: string;
  message: string;
  model: string;
  provider: string;
  usage: TokenUsage;
  estimatedCostUsd: number;
  handoff: boolean;
  toolsUsed: string[];
  spentUsd?: number;
  creditLimitUsd?: number | null;
  remainingUsd?: number | null;
};

type OrgAiSettings = {
  defaultThreadCreditUsd?: number | null;
};

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundUsd(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

type ThreadBudget = {
  spent: number;
  limit: number | null;
  remaining: number | null;
  exhausted: boolean;
};

function computeBudget(thread: {
  spentUsd?: unknown;
  creditLimitUsd?: unknown;
}): ThreadBudget {
  const spent = roundUsd(money(thread.spentUsd));
  if (thread.creditLimitUsd == null || thread.creditLimitUsd === "") {
    return { spent, limit: null, remaining: null, exhausted: false };
  }
  const limit = roundUsd(money(thread.creditLimitUsd));
  const remaining = roundUsd(Math.max(0, limit - spent));
  return { spent, limit, remaining, exhausted: remaining <= 0 };
}

function readOrgAiSettings(settings: unknown): OrgAiSettings {
  if (!settings || typeof settings !== "object") return {};
  const ai = (settings as { ai?: unknown }).ai;
  if (!ai || typeof ai !== "object") return {};
  const raw = (ai as { defaultThreadCreditUsd?: unknown }).defaultThreadCreditUsd;
  if (raw == null || raw === "") return { defaultThreadCreditUsd: null };
  const n = Number(raw);
  return {
    defaultThreadCreditUsd: Number.isFinite(n) && n >= 0 ? roundUsd(n) : null,
  };
}

function mergeOrgAiSettings(
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
  if (ai.defaultThreadCreditUsd === undefined) {
    base.ai = prevAi;
  } else if (ai.defaultThreadCreditUsd == null) {
    delete prevAi.defaultThreadCreditUsd;
    base.ai = prevAi;
  } else {
    prevAi.defaultThreadCreditUsd = ai.defaultThreadCreditUsd;
    base.ai = prevAi;
  }
  return asJson(base);
}

function reportWindow(period?: string, from?: string, to?: string) {
  const now = new Date();
  const p = (period || "7d").trim() || "7d";
  let end = now;
  if (to) {
    const parsed = new Date(to);
    if (!Number.isNaN(parsed.getTime())) {
      end = parsed;
      if (to.length <= 10) end.setHours(23, 59, 59, 999);
    }
  }
  let start: Date;
  if (p === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (p === "30d") {
    start = new Date(now.getTime() - 30 * 86_400_000);
  } else if (p === "custom" && from) {
    start = new Date(from);
  } else {
    start = new Date(now.getTime() - 7 * 86_400_000);
  }
  if (Number.isNaN(start.getTime())) {
    start = new Date(now.getTime() - 7 * 86_400_000);
  }
  return { start, end, period: p };
}

function addDayIfNeeded(checkIn: string, checkOut: string): string {
  if (!checkIn) return checkOut;
  if (!checkOut || checkOut <= checkIn) {
    const d = new Date(`${checkIn}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return checkOut || checkIn;
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return checkOut;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function str(v: unknown): string {
  return String(v || "").trim();
}

function int(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toolSliceArgs(args: Record<string, unknown>, defaultLimit = 5) {
  const limit = Math.min(10, Math.max(1, int(args.limit, defaultLimit)));
  const offset = Math.max(0, int(args.offset, 0));
  return { limit, offset };
}

@Injectable()
export class TravelAiService {
  constructor(private readonly prisma: PrismaService) {}

  async turn(input: TravelAiTurnInput): Promise<TravelAiTurnResult> {
    const thread = await this.resolveThread(input);
    await this.prisma.aiMessage.create({
      data: {
        threadId: thread.id,
        role: "user",
        content: input.text,
      },
    });
    if (!thread.title) {
      const parsed = parseChatAttachments(input.text);
      const titleSource = parsed.text || parsed.attachments[0]?.name || "مرفق";
      await this.prisma.aiThread.update({
        where: { id: thread.id },
        data: { title: titleSource.replace(/\s+/g, " ").slice(0, 48) },
      });
    }

    const budget = await this.threadBudget(thread);
    if (thread.status === "handed_off" || budget.exhausted) {
      if (thread.status !== "handed_off") {
        await this.performHandoff(thread, input, "نفد رصيد المحادثة");
      }
      const notice =
        "نفد رصيد هذه المحادثة، لذلك حُوّل الرد إلى موظف. سيصلك رد بشري قريباً.";
      await this.prisma.aiMessage.create({
        data: { threadId: thread.id, role: "assistant", content: notice },
      });
      return {
        threadId: thread.id,
        message: notice,
        model: "budget-limit",
        provider: "system",
        usage: EMPTY_USAGE,
        estimatedCostUsd: 0,
        handoff: true,
        toolsUsed: [],
        spentUsd: budget.spent,
        creditLimitUsd: budget.limit,
        remainingUsd: budget.remaining,
      };
    }

    const provider = createAiProvider();
    const tools =
      provider.name === "openai" ? enabledOpenAiTools() : enabledFunctionTools();
    let previousResponseId = thread.previousResponseId || undefined;
    let usage = EMPTY_USAGE;
    let model = process.env.OPENAI_MODEL?.trim() || provider.name;
    let lastId: string | undefined;
    const toolsUsed: string[] = [];
    let handoff = false;
    let handoffReason = "";
    let text = "";

    const parsedUser = parseChatAttachments(input.text);
    const userText = chatTextForAi(input.text) || "انظر إلى المرفق";
    const imageUrls = parsedUser.attachments
      .filter((row) => row.kind === "image")
      .map((row) => row.url);

    const inquiryContext = readTravelInquiry(thread.metadata);
    const slotExtractor = new MockAiProvider();

    let result: AiChatTurnResult = await provider.respond({
      system: TRAVEL_SYSTEM_INSTRUCTIONS,
      userText,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      previousResponseId,
      tools,
      inquiryContext,
    });
    usage = addUsage(usage, result.usage);
    model = result.model || model;
    lastId = result.responseId;
    text = result.text;

    for (let round = 0; round < 6 && result.functionCalls.length; round += 1) {
      const outputs: Array<{ callId: string; output: string }> = [];
      for (const call of result.functionCalls) {
        toolsUsed.push(call.name);
        if (call.name === "handoff_to_human") {
          handoff = true;
          handoffReason = str(parseArgs(call.arguments).reason) || handoffReason;
        }
        const output = await this.executeTool(
          call.name,
          call.arguments,
          input,
          thread,
        ).catch(
          (err: unknown) =>
            JSON.stringify({
              error: err instanceof Error ? err.message : "فشل تنفيذ الأداة",
            }),
        );
        outputs.push({ callId: call.callId, output });
      }
      result = await provider.respond({
        system: TRAVEL_SYSTEM_INSTRUCTIONS,
        previousResponseId: result.responseId || previousResponseId,
        tools,
        functionOutputs: outputs,
        inquiryContext,
      });
      usage = addUsage(usage, result.usage);
      model = result.model || model;
      lastId = result.responseId || lastId;
      if (result.text) text = result.text;
      previousResponseId = result.responseId || previousResponseId;
    }

    const slotSync = await slotExtractor.extractTravelIntent({
      messageText: userText,
      current: inquiryContext,
    });

    const flightOnlyDone =
      toolsUsed.includes("search_flights") && !toolsUsed.includes("search_hotels");
    if (
      flightOnlyDone &&
      wantsFlight(slotSync.fields.serviceTypes) &&
      !wantsHotel(slotSync.fields.serviceTypes)
    ) {
      slotSync.fields.awaitingHotelUpsell = true;
      if (!text.includes("فندق")) {
        text = `${text}\n\n${HOTEL_UPSELL_PROMPT}`;
      }
    } else if (toolsUsed.includes("search_hotels")) {
      slotSync.fields.awaitingHotelUpsell = false;
    }

    if (!text) {
      text =
        slotSync.nextQuestion ||
        (handoff
          ? "سأحوّلك الآن إلى موظف مختص."
          : "تم استلام رسالتك. هل يمكنك توضيح وجهتك وتاريخ السفر؟");
    }

    const estimatedCostUsd = estimateCostUsd(model, usage);
    await this.prisma.aiMessage.create({
      data: {
        threadId: thread.id,
        role: "assistant",
        content: text,
        openaiResponseId: lastId,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
      },
    });
    await this.prisma.aiThread.update({
      where: { id: thread.id },
      data: {
        previousResponseId: lastId,
        spentUsd: { increment: estimatedCostUsd },
        metadata: asJson({
          ...(thread.metadata && typeof thread.metadata === "object"
            ? (thread.metadata as Record<string, unknown>)
            : {}),
          travelInquiry: slotSync.fields,
        }),
      },
    });
    await this.prisma.aiUsageLog.create({
      data: {
        organizationId: input.organizationId,
        threadId: thread.id,
        conversationId: input.conversationId,
        userId: input.userId,
        contactId: input.contactId,
        channel: input.channel,
        provider: provider.name,
        model,
        purpose: "chat",
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd,
        openaiResponseId: lastId,
      },
    });

    const spentAfter = budget.spent + estimatedCostUsd;
    if (!handoff && budget.limit != null && spentAfter >= budget.limit) {
      handoff = true;
      handoffReason = handoffReason || "نفد رصيد المحادثة";
      const notice =
        "نفد رصيد هذه المحادثة. حُوّلت الرسائل التالية إلى موظف.";
      await this.prisma.aiMessage.create({
        data: { threadId: thread.id, role: "assistant", content: notice },
      });
      text = `${text}\n\n—\n${notice}`;
    }

    if (handoff) {
      await this.performHandoff(thread, input, handoffReason || "ai_handoff");
    }

    return {
      threadId: thread.id,
      message: text,
      model,
      provider: provider.name,
      usage,
      estimatedCostUsd,
      handoff,
      toolsUsed,
      spentUsd: spentAfter,
      creditLimitUsd: budget.limit,
      remainingUsd:
        budget.limit == null ? null : Math.max(0, budget.limit - spentAfter),
    };
  }

  async getThread(input: {
    organizationId: string;
    threadId?: string;
    channel: AiChannel;
    userId?: string;
    conversationId?: string;
    externalRef?: string;
    createIfMissing?: boolean;
  }) {
    const existing = await this.findThread(input);
    if (!existing && input.createIfMissing === false) {
      return { thread: null, messages: [], tools: listToolAvailability() };
    }
    const thread = existing || (await this.resolveThread({ ...input, text: "" }));
    const messages = await this.prisma.aiMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const budget = computeBudget(thread);
    return {
      thread: this.serializeThread(thread, budget),
      messages,
      tools: listToolAvailability(),
      budget,
    };
  }

  async listUsage(organizationId: string, take = 50) {
    return this.prisma.aiUsageLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async listThreads(organizationId: string, channel?: string) {
    const threads = await this.prisma.aiThread.findMany({
      where: {
        organizationId,
        ...(channel ? { channel } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });
    return threads.map((row) => {
      const budget = computeBudget(row);
      const preview = row.messages[0];
      return {
        ...this.serializeThread(row, budget),
        preview: (preview?.content || "").replace(/\s+/g, " ").slice(0, 90),
        previewRole: preview?.role || null,
      };
    });
  }

  async createThread(input: {
    organizationId: string;
    userId?: string;
    channel?: AiChannel;
    title?: string;
    creditLimitUsd?: number | null;
  }) {
    const settings = await this.orgAiSettings(input.organizationId);
    const creditLimitUsd =
      input.creditLimitUsd === undefined
        ? settings.defaultThreadCreditUsd
        : input.creditLimitUsd;
    const thread = await this.prisma.aiThread.create({
      data: {
        organizationId: input.organizationId,
        channel: input.channel || "dashboard",
        userId: input.userId,
        title: input.title?.trim() || null,
        creditLimitUsd: creditLimitUsd ?? null,
        metadata: asJson({ source: input.channel || "dashboard" }),
      },
    });
    return this.serializeThread(thread, computeBudget(thread));
  }

  async patchThread(input: {
    organizationId: string;
    threadId: string;
    title?: string;
    creditLimitUsd?: number | null;
    status?: "open" | "handed_off";
  }) {
    const existing = await this.prisma.aiThread.findFirst({
      where: { id: input.threadId, organizationId: input.organizationId },
    });
    if (!existing) return null;

    const data: Prisma.AiThreadUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim() || null;
    if (input.creditLimitUsd !== undefined) {
      data.creditLimitUsd =
        input.creditLimitUsd == null ? null : roundUsd(money(input.creditLimitUsd));
    }
    if (input.status === "open" || input.status === "handed_off") {
      data.status = input.status;
    }

    let thread = await this.prisma.aiThread.update({
      where: { id: existing.id },
      data,
    });
    const budget = computeBudget(thread);
    if (
      thread.status === "handed_off" &&
      !budget.exhausted &&
      input.creditLimitUsd !== undefined
    ) {
      thread = await this.prisma.aiThread.update({
        where: { id: thread.id },
        data: { status: "open" },
      });
      if (thread.conversationId) {
        await this.prisma.conversation.updateMany({
          where: { id: thread.conversationId, organizationId: input.organizationId },
          data: { assigneeType: "bot", status: "open" },
        });
      }
    }
    return this.serializeThread(thread, computeBudget(thread));
  }

  async usageReport(
    organizationId: string,
    query?: { period?: string; from?: string; to?: string },
  ) {
    const window = reportWindow(query?.period, query?.from, query?.to);
    const logs = await this.prisma.aiUsageLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: window.start, lte: window.end },
      },
      include: {
        thread: {
          select: {
            id: true,
            title: true,
            channel: true,
            status: true,
            spentUsd: true,
            creditLimitUsd: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const totals = {
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      turns: logs.length,
    };
    const byChannel = new Map<
      string,
      { channel: string; costUsd: number; turns: number; tokens: number }
    >();
    const byThread = new Map<
      string,
      {
        threadId: string;
        title: string;
        channel: string;
        status: string;
        costUsd: number;
        turns: number;
        spentUsd: number;
        creditLimitUsd: number | null;
      }
    >();
    const byDay = new Map<string, { date: string; costUsd: number; turns: number }>();

    for (const log of logs) {
      const cost = money(log.estimatedCostUsd);
      totals.costUsd += cost;
      totals.inputTokens += log.inputTokens || 0;
      totals.outputTokens += log.outputTokens || 0;
      totals.cachedInputTokens += log.cachedInputTokens || 0;

      const channel = log.channel || "unknown";
      const ch = byChannel.get(channel) || {
        channel,
        costUsd: 0,
        turns: 0,
        tokens: 0,
      };
      ch.costUsd += cost;
      ch.turns += 1;
      ch.tokens += log.totalTokens || 0;
      byChannel.set(channel, ch);

      const threadId = log.threadId || "none";
      const th = byThread.get(threadId) || {
        threadId,
        title: log.thread?.title || "بدون عنوان",
        channel: log.thread?.channel || channel,
        status: log.thread?.status || "open",
        costUsd: 0,
        turns: 0,
        spentUsd: money(log.thread?.spentUsd),
        creditLimitUsd:
          log.thread?.creditLimitUsd == null ? null : money(log.thread.creditLimitUsd),
      };
      th.costUsd += cost;
      th.turns += 1;
      byThread.set(threadId, th);

      const date = log.createdAt.toISOString().slice(0, 10);
      const day = byDay.get(date) || { date, costUsd: 0, turns: 0 };
      day.costUsd += cost;
      day.turns += 1;
      byDay.set(date, day);
    }

    return {
      period: {
        key: window.period,
        from: window.start.toISOString(),
        to: window.end.toISOString(),
      },
      totals: {
        ...totals,
        costUsd: roundUsd(totals.costUsd),
      },
      byChannel: [...byChannel.values()]
        .map((row) => ({ ...row, costUsd: roundUsd(row.costUsd) }))
        .sort((a, b) => b.costUsd - a.costUsd),
      byThread: [...byThread.values()]
        .map((row) => ({ ...row, costUsd: roundUsd(row.costUsd) }))
        .sort((a, b) => b.costUsd - a.costUsd)
        .slice(0, 40),
      byDay: [...byDay.values()].map((row) => ({
        ...row,
        costUsd: roundUsd(row.costUsd),
      })),
    };
  }

  async getAiSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    return {
      defaultThreadCreditUsd:
        readOrgAiSettings(org?.settings).defaultThreadCreditUsd ?? null,
    };
  }

  async setAiSettings(
    organizationId: string,
    input: { defaultThreadCreditUsd?: number | null },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const next = mergeOrgAiSettings(org?.settings, {
      defaultThreadCreditUsd: input.defaultThreadCreditUsd,
    });
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: next },
    });
    return this.getAiSettings(organizationId);
  }

  private async findThread(input: {
    organizationId: string;
    threadId?: string;
    channel: AiChannel;
    userId?: string;
    conversationId?: string;
    externalRef?: string;
  }) {
    if (input.threadId) {
      const existing = await this.prisma.aiThread.findFirst({
        where: { id: input.threadId, organizationId: input.organizationId },
      });
      if (existing) return existing;
    }
    if (input.conversationId) {
      const byConv = await this.prisma.aiThread.findFirst({
        where: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          status: "open",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (byConv) return byConv;
    }
    if (input.externalRef) {
      const byExt = await this.prisma.aiThread.findFirst({
        where: {
          organizationId: input.organizationId,
          channel: input.channel,
          externalRef: input.externalRef,
          status: "open",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (byExt) return byExt;
    }
    if (input.channel === "dashboard" && input.userId) {
      const byUser = await this.prisma.aiThread.findFirst({
        where: {
          organizationId: input.organizationId,
          channel: "dashboard",
          userId: input.userId,
          status: "open",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (byUser) return byUser;
    }
    return null;
  }

  private async resolveThread(input: TravelAiTurnInput) {
    const existing = await this.findThread(input);
    if (existing) return existing;
    const settings = await this.orgAiSettings(input.organizationId);
    return this.prisma.aiThread.create({
      data: {
        organizationId: input.organizationId,
        channel: input.channel,
        userId: input.userId,
        contactId: input.contactId,
        conversationId: input.conversationId,
        externalRef: input.externalRef,
        creditLimitUsd: settings.defaultThreadCreditUsd ?? null,
        metadata: asJson({ source: input.channel }),
      },
    });
  }

  private async orgCurrency(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { defaultCurrency: true },
    });
    return (org?.defaultCurrency || process.env.DEFAULT_CURRENCY || "KWD").toUpperCase();
  }

  private async orgAiSettings(organizationId: string): Promise<OrgAiSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    return readOrgAiSettings(org?.settings);
  }

  private threadBudget(thread: {
    spentUsd?: unknown;
    creditLimitUsd?: unknown;
  }): ThreadBudget {
    return computeBudget(thread);
  }

  private serializeThread(
    thread: {
      id: string;
      organizationId: string;
      channel: string;
      status: string;
      title?: string | null;
      creditLimitUsd?: unknown;
      spentUsd?: unknown;
      userId?: string | null;
      contactId?: string | null;
      conversationId?: string | null;
      externalRef?: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    budget = computeBudget(thread),
  ) {
    return {
      id: thread.id,
      organizationId: thread.organizationId,
      channel: thread.channel,
      status: thread.status,
      title: thread.title || null,
      userId: thread.userId || null,
      contactId: thread.contactId || null,
      conversationId: thread.conversationId || null,
      externalRef: thread.externalRef || null,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      spentUsd: budget.spent,
      creditLimitUsd: budget.limit,
      remainingUsd: budget.remaining,
      exhausted: budget.exhausted,
    };
  }

  private async performHandoff(
    thread: {
      id: string;
      organizationId: string;
      conversationId?: string | null;
      status: string;
    },
    input: TravelAiTurnInput,
    reason: string,
  ) {
    if (thread.status !== "handed_off") {
      await this.prisma.aiThread.update({
        where: { id: thread.id },
        data: { status: "handed_off" },
      });
    }

    const conversationId = input.conversationId || thread.conversationId || undefined;
    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, organizationId: thread.organizationId },
        include: { inquiries: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (conversation) {
        if (conversation.assigneeType !== "human") {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { assigneeType: "human", status: "pending" },
          });
        }
        const openHandoff = await this.prisma.handoff.findFirst({
          where: { conversationId: conversation.id, status: "open" },
        });
        if (!openHandoff) {
          const inquiry = conversation.inquiries[0];
          await this.prisma.handoff.create({
            data: {
              organizationId: thread.organizationId,
              conversationId: conversation.id,
              inquiryId: inquiry?.id,
              reason,
              status: "open",
              contextSummary: reason,
            },
          });
          if (inquiry && inquiry.status !== "handed_off") {
            await this.prisma.travelInquiry.update({
              where: { id: inquiry.id },
              data: { status: "handed_off" },
            });
          }
        }
      }
    }

    if (thread.status === "handed_off") return;

    const agents = await this.prisma.membership.findMany({
      where: {
        organizationId: thread.organizationId,
        status: "active",
        role: { code: { in: ["owner", "admin", "agent"] } },
      },
      select: { userId: true },
      take: 20,
    });
    if (!agents.length) return;
    const linkRef = conversationId
      ? `/dashboard/conversations?id=${conversationId}`
      : `/dashboard/assistant?threadId=${thread.id}`;
    await this.prisma.notification.createMany({
      data: agents.map((agent) => ({
        organizationId: thread.organizationId,
        userId: agent.userId,
        type: "handoff",
        title: "تحويل محادثة للموظف",
        body: reason || "نفد رصيد المساعد أو طُلب موظف",
        linkRef,
      })),
    });
  }

  private async executeTool(
    name: string,
    rawArgs: string,
    ctx: TravelAiTurnInput,
    thread: { id: string; metadata: unknown },
  ): Promise<string> {
    const args = parseArgs(rawArgs);
    try {
      if (name === "extract_travel_intent") {
        const extractor = new MockAiProvider();
        const extraction = await extractor.extractTravelIntent({
          messageText: str(args.messageText) || ctx.text,
          current: readTravelInquiry(thread.metadata),
        });
        return JSON.stringify(extraction);
      }
      if (name === "handoff_to_human") {
        return JSON.stringify({
          ok: true,
          reason: str(args.reason) || "طلب العميل موظفاً",
        });
      }
      if (name === "search_flights") {
        return this.toolSearchFlights(ctx.organizationId, args);
      }
      if (name === "search_hotels") {
        return this.toolSearchHotels(ctx.organizationId, args, thread.id);
      }
      if (name === "get_hotel_details") {
        return this.toolGetHotelDetails(ctx.organizationId, args, thread);
      }
      if (name === "search_transfers") {
        return this.toolSearchTransfers(ctx.organizationId, args);
      }
      if (name === "search_flights_travelport") {
        return this.toolScaffoldFlight("travelport", args);
      }
      if (name === "search_flights_travelfusion") {
        return this.toolScaffoldFlight("travelfusion", args);
      }
      return JSON.stringify({ disabled: true, reason: `أداة غير معروفة: ${name}` });
    } catch (err) {
      return JSON.stringify({
        error: err instanceof Error ? err.message : "فشل تنفيذ الأداة",
      });
    }
  }

  private async toolSearchFlights(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const origin = str(args.origin).toUpperCase();
    const destination = str(args.destination).toUpperCase();
    const departDate = str(args.departDate);
    if (!origin || !destination || !departDate) {
      return JSON.stringify({ error: "الأصل والوجهة وتاريخ الذهاب مطلوبة" });
    }
    const provider = await getFlightProviderForOrg(
      this.prisma,
      organizationId,
      process.env.FLIGHT_PROVIDER,
    );
    if (!provider.liveMode) {
      return JSON.stringify({
        disabled: true,
        reason:
          "بحث الطيران غير مفعّل — ينقص DUFFEL_ACCESS_TOKEN أو مفاتيح Amadeus",
      });
    }
    const rows = await provider.searchFlights({
      origin,
      destination,
      departDate,
      returnDate: str(args.returnDate) || null,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
      cabinClass: str(args.cabinClass) || "economy",
    });
    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows,
      kind: "flight",
      ...toolSliceArgs(args),
    });
  }

  private toolScaffoldFlight(
    kind: "travelport" | "travelfusion",
    args: Record<string, unknown>,
  ): Promise<string> {
    const origin = str(args.origin).toUpperCase();
    const destination = str(args.destination).toUpperCase();
    const departDate = str(args.departDate);
    if (!origin || !destination || !departDate) {
      return Promise.resolve(
        JSON.stringify({ error: "الأصل والوجهة وتاريخ الذهاب مطلوبة" }),
      );
    }
    const adapter =
      kind === "travelport"
        ? new TravelportFlightProvider()
        : new TravelfusionFlightProvider();
    if (!adapter.liveMode) {
      return Promise.resolve(
        JSON.stringify({
          disabled: true,
          reason:
            kind === "travelport"
              ? "Travelport بانتظار TRAVELPORT_USER و TRAVELPORT_PASSWORD و TRAVELPORT_TARGET_BRANCH"
              : "Travelfusion بانتظار TRAVELFUSION_USERNAME و TRAVELFUSION_PASSWORD",
        }),
      );
    }
    return adapter
      .searchFlights({
        origin,
        destination,
        departDate,
        returnDate: str(args.returnDate) || null,
        adults: Math.max(1, int(args.adults, 1)),
        children: Math.max(0, int(args.children, 0)),
        cabinClass: str(args.cabinClass) || "economy",
      })
      .then((rows) =>
        serializeSearchResult({
          liveMode: adapter.liveMode,
          provider: adapter.displayName,
          rows,
          kind: "flight",
          ...toolSliceArgs(args),
        }),
      )
      .catch((err: unknown) =>
        JSON.stringify({
          disabled: true,
          reason:
            err instanceof Error
              ? err.message
              : "المزود مربوط هيكلياً وينتظر إكمال الـ API",
        }),
      );
  }

  private async toolSearchHotels(
    organizationId: string,
    args: Record<string, unknown>,
    threadId?: string,
  ): Promise<string> {
    const location = str(args.location);
    const checkInDate = str(args.checkInDate);
    const checkOutDate = addDayIfNeeded(str(args.checkInDate), str(args.checkOutDate));
    if (!location || !checkInDate || !checkOutDate) {
      return JSON.stringify({ error: "الموقع وتاريخا الدخول والخروج مطلوبة" });
    }
    const provider = await getHotelProviderForOrg(
      this.prisma,
      organizationId,
      process.env.HOTEL_PROVIDER || "hotelbeds",
    );
    if (!provider.liveMode) {
      return JSON.stringify({
        disabled: true,
        reason: "بحث الفنادق غير مفعّل — ينقص HOTELBEDS_API_KEY أو DUFFEL_ACCESS_TOKEN",
      });
    }
    const currency = await this.orgCurrency(organizationId);
    const rows = await provider.searchHotels({
      location,
      checkInDate,
      checkOutDate,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
      rooms: Math.max(1, int(args.rooms, 1)),
      currency,
    });

    const sliceArgs = toolSliceArgs(args);
    if (threadId) {
      const catalog = rows.map((row) => hotelCatalogEntry(row as HotelOffer));
      const existing = await this.prisma.aiThread.findUnique({
        where: { id: threadId },
        select: { metadata: true },
      });
      const meta =
        existing?.metadata && typeof existing.metadata === "object"
          ? { ...(existing.metadata as Record<string, unknown>) }
          : {};
      meta.lastHotelSearch = {
        location,
        checkInDate,
        checkOutDate,
        adults: Math.max(1, int(args.adults, 1)),
        children: Math.max(0, int(args.children, 0)),
        rooms: Math.max(1, int(args.rooms, 1)),
        hotelIds: catalog.map((h) => h.id),
        hotels: catalog,
        lastShownOffset: sliceArgs.offset,
      };
      await this.prisma.aiThread.update({
        where: { id: threadId },
        data: { metadata: asJson(meta) },
      });
    }

    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows,
      kind: "hotel",
      ...sliceArgs,
    });
  }

  private async toolGetHotelDetails(
    organizationId: string,
    args: Record<string, unknown>,
    thread: { id: string; metadata: unknown },
  ): Promise<string> {
    const fresh = await this.prisma.aiThread.findUnique({
      where: { id: thread.id },
      select: { metadata: true },
    });
    const saved = readHotelSearchContext(fresh?.metadata ?? thread.metadata);
    const hotelName = str(args.hotelName);
    let hotelId = str(args.hotelId);
    const pickText = hotelName || (!looksLikeHotelId(hotelId) ? hotelId : "");

    if (pickText && /^\d{1,2}$/.test(pickText)) {
      const n = Number(pickText);
      const idx = (saved.lastShownOffset || 0) + n - 1;
      const byNumber = saved.hotels?.[idx];
      if (byNumber?.id) hotelId = byNumber.id;
    }
    if (hotelId && !looksLikeHotelId(hotelId) && !hotelName) {
      const byIdAsName = matchHotelFromCatalog(saved.hotels || [], hotelId);
      if (byIdAsName.id) hotelId = byIdAsName.id;
    }
    if (!hotelId && hotelName) {
      const matched = matchHotelFromCatalog(saved.hotels || [], hotelName);
      if (matched.id) {
        hotelId = matched.id;
      } else if (matched.matches.length > 1) {
        return JSON.stringify({
          error: "وجد أكثر من فندق بهذا الاسم — اطلب من العميل التحديد",
          matches: matched.matches.map((h) => ({
            id: h.id,
            name: h.name,
            stars: h.stars,
            priceFrom: h.priceFrom,
            currency: h.currency,
          })),
        });
      }
    }

    if (!hotelId) {
      return JSON.stringify({
        error: "حدد الفندق بـ hotelId (مثل hb-12345) أو hotelName من قائمة البحث",
        availableHotels: (saved.hotels || []).slice(0, 10).map((h) => ({
          id: h.id,
          name: h.name,
        })),
      });
    }

    const location = str(args.location) || saved.location || "";
    const checkInDate = str(args.checkInDate) || saved.checkInDate || "";
    const checkOutDate = addDayIfNeeded(
      checkInDate,
      str(args.checkOutDate) || saved.checkOutDate || "",
    );

    if (!location || !checkInDate || !checkOutDate) {
      return JSON.stringify({
        error:
          "لجلب تفاصيل الفندق نحتاج المدينة وتاريخي الدخول والخروج — أعد search_hotels أو مرّرها مع get_hotel_details",
      });
    }

    const provider = await getHotelProviderForOrg(
      this.prisma,
      organizationId,
      process.env.HOTEL_PROVIDER || "hotelbeds",
    );
    if (!provider.liveMode) {
      return JSON.stringify({
        disabled: true,
        reason: "تفاصيل الفنادق غير مفعّلة — ينقص HOTELBEDS_API_KEY",
      });
    }

    const currency = await this.orgCurrency(organizationId);
    const rows = await provider.searchHotels({
      location,
      checkInDate,
      checkOutDate,
      adults: Math.max(1, int(args.adults, saved.adults ?? 1)),
      children: Math.max(0, int(args.children, saved.children ?? 0)),
      rooms: Math.max(1, int(args.rooms, saved.rooms ?? 1)),
      hotelCode: hotelId,
      maxRoomsPerHotel: 50,
      currency,
    });

    const match =
      rows.find((row) => row.providerOfferRef === hotelId) ||
      rows.find((row) =>
        row.providerOfferRef.endsWith(hotelId.replace(/^hb-/i, "")),
      ) ||
      rows[0];

    if (!match) {
      return JSON.stringify({
        error: "لم يُعثر على الفندق أو لا يتوفر للتواريخ المحددة",
        hotelId,
        hotelName: hotelName || undefined,
        location,
        checkInDate,
        checkOutDate,
      });
    }

    return serializeHotelDetailsForAi(match);
  }

  private async toolSearchTransfers(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const city = str(args.city);
    const from = str(args.from);
    const to = str(args.to);
    const outboundDate = str(args.outboundDate);
    if (!city || !from || !to || !outboundDate) {
      return JSON.stringify({
        error: "المدينة ونقطتا الاستلام/التسليم وتاريخ الذهاب مطلوبة",
      });
    }
    const provider = await getTransferProviderForOrg(
      this.prisma,
      organizationId,
      process.env.TRANSFER_PROVIDER || "hotelbeds-transfers",
    );
    if (!provider.liveMode) {
      return JSON.stringify({
        disabled: true,
        reason: "بحث المواصلات غير مفعّل — ينقص HOTELBEDS_TRANSFER_API_KEY (مزود منفصل عن الفنادق)",
      });
    }
    const fromKind = str(args.fromKind) as "IATA" | "ATLAS" | "GPS" | "";
    const toKind = str(args.toKind) as "IATA" | "ATLAS" | "GPS" | "";
    const currency = await this.orgCurrency(organizationId);
    const rows = await provider.searchTransfers({
      city,
      from,
      to,
      fromKind: fromKind || "IATA",
      toKind: toKind || "GPS",
      outboundDate,
      outboundTime: str(args.outboundTime) || "10:00",
      inboundDate: str(args.inboundDate) || undefined,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
      currency,
    });
    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows,
      kind: "transfer",
      ...toolSliceArgs(args),
    });
  }
}
