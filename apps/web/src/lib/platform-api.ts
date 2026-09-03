/** Client helper — platform APIs are additive; pages work with static fallbacks too. */
import { shopFetch } from "@/lib/shop-session";
import {
  WEEKEND_DEALS,
  DESTINATION_GUIDES,
  isPlatformEnabled,
  type WeekendDeal,
  type DestinationGuide,
  type PackageDraft,
  type TripPriceBreakdown,
  type MyTrip,
  type CustomerPointsAccount,
  type PriceAlert,
  type CustomerNotification,
  type ReferralRecord,
  type CheckoutSummary,
  type PointsRules,
} from "@watesly-travel/shared";

export { isPlatformEnabled };

export async function fetchDeals(): Promise<WeekendDeal[]> {
  try {
    return await shopFetch<WeekendDeal[]>("/shop/platform/deals");
  } catch {
    return WEEKEND_DEALS.filter((d) => d.active);
  }
}

export async function fetchDeal(slug: string): Promise<WeekendDeal | null> {
  try {
    return await shopFetch<WeekendDeal | null>(`/shop/platform/deals/${slug}`);
  } catch {
    return WEEKEND_DEALS.find((d) => d.slug === slug) || null;
  }
}

export async function fetchDestinations(): Promise<DestinationGuide[]> {
  try {
    return await shopFetch<DestinationGuide[]>("/shop/platform/destinations");
  } catch {
    return DESTINATION_GUIDES;
  }
}

export async function fetchDestination(slug: string): Promise<DestinationGuide | null> {
  try {
    return await shopFetch<DestinationGuide | null>(`/shop/platform/destinations/${slug}`);
  } catch {
    return DESTINATION_GUIDES.find((d) => d.slug === slug) || null;
  }
}

export async function createTrip() {
  return shopFetch<PackageDraft>("/shop/platform/trips", { method: "POST", body: "{}" });
}

export async function setTripComponent(tripId: string, component: unknown) {
  return shopFetch<{ trip: PackageDraft; price: TripPriceBreakdown }>(
    `/shop/platform/trips/${tripId}/components`,
    { method: "POST", body: JSON.stringify(component) },
  );
}

export async function removeTripComponent(tripId: string, kind: string) {
  return shopFetch<{ trip: PackageDraft; price: TripPriceBreakdown }>(
    `/shop/platform/trips/${tripId}/components/remove`,
    { method: "POST", body: JSON.stringify({ kind }) },
  );
}

export async function bookDeal(slug: string) {
  return shopFetch<{ trip: PackageDraft; price: TripPriceBreakdown; deal: WeekendDeal }>(
    `/shop/platform/deals/${slug}/book`,
    { method: "POST", body: "{}" },
  );
}

export async function fetchMyTrips() {
  return shopFetch<MyTrip[]>("/shop/platform/me/trips");
}

export async function fetchPoints() {
  return shopFetch<{ account: CustomerPointsAccount; rules: PointsRules }>(
    "/shop/platform/me/points",
  );
}

export async function fetchReferral() {
  return shopFetch<ReferralRecord>("/shop/platform/me/referral");
}

export async function applyReferralCode(code: string) {
  return shopFetch<{ ok: boolean; error?: string }>("/shop/platform/me/referral/apply", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function fetchAlerts() {
  return shopFetch<PriceAlert[]>("/shop/platform/me/alerts");
}

export async function createAlert(body: Record<string, unknown>) {
  return shopFetch<PriceAlert>("/shop/platform/me/alerts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchNotifications() {
  return shopFetch<CustomerNotification[]>("/shop/platform/me/notifications");
}

export async function createCheckout(tripId: string, redeemPoints = 0) {
  return shopFetch<CheckoutSummary>("/shop/platform/me/checkout", {
    method: "POST",
    body: JSON.stringify({ tripId, redeemPoints }),
  });
}

export async function payCheckout(tripId: string) {
  return shopFetch<CheckoutSummary>("/shop/platform/me/checkout/pay", {
    method: "POST",
    body: JSON.stringify({ tripId, result: "paid" }),
  });
}

export async function fetchAdminStats() {
  return shopFetch<{
    today: Record<string, number>;
    topDestinations: Array<{ slug: string; label: string; count: number }>;
    funnel: Record<string, number>;
  }>("/shop/platform/admin/stats");
}

export function formatKwdMinor(minor: number, currency = "KWD") {
  return `${(minor / 1000).toLocaleString("en-KW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${currency}`;
}
