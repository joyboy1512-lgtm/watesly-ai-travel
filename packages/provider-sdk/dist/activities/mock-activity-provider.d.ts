import type { ActivityOffer } from "@watesly-travel/shared";
import type { ActivityProviderAdapter, ActivitySearchParams, ProviderBookingResult } from "../types";
export declare class MockActivityProvider implements ActivityProviderAdapter {
    readonly providerKey = "mock";
    readonly displayName = "Mock Activities";
    readonly liveMode = false;
    searchActivities(params: ActivitySearchParams): Promise<ActivityOffer[]>;
    createBooking(offer: ActivityOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=mock-activity-provider.d.ts.map