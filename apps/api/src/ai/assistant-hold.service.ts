import { Injectable } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import type { PassportScanFields } from "@watesly-travel/ai-core";
import { PrismaService } from "../prisma/prisma.service";
import {
  ASSISTANT_HOLD_STATUS,
  applyNameFix,
  choiceRows,
  confirmAllTravelers,
  confirmLatestTraveler,
  confirmedTravelers,
  emptyAssistantState,
  holdBlockReason,
  holdCustomerMessage,
  hotelFollowUpText,
  nextPhotoSlice,
  readAssistantState,
  roomByTypedName,
  selectItem,
  transferFollowUpText,
  travelerFromPassport,
  travelerReview,
  travelerRoster,
  upsertTraveler,
  type AssistantAction,
  type AssistantState,
  type HoldItem,
} from "./assistant-flow";

export type AssistantUi = {
  replies: string[];
  list?: {
    header: string;
    body: string;
    button: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  };
  buttons?: { body: string; buttons: Array<{ id: string; title: string }> };
  photos?: { name: string; urls: string[] };
  followUpText?: string;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class AssistantHoldService {
  constructor(private readonly prisma: PrismaService) {}

  async isAwaitingPassport(organizationId: string, conversationId: string): Promise<boolean> {
    const thread = await this.threadFor({ organizationId, conversationId, create: false });
    if (!thread) return false;
    return readAssistantState(thread.metadata).awaitingPassport;
  }

  async hasGallery(organizationId: string, conversationId: string): Promise<boolean> {
    const thread = await this.threadFor({
      organizationId,
      conversationId,
      create: false,
    });
    if (!thread) return false;
    return (readAssistantState(thread.metadata).photos?.urls.length || 0) > 0;
  }

  async readState(threadId: string): Promise<AssistantState> {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      select: { metadata: true },
    });
    return readAssistantState(thread?.metadata);
  }

  async writeState(threadId: string, state: AssistantState) {
    const existing = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      select: { metadata: true },
    });
    const meta =
      existing?.metadata && typeof existing.metadata === "object"
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    meta.assistant = state;
    await this.prisma.aiThread.update({
      where: { id: threadId },
      data: { metadata: asJson(meta) },
    });
  }

  private async threadFor(input: {
    organizationId: string;
    conversationId: string;
    contactId?: string;
    create: boolean;
  }) {
    const existing = await this.prisma.aiThread.findFirst({
      where: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        status: { in: ["open", "handed_off"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) {
      if (existing.status !== "open") {
        return this.prisma.aiThread.update({
          where: { id: existing.id },
          data: { status: "open" },
        });
      }
      return existing;
    }
    if (!input.create) return null;
    return this.prisma.aiThread.create({
      data: {
        organizationId: input.organizationId,
        channel: "whatsapp",
        conversationId: input.conversationId,
        contactId: input.contactId,
        metadata: asJson({ assistant: emptyAssistantState() }),
      },
    });
  }

  async apply(input: {
    organizationId: string;
    conversationId: string;
    contactId?: string;
    action?: AssistantAction;
    text?: string;
    passport?: PassportScanFields | null;
    passportFailed?: boolean;
  }): Promise<AssistantUi | null> {
    const wantsThread = Boolean(input.action || input.passport || input.passportFailed);
    const thread = await this.threadFor({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      create: wantsThread,
    });
    if (!thread) return null;
    let state = readAssistantState(thread.metadata);

    if (input.passportFailed) {
      return {
        replies: ["تعذر قراءة الجواز. أرسل صورة أوضح لصفحة البيانات."],
      };
    }
    if (input.passport) {
      const traveler = travelerFromPassport(input.passport, state.travelers.length);
      if (!traveler) {
        return { replies: ["لم أجد اسماً في الصورة. أرسل صورة صفحة الجواز كاملة."] };
      }
      state = upsertTraveler(state, traveler);
      await this.writeState(thread.id, state);
      const latest = state.travelers[state.travelers.length - 1]!;
      return {
        replies: [travelerReview(latest)],
        buttons: {
          body: "راجع الاسم ثم اختر",
          buttons: [
            { id: "traveler:ok", title: "الاسم صحيح" },
            { id: "traveler:fix", title: "الاسم غير صحيح" },
          ],
        },
      };
    }

    if (state.awaitingNameFix && input.text && !input.action) {
      state = applyNameFix(state, input.text);
      await this.writeState(thread.id, state);
      const latest = state.travelers[state.travelers.length - 1];
      if (!latest) return { replies: ["أرسل صورة الجواز مرة أخرى."] };
      return {
        replies: [travelerReview(latest)],
        buttons: {
          body: "راجع الاسم بعد التصحيح",
          buttons: [
            { id: "traveler:ok", title: "الاسم صحيح" },
            { id: "traveler:fix", title: "الاسم غير صحيح" },
          ],
        },
      };
    }

    if (!input.action && input.text && state.roomsTruncated) {
      const named = roomByTypedName(state.rooms.slice(10), input.text);
      const index = named
        ? state.rooms.findIndex((row) => row.pickId === named.pickId)
        : -1;
      if (index >= 0) input.action = { kind: "room", index };
    }

    if (!input.action) return null;

    if (input.action.kind === "photo") {
      return this.photos(thread.id, state, input.action.more);
    }
    if (input.action.kind === "traveler-fix") {
      state = { ...state, awaitingNameFix: true };
      await this.writeState(thread.id, state);
      return { replies: ["اكتب الاسم كما هو في الجواز، الاسم الأول ثم اسم العائلة."] };
    }
    if (input.action.kind === "traveler-another") {
      state = { ...state, awaitingPassport: true };
      await this.writeState(thread.id, state);
      return { replies: ["أرسل صورة جواز المسافر التالي."] };
    }
    if (input.action.kind === "traveler-ok") {
      state = confirmLatestTraveler(state);
      await this.writeState(thread.id, state);
      return {
        replies: [`تم اعتماد الاسم.\n${travelerRoster(state)}`],
        buttons: {
          body: "مسافر آخر أم نعتمد هذه الأسماء؟",
          buttons: [
            { id: "traveler:another", title: "جواز آخر" },
            { id: "traveler:confirm", title: "اعتمد الأسماء" },
          ],
        },
      };
    }
    if (input.action.kind === "traveler-confirm") {
      state = confirmAllTravelers(state);
      await this.writeState(thread.id, state);
      return this.finishHold(input, thread.id, state);
    }
    if (input.action.kind === "trip-hotel") {
      return { replies: ["سأبحث عن فندق لنفس تواريخ الرحلة."], followUpText: hotelFollowUpText(state) };
    }
    if (input.action.kind === "trip-transfer") {
      return { replies: ["سأبحث عن توصيل المطار."], followUpText: transferFollowUpText(state) };
    }
    if (input.action.kind === "trip-flight-only") {
      state = { ...state, selected: state.selected.filter((row) => row.serviceType === "flight") };
      await this.writeState(thread.id, state);
      return this.finishHold(input, thread.id, state);
    }
    if (input.action.kind === "trip-no-transfer") {
      state = { ...state, selected: state.selected.filter((row) => row.serviceType !== "transfer") };
      await this.writeState(thread.id, state);
      return this.finishHold(input, thread.id, state);
    }

    if (
      input.action.kind !== "room" &&
      input.action.kind !== "flight" &&
      input.action.kind !== "transfer"
    ) {
      return null;
    }
    const pool =
      input.action.kind === "room"
        ? state.rooms
        : input.action.kind === "flight"
          ? state.flights
          : state.transfers;
    const item = pool[input.action.index];
    if (!item) return { replies: ["هذا الخيار لم يعد متاحاً. اطلب القائمة من جديد."] };
    state = selectItem(state, item);
    await this.writeState(thread.id, state);
    const price = item.description;
    if (input.action.kind === "flight") {
      return {
        replies: [
          `تم اختيار الرحلة: ${price}`,
          "هل نضيف فندقاً في وجهة الوصول لنفس التواريخ؟ الطلب لن يُؤكَّد إلا بعد مراجعة الموظف.",
        ],
        buttons: {
          body: "أضف فندقاً أو ثبّت الرحلة فقط",
          buttons: [
            { id: "trip:hotel", title: "أضف فندقاً" },
            { id: "trip:flight-only", title: "بدون فندق" },
          ],
        },
      };
    }
    if (input.action.kind === "room") {
      const hasFlight = state.selected.some((row) => row.serviceType === "flight");
      if (hasFlight) {
        return {
          replies: [`تم اختيار الغرفة: ${price}`, "هل نضيف توصيل المطار إلى الفندق؟"],
          buttons: {
            body: "التوصيل اختياري",
            buttons: [
              { id: "trip:transfer", title: "أضف توصيلاً" },
              { id: "trip:no-transfer", title: "بدون توصيل" },
            ],
          },
        };
      }
      return this.finishHold(input, thread.id, state);
    }
    return this.finishHold(input, thread.id, state);
  }

  private async photos(threadId: string, state: AssistantState, more: boolean): Promise<AssistantUi> {
    const slice = nextPhotoSlice(state.photos, more);
    if (!state.photos?.urls.length) {
      return { replies: ["اختر الفندق أولاً، ثم اطلب صوره."] };
    }
    if (slice.exhausted || !slice.urls.length) {
      return { replies: ["هذه كل صور الفندق المتوفرة لدينا."] };
    }
    await this.writeState(threadId, {
      ...state,
      photos: { ...state.photos, shown: slice.shown },
    });
    const moreLeft = slice.shown < state.photos.urls.length;
    return {
      replies: [`هذه صور ${slice.name}.`],
      photos: { name: slice.name, urls: slice.urls },
      buttons: moreLeft
        ? { body: "المزيد من صور الفندق", buttons: [{ id: "photo:more", title: "صور أكثر" }] }
        : undefined,
    };
  }

  private async finishHold(
    input: { organizationId: string; conversationId: string; contactId?: string },
    threadId: string,
    state: AssistantState,
  ): Promise<AssistantUi> {
    if (state.holdBookingId) {
      return {
        replies: ["طلب الحجز مسجّل وبانتظار تأكيد الموظف. لن يُؤكَّد قبل مراجعته."],
      };
    }
    const block = holdBlockReason(state);
    if (block) {
      await this.writeState(threadId, { ...state, awaitingPassport: !confirmedTravelers(state).length });
      return {
        replies: state.travelers.length ? [block, travelerRoster(state)] : [block],
        buttons: confirmedTravelers(state).length
          ? {
              body: "اعتمد الأسماء لتسجيل الطلب",
              buttons: [{ id: "traveler:confirm", title: "اعتمد الأسماء" }],
            }
          : undefined,
      };
    }
    const bookingId = await this.createHold({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      items: state.selected,
      travelers: confirmedTravelers(state),
    });
    await this.writeState(threadId, { ...state, holdBookingId: bookingId, awaitingPassport: false });
    return { replies: [holdCustomerMessage(state.selected)] };
  }

  private async createHold(input: {
    organizationId: string;
    conversationId: string;
    contactId?: string;
    items: HoldItem[];
    travelers: AssistantState["travelers"];
  }): Promise<string> {
    let inquiry = await this.prisma.travelInquiry.findFirst({
      where: { organizationId: input.organizationId, conversationId: input.conversationId },
      orderBy: { createdAt: "desc" },
    });
    if (!inquiry) {
      inquiry = await this.prisma.travelInquiry.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          contactId: input.contactId,
          source: "whatsapp",
          status: "quoted",
          adults: Math.max(1, input.travelers.length),
          serviceTypes: asJson([...new Set(input.items.map((item) => item.serviceType))]),
        },
      });
    }
    const currency = input.items[0]?.currency || "KWD";
    const cost = input.items.reduce((sum, item) => sum + item.costAmountMinor, 0);
    const sell = input.items.reduce((sum, item) => sum + item.sellAmountMinor, 0);
    const quote = await this.prisma.quote.create({
      data: {
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        conversationId: input.conversationId,
        contactId: input.contactId,
        status: "sent",
        currency,
        totalCostAmount: cost,
        totalSellAmount: sell,
        totalProfitAmount: sell - cost,
        customerVisiblePayload: asJson({
          summary: input.items.map((item) => item.description).join(" · "),
          awaitingStaff: true,
          assistantHold: true,
        }),
        items: {
          create: input.items.map((item) => ({
            organizationId: input.organizationId,
            serviceType: item.serviceType,
            providerKey: item.providerKey,
            providerOfferRef: item.providerOfferRef,
            description: item.description,
            costAmount: item.costAmountMinor,
            sellAmount: item.sellAmountMinor,
            profitAmount: item.sellAmountMinor - item.costAmountMinor,
            rawOfferSnapshot: asJson(item.snapshot),
            revalidationToken: item.revalidationToken,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          })),
        },
      },
    });
    const request = await this.prisma.bookingRequest.create({
      data: {
        organizationId: input.organizationId,
        quoteId: quote.id,
        status: "ready_to_book",
        requestedBy: "customer",
        notes: "طلب من المساعد بانتظار تأكيد الموظف. لم يُؤكَّد ولم يُصدر.",
      },
    });
    const booking = await this.prisma.booking.create({
      data: {
        organizationId: input.organizationId,
        bookingRequestId: request.id,
        quoteId: quote.id,
        status: ASSISTANT_HOLD_STATUS,
        totalCostAmount: cost,
        totalSellAmount: sell,
        totalProfitAmount: sell - cost,
        requiresApproval: true,
        passengerDetails: asJson({
          travelers: input.travelers,
          shopLifecycle: "awaiting_staff",
          assistantHold: true,
        }),
      },
    });
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
          type: "booking",
          title: "طلب حجز بانتظار التأكيد",
          body: input.items.map((item) => item.description).join(" · ").slice(0, 240),
          linkRef: `/dashboard/bookings/${booking.id}`,
        })),
      });
    }
    return booking.id;
  }
}
