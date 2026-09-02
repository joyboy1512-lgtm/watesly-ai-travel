"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createEmptyTripDraft,
  createFlightLeg,
  syncDestinationFlags,
  tripSearchButtonLabel,
  validateServicesSelected,
  type TripDraftState,
  type TripFlightDraft,
  type TripFlightLeg,
  type TripHotelDraft,
  type TripTransferDraft,
  type TripActivityDraft,
  type TripDestinationServiceFlags,
  type TripServiceKind,
  type TripTier,
  type TripOfferSummary,
} from "@watesly-travel/shared";
import { loadTripDraft, saveTripDraft } from "@/lib/trip-builder/storage";
import { orchestrateTripSearch } from "@/lib/trip-builder/orchestrate-client";
import { createTrip } from "@/lib/platform-api";

type TripBuilderContextValue = {
  draft: TripDraftState;
  boardingOpen: boolean;
  searching: boolean;
  searchError: string | null;
  searchButtonLabel: string;
  openBoarding: (prefill?: Partial<TripFlightDraft>) => void;
  closeBoarding: () => void;
  setServices: (services: TripServiceKind[]) => void;
  toggleService: (kind: TripServiceKind) => void;
  patchFlight: (patch: Partial<TripFlightDraft>) => void;
  patchHotel: (patch: Partial<TripHotelDraft>) => void;
  patchTransfer: (patch: Partial<TripTransferDraft>) => void;
  patchActivity: (patch: Partial<TripActivityDraft>) => void;
  patchDraft: (patch: Partial<TripDraftState>) => void;
  setFlightLeg: (id: string, patch: Partial<TripFlightLeg>) => void;
  addFlightLeg: () => void;
  removeFlightLeg: (id: string) => void;
  setDestinationFlag: (
    legId: string,
    patch: Partial<Pick<TripDestinationServiceFlags, "hotel" | "transfer" | "activity">>,
  ) => void;
  selectTier: (tier: TripTier) => void;
  swapOffer: (kind: TripServiceKind, offer: TripOfferSummary) => void;
  runSearch: () => Promise<void>;
};

const TripBuilderContext = createContext<TripBuilderContextValue | null>(null);

function syncOccupancy(flight: TripFlightDraft, hotel: TripHotelDraft) {
  const ages = flight.childAges.slice(0, flight.children);
  while (ages.length < flight.children) ages.push(8);
  return {
    flight: { ...flight, childAges: ages },
    hotel: {
      ...hotel,
      adults: flight.adults,
      children: flight.children,
      childAges: ages,
    },
  };
}

export function TripBuilderProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<TripDraftState>(() => createEmptyTripDraft());
  const [boardingOpen, setBoardingOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadTripDraft();
    if (saved) setDraft(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveTripDraft(draft);
  }, [draft, hydrated]);

  const openBoarding = useCallback((prefill?: Partial<TripFlightDraft>) => {
    setSearchError(null);
    setDraft((prev) => {
      const flight = { ...prev.flight, ...prefill };
      if (prefill?.origin || prefill?.destination) {
        const legs = [...(flight.legs || [])];
        if (legs[0]) {
          legs[0] = {
            ...legs[0],
            origin: flight.origin,
            originLabel: flight.originLabel,
            destination: flight.destination,
            destinationLabel: flight.destinationLabel,
            departDate: flight.departDate || legs[0].departDate,
          };
        }
        flight.legs = legs;
      }
      const synced = syncOccupancy(flight, prev.hotel);
      return {
        ...prev,
        flight: synced.flight,
        hotel: {
          ...synced.hotel,
          destination: prefill?.destinationLabel || prev.hotel.destination,
          checkIn: prefill?.departDate || prev.hotel.checkIn,
          checkOut: prefill?.returnDate || prev.hotel.checkOut,
        },
        transfer: {
          ...prev.transfer,
          pickup: prefill?.destinationLabel
            ? `مطار ${prefill.destinationLabel}`
            : prev.transfer.pickup,
          pickupDate: prefill?.departDate || prev.transfer.pickupDate,
          passengers: synced.flight.adults + synced.flight.children,
        },
        activity: {
          ...prev.activity,
          city: prefill?.destinationLabel || prev.activity.city,
          startDate: prefill?.departDate || prev.activity.startDate,
          endDate: prefill?.returnDate || prev.activity.endDate,
          participants: synced.flight.adults + synced.flight.children,
        },
      };
    });
    setBoardingOpen(true);
  }, []);

  const closeBoarding = useCallback(() => setBoardingOpen(false), []);

  const setServices = useCallback((services: TripServiceKind[]) => {
    setDraft((prev) => ({ ...prev, services }));
  }, []);

  const toggleService = useCallback((kind: TripServiceKind) => {
    setDraft((prev) => {
      const has = prev.services.includes(kind);
      const services = has
        ? prev.services.filter((k) => k !== kind)
        : [...prev.services, kind];
      return { ...prev, services };
    });
  }, []);

  const patchFlight = useCallback((patch: Partial<TripFlightDraft>) => {
    setDraft((prev) => {
      let flight = { ...prev.flight, ...patch };
      if (patch.tripType === "multicity" && prev.flight.tripType !== "multicity") {
        flight.legs = [
          createFlightLeg({
            id: "leg-1",
            origin: flight.origin,
            originLabel: flight.originLabel,
            destination: flight.destination,
            destinationLabel: flight.destinationLabel,
            departDate: flight.departDate,
          }),
          createFlightLeg({
            id: "leg-2",
            origin: flight.destination,
            originLabel: flight.destinationLabel,
            destination: "",
            destinationLabel: "",
            departDate: flight.returnDate || "",
          }),
        ];
      }
      if (patch.children != null) {
        const ages = [...(flight.childAges || [])].slice(0, patch.children);
        while (ages.length < patch.children) ages.push(8);
        flight.childAges = ages;
      }
      const synced = syncOccupancy(flight, prev.hotel);
      const destinationFlags =
        synced.flight.tripType === "multicity"
          ? syncDestinationFlags(
              synced.flight.legs,
              prev.destinationFlags,
              {
                hotel: prev.services.includes("hotel"),
                transfer: prev.services.includes("transfer"),
                activity: prev.services.includes("activity"),
              },
            )
          : prev.destinationFlags;
      return {
        ...prev,
        flight: synced.flight,
        hotel: synced.hotel,
        transfer: {
          ...prev.transfer,
          passengers: synced.flight.adults + synced.flight.children,
        },
        activity: {
          ...prev.activity,
          participants: synced.flight.adults + synced.flight.children,
        },
        destinationFlags,
      };
    });
  }, []);

  const setFlightLeg = useCallback((id: string, patch: Partial<TripFlightLeg>) => {
    setDraft((prev) => {
      const legs = prev.flight.legs.map((leg) =>
        leg.id === id ? { ...leg, ...patch } : leg,
      );
      // Keep primary origin/destination synced from first leg
      const first = legs[0];
      const flight = {
        ...prev.flight,
        legs,
        origin: first?.origin || prev.flight.origin,
        originLabel: first?.originLabel || prev.flight.originLabel,
        destination: first?.destination || prev.flight.destination,
        destinationLabel: first?.destinationLabel || prev.flight.destinationLabel,
        departDate: first?.departDate || prev.flight.departDate,
      };
      const destinationFlags = syncDestinationFlags(legs, prev.destinationFlags, {
        hotel: prev.services.includes("hotel"),
        transfer: prev.services.includes("transfer"),
        activity: prev.services.includes("activity"),
      });
      return { ...prev, flight, destinationFlags };
    });
  }, []);

  const addFlightLeg = useCallback(() => {
    setDraft((prev) => {
      if (prev.flight.legs.length >= 5) return prev;
      const last = prev.flight.legs[prev.flight.legs.length - 1];
      const legs = [
        ...prev.flight.legs,
        createFlightLeg({
          origin: last?.destination || "",
          originLabel: last?.destinationLabel || "",
          destination: "",
          destinationLabel: "",
          departDate: "",
        }),
      ];
      const destinationFlags = syncDestinationFlags(legs, prev.destinationFlags, {
        hotel: prev.services.includes("hotel"),
        transfer: prev.services.includes("transfer"),
        activity: prev.services.includes("activity"),
      });
      return {
        ...prev,
        flight: { ...prev.flight, tripType: "multicity", legs },
        destinationFlags,
      };
    });
  }, []);

  const removeFlightLeg = useCallback((id: string) => {
    setDraft((prev) => {
      if (prev.flight.legs.length <= 2) return prev;
      const legs = prev.flight.legs.filter((l) => l.id !== id);
      const destinationFlags = syncDestinationFlags(legs, prev.destinationFlags);
      return {
        ...prev,
        flight: { ...prev.flight, legs },
        destinationFlags,
      };
    });
  }, []);

  const setDestinationFlag = useCallback(
    (
      legId: string,
      patch: Partial<Pick<TripDestinationServiceFlags, "hotel" | "transfer" | "activity">>,
    ) => {
      setDraft((prev) => ({
        ...prev,
        destinationFlags: prev.destinationFlags.map((f) =>
          f.legId === legId ? { ...f, ...patch } : f,
        ),
      }));
    },
    [],
  );

  const patchHotel = useCallback((patch: Partial<TripHotelDraft>) => {
    setDraft((prev) => ({ ...prev, hotel: { ...prev.hotel, ...patch } }));
  }, []);

  const patchTransfer = useCallback((patch: Partial<TripTransferDraft>) => {
    setDraft((prev) => ({ ...prev, transfer: { ...prev.transfer, ...patch } }));
  }, []);

  const patchActivity = useCallback((patch: Partial<TripActivityDraft>) => {
    setDraft((prev) => ({ ...prev, activity: { ...prev.activity, ...patch } }));
  }, []);

  const patchDraft = useCallback((patch: Partial<TripDraftState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectTier = useCallback((tier: TripTier) => {
    setDraft((prev) => {
      const option = prev.search?.options.find((o) => o.tier === tier);
      if (!option) return { ...prev, selectedTier: tier };
      const selectedOffers: Partial<Record<TripServiceKind, TripOfferSummary>> = {};
      if (option.flight) selectedOffers.flight = option.flight;
      if (option.hotel) selectedOffers.hotel = option.hotel;
      if (option.transfer) selectedOffers.transfer = option.transfer;
      if (option.activities.length) selectedOffers.activity = option.activities[0];
      return { ...prev, selectedTier: tier, selectedOffers };
    });
  }, []);

  const swapOffer = useCallback((kind: TripServiceKind, offer: TripOfferSummary) => {
    setDraft((prev) => ({
      ...prev,
      selectedOffers: { ...prev.selectedOffers, [kind]: offer },
    }));
  }, []);

  const runSearch = useCallback(async () => {
    const err = validateServicesSelected(draft.services);
    if (err) {
      setSearchError(err);
      return;
    }
    if (draft.flight.tripType === "multicity") {
      const incomplete = draft.flight.legs.some(
        (l) => !l.origin || !l.destination || !l.departDate,
      );
      if (incomplete) {
        setSearchError("أكمل بيانات جميع الوجهات (من، إلى، التاريخ).");
        return;
      }
    }
    setSearchError(null);
    setSearching(true);
    try {
      let tripId = draft.tripId;
      try {
        const created = await createTrip();
        tripId = created.id;
      } catch {
        /* local draft ok */
      }
      const nextDraft = { ...draft, tripId };
      const search = await orchestrateTripSearch(nextDraft);
      const defaultOpt = search.options[1] || search.options[0];
      const selectedOffers: Partial<Record<TripServiceKind, TripOfferSummary>> = {};
      if (defaultOpt?.flight) selectedOffers.flight = defaultOpt.flight;
      if (defaultOpt?.hotel) selectedOffers.hotel = defaultOpt.hotel;
      if (defaultOpt?.transfer) selectedOffers.transfer = defaultOpt.transfer;
      if (defaultOpt?.activities[0]) selectedOffers.activity = defaultOpt.activities[0];
      setDraft({
        ...nextDraft,
        search,
        selectedTier: defaultOpt?.tier || null,
        selectedOffers,
      });
      setBoardingOpen(false);
      router.push("/trip-builder/results");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "تعذر إكمال البحث");
    } finally {
      setSearching(false);
    }
  }, [draft, router]);

  const searchButtonLabel = useMemo(
    () => tripSearchButtonLabel(draft.services),
    [draft.services],
  );

  const value: TripBuilderContextValue = {
    draft,
    boardingOpen,
    searching,
    searchError,
    searchButtonLabel,
    openBoarding,
    closeBoarding,
    setServices,
    toggleService,
    patchFlight,
    patchHotel,
    patchTransfer,
    patchActivity,
    patchDraft,
    setFlightLeg,
    addFlightLeg,
    removeFlightLeg,
    setDestinationFlag,
    selectTier,
    swapOffer,
    runSearch,
  };

  return <TripBuilderContext.Provider value={value}>{children}</TripBuilderContext.Provider>;
}

export function useTripBuilder() {
  const ctx = useContext(TripBuilderContext);
  if (!ctx) throw new Error("useTripBuilder requires TripBuilderProvider");
  return ctx;
}
