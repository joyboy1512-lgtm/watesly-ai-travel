import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser, Public, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AssistantService } from "./assistant.service";

@Controller("assistant")
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("thread")
  @RequirePermissions("conversations.read")
  thread(
    @CurrentUser() user: AuthUser,
    @Query("threadId") threadId?: string,
  ) {
    return this.assistant.thread({
      organizationId: user.organizationId,
      channel: "dashboard",
      userId: user.userId,
      threadId,
    });
  }

  @Get("tools")
  @RequirePermissions("conversations.read")
  tools() {
    return this.assistant.status();
  }

  @Get("usage")
  @RequirePermissions("conversations.read")
  usage(@CurrentUser() user: AuthUser) {
    return this.assistant.usage(user.organizationId);
  }

  @Post("chat")
  @RequirePermissions("conversations.read")
  chat(
    @CurrentUser() user: AuthUser,
    @Body() body: { message?: string; threadId?: string },
  ) {
    const text = String(body.message || "").trim();
    if (!text) throw new BadRequestException("نص الرسالة مطلوب");
    return this.assistant.chat({
      organizationId: user.organizationId,
      userId: user.userId,
      channel: "dashboard",
      text,
      threadId: body.threadId,
    });
  }

  @Public()
  @Post("public/chat")
  async publicChat(
    @Body()
    body: {
      message?: string;
      sessionId?: string;
      organizationSlug?: string;
    },
  ) {
    const text = String(body.message || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    if (!text) throw new BadRequestException("نص الرسالة مطلوب");
    if (!sessionId) throw new BadRequestException("معرّف الجلسة مطلوب");

    const slug =
      body.organizationSlug?.trim() ||
      process.env.PUBLIC_ASSISTANT_ORG_SLUG?.trim();
    const organization = slug
      ? await this.prisma.organization.findFirst({
          where: { slug, status: "active" },
        })
      : await this.prisma.organization.findFirst({
          where: { status: "active" },
          orderBy: { createdAt: "asc" },
        });
    if (!organization) {
      throw new BadRequestException("لا توجد منظمة مفعّلة للمساعد");
    }

    return this.assistant.chat({
      organizationId: organization.id,
      channel: "web_chat",
      text,
      externalRef: sessionId,
    });
  }

  @Public()
  @Get("public/thread")
  async publicThread(@Query("sessionId") sessionId?: string) {
    const ref = String(sessionId || "").trim();
    if (!ref) throw new BadRequestException("معرّف الجلسة مطلوب");
    const slug = process.env.PUBLIC_ASSISTANT_ORG_SLUG?.trim();
    const organization = slug
      ? await this.prisma.organization.findFirst({
          where: { slug, status: "active" },
        })
      : await this.prisma.organization.findFirst({
          where: { status: "active" },
          orderBy: { createdAt: "asc" },
        });
    if (!organization) {
      throw new BadRequestException("لا توجد منظمة مفعّلة للمساعد");
    }
    return this.assistant.thread({
      organizationId: organization.id,
      channel: "web_chat",
      externalRef: ref,
      createIfMissing: false,
    });
  }
}
