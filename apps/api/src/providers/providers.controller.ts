import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { PROVIDER_CATALOG, getCatalogEntry } from "@watesly-travel/provider-sdk";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import {
  decryptProviderConfig,
  encryptProviderConfig,
  maskSecret,
} from "../common/secrets";

function envReady(keys: string[]) {
  if (!keys.length) return true;
  return keys.some((k) => Boolean(process.env[k]?.trim()));
}

@Controller("providers")
export class ProvidersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get("catalog")
  @RequirePermissions("providers.manage")
  catalog() {
    return PROVIDER_CATALOG.map((p) => ({
      ...p,
      envConfigured: envReady(p.envKeys),
    }));
  }

  @Get()
  @RequirePermissions("providers.manage")
  async list(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.travelProviderConfig.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { priority: "asc" },
    });

    return rows.map((row) => {
      const catalog = getCatalogEntry(row.providerKey);
      const conf = decryptProviderConfig<Record<string, string>>(
        row.configEncrypted,
      );
      const credentialHints: Record<string, string> = {};
      for (const field of catalog?.credentialFields || []) {
        const val = conf?.[field.key];
        if (!val) continue;
        credentialHints[field.key] = field.secret ? maskSecret(val) : val;
      }
      return {
        id: row.id,
        providerKey: row.providerKey,
        displayName: row.displayName,
        enabled: row.enabled,
        priority: row.priority,
        capabilities: row.capabilities,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        hasCredentials: Boolean(row.configEncrypted),
        catalogStatus: catalog?.status || "scaffold",
        envConfigured: catalog ? envReady(catalog.envKeys) : false,
        credentialHints,
        notes: catalog?.notes,
      };
    });
  }

  @Post()
  @RequirePermissions("providers.manage")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      providerKey: string;
      displayName?: string;
      enabled?: boolean;
      priority?: number;
      credentials?: Record<string, string>;
    },
  ) {
    const key = (body.providerKey || "").trim().toLowerCase();
    if (!key) throw new BadRequestException("مفتاح المزود مطلوب");
    const catalog = getCatalogEntry(key);
    if (!catalog) {
      throw new BadRequestException(
        `مزود غير مدعوم: ${key}. اختر من الكتالوج المتاح.`,
      );
    }

    const existingConf =
      (
        await this.prisma.travelProviderConfig.findUnique({
          where: {
            organizationId_providerKey: {
              organizationId: user.organizationId,
              providerKey: catalog.providerKey,
            },
          },
        })
      )?.configEncrypted || null;

    const prev = decryptProviderConfig<Record<string, string>>(existingConf) || {};
    const nextCreds = { ...prev };
    if (body.credentials && typeof body.credentials === "object") {
      for (const [k, v] of Object.entries(body.credentials)) {
        if (typeof v !== "string") continue;
        const trimmed = v.trim();
        if (!trimmed || trimmed.includes("*")) continue; // ignore masked placeholders
        nextCreds[k] = trimmed;
      }
    }

    const encrypted =
      Object.keys(nextCreds).length > 0
        ? encryptProviderConfig(nextCreds)
        : existingConf;

    const row = await this.prisma.travelProviderConfig.upsert({
      where: {
        organizationId_providerKey: {
          organizationId: user.organizationId,
          providerKey: catalog.providerKey,
        },
      },
      update: {
        displayName: body.displayName?.trim() || catalog.displayNameAr,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 100,
        capabilities: catalog.capabilities,
        ...(encrypted ? { configEncrypted: encrypted } : {}),
      },
      create: {
        organizationId: user.organizationId,
        providerKey: catalog.providerKey,
        displayName: body.displayName?.trim() || catalog.displayNameAr,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 100,
        capabilities: catalog.capabilities,
        configEncrypted: encrypted,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "providers.upsert",
      entityType: "TravelProviderConfig",
      entityId: row.id,
      after: {
        providerKey: row.providerKey,
        enabled: row.enabled,
        hasCredentials: Boolean(row.configEncrypted),
      },
    });

    return {
      id: row.id,
      providerKey: row.providerKey,
      displayName: row.displayName,
      enabled: row.enabled,
      priority: row.priority,
      hasCredentials: Boolean(row.configEncrypted),
      catalogStatus: catalog.status,
    };
  }

  @Patch(":id")
  @RequirePermissions("providers.manage")
  async patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      enabled?: boolean;
      priority?: number;
      displayName?: string;
      credentials?: Record<string, string>;
    },
  ) {
    const existing = await this.prisma.travelProviderConfig.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new BadRequestException("المزود غير موجود");

    let configEncrypted = existing.configEncrypted;
    if (body.credentials && typeof body.credentials === "object") {
      const prev =
        decryptProviderConfig<Record<string, string>>(configEncrypted) || {};
      const next = { ...prev };
      for (const [k, v] of Object.entries(body.credentials)) {
        if (typeof v !== "string") continue;
        const trimmed = v.trim();
        if (!trimmed || trimmed.includes("*")) continue;
        next[k] = trimmed;
      }
      configEncrypted = encryptProviderConfig(next);
    }

    const row = await this.prisma.travelProviderConfig.update({
      where: { id },
      data: {
        enabled: body.enabled,
        priority: body.priority,
        displayName: body.displayName,
        configEncrypted,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "providers.update",
      entityType: "TravelProviderConfig",
      entityId: id,
      before: {
        enabled: existing.enabled,
        priority: existing.priority,
      },
      after: {
        enabled: row.enabled,
        priority: row.priority,
        hasCredentials: Boolean(row.configEncrypted),
      },
    });

    return {
      id: row.id,
      providerKey: row.providerKey,
      displayName: row.displayName,
      enabled: row.enabled,
      priority: row.priority,
      hasCredentials: Boolean(row.configEncrypted),
    };
  }
}
