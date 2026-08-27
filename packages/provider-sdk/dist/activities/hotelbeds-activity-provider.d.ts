import type { ActivityOffer } from "@watesly-travel/shared";
import type { ActivityProviderAdapter, ActivitySearchParams, ProviderBookingResult } from "../types";
import { type HotelbedsCredentials } from "../hotels/hotelbeds-auth";
export declare class HotelbedsActivityProvider implements ActivityProviderAdapter {
    readonly providerKey = "hotelbeds-activities";
    readonly displayName = "Hotelbeds Activities";
    readonly liveMode: boolean;
    private readonly creds;
    constructor(creds?: Partial<HotelbedsCredentials>);
    private ensureConfigured;
    searchActivities(params: ActivitySearchParams): Promise<ActivityOffer[]>;
    createBooking(_offer: ActivityOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=hotelbeds-activity-provider.d.ts.map