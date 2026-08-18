import type { TransferOffer } from "@watesly-travel/shared";
import { transferTypeLabelAr } from "@watesly-travel/shared";
import type {
  ProviderBookingResult,
  TransferProviderAdapter,
  TransferSearchParams,
} from "../types";
import { amountToMinor } from "../types";

export class MockTransferProvider implements TransferProviderAdapter {
  readonly providerKey = "mock";
  readonly displayName = "Mock Transfers";
  readonly liveMode = false;

  async searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]> {
    const from = params.from.trim() || "KWI";
    const to = params.to.trim() || "DXB";
    const currency = "KWD";
    const fetchedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const rows: Array<{
      id: string;
      type: string;
      vehicle: string;
      major: number;
      maxPax: number;
    }> = [
      { id: "priv-sedan", type: "PRIVATE", vehicle: "سيدان خاصة", major: 18, maxPax: 3 },
      { id: "priv-van", type: "PRIVATE", vehicle: "فان عائلية", major: 26, maxPax: 7 },
      { id: "shared", type: "SHARED", vehicle: "نقل مشترك", major: 9, maxPax: 10 },
    ];
    return rows.map((row) => ({
      providerKey: "mock",
      providerOfferRef: `mock-trf-${row.id}`,
      description: `${transferTypeLabelAr(row.type)} · ${row.vehicle} · ${from} → ${to}`,
      costAmountMinor: amountToMinor(row.major, currency),
      currency,
      revalidationToken: JSON.stringify({ rateKey: row.id }),
      expiresAt,
      raw: {
        provider: "mock",
        liveMode: false,
        source: "mock",
        sourceLabel: "تجريبي",
        fetchedAt,
        transferType: row.type,
        transferTypeLabel: transferTypeLabelAr(row.type),
        vehicleName: row.vehicle,
        fromLabel: from,
        toLabel: to,
        outboundAt: `${params.outboundDate}T${params.outboundTime || "10:00"}:00`,
        inboundAt: params.inboundDate
          ? `${params.inboundDate}T${params.inboundTime || "18:00"}:00`
          : undefined,
        maxPax: row.maxPax,
        freeCancellation: row.type !== "SHARED",
      },
    }));
  }

  async createBooking(
    offer: TransferOffer,
    _guests?: unknown,
  ): Promise<ProviderBookingResult> {
    return {
      providerBookingRef: `TRF-MOCK-${offer.providerOfferRef.slice(-6)}`,
      status: "confirmed",
    };
  }
}
