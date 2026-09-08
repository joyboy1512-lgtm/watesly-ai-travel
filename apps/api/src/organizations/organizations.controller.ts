import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get("current")
  current(@CurrentUser() user: AuthUser) {
    return this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
  }

  @Get("roles")
  @RequirePermissions("users.manage")
  roles(@CurrentUser() user: AuthUser) {
    return this.prisma.role.findMany({
      where: { organizationId: user.organizationId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberships: true } },
      },
      orderBy: { code: "asc" },
    });
  }

  @Patch("current")
  @RequirePermissions("settings.manage")
  async updateCurrent(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name?: string;
      defaultCurrency?: string;
      timezone?: string;
      settings?: Record<string, unknown>;
    },
  ) {
    const before = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const after = await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: body.name,
        defaultCurrency: body.defaultCurrency,
        timezone: body.timezone,
        settings: body.settings as object | undefined,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "settings.update",
      entityType: "Organization",
      entityId: user.organizationId,
      before,
      after,
    });

    return after;
  }
}
