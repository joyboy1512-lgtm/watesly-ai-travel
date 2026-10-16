import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";
import { stripCostFields } from "../common/money";
import { QuotesService } from "./quotes.service";

@Controller("quotes")
export class QuotesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
    private readonly quotes: QuotesService,
  ) {}

  @Get()
  @RequirePermissions("conversations.read")
  async list(@CurrentUser() user: AuthUser) {
    await this.quotes.purgeExpiredQuotes(user.organizationId);

    const canViewCost = user.permissions.includes("pricing.view_cost");
    const rows = await this.prisma.quote.findMany({
      where: { organizationId: user.organizationId },
      include: {
        inquiry: true,
        contact: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map((row) => ({
      ...stripCostFields(row as unknown as Record<string, unknown>, canViewCost),
      items: row.items.map((item) =>
        stripCostFields(item as unknown as Record<string, unknown>, canViewCost),
      ),
    }));
  }

  @Get(":id")
  @RequirePermissions("conversations.read")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const row = await this.prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { items: true, inquiry: true, contact: true },
    });
    if (!row) return null;
    return {
      ...stripCostFields(row as unknown as Record<string, unknown>, canViewCost),
      items: row.items.map((item) =>
        stripCostFields(item as unknown as Record<string, unknown>, canViewCost),
      ),
    };
  }

  @Post(":id/send")
  @RequirePermissions("quotes.send")
  send(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.pipeline.sendQuote(id, user.organizationId, user.userId);
  }

  @Delete(":id")
  @RequirePermissions("quotes.create")
  delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.quotes.deleteQuote({
      quoteId: id,
      organizationId: user.organizationId,
      userId: user.userId,
    });
  }
}
