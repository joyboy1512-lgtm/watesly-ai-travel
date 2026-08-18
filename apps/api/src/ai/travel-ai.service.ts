import { Injectable } from "@nestjs/common";
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
import { PrismaService } from "../prisma/prisma.service";
import {
  getFlightProviderForOrg,
  getHotelProviderForOrg,
  getTransferProviderForOrg,
} from "../common/provider-runtime";
import { hotelCatalogEntry, serializeHotelDetailsForAi, serializeSearchResult } from "./tool-result-serializers";
import type { HotelOffer } from "@watesly-travel/shared";

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
};

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

    let result: AiChatTurnResult = await provider.respond({
      system: TRAVEL_SYSTEM_INSTRUCTIONS,
      userText: input.text,
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
      data: { previousResponseId: lastId },
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

    if (handoff && input.conversationId) {
      await this.prisma.conversation.updateMany({
        where: {
          id: input.conversationId,
          organizationId: input.organizationId,
        },
        data: { assigneeType: "human", status: "pending" },
      });
      const inquiry = await this.prisma.travelInquiry.findFirst({
        where: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
        },
        orderBy: { createdAt: "desc" },
      });
      await this.prisma.handoff.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          inquiryId: inquiry?.id,
          reason: handoffReason || "ai_handoff",
          status: "open",
          contextSummary: text.slice(0, 500) || input.text.slice(0, 500),
        },
      });
      if (inquiry) {
        await this.prisma.travelInquiry.update({
          where: { id: inquiry.id },
          data: { status: "handed_off" },
        });
      }
      const agents = await this.prisma.membership.findMany({
        where: {
          organizationId: input.organizationId,
          status: "active",
          role: { code: { in: ["owner", "admin", "agent"] } },
        },
        select: { userId: true },
        take: 20,
      });
      if (agents.length) {
        await this.prisma.notification.createMany({
          data: agents.map((agent) => ({
            organizationId: input.organizationId,
            userId: agent.userId,
            type: "handoff",
            title: "تحويل من Travel AI إلى موظف",
            body: handoffReason || "حوّل المساعد المحادثة إلى موظف",
            linkRef: `/dashboard/conversations?id=${input.conversationId}`,
          })),
        });
      }
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
    return { thread, messages, tools: listToolAvailability() };
  }

  async listUsage(organizationId: string, take = 50) {
    return this.prisma.aiUsageLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
    });
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
    return this.prisma.aiThread.create({
      data: {
        organizationId: input.organizationId,
        channel: input.channel,
        userId: input.userId,
        contactId: input.contactId,
        conversationId: input.conversationId,
        externalRef: input.externalRef,
        metadata: asJson({ source: input.channel }),
      },
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
    const rows = await provider.searchHotels({
      location,
      checkInDate,
      checkOutDate,
      adults: Math.max(1, int(args.adults, 1)),
      children: Math.max(0, int(args.children, 0)),
      rooms: Math.max(1, int(args.rooms, 1)),
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

    const rows = await provider.searchHotels({
      location,
      checkInDate,
      checkOutDate,
      adults: Math.max(1, int(args.adults, saved.adults ?? 1)),
      children: Math.max(0, int(args.children, saved.children ?? 0)),
      rooms: Math.max(1, int(args.rooms, saved.rooms ?? 1)),
      hotelCode: hotelId,
      maxRoomsPerHotel: 50,
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
      process.env.TRANSFER_PROVIDER || "hotelbeds",
    );
    if (!provider.liveMode) {
      return JSON.stringify({
        disabled: true,
        reason: "بحث المواصلات غير مفعّل — ينقص HOTELBEDS_TRANSFER_API_KEY",
      });
    }
    const fromKind = str(args.fromKind) as "IATA" | "ATLAS" | "GPS" | "";
    const toKind = str(args.toKind) as "IATA" | "ATLAS" | "GPS" | "";
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
