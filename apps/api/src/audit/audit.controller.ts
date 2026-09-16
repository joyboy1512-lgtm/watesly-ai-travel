import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("audit.read")
  list(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string,
  ) {
    const take = Math.min(Number(limit) || 50, 200);
    return this.prisma.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
