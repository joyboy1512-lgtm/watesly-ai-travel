import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  parseInboundWebhook,
  parseStatusWebhook,
  verifyWebhookChallenge,
} from "@watesly-travel/whatsapp-core";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";
import { AuditService } from "../common/audit.service";
import { sanitizeWhatsAppAccount } from "../common/money";
import { BookingsService } from "../bookings/bookings.service";
import { parseInboundIntent } from "./inbound-intent";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
    private readonly audit: AuditService,
    private readonly bookings: BookingsService,
  ) {}

  verify(query: {
    "hub.mode"?: string;
    "hub.verify_token"?: string;
    "hub.challenge"?: string;
  }) {
    const challenge = verifyWebhookChallenge({
      mode: query["hub.mode"],
      token: query["hub.verify_token"],
      challenge: query["hub.challenge"],
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "watesly_dev_verify",
    });
    if (!challenge) throw new BadRequestException("Webhook verification failed");
    return challenge;
  }

  verifySignature(rawBody: string | Buffer, signatureHeader?: string) {
    const secret = process.env.WHATSAPP_APP_SECRET;
    const allowDev =
      process.env.NODE_ENV !== "production" ||
      process.env.WHATSAPP_SKIP_SIGNATURE === "true";

    if (!secret) {
      if (allowDev) return true;
      throw new BadRequestException("WHATSAPP_APP_SECRET غير مضبوط");
    }

    if (!signatureHeader?.startsWith("sha256=")) {
      if (allowDev) return true;
      throw new BadRequestException("توقيع Webhook مفقود");
    }

    const expected = createHmac("sha256", secret)
      .update(typeof rawBody === "string" ? rawBody : rawBody)
      .digest("hex");
    const provided = signatureHeader.slice("sha256=".length);
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException("توقيع Webhook غير صالح");
    }
    return true;
  }

  async listAccounts(organizationId: string) {
    const rows = await this.prisma.whatsAppAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) =>
      sanitizeWhatsAppAccount(row as unknown as Record<string, unknown>),
    );
  }

  async upsertAccount(
    organizationId: string,
    dto: {
      phoneNumberId: string;
      businessAccountId?: string;
      displayPhone?: string;
      accessToken?: string;
      status?: string;
      channelName?: string;
      channelType?: string;
      isDefault?: boolean;
    },
    actorUserId: string,
  ) {
    if (!dto.phoneNumberId?.trim()) {
      throw new BadRequestException("phoneNumberId مطلوب");
    }

    const existingCount = await this.prisma.whatsAppAccount.count({
      where: { organizationId },
    });
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;

    const account = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.whatsAppAccount.upsert({
        where: {
          organizationId_phoneNumberId: {
            organizationId,
            phoneNumberId: dto.phoneNumberId.trim(),
          },
        },
        update: {
          businessAccountId: dto.businessAccountId || null,
          displayPhone: dto.displayPhone || null,
          ...(dto.accessToken?.trim()
            ? { accessTokenEnc: dto.accessToken.trim() }
            : {}),
          status: dto.status || "connected",
          channelName: dto.channelName?.trim() || null,
          channelType: dto.channelType?.trim() || "whatsapp",
          ...(dto.isDefault === true ? { isDefault: true } : {}),
        },
        create: {
          organizationId,
          phoneNumberId: dto.phoneNumberId.trim(),
          businessAccountId: dto.businessAccountId || null,
          displayPhone: dto.displayPhone || null,
          accessTokenEnc: dto.accessToken?.trim() || "mock",
          status: dto.status || "connected",
          channelName: dto.channelName?.trim() || null,
          channelType: dto.channelType?.trim() || "whatsapp",
          isDefault: shouldBeDefault,
          webhookVerifiedAt: new Date(),
        },
      });

      if (shouldBeDefault) {
        await tx.whatsAppAccount.updateMany({
          where: { organizationId, id: { not: saved.id } },
          data: { isDefault: false },
        });
      }

      return saved;
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "whatsapp.account.upsert",
      entityType: "WhatsAppAccount",
      entityId: account.id,
      after: { phoneNumberId: account.phoneNumberId, status: account.status },
    });

    return sanitizeWhatsAppAccount(
      account as unknown as Record<string, unknown>,
    );
  }

  async deleteAccount(organizationId: string, id: string, actorUserId: string) {
    const account = await this.getAccountOrThrow(organizationId, id);

    const conversationCount = await this.prisma.conversation.count({
      where: { whatsappAccountId: id },
    });
    if (conversationCount > 0) {
      throw new BadRequestException(
        "لا يمكن حذف قناة مرتبطة بمحادثات. عطّلها بدلاً من ذلك",
      );
    }

    await this.prisma.whatsAppAccount.delete({ where: { id } });

    if (account.isDefault) {
      const next = await this.prisma.whatsAppAccount.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await this.prisma.whatsAppAccount.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "whatsapp.account.delete",
      entityType: "WhatsAppAccount",
      entityId: id,
      before: { phoneNumberId: account.phoneNumberId },
    });

    return { ok: true };
  }

  async setDefaultAccount(
    organizationId: string,
    id: string,
    actorUserId: string,
  ) {
    await this.getAccountOrThrow(organizationId, id);

    const account = await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppAccount.updateMany({
        where: { organizationId, id: { not: id } },
        data: { isDefault: false },
      });
      return tx.whatsAppAccount.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    await this.audit.log({
      organizationId,
      actorUserId,
      action: "whatsapp.account.set_default",
      entityType: "WhatsAppAccount",
      entityId: id,
    });

    return sanitizeWhatsAppAccount(
      account as unknown as Record<string, unknown>,
    );
  }

  async testConnection(organizationId: string, accountId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException("حساب واتساب غير موجود");
    }

    const token = account.accessTokenEnc || "";
    if (!token || token.startsWith("mock")) {
      return {
        ok: true,
        mode: "mock",
        message:
          "الحساب يعمل بوضع تجريبي (mock). الإرسال المحلي ناجح دون Graph API.",
        phoneNumberId: account.phoneNumberId,
        status: account.status,
      };
    }

    const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
    const base =
      process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com";
    const url = `${base}/${graphVersion}/${account.phoneNumberId}?fields=display_phone_number,verified_name`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = (await response.json().catch(() => ({}))) as {
        display_phone_number?: string;
        verified_name?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        return {
          ok: false,
          mode: "live",
          message: raw.error?.message || "فشل التحقق من التوكن عبر Meta",
          phoneNumberId: account.phoneNumberId,
          status: account.status,
        };
      }

      if (raw.display_phone_number && !account.displayPhone) {
        await this.prisma.whatsAppAccount.update({
          where: { id: account.id },
          data: { displayPhone: raw.display_phone_number },
        });
      }

      return {
        ok: true,
        mode: "live",
        message: `الاتصال ناجح${raw.verified_name ? ` · ${raw.verified_name}` : ""}`,
        phoneNumberId: account.phoneNumberId,
        displayPhone: raw.display_phone_number || account.displayPhone,
        status: account.status,
      };
    } catch (error) {
      return {
        ok: false,
        mode: "live",
        message:
          error instanceof Error ? error.message : "تعذر الاتصال بـ Meta API",
        phoneNumberId: account.phoneNumberId,
        status: account.status,
      };
    }
  }

  async handleWebhook(payload: unknown) {
    const statusUpdates = parseStatusWebhook(payload);
    let statusesUpdated = 0;
    for (const st of statusUpdates) {
      const updated = await this.prisma.message.updateMany({
        where: { providerMessageId: st.messageId },
        data: {
          status: st.status,
          ...(st.errors
            ? { rawPayload: asJson({ status: st.status, errors: st.errors }) }
            : {}),
        },
      });
      statusesUpdated += updated.count;
    }

    const messages = parseInboundWebhook(payload);
    const processed = [];

    for (const msg of messages) {
      const account = await this.prisma.whatsAppAccount.findFirst({
        where: { phoneNumberId: msg.phoneNumberId, status: "connected" },
      });
      if (!account) continue;

      const contact = await this.prisma.contact.upsert({
        where: {
          organizationId_waId: {
            organizationId: account.organizationId,
            waId: msg.from,
          },
        },
        update: {
          lastContactedAt: new Date(),
          source: "whatsapp",
          name: msg.contactName || undefined,
        },
        create: {
          organizationId: account.organizationId,
          waId: msg.from,
          name: msg.contactName || msg.from,
          source: "whatsapp",
          lastContactedAt: new Date(),
        },
      });

      let conversation = await this.prisma.conversation.findFirst({
        where: {
          organizationId: account.organizationId,
          contactId: contact.id,
          status: { in: ["open", "pending"] },
          OR: [
            { whatsappAccountId: account.id },
            { whatsappAccountId: null },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            organizationId: account.organizationId,
            contactId: contact.id,
            whatsappAccountId: account.id,
            status: "open",
            assigneeType: "bot",
            lastMessageAt: new Date(),
            unreadCount: 1,
          },
        });
      } else {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
            whatsappAccountId: account.id,
          },
        });
      }

      const existing = await this.prisma.message.findFirst({
        where: {
          organizationId: account.organizationId,
          providerMessageId: msg.messageId,
        },
      });
      if (existing) {
        processed.push({ skipped: true, messageId: existing.id });
        continue;
      }

      const message = await this.prisma.message.create({
        data: {
          organizationId: account.organizationId,
          conversationId: conversation.id,
          direction: "inbound",
          channel: "whatsapp",
          type: msg.type,
          body: msg.text || "",
          providerMessageId: msg.messageId,
          status: "delivered",
          rawPayload: asJson(msg.raw),
        },
      });

      if (msg.text) {
        try {
          await this.routeInboundText({
            organizationId: account.organizationId,
            conversationId: conversation.id,
            contactId: contact.id,
            messageId: message.id,
            text: msg.text,
          });
        } catch (error) {
          // Never fail Meta webhook delivery because of bot/search errors.
          // eslint-disable-next-line no-console
          console.error("[whatsapp] inbound pipeline error", error);
          try {
            await this.pipeline.replyToConversation({
              organizationId: account.organizationId,
              conversationId: conversation.id,
              body: "حدث خطأ مؤقت أثناء معالجة طلبك. جرّب مجددًا أو اكتب «موظف» للتحويل البشري.",
            });
          } catch {
            // ignore secondary failures
          }
        }
      }

      processed.push({ messageId: message.id, conversationId: conversation.id });
    }

    return { processed: processed.length, statusesUpdated, items: processed };
  }

  private async routeInboundText(input: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    messageId: string;
    text: string;
  }) {
    const intent = parseInboundIntent(input.text);

    if (intent.type === "handoff") {
      await this.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { assigneeType: "human", status: "pending" },
      });
      const handoff = await this.prisma.handoff.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          reason: "customer_request",
          status: "open",
          contextSummary: input.text,
        },
      });
      const agents = await this.prisma.membership.findMany({
        where: {
          organizationId: input.organizationId,
          status: "active",
          role: { code: { in: ["owner", "admin", "agent"] } },
        },
        select: { userId: true },
        take: 20,
      });
      if (agents.length) {
        await this.prisma.notification.createMany({
          data: agents.map((agent) => ({
            organizationId: input.organizationId,
            userId: agent.userId,
            type: "handoff",
            title: "طلب تحويل بشري من واتساب",
            body: "طلب العميل التحدث مع موظف",
            linkRef: `/dashboard/conversations?id=${input.conversationId}`,
          })),
        });
      }
      await this.pipeline.replyToConversation({
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        body: "تم تحويل محادثتك إلى موظف متخصص. سيتواصل معك قريبًا.",
      });
      await this.audit.log({
        organizationId: input.organizationId,
        action: "handoff.create",
        entityType: "Handoff",
        entityId: handoff.id,
        after: { source: "whatsapp_keyword" },
      });
      return;
    }

    if (intent.type === "accept") {
      const quote = await this.prisma.quote.findFirst({
        where: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          status: { in: ["sent", "accepted"] },
        },
        include: {
          bookingRequests: {
            where: { status: "price_changed" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!quote) {
        await this.pipeline.replyToConversation({
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          body: "لا يوجد عرض سعر معلّق حاليًا. أرسل تفاصيل سفرك لنجهّز عرضًا جديدًا.",
        });
        return;
      }

      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          organizationId: input.organizationId,
          quoteId: quote.id,
          status: { in: ["on_hold", "confirmed", "ticketed"] },
        },
      });
      if (existingBooking) {
        await this.pipeline.replyToConversation({
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          body: "لديك بالفعل طلب حجز قيد المعالجة لهذا العرض. سيتابع معك الفريق.",
        });
        return;
      }

      const hasPriceChange = quote.bookingRequests.length > 0;
      await this.bookings.createFromQuote({
        organizationId: input.organizationId,
        quoteId: quote.id,
        requestedBy: "customer",
        notifyCustomer: true,
        selectedItemIndex: intent.optionIndex,
        confirmPriceChange: intent.confirmPriceChange || hasPriceChange,
      });
      return;
    }

    await this.pipeline.handleInboundText({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      messageId: input.messageId,
      text: intent.text,
    });
  }

  /** Local MVP helper: simulate inbound WhatsApp without Meta. */
  async simulateInbound(
    organizationId: string,
    dto: { waId: string; text: string; name?: string },
    actorUserId: string,
  ) {
    if (!dto.waId || !dto.text) {
      throw new BadRequestException("waId و text مطلوبان");
    }

    let account = await this.prisma.whatsAppAccount.findFirst({
      where: { organizationId, status: "connected" },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    if (!account) {
      account = await this.prisma.whatsAppAccount.findFirst({
        where: { organizationId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
    }
    if (!account) {
      account = await this.prisma.whatsAppAccount.create({
        data: {
          organizationId,
          phoneNumberId: `mock_${organizationId.slice(0, 8)}`,
          displayPhone: "+966500000000",
          accessTokenEnc: "mock",
          status: "connected",
          webhookVerifiedAt: new Date(),
        },
      });
    }

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: account.phoneNumberId },
                messages: [
                  {
                    from: dto.waId,
                    id: `sim_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "text",
                    text: { body: dto.text },
                  },
                ],
                contacts: [{ profile: { name: dto.name || dto.waId }, wa_id: dto.waId }],
              },
            },
          ],
        },
      ],
    };

    const result = await this.handleWebhook(payload);
    await this.audit.log({
      organizationId,
      actorUserId,
      action: "whatsapp.simulate_inbound",
      entityType: "WhatsAppAccount",
      entityId: account.id,
      after: { waId: dto.waId, text: dto.text },
    });
    return result;
  }

  async getAccountOrThrow(organizationId: string, id: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException("حساب واتساب غير موجود");
    return account;
  }
}
