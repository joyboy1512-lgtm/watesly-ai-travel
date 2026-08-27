import type { TransferOffer } from "@watesly-travel/shared";
import type { ProviderBookingResult, TransferProviderAdapter, TransferSearchParams } from "../types";
export declare class MockTransferProvider implements TransferProviderAdapter {
    readonly providerKey = "mock";
    readonly displayName = "Mock Transfers";
    readonly liveMode = false;
    searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]>;
    createBooking(offer: TransferOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=mock-transfer-provider.d.ts.map