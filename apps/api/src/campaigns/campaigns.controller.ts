import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Prisma } from "@watesly-travel/database";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@watesly-travel/whatsapp-core";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

const UPLOAD_ROOT = process.env.UPLOADS_DIR
  || join(process.cwd(), "..", "..", "uploads");
const TEMPLATE_UPLOAD_DIR = join(UPLOAD_ROOT, "templates");

const HEADER_TYPES = new Set(["none", "text", "image", "video", "document"]);

const MEDIA_LIMITS: Record<string, { maxBytes: number; mimes: string[] }> = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "image/webp"],
  },
  video: {
    maxBytes: 16 * 1024 * 1024,
    mimes: ["video/mp4", "video/3gpp"],
  },
  document: {
    maxBytes: 20 * 1024 * 1024,
    mimes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ],
  },
};

function publicUploadUrl(filename: string) {
  const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  const path = `/uploads/templates/${filename}`;
  return base ? `${base}${path}` : path;
}

function normalizeHeaderType(value?: string | null) {
  const v = (value || "text").trim().toLowerCase();
  return HEADER_TYPES.has(v) ? v : "text";
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get("templates")
  @RequirePermissions("conversations.reply")
  templates(@CurrentUser() user: AuthUser) {
    return this.prisma.template.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        body: true,
        header: true,
        footer: true,
        headerType: true,
        headerMediaUrl: true,
        headerMediaName: true,
        exampleValues: true,
        metaTemplateId: true,
        language: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });
  }


  @Post("templates/upload")
  @RequirePermissions("campaigns.manage")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(TEMPLATE_UPLOAD_DIR)) {
            mkdirSync(TEMPLATE_UPLOAD_DIR, { recursive: true });
          }
          cb(null, TEMPLATE_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || "").toLowerCase() || ".bin";
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadTemplateMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { headerType?: string },
  ) {
    if (!file) {
      throw new BadRequestException("اختر ملفًا للرفع");
    }
    const headerType = normalizeHeaderType(body.headerType);
    if (headerType !== "image" && headerType !== "video" && headerType !== "document") {
      throw new BadRequestException("نوع الرأس يجب أن يكون صورة أو فيديو أو ملف");
    }
    const rules = MEDIA_LIMITS[headerType];
    if (!rules) {
      throw new BadRequestException("نوع الرأس غير مدعوم");
    }
    if (file.size > rules.maxBytes) {
      throw new BadRequestException("حجم الملف أكبر من المسموح");
    }
    const mime = (file.mimetype || "").toLowerCase();
    if (!rules.mimes.includes(mime)) {
      throw new BadRequestException("نوع الملف غير مدعوم لهذا الرأس");
    }
    return {
      ok: true,
      headerType,
      url: publicUploadUrl(file.filename),
      name: file.originalname || file.filename,
      mime,
      size: file.size,
    };
  }

  @Post("templates")
  @RequirePermissions("campaigns.manage")
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      body: string;
      language?: string;
      category?: string;
      header?: string;
      footer?: string;
      headerType?: string;
      headerMediaUrl?: string;
      headerMediaName?: string;
      exampleValues?: Record<string, string>;
      metaTemplateId?: string;
    },
  ) {
    const name = body.name?.trim().toLowerCase().replace(/\s+/g, "_");
    const text = body.body?.trim();
    if (!name || !text) {
      throw new BadRequestException("اسم القالب ونص الرسالة مطلوبان");
    }

    const headerType = normalizeHeaderType(body.headerType);
    const mediaUrl = body.headerMediaUrl?.trim() || null;
    const mediaName = body.headerMediaName?.trim() || null;
    if ((headerType === "image" || headerType === "video" || headerType === "document") && !mediaUrl) {
      throw new BadRequestException("ارفع ملف الوسائط لرأس القالب");
    }

    try {
      const template = await this.prisma.template.create({
        data: {
          organizationId: user.organizationId,
          name,
          body: text,
          language: body.language || "ar",
          category: body.category || "marketing",
          status: "approved",
          header: headerType === "text" ? (body.header?.trim() || null) : null,
          footer: body.footer?.trim() || null,
          headerType,
          headerMediaUrl: (headerType === "image" || headerType === "video" || headerType === "document") ? mediaUrl : null,
          headerMediaName: (headerType === "image" || headerType === "video" || headerType === "document") ? mediaName : null,
          exampleValues: body.exampleValues
            ? asJson(body.exampleValues)
            : undefined,
          metaTemplateId: body.metaTemplateId?.trim() || null,
        },
      });

      await this.audit.log({
        organizationId: user.organizationId,
        actorUserId: user.userId,
        action: "templates.create",
        entityType: "Template",
        entityId: template.id,
      });

      return template;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("يوجد قالب بنفس الاسم واللغة بالفعل");
      }
      throw error;
    }
  }

  @Patch("templates/:id")
  @RequirePermissions("campaigns.manage")
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      body?: string;
      category?: string;
      status?: string;
      language?: string;
      header?: string;
      footer?: string;
      headerType?: string;
      headerMediaUrl?: string | null;
      headerMediaName?: string | null;
      exampleValues?: Record<string, string>;
      metaTemplateId?: string;
    },
  ) {
    const existing = await this.prisma.template.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) {
      throw new BadRequestException("القالب غير موجود");
    }

    const text = body.body?.trim();
    const headerType = body.headerType !== undefined
      ? normalizeHeaderType(body.headerType)
      : existing.headerType || "text";
    const mediaUrl = body.headerMediaUrl !== undefined
      ? (body.headerMediaUrl?.trim() || null)
      : existing.headerMediaUrl;
    const mediaName = body.headerMediaName !== undefined
      ? (body.headerMediaName?.trim() || null)
      : existing.headerMediaName;
    if ((headerType === "image" || headerType === "video" || headerType === "document") && !mediaUrl) {
      throw new BadRequestException("ارفع ملف الوسائط لرأس القالب");
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        ...(text ? { body: text } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.language ? { language: body.language } : {}),
        headerType,
        header: headerType === "text"
          ? (body.header !== undefined ? (body.header?.trim() || null) : existing.header)
          : null,
        ...(body.footer !== undefined ? { footer: body.footer?.trim() || null } : {}),
        headerMediaUrl: (headerType === "image" || headerType === "video" || headerType === "document") ? mediaUrl : null,
        headerMediaName: (headerType === "image" || headerType === "video" || headerType === "document") ? mediaName : null,
        ...(body.exampleValues !== undefined
          ? { exampleValues: asJson(body.exampleValues) }
          : {}),
        ...(body.metaTemplateId !== undefined
          ? { metaTemplateId: body.metaTemplateId?.trim() || null }
          : {}),
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "templates.update",
      entityType: "Template",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  @Delete("templates/:id")
  @RequirePermissions("campaigns.manage")
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    const existing = await this.prisma.template.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { campaigns: true } } },
    });
    if (!existing) {
      throw new BadRequestException("القالب غير موجود");
    }
    if (existing._count.campaigns > 0) {
      throw new BadRequestException(
        "لا يمكن حذف قالب مرتبط بحملات. عطّله أو أنشئ قالبًا جديدًا",
      );
    }

    await this.prisma.template.delete({ where: { id } });
    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "templates.delete",
      entityType: "Template",
      entityId: id,
      before: existing,
    });
    return { ok: true };
  }

  @Get()
  @RequirePermissions("campaigns.manage")
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      include: { template: true, recipients: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Post()
  @RequirePermissions("campaigns.manage")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      templateId?: string;
      contactIds?: string[];
      scheduledAt?: string;
    },
  ) {
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException("اسم الحملة مطلوب");
    }

    const contactIds = body.contactIds ?? [];
    if (!contactIds.length) {
      throw new BadRequestException("حدد مستلمًا واحدًا على الأقل");
    }
    if (!body.templateId) {
      throw new BadRequestException("اختر قالب الرسالة قبل إنشاء الحملة");
    }

    const template = await this.prisma.template.findFirst({
      where: { id: body.templateId, organizationId: user.organizationId },
    });
    if (!template) {
      throw new BadRequestException("القالب المحدد غير موجود");
    }

    const owned = await this.prisma.contact.findMany({
      where: {
        organizationId: user.organizationId,
        id: { in: contactIds },
      },
      select: { id: true },
    });
    if (owned.length !== contactIds.length) {
      throw new BadRequestException(
        "بعض العملاء المحددون غير موجودين في مؤسستك",
      );
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        name,
        templateId: body.templateId,
        status: body.scheduledAt ? "scheduled" : "draft",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        recipients: {
          create: contactIds.map((contactId) => ({
            contactId,
            status: "pending",
          })),
        },
        stats: { sent: 0, failed: 0, pending: contactIds.length },
      },
      include: { recipients: true, template: true },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "campaigns.create",
      entityType: "Campaign",
      entityId: campaign.id,
    });

    return campaign;
  }

  @Post(":id/send")
  @RequirePermissions("campaigns.manage")
  async send(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        template: true,
        recipients: { include: { contact: true } },
      },
    });
    if (!campaign) {
      throw new BadRequestException("الحملة غير موجودة");
    }
    if (!campaign.recipients.length) {
      throw new BadRequestException("لا يوجد مستلمون لهذه الحملة");
    }
    if (!campaign.templateId || !campaign.template?.body) {
      throw new BadRequestException("الحملة بلا قالب صالح");
    }

    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        organizationId: user.organizationId,
        status: { in: ["connected", "pending"] },
      },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    if (!account) {
      throw new BadRequestException(
        "اربط قناة واتساب أولًا من صفحة قنوات واتساب قبل إرسال الحملات",
      );
    }

    let sent = 0;
    let failed = 0;

    await this.prisma.campaign.update({
      where: { id },
      data: { status: "running" },
    });

    for (const recipient of campaign.recipients) {
      const recipientName = recipient.contact.name || recipient.contact.waId;
      const bodyText = campaign.template.body.replace(
        /\{\{\s*1\s*\}\}/g,
        recipientName,
      );

      let result;
      try {
        result = await sendWhatsAppTemplate({
          phoneNumberId: account.phoneNumberId,
          accessToken: account.accessTokenEnc || "mock",
          to: recipient.contact.waId,
          templateName: campaign.template.name,
          language: campaign.template.language,
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: recipientName }],
            },
          ],
        });
        if (result.status === "failed") {
          throw new Error("template send failed");
        }
      } catch {
        try {
          result = await sendWhatsAppText({
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessTokenEnc || "mock",
            to: recipient.contact.waId,
            body: bodyText,
          });
        } catch (error) {
          failed += 1;
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "failed",
              error: error instanceof Error ? error.message : "error",
            },
          });
          continue;
        }
      }

      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: result.status === "failed" ? "failed" : "sent",
          sentAt: new Date(),
          error: result.status === "failed" ? "send failed" : null,
        },
      });

      if (result.status === "failed") {
        failed += 1;
        continue;
      }
      sent += 1;

      // Log outbound template into conversation (create/open if missing).
      try {
        let conversation = await this.prisma.conversation.findFirst({
          where: {
            organizationId: user.organizationId,
            contactId: recipient.contactId,
            status: { in: ["open", "pending"] },
          },
          orderBy: { updatedAt: "desc" },
        });
        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              organizationId: user.organizationId,
              contactId: recipient.contactId,
              whatsappAccountId: account.id,
              status: "open",
              assigneeType: "bot",
              lastMessageAt: new Date(),
              unreadCount: 0,
            },
          });
        }
        await this.prisma.message.create({
          data: {
            organizationId: user.organizationId,
            conversationId: conversation.id,
            direction: "outbound",
            channel: "whatsapp",
            type: "template",
            body: bodyText,
            templateName: campaign.template.name,
            providerMessageId: result.providerMessageId || null,
            status: result.status,
            sentByUserId: user.userId,
            rawPayload: result.raw ? asJson(result.raw) : undefined,
          },
        });
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            whatsappAccountId: account.id,
          },
        });
      } catch {
        // Never fail the campaign send because of best-effort message logging.
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: "completed",
        stats: { sent, failed, pending: 0 },
      },
      include: { recipients: true, template: true },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "campaigns.send",
      entityType: "Campaign",
      entityId: id,
      after: { sent, failed },
    });

    return updated;
  }
}
