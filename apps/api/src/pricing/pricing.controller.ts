import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { Prisma } from "@watesly-travel/database";

type PricingConditionsBody = {
  origins?: string[];
  destinations?: string[];
  cabinClasses?: string[];
  hotelStars?: string[];
  providers?: string[];
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
};

function normalizeList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined;
  const next = values
    .map((v) => String(v || "").trim().toUpperCase())
    .filter(Boolean);
  return next.length ? next : undefined;
}

function cleanConditions(raw?: PricingConditionsBody | null) {
  if (!raw || typeof raw !== "object") return Prisma.JsonNull;
  const next: PricingConditionsBody = {};
  const origins = normalizeList(raw.origins);
  const destinations = normalizeList(raw.destinations);
  const cabinClasses = normalizeList(raw.cabinClasses);
  const hotelStars = normalizeList(raw.hotelStars);
  const providers = normalizeList(raw.providers);
  if (origins) next.origins = origins;
  if (destinations) next.destinations = destinations;
  if (cabinClasses) next.cabinClasses = cabinClasses;
  if (hotelStars) next.hotelStars = hotelStars;
  if (providers) next.providers = providers;
  if (raw.minPrice != null && !Number.isNaN(Number(raw.minPrice))) {
    next.minPrice = Number(raw.minPrice);
  }
  if (raw.maxPrice != null && !Number.isNaN(Number(raw.maxPrice))) {
    next.maxPrice = Number(raw.maxPrice);
  }
  if (raw.dateFrom) next.dateFrom = String(raw.dateFrom).slice(0, 10);
  if (raw.dateTo) next.dateTo = String(raw.dateTo).slice(0, 10);
  return Object.keys(next).length ? (next as Prisma.InputJsonValue) : Prisma.JsonNull;
}

@Controller("pricing-rules")
export class PricingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions("pricing.manage")
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.pricingRule.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { priority: "asc" },
    });
  }

  @Post("sync-currency")
  @RequirePermissions("pricing.manage")
  async syncCurrency(
    @CurrentUser() user: AuthUser,
    @Body() body?: { currency?: string },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { defaultCurrency: true },
    });
    const currency = (
      body?.currency ||
      org?.defaultCurrency ||
      process.env.DEFAULT_CURRENCY ||
      "KWD"
    )
      .trim()
      .toUpperCase();

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { defaultCurrency: currency },
    });

    const result = await this.prisma.pricingRule.updateMany({
      where: { organizationId: user.organizationId },
      data: { currency },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "pricing.rules.sync_currency",
      entityType: "PricingRule",
      after: { currency, count: result.count },
    });

    return { currency, updated: result.count };
  }

  @Post()
  @RequirePermissions("pricing.manage")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      serviceType?: string;
      ruleType?: string;
      percentValue?: number;
      fixedAmount?: number;
      minProfitAmount?: number;
      currency?: string;
      priority?: number;
      isActive?: boolean;
      conditions?: PricingConditionsBody | null;
    },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { defaultCurrency: true },
    });

    const row = await this.prisma.pricingRule.create({
      data: {
        organizationId: user.organizationId,
        name: body.name?.trim() || "قاعدة تسعير",
        serviceType: body.serviceType || "flight",
        ruleType: body.ruleType || "percent",
        percentValue: body.percentValue ?? 10,
        fixedAmount: body.fixedAmount,
        minProfitAmount: body.minProfitAmount,
        currency:
          body.currency?.trim().toUpperCase() ||
          org?.defaultCurrency ||
          process.env.DEFAULT_CURRENCY ||
          "KWD",
        priority: body.priority ?? 100,
        isActive: body.isActive ?? true,
        conditions: cleanConditions(body.conditions),
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "pricing.rule.create",
      entityType: "PricingRule",
      entityId: row.id,
      after: row,
    });

    return row;
  }

  @Patch(":id")
  @RequirePermissions("pricing.manage")
  async patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      serviceType?: string;
      percentValue?: number;
      fixedAmount?: number;
      minProfitAmount?: number;
      isActive?: boolean;
      priority?: number;
      ruleType?: string;
      conditions?: PricingConditionsBody | null;
    },
  ) {
    const existing = await this.prisma.pricingRule.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return null;

    const data: Prisma.PricingRuleUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.serviceType !== undefined) data.serviceType = body.serviceType;
    if (body.percentValue !== undefined) data.percentValue = body.percentValue;
    if (body.fixedAmount !== undefined) data.fixedAmount = body.fixedAmount;
    if (body.minProfitAmount !== undefined) {
      data.minProfitAmount = body.minProfitAmount;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.ruleType !== undefined) data.ruleType = body.ruleType;
    if (body.conditions !== undefined) {
      data.conditions = cleanConditions(body.conditions);
    }

    const row = await this.prisma.pricingRule.update({
      where: { id },
      data,
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "pricing.rule.update",
      entityType: "PricingRule",
      entityId: id,
      before: existing,
      after: row,
    });

    return row;
  }
}
