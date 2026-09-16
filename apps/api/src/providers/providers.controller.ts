import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
  const required = keys.filter((k) => !/_BASE_URL$|_HOSTNAME$/.test(k));
  if (!required.length) return keys.some((k) => Boolean(process.env[k]?.trim()));
  return required.every((k) => Boolean(process.env[k]?.trim()));
}

const DEFAULT_PRIORITY: Record<string, number> = {
  hotelbeds: 10,
  "hotelbeds-transfers": 11,
  "hotelbeds-activities": 12,
  amadeus: 20,
  travelfusion: 30,
  travelport: 40,
  duffel: 50,
};

@Controller("providers")
export class ProvidersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async purgeMock(organizationId: string) {
    await this.prisma.travelProviderConfig.deleteMany({
      where: { organizationId, providerKey: "mock" },
    });
  }

  private async ensureCatalogRows(organizationId: string) {
    await this.purgeMock(organizationId);
    for (const catalog of PROVIDER_CATALOG) {
      if (!envReady(catalog.envKeys)) continue;
      const existing = await this.prisma.travelProviderConfig.findUnique({
        where: {
          organizationId_providerKey: {
            organizationId,
            providerKey: catalog.providerKey,
          },
        },
      });
      if (!existing) {
        await this.prisma.travelProviderConfig.create({
          data: {
            organizationId,
            providerKey: catalog.providerKey,
            displayName: catalog.displayNameAr,
            enabled: true,
            priority: DEFAULT_PRIORITY[catalog.providerKey] ?? 100,
            capabilities: catalog.capabilities,
          },
        });
        continue;
      }
      const staleName =
        existing.displayName === "Hotelbeds" &&
        catalog.providerKey === "hotelbeds";
      if (staleName || !existing.capabilities) {
        await this.prisma.travelProviderConfig.update({
          where: { id: existing.id },
          data: {
            ...(staleName ? { displayName: catalog.displayNameAr } : {}),
            capabilities: catalog.capabilities,
          },
        });
      }
    }
  }

  private mapRow(
    row: {
      id: string;
      providerKey: string;
      displayName: string;
      enabled: boolean;
      priority: number;
      capabilities: unknown;
      configEncrypted: string | null;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
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
      archivedAt: row.archivedAt,
      hasCredentials: Boolean(row.configEncrypted),
      catalogStatus: catalog?.status || "scaffold",
      envConfigured: catalog ? envReady(catalog.envKeys) : false,
      credentialHints,
      notes: catalog?.notes,
      credentialFields: catalog?.credentialFields || [],
      description: catalog?.description || "",
      catalogDisplayNameAr: catalog?.displayNameAr || row.displayName,
    };
  }

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
  async list(
    @CurrentUser() user: AuthUser,
    @Query("includeArchived") includeArchived?: string,
    @Query("capability") capability?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    await this.ensureCatalogRows(user.organizationId);
    const showArchived =
      includeArchived === "1" ||
      includeArchived === "true" ||
      status === "archived";

    const rows = await this.prisma.travelProviderConfig.findMany({
      where: {
        organizationId: user.organizationId,
        ...(showArchived && status === "archived"
          ? { archivedAt: { not: null } }
          : showArchived
            ? {}
            : { archivedAt: null }),
        ...(status === "enabled" ? { enabled: true, archivedAt: null } : {}),
        ...(status === "disabled" ? { enabled: false, archivedAt: null } : {}),
      },
      orderBy: [{ archivedAt: "asc" }, { priority: "asc" }],
    });

    const needle = (q || "").trim().toLowerCase();
    const cap = (capability || "").trim().toLowerCase();

    return rows
      .map((row) => this.mapRow(row))
      .filter((row) => {
        if (cap) {
          const caps = Array.isArray(row.capabilities)
            ? (row.capabilities as string[])
            : [];
          if (!caps.map((c) => c.toLowerCase()).includes(cap)) return false;
        }
        if (!needle) return true;
        return (
          row.providerKey.toLowerCase().includes(needle) ||
          row.displayName.toLowerCase().includes(needle)
        );
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
    if (key === "mock") {
      throw new BadRequestException(
        "المزود التجريبي Mock لم يعد مدعومًا. اختر Duffel أو Amadeus أو Travelfusion.",
      );
    }
    const catalog = getCatalogEntry(key);
    if (!catalog) {
      throw new BadRequestException(
        `مزود غير مدعوم: ${key}. اختر من الكتالوج المتاح.`,
      );
    }

    const existing = await this.prisma.travelProviderConfig.findUnique({
      where: {
        organizationId_providerKey: {
          organizationId: user.organizationId,
          providerKey: catalog.providerKey,
        },
      },
    });

    const prev =
      decryptProviderConfig<Record<string, string>>(
        existing?.configEncrypted || null,
      ) || {};
    const nextCreds = { ...prev };
    if (body.credentials && typeof body.credentials === "object") {
      for (const [k, v] of Object.entries(body.credentials)) {
        if (typeof v !== "string") continue;
        const trimmed = v.trim();
        if (!trimmed || trimmed.includes("*")) continue;
        nextCreds[k] = trimmed;
      }
    }

    const encrypted =
      Object.keys(nextCreds).length > 0
        ? encryptProviderConfig(nextCreds)
        : existing?.configEncrypted || null;

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
        priority: body.priority ?? existing?.priority ?? DEFAULT_PRIORITY[catalog.providerKey] ?? 100,
        capabilities: catalog.capabilities,
        archivedAt: null,
        ...(encrypted ? { configEncrypted: encrypted } : {}),
      },
      create: {
        organizationId: user.organizationId,
        providerKey: catalog.providerKey,
        displayName: body.displayName?.trim() || catalog.displayNameAr,
        enabled: body.enabled ?? true,
        priority:
          body.priority ?? DEFAULT_PRIORITY[catalog.providerKey] ?? 100,
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

    return this.mapRow(row);
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
      archived?: boolean;
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
        ...(body.enabled != null && body.archived !== true
          ? { enabled: body.enabled }
          : {}),
        ...(body.priority != null ? { priority: body.priority } : {}),
        ...(body.displayName != null ? { displayName: body.displayName } : {}),
        configEncrypted,
        ...(body.archived === true
          ? { archivedAt: new Date(), enabled: false }
          : body.archived === false
            ? { archivedAt: null }
            : {}),
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: body.archived ? "providers.archive" : "providers.update",
      entityType: "TravelProviderConfig",
      entityId: id,
      before: {
        enabled: existing.enabled,
        priority: existing.priority,
        archivedAt: existing.archivedAt,
      },
      after: {
        enabled: row.enabled,
        priority: row.priority,
        archivedAt: row.archivedAt,
        hasCredentials: Boolean(row.configEncrypted),
      },
    });

    return this.mapRow(row);
  }

  @Delete(":id")
  @RequirePermissions("providers.manage")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const existing = await this.prisma.travelProviderConfig.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("المزود غير موجود");

    await this.prisma.travelProviderConfig.delete({ where: { id } });
    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "providers.delete",
      entityType: "TravelProviderConfig",
      entityId: id,
      before: {
        providerKey: existing.providerKey,
        displayName: existing.displayName,
      },
    });
    return { ok: true, id };
  }
}
