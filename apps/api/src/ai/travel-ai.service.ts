import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  addUsage,
  createAiProvider,
  enabledFunctionTools,
  enabledOpenAiTools,
  EMPTY_USAGE,
  estimateCostUsd,
  listToolAvailability,
  MockAiProvider,
  TRAVEL_SYSTEM_INSTRUCTIONS,
  type AiChannel,
  type AiChatTurnResult,
  type TokenUsage,
} from "@watesly-travel/ai-core";
import {
  TravelfusionFlightProvider,
  TravelportFlightProvider,
} from "@watesly-travel/provider-sdk";
import { otpDeliveryConfigured } from "../common/security-env";
import { PrismaService } from "../prisma/prisma.service";
import {
  getFlightProviderForOrg,
  getHotelProviderForOrg,
  getTransferProviderForOrg,
} from "../common/provider-runtime";
import { mergeOrgAiSettings, readOrgAiSettings, type OrgAiSettings } from "./org-ai-settings";
import { hotelCatalogEntry, serializeHotelDetailsForAi, serializeSearchResult } from "./tool-result-serializers";
import {
  hotelPickCard,
  hotelPickCustomerText,
  hotelResultPage,
  type HotelPick,
  type HotelPickLimit,
} from "./hotel-pick-list";
import {
  customerWantsHotelPhotos,
  pickHotelPhotoUrls,
  stripExternalLinks,
  type HotelPhotoSet,
} from "./hotel-photos";
import {
  choiceRows,
  hotelRoomSelection,
  roomChoiceBody,
  roomTermsPages,
  nextPhotoSlice,
  readAssistantState,
  transportItems,
  tripMemoryLine,
  type AssistantState,
  type HoldItem,
} from "./assistant-flow";
import { applyAiSellPrices, loadActivePricingRules } from "./apply-ai-sell-prices";
import {
  NEAREST_HOTEL_CANDIDATES,
  NEAREST_MIN_RESULTS,
  NEAREST_RADIUS_STEPS_KM,
  PRICE_LIST_HOTEL_CANDIDATES,
  hotelsWithinRadius,
  rankHotelOffers,
  resolveHotelSearchRank,
  type HotelSearchRank,
} from "./hotel-result-rank";
import type { HotelOffer, HotelPropertyDetails } from "@watesly-travel/shared";
import { chatTextForAi, parseChatAttachments } from "@watesly-travel/shared";

type HotelCatalogEntry = {
  id: string;
  name?: string;
  stars?: number;
  priceFrom?: number;
  currency?: string;
  distanceToCenterLabel?: string;
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
  lastShownCount?: number;
  rank?: HotelSearchRank;
};

function readHotelSearchContext(metadata: unknown): HotelSearchContext {
  if (!metadata || typeof metadata !== "object") return {};
  const row = metadata as { lastHotelSearch?: HotelSearchContext };
  return row.lastHotelSearch || {};
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
  /** Set when the customer tapped a hotel row. The id is the catalog hotel id. */
  hotelPickId?: string;
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
  hotelPicks?: HotelPick[];
  hotelPicksLimit?: HotelPickLimit;
  hotelCard?: {
    header: string;
    body: string;
    footer?: string;
    button: string;
    picks: HotelPick[];
    hasMore: boolean;
  };
  hotelPhotos?: HotelPhotoSet;
  morePhotos?: boolean;
  choiceLists?: Array<{
    header: string;
    body: string;
    button: string;
    rows: Array<{ id: string; title: string; description?: string }>;
    notes?: string[];
  }>;
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
  const all = args.all === true || String(args.all).toLowerCase() === "true";
  const offset = all ? 0 : Math.max(0, int(args.offset, 0));
  const limit = all
    ? PRICE_LIST_HOTEL_CANDIDATES
    : Math.min(10, Math.max(1, int(args.limit, defaultLimit)));
  return { limit, offset, all };
}

@Injectable()
export class TravelAiService {
  constructor(private readonly prisma: PrismaService) {}

  async turn(input: TravelAiTurnInput): Promise<TravelAiTurnResult> {
    if (input.channel === "web_chat") {
      await this.assertWebAssistantOpen(input.organizationId);
    }
    const thread = await this.resolveThread(input);
    const spoken = hotelPickCustomerText({
      text: input.text,
      hotelPickId: input.hotelPickId,
      hotels: readHotelSearchContext(thread.metadata).hotels,
    });
    await this.prisma.aiMessage.create({
      data: {
        threadId: thread.id,
        role: "user",
        content: spoken,
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

    const parsedUser = parseChatAttachments(spoken);
    const memory = tripMemoryLine(readAssistantState(thread.metadata));
    const userText = [memory, chatTextForAi(spoken)].filter(Boolean).join("\n") || "انظر إلى المرفق";
    const imageUrls = parsedUser.attachments
      .filter((row) => row.kind === "image")
      .map((row) => row.url);

    let result: AiChatTurnResult = await provider.respond({
      system: TRAVEL_SYSTEM_INSTRUCTIONS,
      userText,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      previousResponseId,
      tools,
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
      });
      usage = addUsage(usage, result.usage);
      model = result.model || model;
      lastId = result.responseId || lastId;
      if (result.text) text = result.text;
      previousResponseId = result.responseId || previousResponseId;
    }

    if (!text) {
      text = handoff
        ? "سأحوّلك الآن إلى موظف مختص."
        : "تم استلام رسالتك. هل يمكنك توضيح وجهتك وتاريخ السفر؟";
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

    let hotelPhotos: HotelPhotoSet | undefined;
    let morePhotos = false;
    const choiceLists: NonNullable<TravelAiTurnResult["choiceLists"]> = [];
    if (!handoff) {
      const fresh = await this.prisma.aiThread.findUnique({
        where: { id: thread.id },
        select: { metadata: true },
      });
      let assistant = readAssistantState(fresh?.metadata);
      if (customerWantsHotelPhotos(spoken)) {
        const slice = nextPhotoSlice(assistant.photos, /المزيد/.test(spoken));
        if (slice.urls.length && assistant.photos) {
          hotelPhotos = {
            hotelId: assistant.photos.hotelId,
            name: slice.name,
            urls: slice.urls,
          };
          morePhotos = slice.shown < assistant.photos.urls.length;
          assistant = {
            ...assistant,
            photos: { ...assistant.photos, shown: slice.shown },
          };
          const cleaned = stripExternalLinks(text) || `هذه صور ${slice.name}.`;
          if (cleaned !== text) {
            text = cleaned;
            if (lastId) {
              await this.prisma.aiMessage.updateMany({
                where: {
                  threadId: thread.id,
                  role: "assistant",
                  openaiResponseId: lastId,
                },
                data: { content: text },
              });
            }
          }
        }
      }
      const pending = new Set(assistant.pendingLists);
      if (pending.has("rooms") && assistant.rooms.length) {
        choiceLists.push({
          header: "الغرف",
          body: roomChoiceBody(assistant.roomsTruncated === true),
          button: "اختر الغرفة",
          rows: choiceRows(assistant.rooms),
          notes: roomTermsPages(
            assistant.rooms.slice(0, 10),
            3500,
          ).map((page, index, pages) =>
            assistant.roomsTruncated && index === pages.length - 1
              ? `${page}\n\nلبقية الأنواع اكتب اسم الغرفة، وتظهر شروطها مع طلب الحجز.`
              : page,
          ),
        });
      }
      if (pending.has("flights") && assistant.flights.length) {
        choiceLists.push({
          header: "الرحلات",
          body: "اضغط على الرحلة. بعدها يمكن إضافة فندق لنفس التواريخ.",
          button: "اختر الرحلة",
          rows: choiceRows(assistant.flights),
        });
      }
      if (pending.has("transfers") && assistant.transfers.length) {
        choiceLists.push({
          header: "التوصيل",
          body: "اضغط على التوصيل لإضافته إلى الطلب.",
          button: "اختر التوصيل",
          rows: choiceRows(assistant.transfers),
        });
      }
      if (assistant.pendingLists.length || hotelPhotos) {
        assistant = { ...assistant, pendingLists: [] };
        const meta =
          fresh?.metadata && typeof fresh.metadata === "object"
            ? { ...(fresh.metadata as Record<string, unknown>) }
            : {};
        meta.assistant = assistant;
        await this.prisma.aiThread.update({
          where: { id: thread.id },
          data: { metadata: asJson(meta) },
        });
      }
    }

    let hotelPicks: HotelPick[] | undefined;
    let hotelPicksLimit: HotelPickLimit | undefined;
    let hotelCard: TravelAiTurnResult["hotelCard"];
    if (
      !handoff &&
      toolsUsed.includes("search_hotels") &&
      !toolsUsed.includes("get_hotel_details")
    ) {
      const fresh = await this.prisma.aiThread.findUnique({
        where: { id: thread.id },
        select: { metadata: true },
      });
      const saved = readHotelSearchContext(fresh?.metadata);
      const page = hotelResultPage({
        hotels: saved.hotels,
        offset: saved.lastShownOffset,
      });
      if (page.picks.length) {
        hotelPicks = page.picks;
        hotelPicksLimit = page.hasMore ? "whatsapp" : null;
        hotelCard = {
          ...hotelPickCard({
            stay: saved,
            picks: page.picks,
            hasMore: page.hasMore,
          }),
          picks: page.picks,
          hasMore: page.hasMore,
        };
        if (
          saved.lastShownOffset !== page.offset ||
          saved.lastShownCount !== page.picks.length
        ) {
          await this.writeHotelWindow(thread.id, fresh?.metadata, page.offset, page.picks.length);
        }
      }
    }

    return {
      threadId: thread.id,
      message: text,
      hotelPicks,
      hotelPicksLimit,
      hotelCard,
      hotelPhotos,
      morePhotos,
      choiceLists,
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

  /** Next 10 hotels from the saved search, without another supplier search. */
  async advanceHotelPage(input: {
    organizationId: string;
    conversationId: string;
  }): Promise<
    | { exhausted: true }
    | {
        exhausted: false;
        card: NonNullable<TravelAiTurnResult["hotelCard"]>;
      }
    | null
  > {
    const thread = await this.findThread({
      organizationId: input.organizationId,
      channel: "whatsapp",
      conversationId: input.conversationId,
    });
    if (!thread) return null;
    const saved = readHotelSearchContext(thread.metadata);
    const hotels = saved.hotels || [];
    if (!hotels.length) return null;
    const offset = Math.max(0, (saved.lastShownOffset || 0) + (saved.lastShownCount || 0));
    const page = hotelResultPage({ hotels, offset });
    if (!page.picks.length) return { exhausted: true };
    await this.writeHotelWindow(thread.id, thread.metadata, page.offset, page.picks.length);
    return {
      exhausted: false,
      card: {
        ...hotelPickCard({ stay: saved, picks: page.picks, hasMore: page.hasMore }),
        picks: page.picks,
        hasMore: page.hasMore,
      },
    };
  }

  private async writeHotelWindow(
    threadId: string,
    metadata: unknown,
    offset: number,
    count: number,
  ) {
    const meta =
      metadata && typeof metadata === "object"
        ? { ...(metadata as Record<string, unknown>) }
        : {};
    const saved = readHotelSearchContext(meta);
    meta.lastHotelSearch = {
      ...saved,
      lastShownOffset: offset,
      lastShownCount: count,
    };
    await this.prisma.aiThread.update({
      where: { id: threadId },
      data: { metadata: asJson(meta) },
    });
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
        contact: {
          select: { id: true, name: true, waId: true, email: true },
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
    const parsed = await this.orgAiSettings(organizationId);
    return {
      defaultThreadCreditUsd: parsed.defaultThreadCreditUsd ?? null,
      assistantEnabled: parsed.assistantEnabled !== false,
      otpDelivery: otpDeliveryConfigured(),
    };
  }

  async assertWebAssistantOpen(organizationId: string) {
    const parsed = await this.orgAiSettings(organizationId);
    if (parsed.assistantEnabled === false) {
      throw new BadRequestException("المساعد متوقف من لوحة التشغيل");
    }
  }

  async setAiSettings(
    organizationId: string,
    input: { defaultThreadCreditUsd?: number | null; assistantEnabled?: boolean },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const next = mergeOrgAiSettings(org?.settings, {
      defaultThreadCreditUsd: input.defaultThreadCreditUsd,
      assistantEnabled: input.assistantEnabled,
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
      const handed = await this.prisma.aiThread.findFirst({
        where: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          status: "handed_off",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (handed) {
        return this.prisma.aiThread.update({
          where: { id: handed.id },
          data: { status: "open" },
        });
      }
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
      contact?: {
        name?: string | null;
        waId?: string | null;
        email?: string | null;
      } | null;
      messages?: Array<{ role?: string | null }>;
    },
    budget = computeBudget(thread),
  ) {
    const contactName = thread.contact?.name || null;
    const contactPhone = thread.contact?.waId || null;
    const contactEmail = thread.contact?.email || null;
    const lastRole = thread.messages?.[0]?.role || null;
    const waitingReply =
      thread.status === "open" && (lastRole === "user" || lastRole === "human");
    const bucket =
      thread.status === "handed_off"
        ? "handed_off"
        : budget.exhausted
          ? "exhausted"
          : waitingReply
            ? "waiting"
            : "open";
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
      contactName,
      contactPhone,
      contactEmail,
      customerLabel:
        thread.title || contactName || contactPhone || contactEmail || "محادثة جديدة",
      waitingReply,
      bucket,
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
        return this.toolSearchFlights(ctx.organizationId, args, thread.id);
      }
      if (name === "search_hotels") {
        return this.toolSearchHotels(ctx.organizationId, args, thread.id);
      }
      if (name === "get_hotel_details") {
        return this.toolGetHotelDetails(ctx.organizationId, args, thread);
      }
      if (name === "search_transfers") {
        return this.toolSearchTransfers(ctx.organizationId, args, thread.id);
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

  private async saveAssistant(
    threadId: string,
    update: (state: AssistantState) => void,
  ) {
    const existing = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      select: { metadata: true },
    });
    const meta =
      existing?.metadata && typeof existing.metadata === "object"
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    const state = readAssistantState(meta);
    update(state);
    meta.assistant = state;
    await this.prisma.aiThread.update({
      where: { id: threadId },
      data: { metadata: asJson(meta) },
    });
  }

  private async toolSearchFlights(
    organizationId: string,
    args: Record<string, unknown>,
    threadId?: string,
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
    const rules = await loadActivePricingRules(this.prisma, organizationId);
    const priced = applyAiSellPrices(rows, rules, "flight", {
      origin,
      destination,
      departDate,
      cabinClass: str(args.cabinClass) || "economy",
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
    });
    if (threadId) {
      const adults = Math.max(1, int(args.adults, 1));
      const children = Math.max(0, int(args.children, 0));
      const returnDate = str(args.returnDate);
      await this.saveAssistant(threadId, (state) => {
        state.trip = {
          ...state.trip,
          origin,
          destination,
          departDate,
          returnDate: returnDate || state.trip.returnDate,
          adults,
          children,
        };
        state.flights = transportItems(priced, "flight", 8);
        if (!state.pendingLists.includes("flights")) state.pendingLists.push("flights");
      });
    }
    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows: priced,
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
              ? "Travelport بانتظار TRAVELPORT_USER و TRAVELPORT_PASSWORD و TRAVELPORT_CLIENT_ID و TRAVELPORT_CLIENT_SECRET و TRAVELPORT_TARGET_BRANCH"
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

  private async searchHotelRows(
    provider: {
      searchHotels: (params: {
        location: string;
        checkInDate: string;
        checkOutDate: string;
        adults: number;
        children: number;
        rooms: number;
        currency: string;
        radiusKm?: number;
        maxHotels?: number;
      }) => Promise<HotelOffer[]>;
    },
    base: {
      location: string;
      checkInDate: string;
      checkOutDate: string;
      adults: number;
      children: number;
      rooms: number;
      currency: string;
    },
    rank: HotelSearchRank,
    all = false,
  ): Promise<HotelOffer[]> {
    if (rank !== "nearest") {
      return provider.searchHotels({
        ...base,
        ...(all ? { maxHotels: PRICE_LIST_HOTEL_CANDIDATES } : {}),
      });
    }

    let fallback: HotelOffer[] = [];
    for (let step = 0; step < NEAREST_RADIUS_STEPS_KM.length; step += 1) {
      const radiusKm = NEAREST_RADIUS_STEPS_KM[step]!;
      const batch = await provider.searchHotels({
        ...base,
        radiusKm,
        maxHotels: NEAREST_HOTEL_CANDIDATES,
      });
      const within = hotelsWithinRadius(batch, radiusKm);
      const lastStep = step === NEAREST_RADIUS_STEPS_KM.length - 1;
      if (within.length >= NEAREST_MIN_RESULTS || lastStep) {
        return within.length ? within : batch;
      }
      fallback = within.length ? within : batch;
    }
    return fallback;
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
    const sliceArgs = toolSliceArgs(args);
    const explicitSort = str(args.sort);
    let savedSearch: HotelSearchContext = {};
    let meta: Record<string, unknown> = {};
    if (threadId) {
      const existing = await this.prisma.aiThread.findUnique({
        where: { id: threadId },
        select: { metadata: true },
      });
      if (existing?.metadata && typeof existing.metadata === "object") {
        meta = { ...(existing.metadata as Record<string, unknown>) };
      }
      savedSearch = readHotelSearchContext(meta);
    }
    let rank = resolveHotelSearchRank(explicitSort, location);
    if (
      !explicitSort &&
      (sliceArgs.all || sliceArgs.offset > 0) &&
      savedSearch.location === location &&
      (savedSearch.rank === "nearest" || savedSearch.rank === "cheapest")
    ) {
      rank = savedSearch.rank;
    }

    const currency = await this.orgCurrency(organizationId);
    const searchBase = {
      location,
      checkInDate,
      checkOutDate,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
      rooms: Math.max(1, int(args.rooms, 1)),
      currency,
    };
    const rows = await this.searchHotelRows(
      provider,
      searchBase,
      rank,
      sliceArgs.all,
    );

    const rules = await loadActivePricingRules(this.prisma, organizationId);
    const priced = rankHotelOffers(
      applyAiSellPrices(rows, rules, "hotel", {
        city: location,
        checkIn: checkInDate,
        adults: Math.max(1, int(args.adults, 1)),
        children: Math.max(0, int(args.children, 0)),
        rooms: Math.max(1, int(args.rooms, 1)),
      }),
      rank,
    );
    if (threadId) {
      const catalog = priced.map((row) => hotelCatalogEntry(row as HotelOffer));
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
        lastShownCount: Math.min(
          sliceArgs.limit,
          Math.max(0, priced.length - sliceArgs.offset),
        ),
        rank,
      };
      const assistant = readAssistantState(meta);
      assistant.trip = {
        ...assistant.trip,
        location,
        checkInDate,
        checkOutDate,
        adults: Math.max(1, int(args.adults, 1)),
        children: Math.max(0, int(args.children, 0)),
      };
      meta.assistant = assistant;
      await this.prisma.aiThread.update({
        where: { id: threadId },
        data: { metadata: asJson(meta) },
      });
    }

    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows: priced,
      kind: "hotel",
      rankedBy: rank,
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

    const rules = await loadActivePricingRules(this.prisma, organizationId);
    const [priced] = applyAiSellPrices([match], rules, "hotel", {
      city: location,
      checkIn: checkInDate,
      adults: Math.max(1, int(args.adults, saved.adults ?? 1)),
      children: Math.max(0, int(args.children, saved.children ?? 0)),
      rooms: Math.max(1, int(args.rooms, saved.rooms ?? 1)),
    });
    const detailed = priced || match;
    const rawDetails = detailed.raw as HotelPropertyDetails | undefined;
    const photoUrls = pickHotelPhotoUrls(rawDetails?.images, 16);
    const photos: HotelPhotoSet = {
      hotelId: detailed.providerOfferRef,
      name: rawDetails?.name || hotelName || detailed.description,
      urls: photoUrls,
    };
    const roomSelection = hotelRoomSelection({
      providerKey: detailed.providerKey,
      providerOfferRef: detailed.providerOfferRef,
      description: detailed.description,
      costAmountMinor: detailed.costAmountMinor,
      sellAmountMinor: (detailed as { sellAmountMinor?: number }).sellAmountMinor,
      currency: detailed.currency,
      revalidationToken: detailed.revalidationToken,
      expiresAt: detailed.expiresAt,
      raw: detailed.raw,
    });
    await this.rememberHotelStay(
      thread.id,
      photos,
      roomSelection.all,
      roomSelection.truncated,
    );
    return serializeHotelDetailsForAi(detailed);
  }

  private async rememberHotelStay(
    threadId: string,
    photos: HotelPhotoSet,
    rooms: HoldItem[],
    roomsTruncated = false,
  ) {
    const existing = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      select: { metadata: true },
    });
    const meta =
      existing?.metadata && typeof existing.metadata === "object"
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    meta.lastHotelPhotos = photos;
    const assistant = readAssistantState(meta);
    assistant.photos = {
      hotelId: photos.hotelId,
      name: photos.name || "الفندق",
      urls: photos.urls,
      shown: 0,
    };
    assistant.rooms = rooms;
    assistant.roomsTruncated = roomsTruncated;
    if (rooms.length && !assistant.pendingLists.includes("rooms")) {
      assistant.pendingLists.push("rooms");
    }
    meta.assistant = assistant;
    await this.prisma.aiThread.update({
      where: { id: threadId },
      data: { metadata: asJson(meta) },
    });
  }

  private async toolSearchTransfers(
    organizationId: string,
    args: Record<string, unknown>,
    threadId?: string,
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
    const rules = await loadActivePricingRules(this.prisma, organizationId);
    const priced = applyAiSellPrices(rows, rules, "transfer", {
      city,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
    });
    if (threadId) {
      await this.saveAssistant(threadId, (state) => {
        state.transfers = transportItems(priced, "transfer", 8);
        if (!state.pendingLists.includes("transfers")) state.pendingLists.push("transfers");
      });
    }
    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows: priced,
      kind: "transfer",
      ...toolSliceArgs(args),
    });
  }
}
