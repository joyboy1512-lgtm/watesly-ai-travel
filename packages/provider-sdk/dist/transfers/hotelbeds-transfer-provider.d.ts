import type { TransferOffer } from "@watesly-travel/shared";
import type { ProviderBookingResult, TransferProviderAdapter, TransferSearchParams } from "../types";
import { type HotelbedsCredentials } from "../hotels/hotelbeds-auth";
export type TransferEndpoint = {
    type: "IATA" | "ATLAS" | "GPS";
    code: string;
    label: string;
};
export type ResolveTransferEndpointInput = {
    query: string;
    kind: "IATA" | "ATLAS" | "GPS";
    city?: string;
};
export declare function resolveTransferEndpoint(input: ResolveTransferEndpointInput): Promise<TransferEndpoint>;
/**
 * Hotelbeds Transfers needs two distinct points (airport ↔ the chosen hotel).
 * Never rewrite a search into "airport → any hotel / city center".
 */
export declare function ensureDistinctTransferEndpoints(from: TransferEndpoint, to: TransferEndpoint): Promise<{
    from: TransferEndpoint;
    to: TransferEndpoint;
}>;
/** @deprecated Use resolveTransferEndpoint with explicit kind. */
export declare function resolveTransferEndpointLegacy(query: string): Promise<TransferEndpoint>;
export declare class HotelbedsTransferProvider implements TransferProviderAdapter {
    readonly providerKey = "hotelbeds-transfers";
    readonly displayName = "Hotelbeds Transfers";
    readonly liveMode: boolean;
    private readonly creds;
    constructor(creds?: Partial<HotelbedsCredentials>);
    private ensureConfigured;
    private fetchAvailability;
    searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]>;
    createBooking(_offer: TransferOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=hotelbeds-transfer-provider.d.ts.map