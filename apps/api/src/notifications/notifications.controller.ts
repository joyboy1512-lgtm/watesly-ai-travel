import { Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({
      where: {
        organizationId: user.organizationId,
        userId: user.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Post(":id/read")
  async markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.notification.updateMany({
      where: {
        id,
        userId: user.userId,
        organizationId: user.organizationId,
      },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
