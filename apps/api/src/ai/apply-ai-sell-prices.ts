import { applyPricingRule, selectPricingRule } from "@watesly-travel/pricing-engine";
import type { PricingContext, PricingRuleInput } from "@watesly-travel/pricing-engine";
import type { PrismaService } from "../prisma/prisma.service";

export type SellPriced<T> = T & {
  sellAmountMinor: number;
  costAmountMinor: number;
};

export async function loadActivePricingRules(
  prisma: PrismaService,
  organizationId: string,
): Promise<PricingRuleInput[]> {
  return prisma.pricingRule.findMany({
    where: { organizationId, isActive: true },
    orderBy: { priority: "asc" },
  });
}

export function applyAiSellPrices<
  T extends {
    costAmountMinor: number;
    currency: string;
    providerKey?: string;
    raw?: unknown;
  },
>(
  rows: T[],
  rules: PricingRuleInput[],
  serviceType: string,
  context?: PricingContext,
): SellPriced<T>[] {
  return rows.map((row) => {
    const raw = row.raw as { stars?: number | string } | undefined;
    const rule = selectPricingRule(rules, serviceType, {
      ...context,
      stars: raw?.stars ?? context?.stars,
      provider: row.providerKey,
      costAmountMinor: row.costAmountMinor,
    });
    const pricing = applyPricingRule({
      costAmountMinor: row.costAmountMinor,
      currency: row.currency,
      serviceType,
      rule,
      units: context?.units,
      adults: context?.adults,
      children: context?.children,
      rooms: context?.rooms,
    });
    return {
      ...row,
      sellAmountMinor: pricing.sellAmountMinor,
    };
  });
}
