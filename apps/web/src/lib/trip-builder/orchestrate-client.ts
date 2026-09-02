import { shopFetch } from "@/lib/shop-session";
import type { TripDraftState, TripSearchResult } from "@watesly-travel/shared";
import { mockTripSearch, tripUseMock } from "./mock-search";

export async function orchestrateTripSearch(draft: TripDraftState): Promise<TripSearchResult> {
  if (tripUseMock()) {
    return mockTripSearch(draft);
  }
  try {
    return await shopFetch<TripSearchResult>(`/shop/platform/trips/${draft.tripId}/search`, {
      method: "POST",
      body: JSON.stringify({
        services: draft.services,
        flight: draft.flight,
        hotel: draft.hotel,
        transfer: draft.transfer,
        activity: draft.activity,
        sessionId: draft.sessionId,
      }),
    });
  } catch {
    return mockTripSearch(draft);
  }
}
