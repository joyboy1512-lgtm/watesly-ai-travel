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
  tripSearchButtonLabel,
  validateServicesSelected,
  type TripDraftState,
  type TripFlightDraft,
  type TripHotelDraft,
  type TripTransferDraft,
  type TripActivityDraft,
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
  selectTier: (tier: TripTier) => void;
  swapOffer: (kind: TripServiceKind, offer: TripOfferSummary) => void;
  runSearch: () => Promise<void>;
};

const TripBuilderContext = createContext<TripBuilderContextValue | null>(null);

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
    setDraft((prev) => ({
      ...prev,
      flight: { ...prev.flight, ...prefill },
      hotel: {
        ...prev.hotel,
        destination: prefill?.destinationLabel || prev.hotel.destination,
        checkIn: prefill?.departDate || prev.hotel.checkIn,
        checkOut: prefill?.returnDate || prev.hotel.checkOut,
      },
      transfer: {
        ...prev.transfer,
        pickup: prefill?.destinationLabel ? `مطار ${prefill.destinationLabel}` : prev.transfer.pickup,
        dropoff: prev.transfer.dropoff || "الفندق",
        pickupDate: prefill?.departDate || prev.transfer.pickupDate,
      },
      activity: {
        ...prev.activity,
        city: prefill?.destinationLabel || prev.activity.city,
        startDate: prefill?.departDate || prev.activity.startDate,
        endDate: prefill?.returnDate || prev.activity.endDate,
      },
    }));
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
    setDraft((prev) => ({ ...prev, flight: { ...prev.flight, ...patch } }));
  }, []);

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
      const withSearch: TripDraftState = {
        ...nextDraft,
        search,
        selectedTier: defaultOpt?.tier || null,
        selectedOffers,
      };
      setDraft(withSearch);
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
