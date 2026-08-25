import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import { createAiProvider } from "@watesly-travel/ai-core";
import {
  sendChannelMedia,
  sendChannelText,
  sendWhatsAppTemplate,
  usesCustomerServiceWindow,
} from "@watesly-travel/whatsapp-core";
import { searchAndPriceTravel } from "@watesly-travel/travel-core";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { TravelAiService } from "../ai/travel-ai.service";
import { getHotelProviderForOrg } from "../common/provider-runtime";
import { formatMoneyMinor } from "../common/money";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const OPTION_LABELS = ["أ", "ب", "ج", "د", "هـ"] as const;

type PricedRow = Awaited<
  ReturnType<typeof searchAndPriceTravel>
>["flights"][number];

@Injectable()
export class BotPipelineService {
  private readonly ai = createAiProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly travelAi: TravelAiService,
  ) {}

  async handleInboundText(input: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    messageId: string;
    text: string;
  }) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        organizationId: input.organizationId,
      },
      include: { whatsappAccount: true, contact: true },
    });
    if (!conversation) return;

    if (conversation.assigneeType === "human") {
      return { mode: "human" as const };
    }

    const channel =
      conversation.whatsappAccount?.channelType === "telegram"
        ? "telegram"
        : "whatsapp";

    try {
      const aiResult = await this.travelAi.turn({
        organizationId: input.organizationId,
        channel,
        text: input.text,
        contactId: input.contactId,
        conversationId: input.conversationId,
      });
      await this.replyToConversation({
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        body: aiResult.message,
        skipWindowCheck: true,
      });
      await this.syncInquiryFromInbound(input).catch((err) => {
        console.error("[pipeline] inquiry sync after AI", err);
      });
      return {
        mode: aiResult.handoff ? ("handoff" as const) : ("ai" as const),
        threadId: aiResult.threadId,
        toolsUsed: aiResult.toolsUsed,
      };
    } catch (err) {
      console.error("[pipeline] Travel AI failed, using extract fallback", err);
    }

    let inquiry = await this.prisma.travelInquiry.findFirst({
      where: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        status: { in: ["collecting", "ready_to_search", "searched"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!inquiry) {
      inquiry = await this.prisma.travelInquiry.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          contactId: input.contactId,
          source: "whatsapp",
          status: "collecting",
          adults: 1,
        },
      });
    }

    const started = Date.now();
    const extraction = await this.ai.extractTravelIntent({
      messageText: input.text,
      current: {
        origin: inquiry.origin,
        destination: inquiry.destination,
        departDate: inquiry.departDate
          ? inquiry.departDate.toISOString().slice(0, 10)
          : null,
        returnDate: inquiry.returnDate
          ? inquiry.returnDate.toISOString().slice(0, 10)
          : null,
        adults: inquiry.adults,
        children: inquiry.children,
        infants: inquiry.infants,
        cabinClass: inquiry.cabinClass,
        budgetAmount: inquiry.budgetAmount,
        budgetCurrency: inquiry.budgetCurrency,
        preferences: inquiry.preferences,
        serviceTypes: (inquiry.serviceTypes as string[] | null) as
          | ("flight" | "hotel")[]
          | null,
      },
    });

    await this.prisma.aiInteractionLog.create({
      data: {
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        conversationId: input.conversationId,
        messageId: input.messageId,
        provider: extraction.provider,
        model: extraction.model,
        outputJson: asJson({
          fields: extraction.fields,
          missingFields: extraction.missingFields,
          readyToSearch: extraction.readyToSearch,
          prices: extraction.prices,
        }),
        latencyMs: Date.now() - started,
        success: true,
      },
    });

    inquiry = await this.prisma.travelInquiry.update({
      where: { id: inquiry.id },
      data: {
        origin: extraction.fields.origin ?? inquiry.origin,
        destination: extraction.fields.destination ?? inquiry.destination,
        departDate: extraction.fields.departDate
          ? new Date(extraction.fields.departDate)
          : inquiry.departDate,
        returnDate: extraction.fields.returnDate
          ? new Date(extraction.fields.returnDate)
          : inquiry.returnDate,
        adults: extraction.fields.adults ?? inquiry.adults,
        children: extraction.fields.children ?? inquiry.children,
        infants: extraction.fields.infants ?? inquiry.infants,
        cabinClass: extraction.fields.cabinClass ?? inquiry.cabinClass,
        budgetAmount: extraction.fields.budgetAmount ?? inquiry.budgetAmount,
        budgetCurrency:
          extraction.fields.budgetCurrency ?? inquiry.budgetCurrency,
        preferences: extraction.fields.preferences ?? inquiry.preferences,
        serviceTypes: asJson(
          extraction.fields.serviceTypes ?? inquiry.serviceTypes ?? null,
        ),
        missingFields: asJson(extraction.missingFields),
        aiSummary: extraction.summary,
        rawExtraction: asJson(extraction),
        status: extraction.readyToSearch ? "ready_to_search" : "collecting",
      },
    });

    if (!extraction.readyToSearch && extraction.nextQuestion) {
      await this.replyToConversation({
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        body: extraction.nextQuestion,
      });
      return { mode: "collecting" as const, inquiryId: inquiry.id };
    }

    const result = await this.searchAndCreateQuote({
      organizationId: input.organizationId,
      inquiryId: inquiry.id,
      sendToCustomer: true,
      includeHotels: true,
    });

    return {
      mode: "quoted" as const,
      inquiryId: inquiry.id,
      quoteId: result.quote.id,
    };
  }

  /** Keep CRM inquiry + optional silent quote so WhatsApp accept still works. */
  private async syncInquiryFromInbound(input: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    messageId: string;
    text: string;
  }) {
    let inquiry = await this.prisma.travelInquiry.findFirst({
      where: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        status: { in: ["collecting", "ready_to_search", "searched"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!inquiry) {
      inquiry = await this.prisma.travelInquiry.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          contactId: input.contactId,
          source: "whatsapp",
          status: "collecting",
          adults: 1,
        },
      });
    }

    const started = Date.now();
    const extraction = await this.ai.extractTravelIntent({
      messageText: input.text,
      current: {
        origin: inquiry.origin,
        destination: inquiry.destination,
        departDate: inquiry.departDate
          ? inquiry.departDate.toISOString().slice(0, 10)
          : null,
        returnDate: inquiry.returnDate
          ? inquiry.returnDate.toISOString().slice(0, 10)
          : null,
        adults: inquiry.adults,
        children: inquiry.children,
        infants: inquiry.infants,
        cabinClass: inquiry.cabinClass,
        budgetAmount: inquiry.budgetAmount,
        budgetCurrency: inquiry.budgetCurrency,
        preferences: inquiry.preferences,
        serviceTypes: (inquiry.serviceTypes as string[] | null) as
          | ("flight" | "hotel")[]
          | null,
      },
    });

    await this.prisma.aiInteractionLog.create({
      data: {
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        conversationId: input.conversationId,
        messageId: input.messageId,
        provider: extraction.provider,
        model: extraction.model,
        outputJson: asJson({
          fields: extraction.fields,
          missingFields: extraction.missingFields,
          readyToSearch: extraction.readyToSearch,
          prices: extraction.prices,
        }),
        latencyMs: Date.now() - started,
        success: true,
      },
    });

    inquiry = await this.prisma.travelInquiry.update({
      where: { id: inquiry.id },
      data: {
        origin: extraction.fields.origin ?? inquiry.origin,
        destination: extraction.fields.destination ?? inquiry.destination,
        departDate: extraction.fields.departDate
          ? new Date(extraction.fields.departDate)
          : inquiry.departDate,
        returnDate: extraction.fields.returnDate
          ? new Date(extraction.fields.returnDate)
          : inquiry.returnDate,
        adults: extraction.fields.adults ?? inquiry.adults,
        children: extraction.fields.children ?? inquiry.children,
        infants: extraction.fields.infants ?? inquiry.infants,
        cabinClass: extraction.fields.cabinClass ?? inquiry.cabinClass,
        budgetAmount: extraction.fields.budgetAmount ?? inquiry.budgetAmount,
        budgetCurrency:
          extraction.fields.budgetCurrency ?? inquiry.budgetCurrency,
        preferences: extraction.fields.preferences ?? inquiry.preferences,
        serviceTypes: asJson(
          extraction.fields.serviceTypes ?? inquiry.serviceTypes ?? null,
        ),
        missingFields: asJson(extraction.missingFields),
        aiSummary: extraction.summary,
        rawExtraction: asJson(extraction),
        status: extraction.readyToSearch ? "ready_to_search" : "collecting",
      },
    });

    if (!extraction.readyToSearch) return inquiry;
    try {
      await this.searchAndCreateQuote({
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        sendToCustomer: false,
        includeHotels: true,
      });
    } catch (err) {
      console.error("[pipeline] silent quote after AI", err);
    }
    return inquiry;
  }

  async searchAndCreateQuote(input: {
    organizationId: string;
    inquiryId: string;
    sendToCustomer?: boolean;
    createdByUserId?: string;
    includeHotels?: boolean;
  }) {
    const inquiry = await this.prisma.travelInquiry.findFirst({
      where: { id: input.inquiryId, organizationId: input.organizationId },
    });
    if (!inquiry?.departDate) {
      throw new Error("بيانات الاستعلام غير مكتملة للبحث");
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { defaultCurrency: true },
    });
    const searchCurrency =
      inquiry.budgetCurrency ||
      organization?.defaultCurrency ||
      process.env.DEFAULT_CURRENCY ||
      "KWD";

    const provider = await this.prisma.travelProviderConfig.findFirst({
      where: {
        organizationId: input.organizationId,
        enabled: true,
      },
      orderBy: { priority: "asc" },
    });

    const rules = await this.prisma.pricingRule.findMany({
      where: { organizationId: input.organizationId, isActive: true },
      orderBy: { priority: "asc" },
    });

    const serviceTypes = Array.isArray(inquiry.serviceTypes)
      ? (inquiry.serviceTypes as string[])
      : [];
    if (serviceTypes.length === 0) {
      throw new BadRequestException(
        "حدد نوع الخدمة: تذاكر طيران، فنادق، أو طيران وفنادق",
      );
    }
    const wantHotels =
      input.includeHotels ??
      (serviceTypes.includes("hotel") || serviceTypes.includes("package"));
    const wantFlights =
      serviceTypes.includes("flight") || serviceTypes.includes("package");

    if (wantFlights && (!inquiry.origin || !inquiry.destination)) {
      throw new Error("بيانات الطيران غير مكتملة (المغادرة والوجهة)");
    }
    if (wantHotels && !inquiry.destination && !inquiry.preferences) {
      throw new Error("حدد مدينة أو دولة أو اسم فندق للبحث عن الإقامات");
    }

    const departDate = inquiry.departDate.toISOString().slice(0, 10);
    const returnDate = inquiry.returnDate
      ? inquiry.returnDate.toISOString().slice(0, 10)
      : null;
    const hotelCheckOut =
      returnDate ||
      new Date(inquiry.departDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

    let hotelLocation = inquiry.destination || inquiry.origin || "";
    let hotelRooms = 1;
    let childrenAges: string | undefined;
    let shiftDays: number | undefined;
    let minRate: number | undefined;
    let maxRate: number | undefined;
    let boardCode: string | undefined;
    let paymentType: string | undefined;
    if (inquiry.preferences?.trim()) {
      try {
        const pref = JSON.parse(inquiry.preferences) as {
          query?: string;
          rooms?: number;
          preferredHotel?: string;
          childrenAges?: string;
          shiftDays?: number;
          minRate?: number;
          maxRate?: number;
          boardCode?: string;
          paymentType?: string;
        };
        hotelLocation =
          pref.query ||
          pref.preferredHotel ||
          inquiry.preferences ||
          hotelLocation;
        if (pref.rooms && pref.rooms > 0) hotelRooms = pref.rooms;
        if (pref.childrenAges?.trim()) childrenAges = pref.childrenAges.trim();
        if (pref.shiftDays && pref.shiftDays > 0) shiftDays = pref.shiftDays;
        if (pref.minRate && pref.minRate > 0) minRate = pref.minRate;
        if (pref.maxRate && pref.maxRate > 0) maxRate = pref.maxRate;
        if (pref.boardCode?.trim()) boardCode = pref.boardCode.trim();
        if (pref.paymentType?.trim()) paymentType = pref.paymentType.trim();
      } catch {
        hotelLocation = inquiry.preferences.trim();
      }
    }

    const hotelProviderKey =
      process.env.HOTEL_PROVIDER ||
      provider?.providerKey ||
      process.env.TRAVEL_DEFAULT_PROVIDER ||
      "mock";
    const hotelProvider = wantHotels
      ? await getHotelProviderForOrg(
          this.prisma,
          input.organizationId,
          hotelProviderKey,
        )
      : undefined;

    // Flight/hotel providers resolve independently via FLIGHT_PROVIDER / HOTEL_PROVIDER.
    // Org-level credentials from /dashboard/providers override env when configured.
    const search = await searchAndPriceTravel({
      flightProviderKey:
        process.env.FLIGHT_PROVIDER ||
        provider?.providerKey ||
        process.env.TRAVEL_DEFAULT_PROVIDER ||
        "mock",
      hotelProviderKey,
      hotelProvider,
      rules,
      searchFlights: wantFlights,
      searchHotels: wantHotels,
      flightParams:
        wantFlights && inquiry.origin && inquiry.destination
          ? {
              origin: inquiry.origin,
              destination: inquiry.destination,
              departDate,
              returnDate,
              adults: inquiry.adults,
              children: inquiry.children,
              infants: inquiry.infants,
              cabinClass: inquiry.cabinClass,
              currency: searchCurrency,
            }
          : undefined,
      hotelParams: wantHotels
        ? {
            location: hotelLocation,
            checkInDate: departDate,
            checkOutDate: hotelCheckOut,
            adults: inquiry.adults,
            children: inquiry.children + Math.max(0, inquiry.infants || 0),
            childrenAges: (() => {
              const childCount = Math.max(0, inquiry.children || 0);
              const infantCount = Math.max(0, inquiry.infants || 0);
              const parsed = (childrenAges || "")
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean);
              const ages = parsed.slice(0, childCount);
              while (ages.length < childCount) ages.push("6");
              for (let i = 0; i < infantCount; i += 1) ages.push("1");
              return ages.length ? ages.join(",") : undefined;
            })(),
            rooms: hotelRooms,
            currency: searchCurrency,
            shiftDays,
            minRate,
            maxRate,
            boardCode,
            paymentType,
          }
        : undefined,
    });

    if (!search.flights.length && !search.hotels.length) {
      throw new Error(
        search.hotelError || "لا توجد عروض متاحة من مزود السفر",
      );
    }

    const sortedFlights = [...search.flights].sort(
      (a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor,
    );
    const sortedHotels = [...search.hotels].sort(
      (a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor,
    );

    // Each item is a selectable option — never sum unrelated offers into one price.
    const optionRows: PricedRow[] = [
      ...sortedFlights.slice(0, 3),
      ...sortedHotels.slice(0, 2),
    ].slice(0, 5);

    const primary = optionRows[0];
    if (!primary) {
      throw new Error("لا توجد عروض متاحة من مزود السفر");
    }

    const expiresAt = new Date(
      Math.min(
        ...optionRows.map((row) => new Date(row.offer.expiresAt).getTime()),
      ),
    );

    const options = optionRows.map((row, index) => ({
      label: OPTION_LABELS[index] || String(index + 1),
      itemIndex: index,
      serviceType: row.serviceType,
      description: row.offer.description,
      sellAmountMinor: row.pricing.sellAmountMinor,
      currency: row.pricing.currency,
      providerOfferRef: row.offer.providerOfferRef,
    }));

    const noteParts = [
      wantFlights
        ? `طيران: ${search.flightProviderName}${search.flightLiveMode ? " (مباشر)" : ""}`
        : null,
      wantHotels
        ? `فنادق: ${search.hotelProviderName}${search.hotelLiveMode ? " (مباشر)" : ""}`
        : null,
    ].filter(Boolean);
    const note = noteParts.length
      ? `نتائج من ${noteParts.join(" · ")} — الأسعار للبيع فقط`
      : "نتائج البحث";

    const customerVisible = {
      summary: options.map((o) => `${o.label}) ${o.description}`).join(" · "),
      note,
      options,
      selectedLabel: options[0]?.label || "أ",
      selectedItemIndex: 0,
      sellAmountMinor: primary.pricing.sellAmountMinor,
      currency: primary.pricing.currency,
      flightsCount: search.flights.length,
      hotelsCount: search.hotels.length,
      providerKey: search.providerKey,
      flightProviderKey: search.flightProviderKey,
      hotelProviderKey: search.hotelProviderKey,
      liveMode: search.liveMode,
    };

    const quote = await this.prisma.quote.create({
      data: {
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        conversationId: inquiry.conversationId,
        contactId: inquiry.contactId,
        status: "draft",
        currency: primary.pricing.currency,
        // Totals reflect the default selected option only (cheapest first).
        totalCostAmount: primary.pricing.costAmountMinor,
        totalSellAmount: primary.pricing.sellAmountMinor,
        totalProfitAmount: primary.pricing.profitAmountMinor,
        pricingRuleId: primary.pricing.pricingRuleId,
        expiresAt,
        customerVisiblePayload: asJson(customerVisible),
        createdByUserId: input.createdByUserId,
        items: {
          create: optionRows.map((row) => ({
            organizationId: input.organizationId,
            serviceType: row.serviceType,
            providerKey: row.offer.providerKey,
            providerOfferRef: row.offer.providerOfferRef,
            description: row.offer.description,
            costAmount: row.pricing.costAmountMinor,
            sellAmount: row.pricing.sellAmountMinor,
            profitAmount: row.pricing.profitAmountMinor,
            pricingBreakdown: asJson(row.pricing),
            rawOfferSnapshot: asJson(row.offer.raw),
            revalidationToken: row.offer.revalidationToken,
            expiresAt: new Date(row.offer.expiresAt),
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.travelInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: "quoted",
        serviceTypes: asJson(wantHotels ? ["flight", "hotel"] : ["flight"]),
        rawExtraction: asJson({
          providerKey: search.providerKey,
          flightProviderKey: search.flightProviderKey,
          hotelProviderKey: search.hotelProviderKey,
          liveMode: search.liveMode,
          hotelError: search.hotelError,
          flightsFound: search.flights.length,
          hotelsFound: search.hotels.length,
          optionsOffered: options.length,
        }),
      },
    });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.createdByUserId,
      action: "quotes.create",
      entityType: "Quote",
      entityId: quote.id,
      after: {
        sell: quote.totalSellAmount,
        currency: quote.currency,
        provider: search.providerKey,
        options: options.length,
      },
    });

    if (input.sendToCustomer && inquiry.conversationId) {
      await this.sendQuote(
        quote.id,
        input.organizationId,
        input.createdByUserId,
      );
    }

    return {
      quote,
      providerKey: search.providerKey,
      providerName: search.providerName,
      liveMode: search.liveMode,
      flightProviderKey: search.flightProviderKey,
      flightProviderName: search.flightProviderName,
      flightLiveMode: search.flightLiveMode,
      hotelProviderKey: search.hotelProviderKey,
      hotelProviderName: search.hotelProviderName,
      hotelLiveMode: search.hotelLiveMode,
      hotelError: search.hotelError,
      flights: sortedFlights.map((row) => ({
        id: row.offer.providerOfferRef,
        serviceType: "flight" as const,
        description: row.offer.description,
        sellAmountMinor: row.pricing.sellAmountMinor,
        costAmountMinor: row.pricing.costAmountMinor,
        profitAmountMinor: row.pricing.profitAmountMinor,
        currency: row.pricing.currency,
        pricingRuleId: row.pricing.pricingRuleId,
        pricingRuleName: row.pricing.pricingRuleName,
        expiresAt: row.offer.expiresAt,
        details: row.offer.raw,
      })),
      hotels: sortedHotels.map((row) => ({
        id: row.offer.providerOfferRef,
        serviceType: "hotel" as const,
        description: row.offer.description,
        sellAmountMinor: row.pricing.sellAmountMinor,
        costAmountMinor: row.pricing.costAmountMinor,
        profitAmountMinor: row.pricing.profitAmountMinor,
        currency: row.pricing.currency,
        pricingRuleId: row.pricing.pricingRuleId,
        pricingRuleName: row.pricing.pricingRuleName,
        expiresAt: row.offer.expiresAt,
        details: row.offer.raw,
      })),
    };
  }

  async sendQuote(
    quoteId: string,
    organizationId: string,
    actorUserId?: string,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, organizationId },
      include: { items: true, contact: true, conversation: true },
    });
    if (!quote) throw new Error("العرض غير موجود");

    const payload = quote.customerVisiblePayload as {
      options?: Array<{
        label: string;
        description: string;
        sellAmountMinor: number;
        currency: string;
      }>;
    } | null;

    const options = payload?.options?.length
      ? payload.options
      : quote.items.map((item, index) => ({
          label: OPTION_LABELS[index] || String(index + 1),
          description: item.description,
          sellAmountMinor: item.sellAmount,
          currency: quote.currency,
        }));

    const optionLines = options.map(
      (option) =>
        `${option.label}) ${option.description} — ${formatMoneyMinor(option.sellAmountMinor, option.currency)}`,
    );

    const body = [
      "عروض سفر متاحة من وكالتنا (اختر عرضًا واحدًا):",
      ...optionLines,
      quote.expiresAt
        ? `صالحة حتى: ${quote.expiresAt.toISOString().slice(0, 16)} UTC`
        : null,
      "للقبول: اكتب حرف الخيار (أ / ب / ج) أو «أوافق» للخيار أ",
      "للتحويل لموظف: اكتب «موظف»",
      "(الأسعار المعروضة للبيع فقط — بدون تكلفة داخلية)",
    ]
      .filter(Boolean)
      .join("\n");

    if (quote.conversationId) {
      await this.replyToConversation({
        organizationId,
        conversationId: quote.conversationId,
        body,
      });
    }

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: "sent", sentAt: new Date() },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "quotes.send",
      entityType: "Quote",
      entityId: quote.id,
      after: {
        sell: quote.totalSellAmount,
        currency: quote.currency,
        options: options.length,
      },
    });

    return updated;
  }

  /** Resolve linked WhatsApp channel, falling back to org default. */
  async resolveWhatsAppAccount(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { whatsappAccount: true, contact: true },
    });
    if (!conversation) throw new BadRequestException("المحادثة غير موجودة");

    let account = conversation.whatsappAccount;
    if (!account || account.status !== "connected") {
      const preferredType = account?.channelType || "whatsapp";
      account = await this.prisma.whatsAppAccount.findFirst({
        where: {
          organizationId,
          status: "connected",
          channelType: preferredType,
        },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });
      if (!account) {
        account = await this.prisma.whatsAppAccount.findFirst({
          where: { organizationId, status: "connected" },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        });
      }
      if (account && conversation.whatsappAccountId !== account.id) {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { whatsappAccountId: account.id },
        });
      }
    }

    return { conversation, account };
  }

  async isWithinCustomerServiceWindow(conversationId: string) {
    const lastInbound = await this.prisma.message.findFirst({
      where: { conversationId, direction: "inbound" },
      orderBy: { createdAt: "desc" },
    });
    if (!lastInbound) return false;
    return (
      Date.now() - lastInbound.createdAt.getTime() <= 24 * 60 * 60 * 1000
    );
  }

  async replyToConversation(input: {
    organizationId: string;
    conversationId: string;
    body: string;
    sentByUserId?: string;
    /** Skip 24h window check (bot auto-replies right after inbound). */
    skipWindowCheck?: boolean;
  }) {
    const { conversation, account } = await this.resolveWhatsAppAccount(
      input.conversationId,
      input.organizationId,
    );

    const channel = account?.channelType || "whatsapp";

    // Enforce 24h window only for WhatsApp / Messenger / Instagram agent replies.
    if (
      input.skipWindowCheck === false &&
      usesCustomerServiceWindow(channel)
    ) {
      const open = await this.isWithinCustomerServiceWindow(
        input.conversationId,
      );
      if (!open) {
        throw new BadRequestException(
          "انتهت نافذة خدمة المراسلة (24 ساعة). استخدم قالبًا معتمدًا للمتابعة.",
        );
      }
    }

    const token = account?.accessTokenEnc || "mock";
    const phoneNumberId = account?.phoneNumberId || "mock_phone";

    const send = await sendChannelText({
      channelType: channel,
      phoneNumberId,
      accessToken: token,
      to: conversation.contact.waId,
      body: input.body,
    });

    if (send.status === "failed") {
      const errMsg =
        (send.raw as { error?: { message?: string } } | undefined)?.error
          ?.message || "فشل إرسال الرسالة";
      throw new BadRequestException(errMsg);
    }

    const message = await this.prisma.message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        direction: "outbound",
        channel,
        type: "text",
        body: input.body,
        providerMessageId: send.providerMessageId || null,
        status: send.status,
        sentByUserId: input.sentByUserId,
        rawPayload: send.raw ? asJson(send.raw) : undefined,
      },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(account ? { whatsappAccountId: account.id } : {}),
      },
    });

    return message;
  }

  async replyWithTemplate(input: {
    organizationId: string;
    conversationId: string;
    templateId: string;
    sentByUserId?: string;
    variables?: string[];
  }) {
    const { conversation, account } = await this.resolveWhatsAppAccount(
      input.conversationId,
      input.organizationId,
    );
    if (!account) {
      throw new BadRequestException(
        "اربط قناة من صفحة القنوات قبل إرسال القوالب",
      );
    }

    const channel = account.channelType || "whatsapp";
    const template = await this.prisma.template.findFirst({
      where: {
        id: input.templateId,
        organizationId: input.organizationId,
      },
    });
    if (!template) throw new BadRequestException("القالب غير موجود");

    const contactName =
      conversation.contact.name || conversation.contact.waId;
    const vars = input.variables?.length
      ? input.variables
      : [contactName];
    let bodyText = template.body;
    vars.forEach((v, i) => {
      bodyText = bodyText.replace(
        new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g"),
        v,
      );
    });

    const send =
      channel === "whatsapp"
        ? await sendWhatsAppTemplate({
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessTokenEnc || "mock",
            to: conversation.contact.waId,
            templateName: template.name,
            language: template.language,
            components: [
              {
                type: "body",
                parameters: vars.map((text) => ({ type: "text", text })),
              },
            ],
          })
        : await sendChannelText({
            channelType: channel,
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessTokenEnc || "mock",
            to: conversation.contact.waId,
            body: bodyText,
          });

    if (send.status === "failed") {
      // Fallback to free text only in mock / when still inside window
      const open =
        !usesCustomerServiceWindow(channel) ||
        (await this.isWithinCustomerServiceWindow(input.conversationId));
      if (open || (account.accessTokenEnc || "").startsWith("mock")) {
        return this.replyToConversation({
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          body: bodyText,
          sentByUserId: input.sentByUserId,
          skipWindowCheck: true,
        });
      }
      const errMsg =
        (send.raw as { error?: { message?: string } } | undefined)?.error
          ?.message || "فشل إرسال القالب";
      throw new BadRequestException(errMsg);
    }

    const message = await this.prisma.message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        direction: "outbound",
        channel,
        type: channel === "whatsapp" ? "template" : "text",
        body: bodyText,
        templateName: template.name,
        providerMessageId: send.providerMessageId || null,
        status: send.status,
        sentByUserId: input.sentByUserId,
        rawPayload: send.raw ? asJson(send.raw) : undefined,
      },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: new Date(),
        whatsappAccountId: account.id,
        status: conversation.status === "closed" ? "open" : conversation.status,
      },
    });

    return message;
  }

  async replyWithMedia(input: {
    organizationId: string;
    conversationId: string;
    sentByUserId?: string;
    type: "image" | "video" | "document";
    link: string;
    filename?: string;
    caption?: string;
  }) {
    const { conversation, account } = await this.resolveWhatsAppAccount(
      input.conversationId,
      input.organizationId,
    );
    if (!account) {
      throw new BadRequestException(
        "اربط قناة من صفحة القنوات قبل إرسال الملفات",
      );
    }

    const channel = account.channelType || "whatsapp";
    if (usesCustomerServiceWindow(channel)) {
      const open = await this.isWithinCustomerServiceWindow(
        input.conversationId,
      );
      if (!open) {
        throw new BadRequestException(
          "انتهت نافذة خدمة المراسلة (24 ساعة). استخدم قالبًا معتمدًا للمتابعة.",
        );
      }
    }

    const send = await sendChannelMedia({
      channelType: channel,
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessTokenEnc || "mock",
      to: conversation.contact.waId,
      type: input.type,
      link: input.link,
      filename: input.filename,
      caption: input.caption,
    });

    if (send.status === "failed") {
      const errMsg =
        (send.raw as { error?: { message?: string } } | undefined)?.error
          ?.message || "فشل إرسال الملف";
      throw new BadRequestException(errMsg);
    }

    const label =
      input.type === "image"
        ? "صورة"
        : input.type === "video"
          ? "فيديو"
          : input.filename || "ملف PDF";
    const body = input.caption?.trim() || label;

    const message = await this.prisma.message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        direction: "outbound",
        channel,
        type: input.type,
        body,
        providerMessageId: send.providerMessageId || null,
        status: send.status,
        sentByUserId: input.sentByUserId,
        rawPayload: asJson({
          ...(send.raw || {}),
          mediaUrl: input.link,
          filename: input.filename,
          mediaType: input.type,
        }),
      },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: new Date(),
        whatsappAccountId: account.id,
      },
    });

    return message;
  }
}
