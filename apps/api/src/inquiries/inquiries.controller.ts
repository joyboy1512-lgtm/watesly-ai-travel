import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";
import { stripCostFields } from "../common/money";

@Controller("inquiries")
export class InquiriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
  ) {}

  @Get()
  @RequirePermissions("conversations.read")
  async list(@CurrentUser() user: AuthUser) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const rows = await this.prisma.travelInquiry.findMany({
      where: { organizationId: user.organizationId },
      include: {
        contact: true,
        quotes: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return stripCostFields(rows, canViewCost);
  }

  @Get(":id")
  @RequirePermissions("conversations.read")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const row = await this.prisma.travelInquiry.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        contact: true,
        conversation: true,
        quotes: { include: { items: true }, orderBy: { createdAt: "desc" } },
      },
    });
    return stripCostFields(row, canViewCost);
  }

  @Post()
  @RequirePermissions("quotes.create")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      origin?: string;
      destination?: string;
      departDate?: string;
      returnDate?: string;
      adults?: number;
      children?: number;
      infants?: number;
      cabinClass?: string;
      contactId?: string;
      preferences?: string;
      serviceTypes?: string[];
      includeHotels?: boolean;
      budgetCurrency?: string;
    },
  ) {
    const serviceTypes =
      body.serviceTypes?.length
        ? body.serviceTypes
        : body.includeHotels
          ? ["flight", "hotel"]
          : ["flight"];
    const hotelOnly =
      serviceTypes.includes("hotel") && !serviceTypes.includes("flight");
    const missing: string[] = [];
    if (!hotelOnly && !body.origin) missing.push("origin");
    if (!body.destination && !body.preferences) missing.push("destination");
    if (!body.departDate) missing.push("departDate");

    const origin = body.origin?.trim().toUpperCase() || null;
    const destination =
      body.destination?.trim() ||
      body.preferences?.trim() ||
      null;

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { defaultCurrency: true },
    });

    return this.prisma.travelInquiry.create({
      data: {
        organizationId: user.organizationId,
        contactId: body.contactId,
        source: "direct",
        status: missing.length ? "collecting" : "ready_to_search",
        origin,
        destination: destination
          ? hotelOnly
            ? destination
            : destination.toUpperCase()
          : null,
        departDate: body.departDate ? new Date(body.departDate) : null,
        returnDate: body.returnDate ? new Date(body.returnDate) : null,
        adults: body.adults ?? 1,
        children: body.children ?? 0,
        infants: body.infants ?? 0,
        cabinClass: body.cabinClass || "economy",
        preferences: body.preferences,
        serviceTypes,
        budgetCurrency:
          body.budgetCurrency?.trim().toUpperCase() ||
          org?.defaultCurrency ||
          process.env.DEFAULT_CURRENCY ||
          "KWD",
        missingFields: missing,
        aiSummary: [origin, destination, body.departDate]
          .filter(Boolean)
          .join(" → "),
      },
    });
  }

  @Post(":id/search")
  @RequirePermissions("quotes.create")
  async search(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body?: { includeHotels?: boolean },
  ) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const result = await this.pipeline.searchAndCreateQuote({
      organizationId: user.organizationId,
      inquiryId: id,
      sendToCustomer: false,
      createdByUserId: user.userId,
      includeHotels: body?.includeHotels,
    });

    const mapOffer = (row: {
      id: string;
      serviceType: "flight" | "hotel";
      description: string;
      sellAmountMinor: number;
      costAmountMinor: number;
      profitAmountMinor: number;
      currency: string;
      expiresAt: string;
      details: Record<string, unknown>;
    }) => {
      const base = {
        id: row.id,
        serviceType: row.serviceType,
        description: row.description,
        sellAmountMinor: row.sellAmountMinor,
        currency: row.currency,
        expiresAt: row.expiresAt,
        details: row.details,
      };
      if (!canViewCost) return base;
      return {
        ...base,
        costAmountMinor: row.costAmountMinor,
        profitAmountMinor: row.profitAmountMinor,
      };
    };

    return {
      providerKey: result.providerKey,
      providerName: result.providerName,
      liveMode: result.liveMode,
      flightProviderKey: result.flightProviderKey,
      flightProviderName: result.flightProviderName,
      flightLiveMode: result.flightLiveMode,
      hotelProviderKey: result.hotelProviderKey,
      hotelProviderName: result.hotelProviderName,
      hotelLiveMode: result.hotelLiveMode,
      hotelError: result.hotelError,
      quote: stripCostFields(result.quote, canViewCost),
      flights: result.flights.map(mapOffer),
      hotels: result.hotels.map(mapOffer),
    };
  }
}
