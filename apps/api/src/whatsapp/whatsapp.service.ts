import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  debugAccessToken,
  fetchWabaSubscribedApps,
  formatTierHint,
  inspectCommerceCatalog,
  listWabaPhoneNumbers,
  matchWabaPhoneNumber,
  parseHotelPickRowId,
  parseInboundWebhook,
  parseMetaMessagingWebhook,
  parseStatusWebhook,
  parseTelegramUpdate,
  phoneNumberIdsMatch,
  prefixChannelId,
  probeChannel,
  formatPeerId,
  metaWebhookObject,
  normalizeChannelType,
  QUALITY_LABELS_AR,
  setTelegramWebhook,
  subscribeWabaWebhook,
  syncAccountHealth,
  telegramGetMe,
  verifyWebhookChallenge,
} from "@watesly-travel/whatsapp-core";
import type { WhatsAppInboundMessage } from "@watesly-travel/whatsapp-core";
import { readOrgSettings } from "../common/org-settings";
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

function asJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function preferInboundAccount<
  T extends { status: string; isDefault: boolean; updatedAt: Date },
>(rows: T[]): T | null {
  if (!rows.length) return null;
  const rank = (status: string) =>
    status === "connected" ? 0 : status === "pending" ? 1 : 2;
  return (
    [...rows].sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        Number(b.isDefault) - Number(a.isDefault) ||
        b.updatedAt.getTime() - a.updatedAt.getTime(),
    )[0] ?? null
  );
}

@Injectable()
export class WhatsappService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
    private readonly audit: AuditService,
    private readonly bookings: BookingsService,
  ) {}

  async onModuleInit() {
    try {
      await this.activateLiveReceiving();
    } catch (error) {
      // A missing database or a Meta outage must not stop the API.
      // eslint-disable-next-line no-console
      console.error("[whatsapp] activate receiving skipped", error);
    }
  }

  webhookSetup() {
    return {
      webhookUrl: `${this.publicApiBase()}/whatsapp/webhook`,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "watesly_dev_verify",
      appSecretConfigured: Boolean(process.env.WHATSAPP_APP_SECRET),
    };
  }

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

  async listAccounts(organizationId: string, includeArchived = false) {
    const rows = await this.prisma.whatsAppAccount.findMany({
      where: {
        organizationId,
        ...(includeArchived ? {} : { status: { not: "archived" } }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.presentAccount(row));
  }

  async upsertAccount(
    organizationId: string,
    dto: {
      phoneNumberId?: string;
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
    const channelType = normalizeChannelType(dto.channelType);
    const resolved = await this.resolveChannelIdentity(channelType, dto);

    const existingCount = await this.prisma.whatsAppAccount.count({
      where: { organizationId },
    });
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;

    const account = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.whatsAppAccount.upsert({
        where: {
          organizationId_phoneNumberId: {
            organizationId,
            phoneNumberId: resolved.phoneNumberId,
          },
        },
        update: {
          businessAccountId: dto.businessAccountId || null,
          displayPhone: resolved.displayPhone || dto.displayPhone || null,
          ...(dto.accessToken?.trim()
            ? { accessTokenEnc: dto.accessToken.trim() }
            : {}),
          status: dto.status || "connected",
          channelName: resolved.channelName || dto.channelName?.trim() || null,
          channelType,
          ...(resolved.meta ? { meta: asJson(resolved.meta) } : {}),
          ...(dto.isDefault === true ? { isDefault: true } : {}),
        },
        create: {
          organizationId,
          phoneNumberId: resolved.phoneNumberId,
          businessAccountId: dto.businessAccountId || null,
          displayPhone: resolved.displayPhone || dto.displayPhone || null,
          accessTokenEnc: dto.accessToken?.trim() || "mock",
          status: dto.status || "pending",
          channelName: resolved.channelName || dto.channelName?.trim() || null,
          channelType,
          isDefault: shouldBeDefault,
          ...(resolved.meta ? { meta: asJson(resolved.meta) } : {}),
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

    return this.presentAccount(account);
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

    return this.presentAccount(account);
  }

  async archiveAccount(organizationId: string, id: string, actorUserId: string) {
    const account = await this.getAccountOrThrow(organizationId, id);
    const prevMeta = this.accountMeta(account);
    const updated = await this.prisma.whatsAppAccount.update({
      where: { id },
      data: {
        status: "archived",
        isDefault: false,
        meta: asJson({
          ...prevMeta,
          archivedAt: new Date().toISOString(),
        }),
      },
    });
    if (account.isDefault) {
      const next = await this.prisma.whatsAppAccount.findFirst({
        where: {
          organizationId,
          id: { not: id },
          status: { not: "archived" },
        },
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
      action: "whatsapp.account.archive",
      entityType: "WhatsAppAccount",
      entityId: id,
    });
    return this.presentAccount(updated);
  }

  async usageBoard(organizationId: string) {
    const accounts = await this.prisma.whatsAppAccount.findMany({
      where: { organizationId, status: { not: "archived" } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const items = [];
    for (const account of accounts) {
      const [conversations, inbound, outbound, campaignSent] = await Promise.all([
        this.prisma.conversation.count({
          where: { organizationId, whatsappAccountId: account.id },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            direction: "inbound",
            createdAt: { gte: since },
            conversation: { whatsappAccountId: account.id },
          },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            direction: "outbound",
            createdAt: { gte: since },
            conversation: { whatsappAccountId: account.id },
          },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            type: "template",
            createdAt: { gte: since },
            conversation: { whatsappAccountId: account.id },
          },
        }),
      ]);
      const presented = this.presentAccount(account);
      items.push({
        ...presented,
        conversations,
        inbound30d: inbound,
        outbound30d: outbound,
        campaignMessages30d: campaignSent,
      });
    }
    return {
      cycleDays: 30,
      channels: items,
      totals: {
        channels: items.length,
        conversations: items.reduce((sum, row) => sum + row.conversations, 0),
        inbound30d: items.reduce((sum, row) => sum + row.inbound30d, 0),
        outbound30d: items.reduce((sum, row) => sum + row.outbound30d, 0),
        campaignMessages30d: items.reduce(
          (sum, row) => sum + row.campaignMessages30d,
          0,
        ),
      },
    };
  }

  async tokenStatus(organizationId: string, accountId: string) {
    const account = await this.getAccountOrThrow(organizationId, accountId);
    const inspected = await debugAccessToken({
      accessToken: account.accessTokenEnc || "",
    });
    const prevMeta = this.accountMeta(account);
    await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        meta: asJson({
          ...prevMeta,
          tokenValid: inspected.valid,
          tokenError: inspected.error || null,
          tokenCheckedAt: new Date().toISOString(),
        }),
      },
    });
    return {
      accountId: account.id,
      ...inspected,
    };
  }

  async webhookStatus(organizationId: string, accountId: string) {
    const account = await this.getAccountOrThrow(organizationId, accountId);
    const channelType = normalizeChannelType(account.channelType);
    if (channelType === "telegram") {
      const meta = this.accountMeta(account);
      return {
        accountId: account.id,
        channelType,
        subscribed: Boolean(meta.webhookSet),
        mock: (account.accessTokenEnc || "").startsWith("mock"),
        webhookUrl: meta.webhookUrl || this.telegramWebhookUrl(account.id),
        message: meta.webhookSet
          ? "Webhook تلجرام مضبوط"
          : "اضغط مزامنة لضبط Webhook تلجرام",
      };
    }
    if (channelType !== "whatsapp") {
      return {
        accountId: account.id,
        channelType,
        subscribed: Boolean(account.webhookVerifiedAt),
        mock: (account.accessTokenEnc || "").startsWith("mock"),
        webhookUrl: `${this.publicApiBase()}/whatsapp/webhook`,
        message: "ماسنجر/إنستغرام يستخدمان نفس عنوان Webhook ميتا",
      };
    }
    const wabaId = account.businessAccountId || "";
    const result = await fetchWabaSubscribedApps({
      accessToken: account.accessTokenEnc || "",
      wabaId,
    });
    return {
      accountId: account.id,
      channelType,
      wabaId: wabaId || null,
      webhookUrl: `${this.publicApiBase()}/whatsapp/webhook`,
      ...result,
    };
  }

  async ensureWebhook(organizationId: string, accountId: string) {
    const account = await this.getAccountOrThrow(organizationId, accountId);
    const channelType = normalizeChannelType(account.channelType);
    const prevMeta = this.accountMeta(account);
    if (channelType === "telegram") {
      const probed = await this.testConnection(organizationId, accountId);
      return {
        accountId: account.id,
        channelType,
        subscribed: Boolean(probed.ok),
        webhookUrl: probed.webhookUrl,
        mock: probed.mode === "mock",
        message: probed.message,
      };
    }
    if (channelType !== "whatsapp") {
      return {
        accountId: account.id,
        channelType,
        subscribed: true,
        mock: (account.accessTokenEnc || "").startsWith("mock"),
        webhookUrl: `${this.publicApiBase()}/whatsapp/webhook`,
        message: "أضف اشتراك الرسائل في تطبيق ميتا على /whatsapp/webhook",
      };
    }
    const wabaId = account.businessAccountId || "";
    const result = await subscribeWabaWebhook({
      accessToken: account.accessTokenEnc || "",
      wabaId,
    });
    const setup = this.webhookSetup();
    await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        status:
          result.mock && account.status === "connected" ? "pending" : account.status,
        webhookVerifiedAt: result.mock
          ? null
          : result.ok
            ? new Date()
            : account.webhookVerifiedAt,
        meta: asJson({
          ...prevMeta,
          webhookSet: result.ok,
          webhookUrl: setup.webhookUrl,
          webhookEnsuredAt: new Date().toISOString(),
        }),
      },
    });
    return {
      accountId: account.id,
      channelType,
      wabaId: wabaId || null,
      webhookUrl: setup.webhookUrl,
      verifyToken: setup.verifyToken,
      appSecretConfigured: setup.appSecretConfigured,
      ...result,
    };
  }

  async syncHealth(organizationId: string, accountId: string) {
    const account = await this.getAccountOrThrow(organizationId, accountId);
    const health = await syncAccountHealth({
      accessToken: account.accessTokenEnc || "",
      phoneNumberId: account.phoneNumberId,
      wabaId: account.businessAccountId,
      displayPhone: account.displayPhone || undefined,
      channelName: account.channelName || undefined,
    });
    const prevMeta = this.accountMeta(account);
    const nextStatus =
      account.status === "archived"
        ? "archived"
        : health.mock
          ? "pending"
          : health.derivedStatus === "connected"
            ? "connected"
            : health.derivedStatus === "suspended"
              ? "disconnected"
              : "disconnected";
    const updated = await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: nextStatus,
        displayPhone: health.displayPhoneNumber || account.displayPhone,
        channelName: health.verifiedName || account.channelName,
        webhookVerifiedAt: health.mock
          ? null
          : health.derivedStatus === "connected"
            ? new Date()
            : account.webhookVerifiedAt,
        meta: asJson({
          ...prevMeta,
          health,
          healthSyncedAt: new Date().toISOString(),
          qualityRating: health.qualityRating,
          messagingLimitTier: health.messagingLimitTier,
          messagingLimit: health.messagingLimit,
          metaStatusMessage: health.metaStatusMessage,
        }),
      },
    });
    return this.presentAccount(updated);
  }

  async commerceReadiness(organizationId: string, accountId?: string) {
    const account = accountId
      ? await this.getAccountOrThrow(organizationId, accountId)
      : await this.prisma.whatsAppAccount.findFirst({
          where: {
            organizationId,
            channelType: "whatsapp",
            status: { not: "archived" },
          },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        });
    const settings = await readOrgSettings(this.prisma, organizationId);
    const commerce = asJsonRecord(settings.metaCommerce);
    const catalogId =
      (typeof commerce.metaCatalogId === "string" && commerce.metaCatalogId) ||
      "";
    const products = Array.isArray(commerce.products) ? commerce.products : [];
    const inspected = await inspectCommerceCatalog({
      accessToken: account?.accessTokenEnc || "mock",
      catalogId,
    });
    const issues = [...inspected.issues];
    if (!account) issues.push("اربط حساب واتساب قبل مزامنة الكتالوج");
    else if (account.status !== "connected") {
      issues.push("حساب واتساب غير متصل");
    }
    if (!products.length) issues.push("أضف منتجاً واحداً على الأقل");
    return {
      accountId: account?.id || null,
      catalogId: catalogId || null,
      productCount: products.length,
      lastSyncedAt: commerce.lastSyncedAt || null,
      lastSyncError: commerce.lastSyncError || null,
      ...inspected,
      ready: inspected.ready && Boolean(account) && account?.status === "connected" && products.length > 0,
      issues,
    };
  }

  async testConnection(organizationId: string, accountId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException("القناة غير موجودة");
    }

    const channelType = normalizeChannelType(account.channelType);
    const token = account.accessTokenEnc || "";
    const phoneHint =
      channelType === "whatsapp"
        ? account.phoneNumberId.replace(/\D/g, "") || account.phoneNumberId
        : account.phoneNumberId;
    let probed = await probeChannel({
      channelType,
      phoneNumberId: phoneHint,
      accessToken: token,
    });
    let resolvedPhoneId = probed.ok ? probed.externalId || phoneHint : "";

    if (
      channelType === "whatsapp" &&
      probed.mode === "live" &&
      !probed.ok &&
      account.businessAccountId
    ) {
      try {
        const listed = await listWabaPhoneNumbers({
          accessToken: token,
          wabaId: account.businessAccountId,
        });
        const match = listed.ok
          ? matchWabaPhoneNumber(listed.phones, {
              phoneNumberId: account.phoneNumberId,
              displayPhone: account.displayPhone,
            })
          : null;
        if (match) {
          const again = await probeChannel({
            channelType,
            phoneNumberId: match.id,
            accessToken: token,
          });
          if (again.ok) {
            probed = again;
            if (!probed.displayPhone && match.displayPhone) {
              probed.displayPhone = match.displayPhone;
            }
            if (!probed.channelName && match.verifiedName) {
              probed.channelName = match.verifiedName;
            }
            resolvedPhoneId = match.id;
            probed.message = `${probed.message} — تم اعتماد معرّف الرقم من ميتا`;
          }
        } else if (listed.ok && listed.phones.length > 1) {
          probed.message = `${probed.message} — يوجد أكثر من رقم. احفظ Phone Number ID الصحيح من ميتا.`;
        } else if (!listed.ok && listed.message) {
          probed.message = `${probed.message} — ${listed.message}`;
        }
      } catch {
        probed.message = `${probed.message} — تعذر قراءة أرقام الحساب من ميتا`;
      }
    }

    const patch: {
      displayPhone?: string;
      channelName?: string;
      phoneNumberId?: string;
      webhookVerifiedAt?: Date | null;
      status?: string;
      meta?: Prisma.InputJsonValue;
    } = {};
    const setup = this.webhookSetup();
    let webhookUrl: string | undefined =
      channelType === "telegram" ? undefined : setup.webhookUrl;
    let receiveReady = false;

    if (probed.mode === "mock") {
      if (account.status === "connected") patch.status = "pending";
      patch.webhookVerifiedAt = null;
    } else if (probed.ok && channelType === "whatsapp") {
      patch.status = "connected";
      if (probed.displayPhone) patch.displayPhone = probed.displayPhone;
      if (probed.channelName && !account.channelName) {
        patch.channelName = probed.channelName;
      }
      const canonical = (resolvedPhoneId || "").replace(/\D/g, "");
      if (canonical && canonical !== account.phoneNumberId) {
        const clash = await this.prisma.whatsAppAccount.findFirst({
          where: {
            organizationId,
            phoneNumberId: canonical,
            NOT: { id: account.id },
          },
        });
        if (!clash) patch.phoneNumberId = canonical;
      }
      let subscribed: { ok: boolean; message: string };
      try {
        subscribed = await subscribeWabaWebhook({
          accessToken: token,
          wabaId: account.businessAccountId || "",
        });
      } catch {
        subscribed = {
          ok: false,
          message: "تعذر الاشتراك في استقبال الرسائل من ميتا",
        };
      }
      receiveReady = subscribed.ok;
      if (subscribed.ok) patch.webhookVerifiedAt = new Date();
      probed.message = `${probed.message} — ${subscribed.message}`;
      patch.meta = asJson({
        ...this.accountMeta(account),
        webhookSet: subscribed.ok,
        webhookUrl: setup.webhookUrl,
        webhookEnsuredAt: new Date().toISOString(),
      });
    } else if (probed.ok && channelType === "telegram" && probed.mode === "live") {
      patch.webhookVerifiedAt = new Date();
      if (probed.displayPhone && !account.displayPhone) {
        patch.displayPhone = probed.displayPhone;
      }
      if (probed.channelName && !account.channelName) {
        patch.channelName = probed.channelName;
      }
      webhookUrl = this.telegramWebhookUrl(account.id);
      const secret = this.telegramWebhookSecret(account.id);
      const hooked = await setTelegramWebhook(token, webhookUrl, secret);
      patch.meta = asJson({
        ...this.accountMeta(account),
        webhookUrl,
        webhookSecret: secret,
        webhookSet: hooked.ok,
      });
      if (!hooked.ok) {
        probed.message = `${probed.message} — ${hooked.message}`;
      }
    } else if (probed.ok) {
      patch.webhookVerifiedAt = new Date();
      if (probed.displayPhone && !account.displayPhone) {
        patch.displayPhone = probed.displayPhone;
      }
      if (probed.channelName && !account.channelName) {
        patch.channelName = probed.channelName;
      }
    }

    if (Object.keys(patch).length) {
      await this.prisma.whatsAppAccount.update({
        where: { id: account.id },
        data: patch,
      });
    }

    const ready = channelType === "whatsapp" ? receiveReady : probed.ok;
    let message = probed.message;
    if (channelType === "whatsapp" && ready && !setup.appSecretConfigured) {
      message = `${message} — سر تطبيق ميتا غير محفوظ على الخادم، لذلك لن تُقبل الرسائل الواردة في الإنتاج.`;
    }

    return {
      ok: ready && (channelType !== "whatsapp" || setup.appSecretConfigured),
      mode: probed.mode,
      message,
      phoneNumberId: patch.phoneNumberId || account.phoneNumberId,
      displayPhone: probed.displayPhone || patch.displayPhone || account.displayPhone,
      status: patch.status || account.status,
      channelType,
      webhookUrl,
      verifyToken: channelType === "whatsapp" ? setup.verifyToken : undefined,
      appSecretConfigured: setup.appSecretConfigured,
      receiveReady: ready,
    };
  }

  async handleWebhook(payload: unknown) {
    const objectType = metaWebhookObject(payload);
    if (objectType === "page" || objectType === "instagram") {
      return this.handleMetaMessagingWebhook(payload);
    }

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
      const account = await this.findConnectedAccount(
        "whatsapp",
        msg.phoneNumberId,
      );
      if (!account) continue;
      const item = await this.ingestInboundMessage(account, {
        ...msg,
        channelType: "whatsapp",
      });
      if (item) processed.push(item);
    }

    return { processed: processed.length, statusesUpdated, items: processed };
  }

  private async routeInboundText(input: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    messageId: string;
    text: string;
    hotelPickId?: string;
  }) {
    const intent = input.hotelPickId
      ? ({ type: "chat" as const, text: input.text })
      : parseInboundIntent(input.text);

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
      hotelPickId: input.hotelPickId,
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
        where: { organizationId, status: { not: "archived" } },
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

  async handleTelegramWebhook(
    accountId: string,
    payload: unknown,
    secretHeader?: string,
  ) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id: accountId, channelType: "telegram" },
    });
    if (!account || account.status !== "connected") {
      return { ok: true, ignored: true };
    }

    const expected = this.telegramWebhookSecret(account.id);
    const meta =
      account.meta && typeof account.meta === "object"
        ? (account.meta as Record<string, unknown>)
        : {};
    const storedSecret =
      typeof meta.webhookSecret === "string" ? meta.webhookSecret : expected;
    if (secretHeader && storedSecret && secretHeader !== storedSecret) {
      return { ok: false, error: "invalid telegram secret" };
    }

    const messages = parseTelegramUpdate(payload);
    const processed = [];
    for (const msg of messages) {
      const item = await this.ingestInboundMessage(account, {
        ...msg,
        phoneNumberId: account.phoneNumberId,
        channelType: "telegram",
      });
      if (item) processed.push(item);
    }
    return { ok: true, processed: processed.length, items: processed };
  }

  async handleMetaMessagingWebhook(payload: unknown) {
    const messages = parseMetaMessagingWebhook(payload);
    const processed = [];
    for (const msg of messages) {
      const channelType = normalizeChannelType(msg.channelType);
      const account = await this.findConnectedAccount(
        channelType,
        msg.phoneNumberId,
      );
      if (!account) continue;
      const item = await this.ingestInboundMessage(account, {
        ...msg,
        channelType,
      });
      if (item) processed.push(item);
    }
    return { ok: true, processed: processed.length, items: processed };
  }

  async getAccountOrThrow(organizationId: string, id: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException("القناة غير موجودة");
    return account;
  }

  private publicApiBase() {
    return (
      process.env.PUBLIC_API_URL ||
      process.env.API_PUBLIC_URL ||
      "https://api.weekendgate.com"
    ).replace(/\/$/, "");
  }

  private telegramWebhookUrl(accountId: string) {
    return `${this.publicApiBase()}/whatsapp/telegram/webhook/${accountId}`;
  }

  private telegramWebhookSecret(accountId: string) {
    const seed =
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      process.env.WHATSAPP_APP_SECRET ||
      "weekendgate";
    return createHmac("sha256", seed).update(accountId).digest("hex").slice(0, 32);
  }

  private async resolveChannelIdentity(
    channelType: ReturnType<typeof normalizeChannelType>,
    dto: {
      phoneNumberId?: string;
      accessToken?: string;
      displayPhone?: string;
      channelName?: string;
    },
  ) {
    const token = dto.accessToken?.trim() || "";
    let phoneNumberId = dto.phoneNumberId?.trim() || "";
    let displayPhone = dto.displayPhone?.trim() || "";
    let channelName = dto.channelName?.trim() || "";
    let meta: Record<string, unknown> | undefined;

    if (channelType === "telegram") {
      if (!token && !phoneNumberId) {
        throw new BadRequestException("توكن بوت تلجرام مطلوب");
      }
      if (token && !token.startsWith("mock")) {
        const me = await telegramGetMe(token);
        if (!me.ok || !me.id) {
          throw new BadRequestException(me.message || "توكن تلجرام غير صالح");
        }
        phoneNumberId = prefixChannelId("telegram", String(me.id));
        displayPhone = displayPhone || (me.username ? `@${me.username}` : "");
        channelName = channelName || me.firstName || "Telegram";
        meta = { botId: me.id, username: me.username };
      } else {
        const rawId =
          phoneNumberId.replace(/^tg_/, "") || `mock_${Date.now()}`;
        phoneNumberId = prefixChannelId("telegram", rawId);
        channelName = channelName || "Telegram (تجريبي)";
      }
      return { phoneNumberId, displayPhone, channelName, meta };
    }

    if (channelType === "messenger") {
      if (!phoneNumberId) {
        throw new BadRequestException("معرّف صفحة فيسبوك (Page ID) مطلوب");
      }
      phoneNumberId = prefixChannelId(
        "messenger",
        phoneNumberId.replace(/^ms_/, ""),
      );
      channelName = channelName || "Messenger";
      return { phoneNumberId, displayPhone, channelName, meta };
    }

    if (channelType === "instagram") {
      if (!phoneNumberId) {
        throw new BadRequestException("معرّف حساب إنستغرام (IG User ID) مطلوب");
      }
      phoneNumberId = prefixChannelId(
        "instagram",
        phoneNumberId.replace(/^ig_/, ""),
      );
      channelName = channelName || "Instagram";
      return { phoneNumberId, displayPhone, channelName, meta };
    }

    if (!phoneNumberId) {
      throw new BadRequestException("phoneNumberId مطلوب");
    }
    const digits = phoneNumberId.replace(/\D/g, "");
    return {
      phoneNumberId: digits || phoneNumberId,
      displayPhone,
      channelName,
      meta,
    };
  }

  private async activateLiveReceiving() {
    const accounts = await this.prisma.whatsAppAccount.findMany({
      where: {
        status: "connected",
        channelType: "whatsapp",
        businessAccountId: { not: null },
      },
    });
    const setup = this.webhookSetup();
    for (const account of accounts) {
      const token = account.accessTokenEnc || "";
      if (!token || token.startsWith("mock") || !account.businessAccountId) continue;
      try {
        const result = await subscribeWabaWebhook({
          accessToken: token,
          wabaId: account.businessAccountId,
        });
        if (!result.ok) {
          // eslint-disable-next-line no-console
          console.error("[whatsapp] subscribe failed", account.id, result.message);
          continue;
        }
        await this.prisma.whatsAppAccount.update({
          where: { id: account.id },
          data: {
            webhookVerifiedAt: new Date(),
            meta: asJson({
              ...this.accountMeta(account),
              webhookSet: true,
              webhookUrl: setup.webhookUrl,
              webhookEnsuredAt: new Date().toISOString(),
            }),
          },
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[whatsapp] subscribe error", account.id, error);
      }
    }
  }

  private async findConnectedAccount(channelType: string, rawId: string) {
    const type = normalizeChannelType(channelType);
    const prefixed = prefixChannelId(type, rawId);
    const ids = [rawId, prefixed].filter(Boolean);
    const exact = await this.prisma.whatsAppAccount.findMany({
      where: {
        status: { not: "archived" },
        ...(type === "whatsapp"
          ? { phoneNumberId: { in: ids } }
          : { channelType: type, phoneNumberId: { in: ids } }),
      },
    });
    const chosen = preferInboundAccount(exact);
    if (chosen) return chosen;
    if (type !== "whatsapp") return null;
    const candidates = await this.prisma.whatsAppAccount.findMany({
      where: {
        status: { not: "archived" },
        channelType: "whatsapp",
      },
    });
    return preferInboundAccount(
      candidates.filter((row) => phoneNumberIdsMatch(row.phoneNumberId, rawId)),
    );
  }

  private async ingestInboundMessage(
    account: {
      id: string;
      organizationId: string;
      channelType: string;
    },
    msg: WhatsAppInboundMessage,
  ) {
    const channel = normalizeChannelType(
      msg.channelType || account.channelType,
    );
    const waId = formatPeerId(channel, msg.from);

    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_waId: {
          organizationId: account.organizationId,
          waId,
        },
      },
      update: {
        lastContactedAt: new Date(),
        source: channel,
        name: msg.contactName || undefined,
      },
      create: {
        organizationId: account.organizationId,
        waId,
        name: msg.contactName || waId,
        source: channel,
        lastContactedAt: new Date(),
      },
    });

    const existing = await this.prisma.message.findFirst({
      where: {
        organizationId: account.organizationId,
        providerMessageId: msg.messageId,
      },
    });
    if (existing) {
      return { skipped: true, messageId: existing.id };
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: account.organizationId,
        contactId: contact.id,
        status: { in: ["open", "pending"] },
        OR: [{ whatsappAccountId: account.id }, { whatsappAccountId: null }],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.findFirst({
        where: {
          organizationId: account.organizationId,
          contactId: contact.id,
          status: "closed",
          OR: [{ whatsappAccountId: account.id }, { whatsappAccountId: null }],
        },
        orderBy: { updatedAt: "desc" },
      });
    }

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
      const reopen = conversation.status === "closed";
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          // A customer message opens the 24h window. Pending human handoff stays pending.
          status: reopen ? "open" : conversation.status,
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
          whatsappAccountId: account.id,
        },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        organizationId: account.organizationId,
        conversationId: conversation.id,
        direction: "inbound",
        channel,
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
          hotelPickId: parseHotelPickRowId(msg.replyId) || undefined,
        });
      } catch (error) {
        // Never fail webhook delivery because of bot/search errors.
        // eslint-disable-next-line no-console
        console.error("[channel] inbound pipeline error", error);
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

    return { messageId: message.id, conversationId: conversation.id };
  }

  private accountMeta(account: { meta?: unknown }): Record<string, unknown> {
    return asJsonRecord(account.meta);
  }

  private presentAccount(account: Record<string, unknown> | object) {
    const rawToken =
      (account as { accessTokenEnc?: string | null }).accessTokenEnc || "";
    const tokenKind = !rawToken
      ? "empty"
      : rawToken.startsWith("mock")
        ? "mock"
        : "live";
    const sanitized = sanitizeWhatsAppAccount(
      account as unknown as Record<string, unknown>,
    );
    const meta = asJsonRecord(
      (sanitized as { meta?: unknown }).meta,
    );
    const health = asJsonRecord(meta.health);
    const quality =
      (typeof health.qualityRating === "string" && health.qualityRating) ||
      (typeof meta.qualityRating === "string" && meta.qualityRating) ||
      null;
    return {
      ...sanitized,
      tokenKind,
      health: {
        qualityRating: quality,
        qualityLabel: quality
          ? QUALITY_LABELS_AR[quality] || quality
          : null,
        messagingLimitTier: health.messagingLimitTier || meta.messagingLimitTier || null,
        messagingLimit: health.messagingLimit ?? meta.messagingLimit ?? null,
        messagingLimitHint: formatTierHint(
          (health.messagingLimitTier || meta.messagingLimitTier) as string | undefined,
          (health.messagingLimit ?? meta.messagingLimit) as number | null | undefined,
        ),
        metaPhoneStatus: health.metaPhoneStatus || null,
        metaNameStatus: health.metaNameStatus || null,
        metaCanSendMessage: health.metaCanSendMessage || null,
        metaAccountReviewStatus: health.metaAccountReviewStatus || null,
        metaStatusMessage:
          (health.metaStatusMessage as string) ||
          (meta.metaStatusMessage as string) ||
          null,
        healthSyncedAt: meta.healthSyncedAt || health.healthSyncedAt || null,
        mock: Boolean(health.mock),
      },
      archivedAt: meta.archivedAt || null,
      webhookSet: Boolean(meta.webhookSet),
    };
  }
}
