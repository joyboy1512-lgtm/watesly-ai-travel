import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";
import { AuditService } from "../common/audit.service";

@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions("conversations.read")
  list(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("assigneeType") assigneeType?: string,
    @Query("whatsappAccountId") whatsappAccountId?: string,
    @Query("mine") mine?: string,
  ) {
    return this.prisma.conversation.findMany({
      where: {
        organizationId: user.organizationId,
        status: status || undefined,
        assigneeType: assigneeType || undefined,
        whatsappAccountId: whatsappAccountId || undefined,
        ...(mine === "1" || mine === "true"
          ? { assignedUserId: user.userId }
          : {}),
      },
      include: {
        contact: true,
        whatsappAccount: {
          select: {
            id: true,
            displayPhone: true,
            channelName: true,
            phoneNumberId: true,
            isDefault: true,
            status: true,
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
  }

  @Get(":id")
  @RequirePermissions("conversations.read")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        contact: true,
        whatsappAccount: {
          select: {
            id: true,
            displayPhone: true,
            channelName: true,
            phoneNumberId: true,
            isDefault: true,
            status: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
        inquiries: { orderBy: { createdAt: "desc" }, take: 5 },
        handoffs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!conversation) return null;

    await this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });

    const withinWindow =
      await this.pipeline.isWithinCustomerServiceWindow(id);

    return {
      ...conversation,
      unreadCount: 0,
      withinCustomerServiceWindow: withinWindow,
    };
  }

  @Post(":id/reply")
  @RequirePermissions("conversations.reply")
  async reply(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { text: string },
  ) {
    if (!body.text?.trim()) {
      throw new BadRequestException("نص الرسالة مطلوب");
    }
    return this.pipeline.replyToConversation({
      organizationId: user.organizationId,
      conversationId: id,
      body: body.text.trim(),
      sentByUserId: user.userId,
      skipWindowCheck: false,
    });
  }

  @Post(":id/reply-template")
  @RequirePermissions("conversations.reply")
  async replyTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { templateId: string; variables?: string[] },
  ) {
    if (!body.templateId?.trim()) {
      throw new BadRequestException("معرّف القالب مطلوب");
    }
    const message = await this.pipeline.replyWithTemplate({
      organizationId: user.organizationId,
      conversationId: id,
      templateId: body.templateId.trim(),
      sentByUserId: user.userId,
      variables: body.variables,
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "conversations.reply_template",
      entityType: "Message",
      entityId: message.id,
      after: { conversationId: id, templateId: body.templateId },
    });

    return message;
  }

  @Patch(":id")
  @RequirePermissions("conversations.reply")
  async patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      assigneeType?: string;
    },
  ) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new BadRequestException("المحادثة غير موجودة");

    const data: {
      status?: string;
      assigneeType?: string;
      assignedUserId?: string | null;
    } = {};

    if (body.status) {
      if (!["open", "pending", "closed"].includes(body.status)) {
        throw new BadRequestException("حالة غير صالحة");
      }
      data.status = body.status;
    }

    if (body.assigneeType === "human") {
      data.assigneeType = "human";
      data.assignedUserId = user.userId;
      if (!data.status) data.status = "pending";
    } else if (body.assigneeType === "bot") {
      data.assigneeType = "bot";
      data.assignedUserId = null;
      if (!data.status && existing.status === "closed") data.status = "open";
    }

    const row = await this.prisma.conversation.update({
      where: { id },
      data,
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "conversations.update",
      entityType: "Conversation",
      entityId: id,
      before: { status: existing.status, assigneeType: existing.assigneeType },
      after: { status: row.status, assigneeType: row.assigneeType },
    });

    return row;
  }

  @Post(":id/handoff")
  @RequirePermissions("conversations.reply")
  async handoff(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        inquiries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!conversation) return null;

    const inquiry = conversation.inquiries[0];
    const handoff = await this.prisma.handoff.create({
      data: {
        organizationId: user.organizationId,
        conversationId: id,
        inquiryId: inquiry?.id,
        reason: body.reason || "طلب تحويل بشري",
        status: "open",
        contextSummary: inquiry?.aiSummary || "تحويل من الروبوت",
      },
    });

    await this.prisma.conversation.update({
      where: { id },
      data: {
        assigneeType: "human",
        assignedUserId: user.userId,
        status: "pending",
      },
    });

    if (inquiry) {
      await this.prisma.travelInquiry.update({
        where: { id: inquiry.id },
        data: { status: "handed_off" },
      });
    }

    const members = await this.prisma.membership.findMany({
      where: {
        organizationId: user.organizationId,
        status: "active",
        role: { code: { in: ["owner", "admin", "agent"] } },
      },
    });

    if (members.length) {
      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          organizationId: user.organizationId,
          userId: m.userId,
          type: "handoff",
          title: "تحويل محادثة للموظف",
          body: body.reason || "تم طلب تحويل بشري",
          linkRef: `/dashboard/conversations?id=${id}`,
        })),
      });
    }

    try {
      await this.pipeline.replyToConversation({
        organizationId: user.organizationId,
        conversationId: id,
        body: "تم تحويل محادثتك إلى موظف متخصص. سيتواصل معك قريبًا.",
        sentByUserId: user.userId,
      });
    } catch {
      // Outside 24h window or send failure — handoff still recorded.
    }

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "handoff.create",
      entityType: "Handoff",
      entityId: handoff.id,
      after: { conversationId: id, reason: body.reason },
    });

    return handoff;
  }

  @Post(":id/return-to-bot")
  @RequirePermissions("conversations.reply")
  async returnToBot(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        assigneeType: "bot",
        assignedUserId: null,
        status: "open",
      },
    });

    await this.prisma.handoff.updateMany({
      where: {
        conversationId: id,
        organizationId: user.organizationId,
        status: { in: ["open", "accepted"] },
      },
      data: { status: "returned_to_bot" },
    });

    return { ok: true };
  }
}
