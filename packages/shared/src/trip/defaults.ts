import type {
  TripContactDraft,
  TripDestinationServiceFlags,
  TripDraftState,
  TripFlightDraft,
  TripFlightLeg,
  TripHotelDraft,
  TripTransferDraft,
  TripActivityDraft,
} from "./types";

export function newLegId(): string {
  return `leg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createFlightLeg(partial?: Partial<TripFlightLeg>): TripFlightLeg {
  return {
    id: newLegId(),
    origin: "",
    originLabel: "",
    destination: "",
    destinationLabel: "",
    departDate: "",
    ...partial,
  };
}

export function defaultFlightDraft(partial?: Partial<TripFlightDraft>): TripFlightDraft {
  const origin = partial?.origin ?? "KWI";
  const originLabel = partial?.originLabel ?? "الكويت";
  const destination = partial?.destination ?? "DXB";
  const destinationLabel = partial?.destinationLabel ?? "دبي";
  const departDate = partial?.departDate ?? "";
  const baseLegs = [
    createFlightLeg({
      id: "leg-1",
      origin,
      originLabel,
      destination,
      destinationLabel,
      departDate,
    }),
    createFlightLeg({
      id: "leg-2",
      origin: destination,
      originLabel: destinationLabel,
      destination: "",
      destinationLabel: "",
      departDate: "",
    }),
  ];

  const merged = {
    tripType: "roundtrip" as const,
    origin,
    originLabel,
    destination,
    destinationLabel,
    departDate,
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    childAges: [] as number[],
    cabinClass: "economy",
    directOnly: false,
    flexibleDates: false,
    ...partial,
  };
  return {
    ...merged,
    legs: partial?.legs?.length ? partial.legs : baseLegs,
  };
}

export function defaultHotelDraft(partial?: Partial<TripHotelDraft>): TripHotelDraft {
  return {
    destination: "دبي",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    adults: 2,
    children: 0,
    childAges: [],
    starRating: 4,
    boardType: "room_only",
    ...partial,
  };
}

export function defaultTransferDraft(partial?: Partial<TripTransferDraft>): TripTransferDraft {
  return {
    pickup: "مطار الوصول",
    dropoff: "الفندق",
    pickupDate: "",
    pickupTime: "11:30",
    roundtrip: true,
    passengers: 2,
    bags: 2,
    vehicleType: "sedan",
    ...partial,
  };
}

export function defaultActivityDraft(partial?: Partial<TripActivityDraft>): TripActivityDraft {
  return {
    city: "دبي",
    startDate: "",
    endDate: "",
    participants: 2,
    interests: "",
    activityTypes: "",
    budgetMinor: 0,
    suggestWithAi: false,
    ...partial,
  };
}

export function defaultContact(): TripContactDraft {
  return {
    phoneCountry: "+965",
    phone: "",
    email: "",
    emailConfirm: "",
    whatsappUpdates: true,
  };
}

/** Sync destination flags from multicity legs (unique destinations) */
export function syncDestinationFlags(
  legs: TripFlightLeg[],
  prev: TripDestinationServiceFlags[],
  defaults?: { hotel?: boolean; transfer?: boolean; activity?: boolean },
): TripDestinationServiceFlags[] {
  const seen = new Set<string>();
  const next: TripDestinationServiceFlags[] = [];
  for (const leg of legs) {
    const key = (leg.destination || leg.destinationLabel || "").toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existing = prev.find(
      (p) =>
        p.legId === leg.id ||
        (p.destination || p.destinationLabel || "").toUpperCase() === key,
    );
    next.push({
      legId: leg.id,
      destination: leg.destination,
      destinationLabel: leg.destinationLabel || leg.destination,
      hotel: existing?.hotel ?? defaults?.hotel ?? true,
      transfer: existing?.transfer ?? defaults?.transfer ?? true,
      activity: existing?.activity ?? defaults?.activity ?? false,
    });
  }
  return next;
}

export function createEmptyTripDraft(tripId?: string): TripDraftState {
  const id = tripId || `trip_${Date.now().toString(36)}`;
  const flight = defaultFlightDraft();
  return {
    tripId: id,
    sessionId: `sess_${Date.now().toString(36)}`,
    services: ["flight", "hotel"],
    flight,
    hotel: defaultHotelDraft({
      destination: flight.destinationLabel,
      adults: flight.adults,
      children: flight.children,
      childAges: flight.childAges,
    }),
    transfer: defaultTransferDraft({ passengers: flight.adults + flight.children }),
    activity: defaultActivityDraft({
      city: flight.destinationLabel,
      participants: flight.adults + flight.children,
    }),
    hotels: [],
    transfers: [],
    activities: [],
    destinationFlags: [],
    selectedTier: null,
    selectedOffers: {},
    travelers: [],
    contact: defaultContact(),
    search: null,
    repriceStatus: "idle",
    updatedAt: new Date().toISOString(),
  };
}
