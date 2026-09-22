/** Detect Hotelbeds sandbox quota, including the string-body 403 payload. */
export function isShopHotelQuotaError(message: string): boolean {
  return /quota exceeded|quota has been exceeded|hotelbeds http 403|تجاوز حد طلبات/i.test(
    String(message || ""),
  );
}

export type StaleHotelQuoteItem = {
  providerOfferRef: string;
  description: string;
  sellAmount: number;
  costAmount: number;
  expiresAt: Date | null;
  rawOfferSnapshot: unknown;
};

export function mapQuoteItemsToHotelRows(
  items: StaleHotelQuoteItem[],
  currency: string,
) {
  return items
    .filter(
      (item) =>
        item.rawOfferSnapshot &&
        typeof item.rawOfferSnapshot === "object" &&
        !Array.isArray(item.rawOfferSnapshot),
    )
    .map((item) => ({
      id: item.providerOfferRef,
      serviceType: "hotel" as const,
      description: item.description,
      sellAmountMinor: item.sellAmount,
      costAmountMinor: item.costAmount,
      currency,
      expiresAt:
        item.expiresAt?.toISOString() ||
        new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      details: item.rawOfferSnapshot as Record<string, unknown>,
    }));
}
