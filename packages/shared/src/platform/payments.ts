/** Shop payment lifecycle — includes partially refunded. */

export const SHOP_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
] as const;

export type ShopPaymentStatus = (typeof SHOP_PAYMENT_STATUSES)[number];

export const SHOP_PAYMENT_STATUS_AR: Record<ShopPaymentStatus, string> = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "فشل",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئياً",
};

export function normalizeShopPaymentStatus(raw: string | undefined | null): ShopPaymentStatus {
  const v = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (v === "captured" || v === "success" || v === "paid") return "paid";
  if (v === "unpaid" || v === "pending" || v === "processing") return "pending";
  if (v === "failed" || v === "cancelled" || v === "canceled" || v === "expired") {
    return "failed";
  }
  if (v === "partially_refunded" || v === "partial_refund") return "partially_refunded";
  if (v === "refunded") return "refunded";
  if ((SHOP_PAYMENT_STATUSES as readonly string[]).includes(v)) return v as ShopPaymentStatus;
  return "pending";
}
