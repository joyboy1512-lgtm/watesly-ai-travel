/**
 * Platform v2 shop service — in-memory store so production DB stays untouched
 * until an explicit migration + WG_PLATFORM=1 deploy.
 */
import { Injectable } from "@nestjs/common";
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
  createNotification,
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
  type PointsRules,
  type CheckoutSummary,
} from "@watesly-travel/shared";
import type { ShopCustomer } from "./shop-auth";

type FavDest = { customerId: string; slug: string; savedAt: string };
type SavedSearch = {
  id: string;
  customerId: string;
  label: string;
  href: string;
  savedAt: string;
};

@Injectable()
export class PlatformService {
  private deals: WeekendDeal[] = [...WEEKEND_DEALS];
  private cms: CmsState = {
    ...DEFAULT_CMS,
    updatedAt: new Date().toISOString(),
  };
  private pointsRules: PointsRules = { ...DEFAULT_POINTS_RULES };
  private points = new Map<string, CustomerPointsAccount>();
  private referrals = new Map<string, ReferralRecord>();
  private alerts: PriceAlert[] = [];
  private notifications: CustomerNotification[] = [];
  private trips = new Map<string, PackageDraft>();
  private myTrips: MyTrip[] = [];
  private favoriteRows: FavDest[] = [];
  private searches: SavedSearch[] = [];
  private checkouts = new Map<string, CheckoutSummary>();

  catalog() {
    return {
      deals: listActiveDeals(this.deals),
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

  listDeals() {
    return listActiveDeals(this.deals);
  }

  getDeal(slug: string) {
    return getDealBySlug(slug, this.deals) || null;
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

  upsertDeal(deal: WeekendDeal) {
    const i = this.deals.findIndex((d) => d.id === deal.id || d.slug === deal.slug);
    if (i >= 0) this.deals[i] = deal;
    else this.deals.push(deal);
    return deal;
  }

  getOrCreateTrip(tripId?: string) {
    if (tripId && this.trips.has(tripId)) return this.trips.get(tripId)!;
    const draft = emptyTripDraft(tripId);
    this.trips.set(draft.id, draft);
    return draft;
  }

  setTripComponent(tripId: string, component: PackageComponent) {
    const cur = this.getOrCreateTrip(tripId);
    const next = upsertComponent(cur, component);
    this.trips.set(next.id, next);
    return { trip: next, price: buildTripPriceBreakdown(next.components) };
  }

  removeTripComponent(tripId: string, kind: PackageComponent["kind"]) {
    const cur = this.getOrCreateTrip(tripId);
    const next = removeComponent(cur, kind);
    this.trips.set(next.id, next);
    return { trip: next, price: buildTripPriceBreakdown(next.components) };
  }

  tripPrice(tripId: string, pointsRedeemed = 0) {
    const trip = this.getOrCreateTrip(tripId);
    return {
      trip,
      price: buildTripPriceBreakdown(trip.components, {
        pointsRedeemedMinor: pointsToCreditMinor(pointsRedeemed, this.pointsRules),
      }),
    };
  }

  bookDealAsTrip(slug: string) {
    const deal = this.getDeal(slug);
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
    return {
      trip: draft,
      price: buildTripPriceBreakdown(draft.components),
      deal,
    };
  }

  ensurePoints(customerId: string): CustomerPointsAccount {
    let acc = this.points.get(customerId);
    if (!acc) {
      acc = {
        customerId,
        balance: this.pointsRules.welcomeBonus,
        entries: [
          {
            id: `pts_welcome_${customerId.slice(0, 8)}`,
            customerId,
            delta: this.pointsRules.welcomeBonus,
            reason: "welcome_bonus",
            createdAt: new Date().toISOString(),
          },
        ],
      };
      this.points.set(customerId, acc);
    }
    return acc;
  }

  getPoints(customer: ShopCustomer) {
    return this.ensurePoints(customer.id);
  }

  getPointsRules() {
    return this.pointsRules;
  }

  adjustPoints(customerId: string, delta: number, reason: string, bookingId?: string) {
    const acc = this.ensurePoints(customerId);
    acc.balance = Math.max(0, acc.balance + delta);
    acc.entries.unshift({
      id: `pts_${Date.now().toString(36)}`,
      customerId,
      delta,
      reason,
      createdAt: new Date().toISOString(),
      bookingId,
    });
    return acc;
  }

  setPointsRules(rules: Partial<PointsRules>) {
    this.pointsRules = { ...this.pointsRules, ...rules };
    return this.pointsRules;
  }

  getOrCreateReferral(customer: ShopCustomer) {
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

  applyReferral(code: string, friendCustomerId: string) {
    const rec = this.referrals.get(code.toUpperCase());
    if (!rec) return { ok: false as const, error: "كود غير صالح" };
    if (rec.ownerCustomerId === friendCustomerId) {
      return { ok: false as const, error: "لا يمكن استخدام كودك" };
    }
    rec.uses += 1;
    this.adjustPoints(rec.ownerCustomerId, DEFAULT_REFERRAL.rewardReferrerPoints, "referral_owner");
    this.adjustPoints(friendCustomerId, DEFAULT_REFERRAL.rewardFriendPoints, "referral_friend");
    this.pushNotification(
      createNotification({
        customerId: rec.ownerCustomerId,
        type: "reward",
        title: "مكافأة إحالة",
        body: `حصلت على ${DEFAULT_REFERRAL.rewardReferrerPoints} نقطة من إحالة صديق.`,
        channels: ["in_app", "email"],
      }),
    );
    return { ok: true as const, referral: rec };
  }

  listAlerts(customerId: string) {
    return this.alerts.filter((a) => a.customerId === customerId);
  }

  createAlert(
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
    return alert;
  }

  checkAlerts(latest: { origin: string; destination: string; priceMinor: number }) {
    const fired: PriceAlert[] = [];
    for (const a of this.alerts) {
      if (
        a.active &&
        a.origin === latest.origin &&
        a.destination === latest.destination &&
        shouldFirePriceAlert(a, latest.priceMinor)
      ) {
        a.lastNotifiedAt = new Date().toISOString();
        fired.push(a);
        this.pushNotification(
          createNotification({
            customerId: a.customerId,
            type: "price_drop",
            title: "انخفض السعر!",
            body: `${a.origin} → ${a.destination} وصل إلى هدفك ${a.targetPriceMinor / 1000} ${a.currency}`,
            channels: ["in_app", "email"],
            href: `/flights/results?origin=${a.origin}&destination=${a.destination}`,
          }),
        );
      }
    }
    return fired;
  }

  listNotifications(customerId: string) {
    return this.notifications.filter((n) => n.customerId === customerId);
  }

  pushNotification(n: CustomerNotification) {
    this.notifications.unshift(n);
    return n;
  }

  markNotificationRead(customerId: string, id: string) {
    const n = this.notifications.find((x) => x.id === id && x.customerId === customerId);
    if (n) n.read = true;
    return n || null;
  }

  listMyTrips(customerId: string) {
    return this.myTrips.filter(
      (t) => (t as MyTrip & { customerId?: string }).customerId === customerId,
    );
  }

  /** Demo / seeded trips for logged-in customer */
  ensureDemoTrips(customer: ShopCustomer) {
    const existing = this.listMyTrips(customer.id);
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
    return [trip];
  }

  createCheckout(customer: ShopCustomer, tripId: string, redeemPoints = 0) {
    const { trip, price } = this.tripPrice(tripId, redeemPoints);
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
    return summary;
  }

  payCheckout(customer: ShopCustomer, tripId: string, result: "paid" | "failed" = "paid") {
    const summary = this.checkouts.get(tripId);
    if (!summary) return null;
    summary.paymentStatus = normalizeShopPaymentStatus(result);
    if (result === "paid") {
      const earned = pointsEarnedFromSpend(summary.finalMinor, this.pointsRules);
      this.adjustPoints(customer.id, earned, "booking_earn", tripId);
      this.pushNotification(
        createNotification({
          customerId: customer.id,
          type: "payment_confirmed",
          title: "تم تأكيد الدفع",
          body: `دفعت ${summary.finalMinor / 1000} ${summary.currency} — حصلت على ${earned} نقطة.`,
          channels: ["in_app", "email"],
          href: "/account/trips",
        }),
      );
      const dest =
        tripId &&
        (this.myTrips.find((t) => t.id === tripId) ||
          (() => {
            const t: MyTrip & { customerId: string } = {
              id: `trip_${tripId}`,
              customerId: customer.id,
              title: "رحلتي",
              destination: "—",
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date().toISOString().slice(0, 10),
              currency: summary.currency,
              totalMinor: summary.finalMinor,
              paymentStatus: "paid",
              services: {
                flight: summary.components.some((c) => c.kind === "flight")
                  ? "confirmed"
                  : "none",
                hotel: summary.components.some((c) => c.kind === "hotel")
                  ? "confirmed"
                  : "none",
                transfer: summary.components.some((c) => c.kind === "transfer")
                  ? "confirmed"
                  : "none",
                activity: summary.components.some((c) => c.kind === "activity")
                  ? "confirmed"
                  : "none",
              },
              documents: {
                invoiceUrl: `/account/trips?id=${tripId}`,
              },
            };
            this.myTrips.push(t);
            return t;
          })());
      void dest;
    }
    return summary;
  }

  listFavorites(customerId: string) {
    return this.favoriteRows.filter((f) => f.customerId === customerId);
  }

  toggleFavorite(customerId: string, slug: string) {
    const i = this.favoriteRows.findIndex((f) => f.customerId === customerId && f.slug === slug);
    if (i >= 0) {
      this.favoriteRows.splice(i, 1);
      return { saved: false };
    }
    this.favoriteRows.push({ customerId, slug, savedAt: new Date().toISOString() });
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

  adminStats() {
    return {
      today: {
        bookings: this.myTrips.length || 0,
        salesMinor: this.myTrips.reduce((s, t) => s + t.totalMinor, 0),
        customers: this.points.size,
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
