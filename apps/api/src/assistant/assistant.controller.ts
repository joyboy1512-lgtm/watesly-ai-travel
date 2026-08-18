import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { CurrentUser, Public, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AssistantService } from "./assistant.service";
import type { AiChannel } from "@watesly-travel/ai-core";

@Controller("assistant")
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("threads")
  @RequirePermissions("conversations.read")
  threads(
    @CurrentUser() user: AuthUser,
    @Query("channel") channel?: string,
  ) {
    return this.assistant.listThreads(user.organizationId, channel);
  }

  @Post("threads")
  @RequirePermissions("conversations.read")
  createThread(
    @CurrentUser() user: AuthUser,
    @Body() body: { title?: string; creditLimitUsd?: number | null },
  ) {
    return this.assistant.createThread({
      organizationId: user.organizationId,
      userId: user.userId,
      channel: "dashboard",
      title: body.title,
      creditLimitUsd: body.creditLimitUsd,
    });
  }

  @Post("upload")
  @RequirePermissions("conversations.read")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(
            process.env.UPLOADS_DIR || join(process.cwd(), "..", "..", "uploads"),
            "assistant",
          );
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || "").toLowerCase() || ".bin";
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("اختر صورة أو ملفاً");
    const mime = (file.mimetype || "").toLowerCase();
    const ext = extname(file.originalname || "").toLowerCase();
    const image =
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime) ||
      [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    const allowed =
      image ||
      mime === "application/pdf" ||
      ext === ".pdf" ||
      mime.startsWith("text/") ||
      [".doc", ".docx", ".xls", ".xlsx"].includes(ext);
    if (!allowed) {
      throw new BadRequestException("يُسمح بالصور أو PDF أو ملفات أوفيس");
    }
    const publicBase = (
      process.env.PUBLIC_API_URL ||
      process.env.API_URL ||
      "https://api.weekendgate.com"
    ).replace(/\/$/, "");
    return {
      kind: image ? "image" : "file",
      name: file.originalname || file.filename,
      mime: file.mimetype,
      url: `${publicBase}/uploads/assistant/${file.filename}`,
    };
  }

  @Patch("threads/:id")
  @RequirePermissions("conversations.read")
  async patchThread(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      creditLimitUsd?: number | null;
      status?: "open" | "handed_off";
    },
  ) {
    const row = await this.assistant.patchThread({
      organizationId: user.organizationId,
      threadId: id,
      title: body.title,
      creditLimitUsd: body.creditLimitUsd,
      status: body.status,
    });
    if (!row) throw new NotFoundException("المحادثة غير موجودة");
    return row;
  }

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

  @Get("usage/report")
  @RequirePermissions("conversations.read")
  usageReport(
    @CurrentUser() user: AuthUser,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.assistant.usageReport(user.organizationId, { period, from, to });
  }

  @Get("usage")
  @RequirePermissions("conversations.read")
  usage(@CurrentUser() user: AuthUser) {
    return this.assistant.usage(user.organizationId);
  }

  @Get("settings")
  @RequirePermissions("conversations.read")
  settings(@CurrentUser() user: AuthUser) {
    return this.assistant.getAiSettings(user.organizationId);
  }

  @Patch("settings")
  @RequirePermissions("conversations.read")
  patchSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: { defaultThreadCreditUsd?: number | null },
  ) {
    return this.assistant.setAiSettings(user.organizationId, {
      defaultThreadCreditUsd: body.defaultThreadCreditUsd,
    });
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
      channel: "dashboard" as AiChannel,
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
