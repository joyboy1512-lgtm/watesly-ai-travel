import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  createMessageTemplate,
  deleteMessageTemplate,
  listMessageTemplates,
  normalizeTemplateName,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@watesly-travel/whatsapp-core";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function statsOf(campaign: { stats?: unknown; recipients?: Array<{ status: string }> }) {
  const stored = asRecord(campaign.stats);
  const recipients = campaign.recipients || [];
  const sent =
    typeof stored.sent === "number"
      ? stored.sent
      : recipients.filter((r) => ["sent", "delivered", "read"].includes(r.status)).length;
  const failed =
    typeof stored.failed === "number"
      ? stored.failed
      : recipients.filter((r) => r.status === "failed").length;
  const pending =
    typeof stored.pending === "number"
      ? stored.pending
      : recipients.filter((r) => r.status === "pending" || r.status === "queued").length;
  return { ...stored, sent, failed, pending } as Record<string, unknown> & {
    sent: number;
    failed: number;
    pending: number;
    approvedAt?: string;
  };
}

const ARCHIVABLE = new Set([
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
  "paused",
]);

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async defaultWhatsApp(organizationId: string) {
    return this.prisma.whatsAppAccount.findFirst({
      where: {
        organizationId,
        channelType: "whatsapp",
        status: { in: ["connected", "pending"] },
      },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async submitTemplate(organizationId: string, templateId: string, actorUserId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) throw new NotFoundException("القالب غير موجود");
    if (template.status === "approved" && template.metaTemplateId) {
      throw new BadRequestException("القالب معتمد مسبقاً");
    }

    const account = await this.defaultWhatsApp(organizationId);
    if (!account) {
      throw new BadRequestException("اربط قناة واتساب قبل إرسال القالب إلى ميتا");
    }

    let name = template.name;
    try {
      name = normalizeTemplateName(template.name);
    } catch {
      throw new BadRequestException("اسم القالب يجب أن يكون أحرفاً إنجليزية وأرقاماً وشرطة سفلية");
    }

    const result = await createMessageTemplate({
      accessToken: account.accessTokenEnc || "mock",
      wabaId: account.businessAccountId || "",
      template: {
        name,
        body: template.body,
        language: template.language,
        category: template.category,
        header: template.header,
        footer: template.footer,
        headerType: template.headerType,
        headerMediaUrl: template.headerMediaUrl,
      },
    });

    const status = result.ok
      ? result.mock
        ? "approved"
        : String(result.status || "PENDING").toLowerCase()
      : "rejected";

    const updated = await this.prisma.template.update({
      where: { id: template.id },
      data: {
        name,
        status,
        metaTemplateId: result.id || template.metaTemplateId,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "templates.submit",
      entityType: "Template",
      entityId: template.id,
      after: { status, metaTemplateId: updated.metaTemplateId, mock: result.mock },
    });

    if (!result.ok) {
      throw new BadRequestException(result.error || "فشل إرسال القالب إلى ميتا");
    }
    return { ...updated, mock: result.mock };
  }

  async syncTemplates(organizationId: string, actorUserId: string, accountId?: string) {
    const account = accountId
      ? await this.prisma.whatsAppAccount.findFirst({
          where: { id: accountId, organizationId, channelType: "whatsapp" },
        })
      : await this.defaultWhatsApp(organizationId);
    if (!account) throw new BadRequestException("لا توجد قناة واتساب للمزامنة");

    const listed = await listMessageTemplates({
      accessToken: account.accessTokenEnc || "mock",
      wabaId: account.businessAccountId || "",
    });
    if (!listed.ok) {
      throw new BadRequestException(listed.error || "فشل مزامنة القوالب من ميتا");
    }

    let created = 0;
    let updated = 0;
    for (const item of listed.items) {
      const existing = await this.prisma.template.findFirst({
        where: {
          organizationId,
          name: item.name,
          language: item.language,
        },
      });
      const status = item.status || "pending";
      const category = item.category || "utility";
      const bodyFromMeta = extractBodyFromComponents(item.components);
      if (!existing) {
        await this.prisma.template.create({
          data: {
            organizationId,
            name: item.name,
            language: item.language,
            category,
            status,
            body: bodyFromMeta || item.name,
            metaTemplateId: item.id || null,
          },
        });
        created += 1;
      } else {
        await this.prisma.template.update({
          where: { id: existing.id },
          data: {
            status,
            category,
            metaTemplateId: item.id || existing.metaTemplateId,
            ...(bodyFromMeta && !existing.body ? { body: bodyFromMeta } : {}),
          },
        });
        updated += 1;
      }
    }

    const pending = await this.prisma.template.findMany({
      where: { organizationId, status: { in: ["pending", "draft"] } },
    });
    const index = new Map(
      listed.items.map((item) => [`${item.name}::${item.language}`, item]),
    );
    for (const template of pending) {
      const meta = index.get(`${template.name}::${template.language}`);
      if (!meta) continue;
      await this.prisma.template.update({
        where: { id: template.id },
        data: {
          status: meta.status || template.status,
          metaTemplateId: meta.id || template.metaTemplateId,
        },
      });
    }

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "templates.sync",
      entityType: "Template",
      after: { created, updated, mock: listed.mock },
    });
    return { ok: true, created, updated, mock: listed.mock, count: listed.items.length };
  }

  async deleteTemplateOnMeta(organizationId: string, name: string) {
    const account = await this.defaultWhatsApp(organizationId);
    if (!account?.businessAccountId) return;
    await deleteMessageTemplate({
      accessToken: account.accessTokenEnc || "mock",
      wabaId: account.businessAccountId,
      templateName: name,
    }).catch(() => undefined);
  }

  async preflight(
    organizationId: string,
    body: { templateId?: string; contactIds?: string[]; campaignId?: string },
  ) {
    const issues: string[] = [];
    const warnings: string[] = [];

    let templateId = body.templateId;
    let contactIds = body.contactIds || [];
    if (body.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: body.campaignId, organizationId },
        include: { recipients: true, template: true },
      });
      if (!campaign) throw new NotFoundException("الحملة غير موجودة");
      templateId = campaign.templateId || templateId;
      if (!contactIds.length) {
        contactIds = campaign.recipients.map((r) => r.contactId);
      }
    }

    const account = await this.defaultWhatsApp(organizationId);
    if (!account) issues.push("لا توجد قناة واتساب متصلة");
    else if (account.status !== "connected") {
      warnings.push("قناة واتساب ليست في حالة متصل بالكامل");
    }

    if (!templateId) issues.push("اختر قالباً معتمداً");
    const template = templateId
      ? await this.prisma.template.findFirst({
          where: { id: templateId, organizationId },
        })
      : null;
    if (templateId && !template) issues.push("القالب غير موجود");
    if (template && template.status !== "approved") {
      issues.push("القالب غير معتمد من ميتا بعد");
    }

    if (!contactIds.length) issues.push("حدد مستلماً واحداً على الأقل");
    if (contactIds.length) {
      const owned = await this.prisma.contact.count({
        where: { organizationId, id: { in: contactIds } },
      });
      if (owned !== contactIds.length) {
        issues.push("بعض المستلمين غير موجودين في المؤسسة");
      }
    }

    return {
      ok: issues.length === 0,
      ready: issues.length === 0,
      issues,
      warnings,
      template: template
        ? { id: template.id, name: template.name, status: template.status }
        : null,
      account: account
        ? {
            id: account.id,
            displayPhone: account.displayPhone,
            status: account.status,
            isDefault: account.isDefault,
          }
        : null,
      recipientCount: contactIds.length,
    };
  }

  async approve(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!["draft", "paused", "scheduled"].includes(campaign.status)) {
      throw new BadRequestException("لا يمكن اعتماد الحملة في حالتها الحالية");
    }
    const check = await this.preflight(organizationId, { campaignId });
    if (!check.ok) {
      throw new BadRequestException(check.issues.join(" · "));
    }
    const stats = statsOf(campaign);
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "approved",
        stats: asJson({
          ...stats,
          approvedAt: new Date().toISOString(),
          approvedBy: actorUserId,
        }),
      },
      include: { recipients: true, template: true },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.approve",
      entityType: "Campaign",
      entityId: campaignId,
    });
    return updated;
  }

  async start(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!["draft", "scheduled", "paused", "approved"].includes(campaign.status)) {
      throw new BadRequestException("لا يمكن بدء الحملة في حالتها الحالية");
    }
    const stats = statsOf(campaign);
    if (!stats.approvedAt && campaign.status !== "approved") {
      throw new BadRequestException("اعتماد الحملة مطلوب قبل الإرسال");
    }
    const check = await this.preflight(organizationId, { campaignId });
    if (!check.ok) throw new BadRequestException(check.issues.join(" · "));
    return this.send(organizationId, campaignId, actorUserId);
  }

  async pause(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!["scheduled", "running"].includes(campaign.status)) {
      throw new BadRequestException("لا يمكن إيقاف الحملة مؤقتاً");
    }
    const stats = statsOf(campaign);
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "paused",
        stats: asJson({ ...stats, pausedAt: new Date().toISOString() }),
      },
      include: { recipients: true, template: true },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.pause",
      entityType: "Campaign",
      entityId: campaignId,
    });
    return updated;
  }

  async cancel(
    organizationId: string,
    campaignId: string,
    actorUserId: string,
    reason?: string,
  ) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (["completed", "cancelled", "archived"].includes(campaign.status)) {
      throw new BadRequestException("لا يمكن إلغاء الحملة");
    }
    const stats = statsOf(campaign);
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "cancelled",
        stats: asJson({
          ...stats,
          cancelledAt: new Date().toISOString(),
          cancelledReason: (reason || "cancelled").slice(0, 500),
        }),
      },
      include: { recipients: true, template: true },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.cancel",
      entityType: "Campaign",
      entityId: campaignId,
    });
    return updated;
  }

  async retryFailed(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    await this.prisma.campaignRecipient.updateMany({
      where: { campaignId, status: "failed" },
      data: { status: "pending", error: null },
    });
    const pending = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: "pending" },
    });
    if (!pending) throw new BadRequestException("لا توجد رسائل فاشلة لإعادة المحاولة");
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "approved",
        stats: asJson({
          ...statsOf(campaign),
          pending,
          retryAt: new Date().toISOString(),
        }),
      },
    });
    return this.send(organizationId, campaignId, actorUserId);
  }

  async archive(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!ARCHIVABLE.has(campaign.status) && campaign.status !== "archived") {
      throw new BadRequestException("يمكن أرشفة الحملات المكتملة أو الملغاة أو المتوقفة فقط");
    }
    const stats = statsOf(campaign);
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "archived",
        stats: asJson({ ...stats, archivedAt: new Date().toISOString() }),
      },
      include: { recipients: true, template: true },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.archive",
      entityType: "Campaign",
      entityId: campaignId,
    });
    return updated;
  }

  async unarchive(organizationId: string, campaignId: string, actorUserId: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (campaign.status !== "archived") {
      throw new BadRequestException("الحملة ليست مؤرشفة");
    }
    const stats = statsOf(campaign);
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "completed",
        stats: asJson({ ...stats, archivedAt: null, unarchivedAt: new Date().toISOString() }),
      },
      include: { recipients: true, template: true },
    });
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.unarchive",
      entityType: "Campaign",
      entityId: campaignId,
    });
    return updated;
  }

  async report(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        template: true,
        recipients: { include: { contact: true } },
      },
    });
    if (!campaign) throw new NotFoundException("الحملة غير موجودة");
    const counts: Record<string, number> = {};
    for (const row of campaign.recipients) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
    const sent = (counts.sent || 0) + (counts.delivered || 0) + (counts.read || 0);
    const delivered = (counts.delivered || 0) + (counts.read || 0);
    const read = counts.read || 0;
    const failed = counts.failed || 0;
    const pending = (counts.pending || 0) + (counts.queued || 0);
    const total = campaign.recipients.length;
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      template: campaign.template
        ? { id: campaign.template.id, name: campaign.template.name, status: campaign.template.status }
        : null,
      total,
      pending,
      sent,
      delivered,
      read,
      failed,
      skipped: counts.skipped || 0,
      deliveryRate: Number((((delivered + read) / Math.max(sent + delivered + read, 1)) * 100).toFixed(2)),
      readRate: Number(((read / Math.max(delivered + read, 1)) * 100).toFixed(2)),
      stats: campaign.stats,
      recipients: campaign.recipients.map((row) => ({
        id: row.id,
        status: row.status,
        error: row.error,
        sentAt: row.sentAt,
        contact: {
          id: row.contact.id,
          name: row.contact.name,
          waId: row.contact.waId,
        },
      })),
    };
  }

  async send(organizationId: string, id: string, actorUserId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        recipients: { include: { contact: true } },
      },
    });
    if (!campaign) throw new BadRequestException("الحملة غير موجودة");
    if (!campaign.recipients.length) {
      throw new BadRequestException("لا يوجد مستلمون لهذه الحملة");
    }
    if (!campaign.templateId || !campaign.template?.body) {
      throw new BadRequestException("الحملة بلا قالب صالح");
    }
    if (campaign.template.status !== "approved") {
      throw new BadRequestException("لا يمكن الإرسال إلا بقالب معتمد من ميتا");
    }

    const account = await this.defaultWhatsApp(organizationId);
    if (!account) {
      throw new BadRequestException(
        "اربط قناة واتساب أولًا من صفحة قنوات واتساب قبل إرسال الحملات",
      );
    }

    let sent = 0;
    let failed = 0;
    const pendingRecipients = campaign.recipients.filter(
      (row) => row.status === "pending" || row.status === "queued",
    );

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: "running",
        stats: asJson({
          ...statsOf(campaign),
          startedAt: new Date().toISOString(),
        }),
      },
    });

    for (const recipient of pendingRecipients) {
      const live = await this.prisma.campaign.findUnique({
        where: { id },
        select: { status: true },
      });
      if (live?.status === "paused" || live?.status === "cancelled") {
        break;
      }

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

      try {
        let conversation = await this.prisma.conversation.findFirst({
          where: {
            organizationId,
            contactId: recipient.contactId,
            status: { in: ["open", "pending"] },
          },
          orderBy: { updatedAt: "desc" },
        });
        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              organizationId,
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
            organizationId,
            conversationId: conversation.id,
            direction: "outbound",
            channel: "whatsapp",
            type: "template",
            body: bodyText,
            templateName: campaign.template.name,
            providerMessageId: result.providerMessageId || null,
            status: result.status,
            sentByUserId: actorUserId,
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
        // best-effort inbox logging
      }
    }

    const leftover = await this.prisma.campaignRecipient.count({
      where: { campaignId: id, status: { in: ["pending", "queued"] } },
    });
    const live = await this.prisma.campaign.findUnique({
      where: { id },
      select: { status: true, stats: true },
    });
    const finalStatus =
      live?.status === "paused" || live?.status === "cancelled"
        ? live.status
        : leftover
          ? "paused"
          : failed && sent
            ? "completed_with_errors"
            : failed && !sent
              ? "failed"
              : "completed";

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: finalStatus,
        stats: asJson({
          ...asRecord(live?.stats),
          sent,
          failed,
          pending: leftover,
          completedAt: leftover ? null : new Date().toISOString(),
        }),
      },
      include: { recipients: true, template: true },
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "campaigns.send",
      entityType: "Campaign",
      entityId: id,
      after: { sent, failed, status: finalStatus },
    });

    return updated;
  }

  private async getCampaign(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { recipients: true, template: true },
    });
    if (!campaign) throw new NotFoundException("الحملة غير موجودة");
    return campaign;
  }
}

function extractBodyFromComponents(components: unknown): string | null {
  if (!Array.isArray(components)) return null;
  for (const row of components) {
    if (!row || typeof row !== "object") continue;
    const item = row as { type?: string; text?: string };
    if (String(item.type || "").toUpperCase() === "BODY" && item.text) {
      return item.text;
    }
  }
  return null;
}
