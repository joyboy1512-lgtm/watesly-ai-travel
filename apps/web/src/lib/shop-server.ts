import { WEEKEND_DEALS, type WeekendDeal } from "@watesly-travel/shared";

function shopApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:3011";
}

/** Server-side catalog fetch — no auth required; falls back to static seed. */
export async function fetchShopDeals(): Promise<WeekendDeal[]> {
  try {
    const res = await fetch(`${shopApiBase()}/shop/platform/deals`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(String(res.status));
    const deals = (await res.json()) as WeekendDeal[];
    if (Array.isArray(deals) && deals.length) return deals;
  } catch {
    // fall through
  }
  return WEEKEND_DEALS.filter((d) => d.active);
}

export async function fetchShopDeal(slug: string): Promise<WeekendDeal | null> {
  try {
    const res = await fetch(`${shopApiBase()}/shop/platform/deals/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as WeekendDeal | null;
  } catch {
    return WEEKEND_DEALS.find((d) => d.slug === slug) || null;
  }
}
