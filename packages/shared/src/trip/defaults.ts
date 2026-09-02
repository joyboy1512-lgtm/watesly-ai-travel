import type { TripContactDraft, TripDraftState, TripFlightDraft } from "./types";

export function defaultFlightDraft(partial?: Partial<TripFlightDraft>): TripFlightDraft {
  return {
    tripType: "roundtrip",
    origin: "KWI",
    originLabel: "الكويت",
    destination: "DXB",
    destinationLabel: "دبي",
    departDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
    directOnly: false,
    flexibleDates: false,
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

export function createEmptyTripDraft(tripId?: string): TripDraftState {
  const id = tripId || `trip_${Date.now().toString(36)}`;
  return {
    tripId: id,
    sessionId: `sess_${Date.now().toString(36)}`,
    services: ["flight", "hotel"],
    flight: defaultFlightDraft(),
    hotel: {
      destination: "دبي",
      checkIn: "",
      checkOut: "",
      rooms: 1,
      adults: 2,
      children: 0,
      childAges: [],
      starRating: 4,
      boardType: "room_only",
    },
    transfer: {
      pickup: "مطار الوصول",
      dropoff: "الفندق",
      pickupDate: "",
      pickupTime: "11:30",
      roundtrip: true,
      passengers: 2,
      bags: 2,
      vehicleType: "sedan",
    },
    activity: {
      city: "دبي",
      startDate: "",
      endDate: "",
      participants: 2,
      interests: "",
      activityTypes: "",
      budgetMinor: 0,
      suggestWithAi: false,
    },
    selectedTier: null,
    selectedOffers: {},
    travelers: [],
    contact: defaultContact(),
    search: null,
    repriceStatus: "idle",
    updatedAt: new Date().toISOString(),
  };
}
