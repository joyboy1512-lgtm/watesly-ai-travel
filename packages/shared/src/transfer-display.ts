/** Rich transfer display model — provider-agnostic UI shape. */

export type TransferServiceDetails = {
  provider: string;
  liveMode: boolean;
  source?: string;
  sourceLabel?: string;
  fetchedAt?: string;
  rateKey?: string;
  transferType?: string;
  transferTypeLabel?: string;
  vehicleCode?: string;
  vehicleName?: string;
  categoryCode?: string;
  categoryName?: string;
  direction?: string;
  fromLabel?: string;
  toLabel?: string;
  fromType?: string;
  toType?: string;
  outboundAt?: string;
  inboundAt?: string;
  minPax?: number;
  maxPax?: number;
  imageUrl?: string;
  freeCancellation?: boolean;
  cancellationFrom?: string;
  cancellationAmount?: number;
  description?: string;
  [key: string]: unknown;
};

export function transferTypeLabelAr(type?: string): string {
  const key = String(type || "").toUpperCase();
  if (key === "PRIVATE") return "نقل خاص";
  if (key === "SHARED") return "نقل مشترك";
  if (key === "SHUTTLE") return "باص مشترك";
  return type || "نقل";
}

/** Hotelbeds endpoint kinds used in transfer availability URLs. */
export type TransferEndpointKind = "IATA" | "ATLAS" | "GPS";

/** UI pickup/dropoff selectors on the inquiries transfer tab. */
export type TransferPointKindUi = "airport" | "hotel" | "address";

export function transferPointKindToEndpoint(
  kind: TransferPointKindUi,
): TransferEndpointKind {
  if (kind === "airport") return "IATA";
  if (kind === "hotel") return "ATLAS";
  return "GPS";
}

export function transferPointKindLabelAr(kind?: TransferPointKindUi | string): string {
  const key = String(kind || "").toLowerCase();
  if (key === "airport") return "مطار";
  if (key === "hotel") return "فندق";
  if (key === "address") return "عنوان";
  return key || "نقطة";
}
