import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  DEFAULT_FX_SETTINGS,
  SUPPORTED_CURRENCIES,
  defaultRatesToCurrency,
  isSupportedCurrency,
  parseOrgFxSettings,
  type OrgFxSettings,
} from "@watesly-travel/shared";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { randomUUID } from "crypto";

type RateBody = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

@Controller("fx")
export class FxController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async orgCurrency(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { defaultCurrency: true, settings: true },
    });
    return {
      currency: (org?.defaultCurrency || "KWD").toUpperCase(),
      settings: parseOrgFxSettings(org?.settings),
      rawSettings: (org?.settings as Record<string, unknown> | null) || {},
    };
  }

  private async ensureDefaultRates(organizationId: string, toCurrency: string) {
    const count = await this.prisma.organizationFxRate.count({
      where: { organizationId },
    });
    if (count > 0) return;
    const defaults = defaultRatesToCurrency(toCurrency);
    const now = new Date();
    await this.prisma.organizationFxRate.createMany({
      data: defaults.map((r) => ({
        id: randomUUID(),
        organizationId,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        source: "manual",
        updatedAt: now,
      })),
      skipDuplicates: true,
    });
  }

  @Get()
  @RequirePermissions("settings.manage")
  async get(@CurrentUser() user: AuthUser) {
    const { currency, settings } = await this.orgCurrency(user.organizationId);
    await this.ensureDefaultRates(user.organizationId, currency);
    const rates = await this.prisma.organizationFxRate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ toCurrency: "asc" }, { fromCurrency: "asc" }],
    });
    return {
      displayCurrency: currency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      settings,
      rates: rates.map((r) => ({
        id: r.id,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        source: r.source,
        updatedAt: r.updatedAt,
      })),
    };
  }

  @Patch("settings")
  @RequirePermissions("settings.manage")
  async patchSettings(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      displayCurrency?: string;
      autoUpdateEnabled?: boolean;
      autoUpdateSource?: OrgFxSettings["autoUpdateSource"];
      autoUpdateUrl?: string | null;
    },
  ) {
    const { currency, settings, rawSettings } = await this.orgCurrency(
      user.organizationId,
    );
    const nextCurrency = body.displayCurrency?.trim().toUpperCase();
    if (nextCurrency && !isSupportedCurrency(nextCurrency)) {
      throw new BadRequestException(`عملة غير مدعومة: ${nextCurrency}`);
    }

    const nextFx: OrgFxSettings = {
      ...settings,
      autoUpdateEnabled:
        body.autoUpdateEnabled != null
          ? Boolean(body.autoUpdateEnabled)
          : settings.autoUpdateEnabled,
      autoUpdateSource: body.autoUpdateSource || settings.autoUpdateSource,
      autoUpdateUrl:
        body.autoUpdateUrl === undefined
          ? settings.autoUpdateUrl
          : body.autoUpdateUrl?.trim() || null,
    };

    const after = await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(nextCurrency ? { defaultCurrency: nextCurrency } : {}),
        settings: {
          ...rawSettings,
          fx: nextFx,
        },
      },
    });

    if (nextCurrency && nextCurrency !== currency) {
      await this.ensureDefaultRates(user.organizationId, nextCurrency);
    }

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "fx.settings.update",
      entityType: "Organization",
      entityId: user.organizationId,
      after: {
        defaultCurrency: after.defaultCurrency,
        fx: nextFx,
      },
    });

    return this.get(user);
  }

  @Put("rates")
  @RequirePermissions("settings.manage")
  async putRates(
    @CurrentUser() user: AuthUser,
    @Body() body: { rates?: RateBody[] },
  ) {
    const rates = Array.isArray(body.rates) ? body.rates : [];
    if (!rates.length) throw new BadRequestException("أدخل سعر صرف واحد على الأقل");

    for (const row of rates) {
      const from = (row.fromCurrency || "").trim().toUpperCase();
      const to = (row.toCurrency || "").trim().toUpperCase();
      const rate = Number(row.rate);
      if (!from || !to) throw new BadRequestException("من/إلى العملة مطلوبان");
      if (!(rate > 0)) throw new BadRequestException(`سعر غير صالح لـ ${from}→${to}`);

      await this.prisma.organizationFxRate.upsert({
        where: {
          organizationId_fromCurrency_toCurrency: {
            organizationId: user.organizationId,
            fromCurrency: from,
            toCurrency: to,
          },
        },
        update: { rate, source: "manual" },
        create: {
          organizationId: user.organizationId,
          fromCurrency: from,
          toCurrency: to,
          rate,
          source: "manual",
        },
      });
    }

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "fx.rates.update",
      entityType: "OrganizationFxRate",
      after: { count: rates.length },
    });

    return this.get(user);
  }

  @Post("sync")
  @RequirePermissions("settings.manage")
  async sync(@CurrentUser() user: AuthUser) {
    const { currency, settings, rawSettings } = await this.orgCurrency(
      user.organizationId,
    );

    const codes = SUPPORTED_CURRENCIES.map((c) => c.code).filter(
      (c) => c !== currency,
    );

    let payload: Record<string, number> = {};
    let sourceLabel = settings.autoUpdateSource;

    try {
      if (settings.autoUpdateSource === "custom") {
        const url = settings.autoUpdateUrl?.trim();
        if (!url) {
          throw new BadRequestException("أدخل رابط مصدر سعر الصرف المخصص");
        }
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          rates?: Record<string, number>;
          conversion_rates?: Record<string, number>;
        };
        payload = json.rates || json.conversion_rates || {};
        // If custom feed is relative to a base other than display currency,
        // expect rates as: 1 FROM = X displayCurrency under key FROM.
      } else if (settings.autoUpdateSource === "open.er-api") {
        // Free no-key endpoint: https://open.er-api.com/v6/latest/USD
        const base = "USD";
        const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          rates?: Record<string, number>;
          result?: string;
        };
        if (!json.rates) throw new Error("لا توجد أسعار من المصدر");
        const usdToDisplay = json.rates[currency];
        if (usdToDisplay == null || !(usdToDisplay > 0)) {
          throw new Error(`المصدر لا يدعم عملة العرض ${currency}`);
        }
        // Convert: 1 FROM = (usdToDisplay / usdToFrom) DISPLAY
        for (const code of [...codes, currency, base]) {
          const usdToFrom = json.rates[code];
          if (usdToFrom == null || !(usdToFrom > 0)) continue;
          payload[code] = usdToDisplay / usdToFrom;
        }
        sourceLabel = "open.er-api";
      } else {
        // frankfurter.app — ECB-based daily rates
        const base = currency === "USD" ? "EUR" : "USD";
        const toList = [...new Set([currency, ...codes, base])].join(",");
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=${base}&to=${toList}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { rates?: Record<string, number> };
        if (!json.rates) throw new Error("لا توجد أسعار من Frankfurter");
        const baseToDisplay =
          currency === base ? 1 : json.rates[currency];
        if (baseToDisplay == null || !(baseToDisplay > 0)) {
          throw new Error(`Frankfurter لا يدعم عملة العرض ${currency}`);
        }
        payload[base] = baseToDisplay;
        payload[currency] = 1;
        for (const [code, baseToCode] of Object.entries(json.rates)) {
          if (!(baseToCode > 0)) continue;
          // 1 CODE = (baseToDisplay / baseToCode) DISPLAY
          payload[code] = baseToDisplay / baseToCode;
        }
        sourceLabel = "frankfurter";
      }
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error
          ? `فشل مزامنة أسعار الصرف: ${err.message}`
          : "فشل مزامنة أسعار الصرف",
      );
    }

    const now = new Date();
    let updated = 0;
    for (const [from, rate] of Object.entries(payload)) {
      const fromCode = from.toUpperCase();
      if (!(rate > 0)) continue;
      if (!SUPPORTED_CURRENCIES.some((c) => c.code === fromCode) && fromCode !== currency) {
        continue;
      }
      await this.prisma.organizationFxRate.upsert({
        where: {
          organizationId_fromCurrency_toCurrency: {
            organizationId: user.organizationId,
            fromCurrency: fromCode,
            toCurrency: currency,
          },
        },
        update: { rate, source: "auto", updatedAt: now },
        create: {
          organizationId: user.organizationId,
          fromCurrency: fromCode,
          toCurrency: currency,
          rate,
          source: "auto",
        },
      });
      updated += 1;
    }

    const nextFx: OrgFxSettings = {
      ...settings,
      autoUpdateEnabled: true,
      lastAutoSyncAt: now.toISOString(),
      autoUpdateSource: sourceLabel,
    };
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...rawSettings,
          fx: nextFx,
        },
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "fx.rates.sync",
      entityType: "OrganizationFxRate",
      after: { updated, source: sourceLabel, currency },
    });

    return this.get(user);
  }
}
