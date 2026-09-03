/**
 * Platform v2 shop service — prefers Prisma persistence; keeps light
 * in-memory fallbacks for CMS banners/rules, checkouts, favorites, searches.
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@watesly-travel/database";
import {
  WEEKEND_DEALS,
  DESTINATION_GUIDES,
  DEFAULT_CMS,
  DEFAULT_POINTS_RULES,
  DEFAULT_REFERRAL,
  buildReferralCode,
  buildTripPriceBreakdown,
  emptyTripDraft,
  upsertComponent,
  removeComponent,
  pointsEarnedFromSpend,
  pointsToCreditMinor,
  shouldFirePriceAlert,
  listActiveDeals,
  getDealBySlug,
  getDestination,
  normalizeShopPaymentStatus,
  type WeekendDeal,
  type CmsState,
  type PackageComponent,
  type PackageDraft,
  type PriceAlert,
  type CustomerNotification,
  type CustomerPointsAccount,
  type ReferralRecord,
  type MyTrip,
  type MyTripServiceStatus,
  type PointsRules,
  type CheckoutSummary,
} from "@watesly-travel/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { ShopCustomer } from "./shop-auth";
import { PublicOrgService } from "./public-org";
import { dispatchCustomerNotification } from "./platform-notify";

type FavDest = { customerId: string; slug: string; savedAt: string };
type SavedSearch = {
  id: string;
  customerId: string;
  label: string;
  href: string;
  savedAt: string;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function dealFromRow(row: {
  id: string;
  slug: string;
  destinationSlug: string;
  titleAr: string;
  titleEn: string;
  image: string;
  includes: unknown;
  originalPriceMinor: number;
  salePriceMinor: number;
  currency: string;
  nights: number;
  active: boolean;
  startAt: Date | null;
  endAt: Date | null;
  descriptionAr: string;
  descriptionEn: string;
  countryFlag: string | null;
  city: string | null;
}): WeekendDeal {
  return {
    id: row.id,
    slug: row.slug,
    destinationSlug: row.destinationSlug,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    countryFlag: row.countryFlag || "",
    city: row.city || "",
    image: row.image,
    includes: (Array.isArray(row.includes) ? row.includes : []) as WeekendDeal["includes"],
    originalPriceMinor: row.originalPriceMinor,
    salePriceMinor: row.salePriceMinor,
    currency: row.currency,
    nights: row.nights,
    active: row.active,
    startAt: row.startAt?.toISOString(),
    endAt: row.endAt?.toISOString(),
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
  };
}

function draftFromTripRow(row: {
  id: string;
  status: string;
  currency: string;
  totalSellMinor: number;
  savingsMinor: number;
  components: unknown;
}): PackageDraft {
  const components = (Array.isArray(row.components)
    ? row.components
    : []) as PackageComponent[];
  return {
    id: row.id,
    components,
    totalSellAmountMinor: row.totalSellMinor,
    currency: row.currency,
    savingsMinor: row.savingsMinor,
    status: (row.status as PackageDraft["status"]) || "draft",
  };
}

function mapBookingToMyTrip(row: {
  id: string;
  status: string;
  totalSellAmount: number;
  createdAt: Date;
  quote?: {
    currency?: string | null;
    items?: Array<{ serviceType?: string | null; description?: string | null }>;
  } | null;
  payments?: Array<{ status: string }>;
  passengerDetails?: unknown;
}): MyTrip & { customerId?: string } {
  const items = row.quote?.items || [];
  const kinds = new Set(items.map((i) => String(i.serviceType || "").toLowerCase()));
  const pd = (row.passengerDetails || {}) as {
    route?: { destination?: string; destinationCity?: string };
    stay?: { city?: string };
    extras?: { destination?: string };
  };
  const destination =
    pd.route?.destinationCity ||
    pd.route?.destination ||
    pd.stay?.city ||
    pd.extras?.destination ||
    items[0]?.description?.split(" ")?.[0] ||
    "—";
  const service = (kind: string): MyTripServiceStatus => {
    if (!kinds.has(kind)) return "none";
    if (row.status === "cancelled") return "cancelled";
    if (row.status === "issued" || row.status === "completed" || row.status === "confirmed") {
      return "confirmed";
    }
    return "pending";
  };
  const paymentStatus = normalizeShopPaymentStatus(row.payments?.[0]?.status || "pending");
  const day = row.createdAt.toISOString().slice(0, 10);
  return {
    id: row.id,
    title: items[0]?.description || "حجز",
    destination,
    startDate: day,
    endDate: day,
    currency: row.quote?.currency || "KWD",
    totalMinor: row.totalSellAmount,
    paymentStatus,
    services: {
      flight: service("flight"),
      hotel: service("hotel"),
      transfer: service("transfer"),
      activity: service("activity"),
    },
    documents: {
      invoiceUrl: `/account/trips?id=${row.id}`,
    },
  };
}

@Injectable()
export class PlatformService {
  private cms: CmsState = {
    ...DEFAULT_CMS,
    updatedAt: new Date().toISOString(),
  };
  private pointsRules: PointsRules = { ...DEFAULT_POINTS_RULES };
  /** Memory fallback when DB unavailable / pre-migration */
  private points = new Map<string, CustomerPointsAccount>();
  private referrals = new Map<string, ReferralRecord>();
  private alerts: PriceAlert[] = [];
  private notifications: CustomerNotification[] = [];
  private trips = new Map<string, PackageDraft>();
  private myTrips: Array<MyTrip & { customerId: string }> = [];
  private favoriteRows: FavDest[] = [];
  private searches: SavedSearch[] = [];
  private checkouts = new Map<string, CheckoutSummary & { customerId?: string }>();
  private dealsSeededFor = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: PublicOrgService,
  ) {}

  private async orgId(): Promise<string> {
    const org = await this.orgs.resolve();
    return org.id;
  }

  private async ensureDealsSeeded(organizationId: string): Promise<WeekendDeal[]> {
    try {
      const count = await this.prisma.cmsDeal.count({ where: { organizationId } });
      if (count === 0 && !this.dealsSeededFor.has(organizationId)) {
        this.dealsSeededFor.add(organizationId);
        for (const deal of WEEKEND_DEALS) {
          await this.prisma.cmsDeal.upsert({
            where: {
              organizationId_slug: { organizationId, slug: deal.slug },
            },
            create: {
              id: deal.id,
              organizationId,
              slug: deal.slug,
              destinationSlug: deal.destinationSlug,
              titleAr: deal.titleAr,
              titleEn: deal.titleEn,
              image: deal.image,
              includes: deal.includes,
              originalPriceMinor: deal.originalPriceMinor ?? deal.salePriceMinor ?? 0,
              salePriceMinor: deal.salePriceMinor ?? deal.originalPriceMinor ?? 0,
              currency: deal.currency || "KWD",
              nights: deal.nights ?? 0,
              active: deal.active,
              startAt: deal.startAt ? new Date(deal.startAt) : null,
              endAt: deal.endAt ? new Date(deal.endAt) : null,
              descriptionAr: deal.descriptionAr,
              descriptionEn: deal.descriptionEn,
              countryFlag: deal.countryFlag || null,
              city: deal.city || null,
            },
            update: {},
          });
        }
      }
      const rows = await this.prisma.cmsDeal.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      });
      if (rows.length) return rows.map(dealFromRow);
    } catch {
      // fall through to static catalog
    }
    return [...WEEKEND_DEALS];
  }

  async catalog() {
    const organizationId = await this.orgId();
    const deals = await this.ensureDealsSeeded(organizationId);
    return {
      deals: listActiveDeals(deals),
      destinations: DESTINATION_GUIDES,
      pointsRules: this.pointsRules,
      referral: DEFAULT_REFERRAL,
      paymentStatuses: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
    };
  }

  async listDeals() {
    const organizationId = await this.orgId();
    const deals = await this.ensureDealsSeeded(organizationId);
    return listActiveDeals(deals);
  }

  async getDeal(slug: string) {
    const organizationId = await this.orgId();
    const deals = await this.ensureDealsSeeded(organizationId);
    return getDealBySlug(slug, deals) || null;
  }

  listDestinations() {
    return DESTINATION_GUIDES;
  }

  getDestination(slug: string) {
    return getDestination(slug) || null;
  }

  getCms() {
    return this.cms;
  }

  updateCms(patch: Partial<CmsState>) {
    this.cms = {
      ...this.cms,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return this.cms;
  }

  async upsertDeal(deal: WeekendDeal) {
    const organizationId = await this.orgId();
    try {
      const row = await this.prisma.cmsDeal.upsert({
        where: {
          organizationId_slug: { organizationId, slug: deal.slug },
        },
        create: {
          id: deal.id,
          organizationId,
          slug: deal.slug,
          destinationSlug: deal.destinationSlug,
          titleAr: deal.titleAr,
          titleEn: deal.titleEn,
          image: deal.image,
          includes: deal.includes,
          originalPriceMinor: deal.originalPriceMinor,
          salePriceMinor: deal.salePriceMinor,
          currency: deal.currency || "KWD",
          nights: deal.nights,
          active: deal.active,
          startAt: deal.startAt ? new Date(deal.startAt) : null,
          endAt: deal.endAt ? new Date(deal.endAt) : null,
          descriptionAr: deal.descriptionAr,
          descriptionEn: deal.descriptionEn,
          countryFlag: deal.countryFlag || null,
          city: deal.city || null,
        },
        update: {
          destinationSlug: deal.destinationSlug,
          titleAr: deal.titleAr,
          titleEn: deal.titleEn,
          image: deal.image,
          includes: deal.includes,
          originalPriceMinor: deal.originalPriceMinor,
          salePriceMinor: deal.salePriceMinor,
          currency: deal.currency || "KWD",
          nights: deal.nights,
          active: deal.active,
          startAt: deal.startAt ? new Date(deal.startAt) : null,
          endAt: deal.endAt ? new Date(deal.endAt) : null,
          descriptionAr: deal.descriptionAr,
          descriptionEn: deal.descriptionEn,
          countryFlag: deal.countryFlag || null,
          city: deal.city || null,
        },
      });
      return dealFromRow(row);
    } catch {
      return deal;
    }
  }

  async getOrCreateTrip(tripId?: string, customer?: ShopCustomer) {
    if (tripId) {
      try {
        const row = await this.prisma.platformTrip.findFirst({
          where: { id: tripId },
        });
        if (row) return draftFromTripRow(row);
      } catch {
        /* memory */
      }
      if (this.trips.has(tripId)) return this.trips.get(tripId)!;
    }
    const draft = emptyTripDraft(tripId);
    this.trips.set(draft.id, draft);
    try {
      const organizationId = customer?.organizationId || (await this.orgId());
      await this.prisma.platformTrip.create({
        data: {
          id: draft.id,
          organizationId,
          customerId: customer?.id || null,
          status: draft.status,
          currency: draft.currency,
          totalSellMinor: draft.totalSellAmountMinor,
          savingsMinor: draft.savingsMinor || 0,
          components: asJson(draft.components),
          paymentStatus: "pending",
        },
      });
    } catch {
      /* keep memory */
    }
    return draft;
  }

  private async persistTrip(draft: PackageDraft, customerId?: string | null) {
    this.trips.set(draft.id, draft);
    try {
      await this.prisma.platformTrip.update({
        where: { id: draft.id },
        data: {
          status: draft.status,
          currency: draft.currency,
          totalSellMinor: draft.totalSellAmountMinor,
          savingsMinor: draft.savingsMinor || 0,
          components: asJson(draft.components),
          ...(customerId ? { customerId } : {}),
        },
      });
    } catch {
      /* memory only */
    }
  }

  async setTripComponent(tripId: string, component: PackageComponent) {
    const cur = await this.getOrCreateTrip(tripId);
    const next = upsertComponent(cur, component);
    await this.persistTrip(next);
    return { trip: next, price: buildTripPriceBreakdown(next.components) };
  }

  async removeTripComponent(tripId: string, kind: PackageComponent["kind"]) {
    const cur = await this.getOrCreateTrip(tripId);
    const next = removeComponent(cur, kind);
    await this.persistTrip(next);
    return { trip: next, price: buildTripPriceBreakdown(next.components) };
  }

  async tripPrice(tripId: string, pointsRedeemed = 0) {
    const trip = await this.getOrCreateTrip(tripId);
    return {
      trip,
      price: buildTripPriceBreakdown(trip.components, {
        pointsRedeemedMinor: pointsToCreditMinor(pointsRedeemed, this.pointsRules),
      }),
    };
  }

  async bookDealAsTrip(slug: string) {
    const deal = await this.getDeal(slug);
    if (!deal) return null;
    const draft = emptyTripDraft();
    const per = Math.round(deal.salePriceMinor / Math.max(1, deal.includes.length));
    for (const kind of deal.includes) {
      draft.components.push({
        kind,
        offerId: `${deal.id}-${kind}`,
        status: "selected",
        sellAmountMinor: per,
        currency: deal.currency,
        label: `${deal.titleAr} · ${kind}`,
      });
    }
    draft.totalSellAmountMinor = deal.salePriceMinor;
    draft.savingsMinor = deal.originalPriceMinor - deal.salePriceMinor;
    draft.currency = deal.currency;
    this.trips.set(draft.id, draft);
    try {
      const organizationId = await this.orgId();
      await this.prisma.platformTrip.create({
        data: {
          id: draft.id,
          organizationId,
          status: draft.status,
          currency: draft.currency,
          totalSellMinor: draft.totalSellAmountMinor,
          savingsMinor: draft.savingsMinor || 0,
          components: asJson(draft.components),
          paymentStatus: "pending",
          title: deal.titleAr,
          destination: deal.city || deal.destinationSlug,
        },
      });
    } catch {
      /* memory */
    }
    return {
      trip: draft,
      price: buildTripPriceBreakdown(draft.components),
      deal,
    };
  }

  async ensurePoints(customer: ShopCustomer): Promise<CustomerPointsAccount> {
    try {
      const entries = await this.prisma.pointsLedger.findMany({
        where: {
          organizationId: customer.organizationId,
          customerId: customer.id,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      if (entries.length) {
        const balance = entries[0]!.balanceAfter;
        const acc: CustomerPointsAccount = {
          customerId: customer.id,
          balance,
          entries: entries.map((e) => ({
            id: e.id,
            customerId: e.customerId,
            delta: e.delta,
            reason: e.reason,
            createdAt: e.createdAt.toISOString(),
            bookingId: e.bookingId || undefined,
          })),
        };
        this.points.set(customer.id, acc);
        return acc;
      }
      const welcome = this.pointsRules.welcomeBonus;
      const created = await this.prisma.pointsLedger.create({
        data: {
          organizationId: customer.organizationId,
          customerId: customer.id,
          delta: welcome,
          balanceAfter: welcome,
          reason: "welcome_bonus",
        },
      });
      const acc: CustomerPointsAccount = {
        customerId: customer.id,
        balance: welcome,
        entries: [
          {
            id: created.id,
            customerId: customer.id,
            delta: welcome,
            reason: "welcome_bonus",
            createdAt: created.createdAt.toISOString(),
          },
        ],
      };
      this.points.set(customer.id, acc);
      return acc;
    } catch {
      let acc = this.points.get(customer.id);
      if (!acc) {
        acc = {
          customerId: customer.id,
          balance: this.pointsRules.welcomeBonus,
          entries: [
            {
              id: `pts_welcome_${customer.id.slice(0, 8)}`,
              customerId: customer.id,
              delta: this.pointsRules.welcomeBonus,
              reason: "welcome_bonus",
              createdAt: new Date().toISOString(),
            },
          ],
        };
        this.points.set(customer.id, acc);
      }
      return acc;
    }
  }

  async getPoints(customer: ShopCustomer) {
    return this.ensurePoints(customer);
  }

  getPointsRules() {
    return this.pointsRules;
  }

  async adjustPoints(
    customer: ShopCustomer | { id: string; organizationId: string },
    delta: number,
    reason: string,
    bookingId?: string,
  ) {
    const acc = await this.ensurePoints(customer as ShopCustomer);
    acc.balance = Math.max(0, acc.balance + delta);
    const entry = {
      id: `pts_${Date.now().toString(36)}`,
      customerId: customer.id,
      delta,
      reason,
      createdAt: new Date().toISOString(),
      bookingId,
    };
    acc.entries.unshift(entry);
    this.points.set(customer.id, acc);
    try {
      const row = await this.prisma.pointsLedger.create({
        data: {
          organizationId: customer.organizationId,
          customerId: customer.id,
          delta,
          balanceAfter: acc.balance,
          reason,
          bookingId: bookingId || null,
          tripId: bookingId || null,
        },
      });
      entry.id = row.id;
      entry.createdAt = row.createdAt.toISOString();
    } catch {
      /* memory */
    }
    return acc;
  }

  setPointsRules(rules: Partial<PointsRules>) {
    this.pointsRules = { ...this.pointsRules, ...rules };
    return this.pointsRules;
  }

  async getOrCreateReferral(customer: ShopCustomer) {
    try {
      const existing = await this.prisma.referral.findFirst({
        where: {
          organizationId: customer.organizationId,
          ownerCustomerId: customer.id,
        },
      });
      if (existing) {
        const rec: ReferralRecord = {
          code: existing.code,
          ownerCustomerId: existing.ownerCustomerId,
          uses: existing.uses,
          createdAt: existing.createdAt.toISOString(),
        };
        this.referrals.set(rec.code, rec);
        return rec;
      }
      const code = buildReferralCode(customer.name || customer.phone || customer.id);
      const created = await this.prisma.referral.create({
        data: {
          organizationId: customer.organizationId,
          ownerCustomerId: customer.id,
          code,
          uses: 0,
        },
      });
      const rec: ReferralRecord = {
        code: created.code,
        ownerCustomerId: created.ownerCustomerId,
        uses: created.uses,
        createdAt: created.createdAt.toISOString(),
      };
      this.referrals.set(rec.code, rec);
      return rec;
    } catch {
      for (const r of this.referrals.values()) {
        if (r.ownerCustomerId === customer.id) return r;
      }
      const code = buildReferralCode(customer.name || customer.phone || customer.id);
      const rec: ReferralRecord = {
        code,
        ownerCustomerId: customer.id,
        uses: 0,
        createdAt: new Date().toISOString(),
      };
      this.referrals.set(code, rec);
      return rec;
    }
  }

  async applyReferral(code: string, friendCustomer: ShopCustomer) {
    const normalized = code.toUpperCase();
    let rec: ReferralRecord | null = null;
    try {
      const row = await this.prisma.referral.findFirst({
        where: {
          organizationId: friendCustomer.organizationId,
          code: normalized,
        },
      });
      if (row) {
        rec = {
          code: row.code,
          ownerCustomerId: row.ownerCustomerId,
          uses: row.uses,
          createdAt: row.createdAt.toISOString(),
        };
      }
    } catch {
      rec = this.referrals.get(normalized) || null;
    }
    if (!rec) return { ok: false as const, error: "كود غير صالح" };
    if (rec.ownerCustomerId === friendCustomer.id) {
      return { ok: false as const, error: "لا يمكن استخدام كودك" };
    }
    rec.uses += 1;
    this.referrals.set(rec.code, rec);
    try {
      await this.prisma.referral.updateMany({
        where: {
          organizationId: friendCustomer.organizationId,
          code: rec.code,
        },
        data: { uses: rec.uses },
      });
    } catch {
      /* memory */
    }
    await this.adjustPoints(
      { id: rec.ownerCustomerId, organizationId: friendCustomer.organizationId },
      DEFAULT_REFERRAL.rewardReferrerPoints,
      "referral_owner",
    );
    await this.adjustPoints(
      friendCustomer,
      DEFAULT_REFERRAL.rewardFriendPoints,
      "referral_friend",
    );
    await this.pushNotification(friendCustomer.organizationId, {
      customerId: rec.ownerCustomerId,
      type: "reward",
      title: "مكافأة إحالة",
      body: `حصلت على ${DEFAULT_REFERRAL.rewardReferrerPoints} نقطة من إحالة صديق.`,
      channels: ["in_app", "email"],
    });
    return { ok: true as const, referral: rec };
  }

  async listAlerts(customerId: string) {
    try {
      const rows = await this.prisma.priceAlert.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(
        (a): PriceAlert => ({
          id: a.id,
          customerId: a.customerId,
          origin: a.origin,
          destination: a.destination,
          departDate: a.departDate?.toISOString().slice(0, 10),
          returnDate: a.returnDate?.toISOString().slice(0, 10),
          currentPriceMinor: a.currentPriceMinor,
          targetPriceMinor: a.targetPriceMinor,
          currency: a.currency,
          active: a.active,
          createdAt: a.createdAt.toISOString(),
          lastNotifiedAt: a.lastNotifiedAt?.toISOString(),
        }),
      );
    } catch {
      return this.alerts.filter((a) => a.customerId === customerId);
    }
  }

  async createAlert(
    customer: ShopCustomer,
    body: {
      origin: string;
      destination: string;
      currentPriceMinor: number;
      targetPriceMinor: number;
      currency?: string;
      departDate?: string;
      returnDate?: string;
    },
  ) {
    const alert: PriceAlert = {
      id: `alert_${Date.now().toString(36)}`,
      customerId: customer.id,
      origin: body.origin,
      destination: body.destination,
      currentPriceMinor: body.currentPriceMinor,
      targetPriceMinor: body.targetPriceMinor,
      currency: body.currency || "KWD",
      departDate: body.departDate,
      returnDate: body.returnDate,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.alerts.push(alert);
    try {
      const row = await this.prisma.priceAlert.create({
        data: {
          organizationId: customer.organizationId,
          customerId: customer.id,
          origin: body.origin,
          destination: body.destination,
          departDate: body.departDate ? new Date(body.departDate) : null,
          returnDate: body.returnDate ? new Date(body.returnDate) : null,
          currentPriceMinor: body.currentPriceMinor,
          targetPriceMinor: body.targetPriceMinor,
          currency: body.currency || "KWD",
          active: true,
        },
      });
      alert.id = row.id;
      alert.createdAt = row.createdAt.toISOString();
    } catch {
      /* memory */
    }
    return alert;
  }

  async checkAlerts(latest: {
    origin: string;
    destination: string;
    priceMinor: number;
  }) {
    let candidates: PriceAlert[] = [];
    try {
      const rows = await this.prisma.priceAlert.findMany({
        where: {
          active: true,
          origin: latest.origin,
          destination: latest.destination,
        },
      });
      candidates = rows.map((a) => ({
        id: a.id,
        customerId: a.customerId,
        origin: a.origin,
        destination: a.destination,
        currentPriceMinor: a.currentPriceMinor,
        targetPriceMinor: a.targetPriceMinor,
        currency: a.currency,
        active: a.active,
        createdAt: a.createdAt.toISOString(),
        lastNotifiedAt: a.lastNotifiedAt?.toISOString(),
      }));
    } catch {
      candidates = this.alerts.filter(
        (a) =>
          a.active &&
          a.origin === latest.origin &&
          a.destination === latest.destination,
      );
    }

    const fired: PriceAlert[] = [];
    for (const a of candidates) {
      if (!shouldFirePriceAlert(a, latest.priceMinor)) continue;
      a.lastNotifiedAt = new Date().toISOString();
      fired.push(a);
      try {
        await this.prisma.priceAlert.update({
          where: { id: a.id },
          data: { lastNotifiedAt: new Date() },
        });
      } catch {
        const mem = this.alerts.find((x) => x.id === a.id);
        if (mem) mem.lastNotifiedAt = a.lastNotifiedAt;
      }
      let organizationId = "";
      try {
        const cust = await this.prisma.customer.findFirst({
          where: { id: a.customerId },
          select: { organizationId: true },
        });
        organizationId = cust?.organizationId || (await this.orgId());
      } catch {
        organizationId = await this.orgId().catch(() => "");
      }
      if (organizationId) {
        await this.pushNotification(organizationId, {
          customerId: a.customerId,
          type: "price_drop",
          title: "انخفض السعر!",
          body: `${a.origin} → ${a.destination} وصل إلى هدفك ${a.targetPriceMinor / 1000} ${a.currency}`,
          channels: ["in_app", "email", "whatsapp"],
          href: `/flights/results?origin=${a.origin}&destination=${a.destination}`,
        });
      }
    }
    return fired;
  }

  async listNotifications(customerId: string) {
    try {
      const rows = await this.prisma.customerNotification.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return rows.map(
        (n): CustomerNotification => ({
          id: n.id,
          customerId: n.customerId,
          type: n.type as CustomerNotification["type"],
          title: n.title,
          body: n.body,
          read: Boolean(n.readAt),
          channels: (Array.isArray(n.channels)
            ? n.channels
            : ["in_app"]) as CustomerNotification["channels"],
          createdAt: n.createdAt.toISOString(),
          href: n.href || undefined,
        }),
      );
    } catch {
      return this.notifications.filter((n) => n.customerId === customerId);
    }
  }

  async pushNotification(
    organizationId: string,
    partial: Omit<CustomerNotification, "id" | "read" | "createdAt"> & {
      id?: string;
      read?: boolean;
      createdAt?: string;
    },
  ) {
    const n = await dispatchCustomerNotification(
      { prisma: this.prisma },
      {
        organizationId,
        customerId: partial.customerId,
        type: partial.type,
        title: partial.title,
        body: partial.body,
        channels: partial.channels,
        href: partial.href,
      },
    );
    this.notifications.unshift(n);
    return n;
  }

  async markNotificationRead(customerId: string, id: string) {
    try {
      const row = await this.prisma.customerNotification.findFirst({
        where: { id, customerId },
      });
      if (!row) return null;
      const updated = await this.prisma.customerNotification.update({
        where: { id },
        data: { readAt: new Date() },
      });
      return {
        id: updated.id,
        customerId: updated.customerId,
        type: updated.type as CustomerNotification["type"],
        title: updated.title,
        body: updated.body,
        read: true,
        channels: (Array.isArray(updated.channels)
          ? updated.channels
          : ["in_app"]) as CustomerNotification["channels"],
        createdAt: updated.createdAt.toISOString(),
        href: updated.href || undefined,
      } satisfies CustomerNotification;
    } catch {
      const n = this.notifications.find((x) => x.id === id && x.customerId === customerId);
      if (n) n.read = true;
      return n || null;
    }
  }

  async listMyTrips(customer: ShopCustomer): Promise<MyTrip[]> {
    const platformRows: MyTrip[] = [];
    try {
      const rows = await this.prisma.platformTrip.findMany({
        where: {
          organizationId: customer.organizationId,
          customerId: customer.id,
          OR: [
            { paymentStatus: { in: ["paid", "partially_refunded", "refunded"] } },
            { status: { in: ["confirmed", "booking"] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      for (const row of rows) {
        const services = (row.services || {}) as MyTrip["services"];
        const documents = (row.documents || {}) as MyTrip["documents"];
        platformRows.push({
          id: row.id,
          title: row.title || "رحلتي",
          destination: row.destination || "—",
          startDate: row.startDate
            ? row.startDate.toISOString().slice(0, 10)
            : row.createdAt.toISOString().slice(0, 10),
          endDate: row.endDate
            ? row.endDate.toISOString().slice(0, 10)
            : row.createdAt.toISOString().slice(0, 10),
          currency: row.currency,
          totalMinor: row.totalSellMinor,
          paymentStatus: normalizeShopPaymentStatus(row.paymentStatus),
          services: {
            flight: services?.flight || "none",
            hotel: services?.hotel || "none",
            transfer: services?.transfer || "none",
            activity: services?.activity || "none",
          },
          documents: documents || {},
        });
      }
    } catch {
      platformRows.push(
        ...this.myTrips.filter((t) => t.customerId === customer.id),
      );
    }

    let bookingRows: MyTrip[] = [];
    try {
      const bookings = await this.prisma.booking.findMany({
        where: {
          organizationId: customer.organizationId,
          customerId: customer.id,
        },
        include: {
          quote: { include: { items: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      bookingRows = bookings.map(mapBookingToMyTrip);
    } catch {
      bookingRows = [];
    }

    const byId = new Map<string, MyTrip>();
    for (const t of [...bookingRows, ...platformRows]) {
      if (!byId.has(t.id)) byId.set(t.id, t);
    }
    return Array.from(byId.values());
  }

  /** Demo / seeded trips for logged-in customer — also merges real Booking rows */
  async ensureDemoTrips(customer: ShopCustomer) {
    const existing = await this.listMyTrips(customer);
    if (existing.length) return existing;
    const trip: MyTrip & { customerId: string } = {
      id: `trip_demo_${customer.id.slice(0, 8)}`,
      customerId: customer.id,
      title: "Dubai Trip",
      destination: "دبي",
      startDate: "2026-09-12",
      endDate: "2026-09-17",
      currency: "KWD",
      totalMinor: 199_000,
      paymentStatus: "paid",
      services: {
        flight: "confirmed",
        hotel: "confirmed",
        transfer: "confirmed",
        activity: "pending",
      },
      documents: {
        ticketUrl: "/account/trips#ticket",
        hotelVoucherUrl: "/account/trips#hotel",
        transferVoucherUrl: "/account/trips#transfer",
        activityVoucherUrl: "/account/trips#activity",
        invoiceUrl: "/account/trips#invoice",
        itineraryUrl: "/account/trips#itinerary",
      },
    };
    this.myTrips.push(trip);
    try {
      await this.prisma.platformTrip.create({
        data: {
          id: trip.id,
          organizationId: customer.organizationId,
          customerId: customer.id,
          status: "confirmed",
          currency: trip.currency,
          totalSellMinor: trip.totalMinor,
          savingsMinor: 0,
          components: asJson([]),
          paymentStatus: "paid",
          title: trip.title,
          destination: trip.destination,
          startDate: new Date(trip.startDate),
          endDate: new Date(trip.endDate),
          services: asJson(trip.services),
          documents: asJson(trip.documents),
        },
      });
    } catch {
      /* memory demo */
    }
    return [trip];
  }

  async createCheckout(customer: ShopCustomer, tripId: string, redeemPoints = 0) {
    const { trip, price } = await this.tripPrice(tripId, redeemPoints);
    if (!trip.components.length) return null;
    const summary: CheckoutSummary & { customerId: string } = {
      tripId: trip.id,
      customerId: customer.id,
      components: trip.components.map((c) => ({
        kind: c.kind,
        label: c.label,
        amountMinor: c.sellAmountMinor,
      })),
      originalMinor: price.originalMinor,
      discountMinor: price.discountMinor,
      taxesMinor: price.taxesMinor,
      feesMinor: price.feesMinor,
      pointsRedeemedMinor: price.pointsRedeemedMinor,
      finalMinor: price.finalMinor,
      currency: price.currency,
      paymentStatus: "pending",
    };
    this.checkouts.set(trip.id, summary);
    try {
      await this.prisma.platformTrip.update({
        where: { id: trip.id },
        data: {
          customerId: customer.id,
          paymentStatus: "pending",
          totalSellMinor: summary.finalMinor,
        },
      });
    } catch {
      /* memory */
    }
    return summary;
  }

  async payCheckout(customer: ShopCustomer, tripId: string) {
    const summary = this.checkouts.get(tripId);
    if (!summary) return null;

    // Never trust a client-supplied "paid" flag. Demo pay is server-gated only.
    const allowDemo =
      process.env.ALLOW_DEMO_CHECKOUT_PAY === "1" &&
      (process.env.PAYMENT_ENV || "sandbox").toLowerCase() !== "production";
    if (!allowDemo) {
      throw new BadRequestException(
        "أكمل الدفع عبر بوابة الدفع المعتمدة. تأكيد الدفع يتم من السيرفر فقط.",
      );
    }

    const result = "paid" as const;
    summary.paymentStatus = normalizeShopPaymentStatus(result);
    if (result === "paid") {
      const earned = pointsEarnedFromSpend(summary.finalMinor, this.pointsRules);
      await this.adjustPoints(customer, earned, "booking_earn", tripId);
      await this.pushNotification(customer.organizationId, {
        customerId: customer.id,
        type: "payment_confirmed",
        title: "تم تأكيد الدفع",
        body: `دفعت ${summary.finalMinor / 1000} ${summary.currency} — حصلت على ${earned} نقطة.`,
        channels: ["in_app", "email", "whatsapp"],
        href: "/account/trips",
      });
      const services = {
        flight: summary.components.some((c) => c.kind === "flight")
          ? ("confirmed" as const)
          : ("none" as const),
        hotel: summary.components.some((c) => c.kind === "hotel")
          ? ("confirmed" as const)
          : ("none" as const),
        transfer: summary.components.some((c) => c.kind === "transfer")
          ? ("confirmed" as const)
          : ("none" as const),
        activity: summary.components.some((c) => c.kind === "activity")
          ? ("confirmed" as const)
          : ("none" as const),
      };
      const tripRow: MyTrip & { customerId: string } = {
        id: tripId.startsWith("trip_") ? tripId : `trip_${tripId}`,
        customerId: customer.id,
        title: "رحلتي",
        destination: "—",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        currency: summary.currency,
        totalMinor: summary.finalMinor,
        paymentStatus: "paid",
        services,
        documents: {
          invoiceUrl: `/account/trips?id=${tripId}`,
        },
      };
      if (!this.myTrips.find((t) => t.id === tripRow.id || t.id === tripId)) {
        this.myTrips.push(tripRow);
      }
      try {
        await this.prisma.platformTrip.update({
          where: { id: tripId },
          data: {
            customerId: customer.id,
            paymentStatus: "paid",
            status: "confirmed",
            totalSellMinor: summary.finalMinor,
            services: asJson(services),
            documents: asJson(tripRow.documents),
            title: tripRow.title,
          },
        });
      } catch {
        /* memory */
      }
    } else {
      try {
        await this.prisma.platformTrip.update({
          where: { id: tripId },
          data: { paymentStatus: "failed" },
        });
      } catch {
        /* ignore */
      }
    }
    return summary;
  }

  listFavorites(customerId: string) {
    return this.favoriteRows.filter((f) => f.customerId === customerId);
  }

  toggleFavorite(customerId: string, slug: string) {
    const i = this.favoriteRows.findIndex(
      (f) => f.customerId === customerId && f.slug === slug,
    );
    if (i >= 0) {
      this.favoriteRows.splice(i, 1);
      return { saved: false };
    }
    this.favoriteRows.push({
      customerId,
      slug,
      savedAt: new Date().toISOString(),
    });
    return { saved: true };
  }

  savedSearches(customerId: string) {
    return this.searches.filter((s) => s.customerId === customerId);
  }

  saveSearch(customerId: string, label: string, href: string) {
    const row: SavedSearch = {
      id: `srch_${Date.now().toString(36)}`,
      customerId,
      label,
      href,
      savedAt: new Date().toISOString(),
    };
    this.searches.unshift(row);
    return row;
  }

  async adminStats() {
    let bookings = this.myTrips.length;
    let salesMinor = this.myTrips.reduce((s, t) => s + t.totalMinor, 0);
    let customers = this.points.size;
    try {
      const organizationId = await this.orgId();
      const [bookingCount, bookingAgg, customerCount] = await Promise.all([
        this.prisma.booking.count({ where: { organizationId } }),
        this.prisma.booking.aggregate({
          where: { organizationId },
          _sum: { totalSellAmount: true },
        }),
        this.prisma.customer.count({ where: { organizationId } }),
      ]);
      bookings = bookingCount || bookings;
      salesMinor = bookingAgg._sum.totalSellAmount || salesMinor;
      customers = customerCount || customers;
    } catch {
      /* memory stats */
    }
    return {
      today: {
        bookings,
        salesMinor,
        customers,
        cancellations: 0,
        refunds: 0,
      },
      topDestinations: [
        { slug: "dubai", label: "دبي", count: 18 },
        { slug: "istanbul", label: "إسطنبول", count: 12 },
        { slug: "doha", label: "الدوحة", count: 9 },
        { slug: "bahrain", label: "البحرين", count: 7 },
        { slug: "london", label: "لندن", count: 4 },
      ],
      funnel: {
        visits: 1000,
        searches: 600,
        selected: 300,
        checkoutStarted: 150,
        paid: 100,
      },
    };
  }
}
