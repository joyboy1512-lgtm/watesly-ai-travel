import { Controller, Get } from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("summary")
  @RequirePermissions("reports.read")
  async summary(@CurrentUser() user: AuthUser) {
    const orgId = user.organizationId;
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [
      conversations,
      openConversations,
      pendingConversations,
      closedConversations,
      quotes,
      bookings,
      contacts,
      openHandoffs,
      inquiries,
      members,
      inboundToday,
      outboundToday,
      quoteAgg,
      bookingAgg,
      lastCampaign,
      subscription,
      recentWaiting,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { organizationId: orgId } }),
      this.prisma.conversation.count({
        where: { organizationId: orgId, status: "open" },
      }),
      this.prisma.conversation.count({
        where: { organizationId: orgId, status: "pending" },
      }),
      this.prisma.conversation.count({
        where: { organizationId: orgId, status: "closed" },
      }),
      this.prisma.quote.count({ where: { organizationId: orgId } }),
      this.prisma.booking.count({ where: { organizationId: orgId } }),
      this.prisma.contact.count({ where: { organizationId: orgId } }),
      this.prisma.handoff.count({
        where: { organizationId: orgId, status: "open" },
      }),
      this.prisma.travelInquiry.count({ where: { organizationId: orgId } }),
      this.prisma.membership.count({
        where: { organizationId: orgId, status: "active" },
      }),
      this.prisma.message.count({
        where: {
          organizationId: orgId,
          direction: "inbound",
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.message.count({
        where: {
          organizationId: orgId,
          direction: "outbound",
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.quote.aggregate({
        where: { organizationId: orgId },
        _sum: { totalSellAmount: true, totalProfitAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ["confirmed", "ticketed", "on_hold"] },
        },
        _sum: { totalSellAmount: true, totalProfitAmount: true },
      }),
      this.prisma.campaign.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { recipients: true } },
          recipients: { select: { status: true } },
        },
      }),
      this.prisma.subscription.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.conversation.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["open", "pending"] },
        },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      }),
    ]);

    const waitingForReply = recentWaiting.filter(
      (c) => c.messages[0]?.direction === "inbound",
    );

    const campaignStats = lastCampaign
      ? {
          id: lastCampaign.id,
          name: lastCampaign.name,
          status: lastCampaign.status,
          total: lastCampaign.recipients.length,
          sent: lastCampaign.recipients.filter((r) => r.status === "sent").length,
          failed: lastCampaign.recipients.filter((r) => r.status === "failed")
            .length,
          pending: lastCampaign.recipients.filter((r) => r.status === "pending")
            .length,
        }
      : null;

    return {
      conversations,
      openConversations,
      pendingConversations,
      closedConversations,
      waitingReply: waitingForReply.length,
      quotes,
      bookings,
      contacts,
      openHandoffs,
      inquiries,
      members,
      inboundToday,
      outboundToday,
      estimatedSalesMinor: quoteAgg._sum.totalSellAmount || 0,
      confirmedSalesMinor: bookingAgg._sum.totalSellAmount || 0,
      estimatedProfitMinor: canViewCost
        ? quoteAgg._sum.totalProfitAmount || 0
        : undefined,
      confirmedProfitMinor: canViewCost
        ? bookingAgg._sum.totalProfitAmount || 0
        : undefined,
      lastCampaign: campaignStats,
      subscription: subscription
        ? {
            planCode: subscription.planCode,
            status: subscription.status,
            seatsLimit: subscription.seatsLimit,
            members,
          }
        : {
            planCode: "trial",
            status: "trialing",
            seatsLimit: 5,
            members,
          },
      waitingConversations: waitingForReply.map((c) => ({
        id: c.id,
        name: c.contact.name || c.contact.waId,
        waId: c.contact.waId,
        preview: c.messages[0]?.body || "",
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCount,
      })),
    };
  }
}
