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
import { serializeSearchResult } from "./tool-result-serializers";

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

function toolSliceArgs(args: Record<string, unknown>) {
  const limit = Math.min(20, Math.max(1, int(args.limit, 10)));
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
        const output = await this.executeTool(call.name, call.arguments, input).catch(
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
        return this.toolSearchHotels(ctx.organizationId, args);
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
    return serializeSearchResult({
      liveMode: provider.liveMode,
      provider: provider.displayName,
      rows,
      kind: "hotel",
      ...toolSliceArgs(args),
    });
  }
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
