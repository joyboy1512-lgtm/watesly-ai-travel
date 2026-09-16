/** sessionStorage for trip draft — no passport/payment data */
import {
  createEmptyTripDraft,
  createFlightLeg,
  type TripDraftState,
  type TripTravelerDraft,
} from "@watesly-travel/shared";

const KEY = "weekendgate_trip_draft_v2";
const LEGACY_KEY = "weekendgate_trip_draft_v1";

function redactTraveler(t: TripTravelerDraft): TripTravelerDraft {
  return {
    ...t,
    passportNumber: "",
    passportExpiry: "",
  };
}

/** Never persist passport / payment secrets in the browser. */
export function redactDraftForStorage(draft: TripDraftState): TripDraftState {
  return {
    ...draft,
    travelers: (draft.travelers || []).map((t) =>
      redactTraveler(t as TripTravelerDraft),
    ),
  };
}

function migrateDraft(raw: unknown): TripDraftState | null {
  if (!raw || typeof raw !== "object") return null;
  const base = createEmptyTripDraft();
  const data = raw as Partial<TripDraftState> & {
    flight?: Partial<TripDraftState["flight"]>;
  };

  const flight = {
    ...base.flight,
    ...data.flight,
    childAges: data.flight?.childAges || base.flight.childAges,
    legs:
      data.flight?.legs?.length
        ? data.flight.legs
        : [
            createFlightLeg({
              id: "leg-1",
              origin: data.flight?.origin || base.flight.origin,
              originLabel: data.flight?.originLabel || base.flight.originLabel,
              destination: data.flight?.destination || base.flight.destination,
              destinationLabel:
                data.flight?.destinationLabel || base.flight.destinationLabel,
              departDate: data.flight?.departDate || base.flight.departDate,
            }),
            createFlightLeg({
              id: "leg-2",
              origin: data.flight?.destination || base.flight.destination,
              originLabel:
                data.flight?.destinationLabel || base.flight.destinationLabel,
              destination: "",
              destinationLabel: "",
              departDate: data.flight?.returnDate || "",
            }),
          ],
  };

  return redactDraftForStorage({
    ...base,
    ...data,
    flight,
    hotel: { ...base.hotel, ...data.hotel },
    transfer: { ...base.transfer, ...data.transfer },
    activity: { ...base.activity, ...data.activity },
    hotels: data.hotels || [],
    transfers: data.transfers || [],
    activities: data.activities || [],
    destinationFlags: data.destinationFlags || [],
    travelers: data.travelers || [],
    contact: { ...base.contact, ...data.contact },
    selectedOffers: data.selectedOffers || {},
    search: data.search || null,
  });
}

export function loadTripDraft(): TripDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY) || sessionStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return migrateDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTripDraft(draft: TripDraftState): void {
  if (typeof window === "undefined") return;
  try {
    const safe = redactDraftForStorage({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    sessionStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* quota */
  }
}

export function clearTripDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}
