"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { shopFetch } from "@/lib/shop-session";
import { ShopLanding } from "@/components/shop/ShopLanding";
import { ShopHeroBanner, type FlightLeg, type FlightTripType } from "@/components/shop/ShopHeroBanner";
import type { ShopDestination, ShopOffer } from "@/lib/shop-content";
import { buildFlightResultsHref } from "@/lib/flight-results-url";
import {
  buildHotelResultsHref,
  encodeRoomOccupancies,
} from "@/lib/hotel-results-url";
import {
  buildActivityResultsHref,
  buildTransferResultsHref,
} from "@/lib/transfer-results-url";
import {
  defaultOccupancy,
  occupancyTotals,
  validateOccupancy,
  type HotelOccupancyState,
} from "@/lib/hotel-occupancy";
import { TripBuilderProvider, useTripBuilder } from "@/components/trip-builder/TripBuilderProvider";

const RuheltiBoardingModal = dynamic(
  () =>
    import("@/components/trip-builder/RuheltiBoardingModal").then((m) => m.RuheltiBoardingModal),
  { ssr: false },
);

type Mode = "flights" | "stays" | "cars" | "activities";

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return plusDays(days);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function newLegId(existing: FlightLeg[]) {
  let index = existing.length + 1;
  let id = `leg-${index}`;
  while (existing.some((leg) => leg.id === id)) {
    index += 1;
    id = `leg-${index}`;
  }
  return id;
}

function createFlightLeg(partial?: Partial<FlightLeg>): FlightLeg {
  return {
    id: partial?.id || "leg-new",
    origin: partial?.origin || "",
    originLabel: partial?.originLabel || "",
    destination: partial?.destination || "",
    destinationLabel: partial?.destinationLabel || "",
    departDate: partial?.departDate || plusDays(14),
  };
}

export function ShopHomeClient() {
  return (
    <TripBuilderProvider>
      <ShopHomeInner />
    </TripBuilderProvider>
  );
}

function ShopHomeInner() {
  const router = useRouter();
  const { openBoarding, boardingOpen } = useTripBuilder();
  const [boardingMounted, setBoardingMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("flights");
  const [tripType, setTripType] = useState<FlightTripType>("roundtrip");
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(() => [
    createFlightLeg({
      id: "leg-1",
      origin: "KWI",
      originLabel: "KWI · الكويت",
      destination: "DXB",
      destinationLabel: "DXB · دبي",
      departDate: plusDays(14),
    }),
    createFlightLeg({
      id: "leg-2",
      origin: "DXB",
      originLabel: "DXB · دبي",
      destination: "",
      destinationLabel: "",
      departDate: plusDays(18),
    }),
  ]);
  const [transferRoundtrip, setTransferRoundtrip] = useState(false);
  const [transferAirport, setTransferAirport] = useState(true);
  const [transferCarRental, setTransferCarRental] = useState(false);
  const [transferDropoff, setTransferDropoff] = useState("الكويت");
  const [transferDropoffLabel, setTransferDropoffLabel] = useState("الكويت");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("KWI");
  const [originLabel, setOriginLabel] = useState("KWI · الكويت");
  const [destination, setDestination] = useState("DXB");
  const [destinationLabel, setDestinationLabel] = useState("DXB · دبي");
  const [stayQuery, setStayQuery] = useState("دبي");
  const [activityDest, setActivityDest] = useState("DXB");
  const [activityLabel, setActivityLabel] = useState("دبي");
  const [departDate, setDepartDate] = useState(plusDays(14));
  const [returnDate, setReturnDate] = useState(plusDays(21));
  const [pickupTime, setPickupTime] = useState("14:00");
  const [dropoffTime, setDropoffTime] = useState("12:00");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [stayOccupancy, setStayOccupancy] = useState<HotelOccupancyState>(() =>
    defaultOccupancy(1, 1, 0),
  );
  const [cabinClass, setCabinClass] = useState("economy");
  const [directOnly, setDirectOnly] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);

  async function searchAirports(q: string): Promise<SuggestItem[]> {
    const rows = await shopFetch<
      Array<{
        id: string;
        iataCode?: string | null;
        name: string;
        city?: string | null;
        country?: string | null;
      }>
    >(`/shop/airports?q=${encodeURIComponent(q)}&limit=40`);
    return rows.map((a) => ({
      id: a.id,
      code: (a.iataCode || "").toUpperCase(),
      title: `${a.iataCode || "—"} · ${a.city || a.name}`,
      subtitle: `${a.name}${a.country ? ` — ${a.country}` : ""}`,
    }));
  }

  async function searchCities(q: string): Promise<SuggestItem[]> {
    const rows = await shopFetch<
      Array<{ city: string | null; country: string | null; iataCode?: string | null }>
    >(`/shop/cities?q=${encodeURIComponent(q)}`);
    return rows.map((c, idx) => ({
      id: `${c.city}-${idx}`,
      code: c.iataCode || c.city || q,
      title: c.city || q,
      subtitle: c.country || undefined,
    }));
  }

  function handleTripTypeChange(next: FlightTripType) {
    if (next === "multicity" && tripType !== "multicity") {
      setFlightLegs([
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
          departDate: returnDate || plusDays(18),
        }),
      ]);
    }
    if (next !== "multicity" && tripType === "multicity") {
      const first = flightLegs[0];
      if (first) {
        setOrigin(first.origin);
        setOriginLabel(first.originLabel);
        setDestination(first.destination);
        setDestinationLabel(first.destinationLabel);
        setDepartDate(first.departDate);
      }
    }
    setTripType(next);
  }

  function updateFlightLeg(id: string, patch: Partial<FlightLeg>) {
    setFlightLegs((prev) => {
      const next = prev.map((leg) =>
        leg.id === id ? ({ ...leg, ...patch } as FlightLeg) : leg,
      );
      const index = prev.findIndex((leg) => leg.id === id);
      if (index >= 0 && (patch.destination !== undefined || patch.destinationLabel !== undefined)) {
        const updated = next[index];
        const chained = next[index + 1];
        if (updated && chained) {
          next[index + 1] = {
            ...chained,
            origin: updated.destination,
            originLabel: updated.destinationLabel,
          };
        }
      }
      return next;
    });
  }

  function addFlightLeg() {
    setFlightLegs((prev) => {
      if (prev.length >= 5) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev,
        createFlightLeg({
          id: newLegId(prev),
          origin: last?.destination || "",
          originLabel: last?.destinationLabel || "",
          departDate: addDaysToIso(last?.departDate || plusDays(14), 4),
        }),
      ];
    });
  }

  function removeFlightLeg(id: string) {
    setFlightLegs((prev) => (prev.length <= 2 ? prev : prev.filter((leg) => leg.id !== id)));
  }

  async function runSearch() {
    if (mode === "flights") {
      try {
        if (tripType === "multicity") {
          flightLegs.forEach((leg, i) => {
            if (!leg?.origin || !leg.destination || !leg.departDate) {
              throw new Error(`أكمل بيانات الرحلة ${i + 1}`);
            }
          });
          router.push(
            buildFlightResultsHref({
              tripType: "multicity",
              adults,
              children,
              infants,
              cabinClass,
              directOnly,
              legs: flightLegs.map((leg) => ({
                origin: leg.origin,
                originLabel: leg.originLabel,
                destination: leg.destination,
                destinationLabel: leg.destinationLabel,
                departDate: leg.departDate,
              })),
            }),
          );
          return;
        }
        if (!origin || !destination || !departDate) {
          throw new Error("أدخل المغادرة والوجهة والتاريخ");
        }
        router.push(
          buildFlightResultsHref({
            tripType,
            origin,
            originLabel,
            destination,
            destinationLabel,
            departDate,
            returnDate: tripType === "roundtrip" ? returnDate : undefined,
            adults,
            children,
            infants,
            cabinClass,
            directOnly,
            flexibleDates,
          }),
        );
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل البحث");
        return;
      }
    }

    if (mode === "stays") {
      try {
        if (!stayQuery.trim() || !departDate || !returnDate) {
          throw new Error("أدخل الوجهة وتواريخ الإقامة");
        }
        const occErr = validateOccupancy(stayOccupancy);
        if (occErr) throw new Error(occErr);
        const totals = occupancyTotals(stayOccupancy);
        router.push(
          buildHotelResultsHref({
            destination: stayQuery,
            destinationLabel: stayQuery,
            checkIn: departDate,
            checkOut: returnDate,
            adults: totals.adults,
            children: totals.children,
            infants,
            rooms: totals.rooms,
            childrenAges: totals.childrenAgesCsv,
            occ: encodeRoomOccupancies(stayOccupancy.rooms),
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل البحث");
      }
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "cars") {
        if (!transferAirport && !transferCarRental) {
          throw new Error("اختر نوع النقل: نقل المطار أو تأجير سيارة");
        }
        if (transferCarRental && !transferAirport) {
          throw new Error("تأجير السيارات قريباً — فعّل نقل المطار حالياً");
        }
        if (!origin) {
          throw new Error("اختر مطار الوصول");
        }
        if (!transferDropoff.trim()) {
          throw new Error("أدخل الفندق أو العنوان");
        }
        router.push(
          buildTransferResultsHref({
            origin: origin || "KWI",
            originLabel,
            dropoff: transferDropoff,
            dropoffLabel: transferDropoffLabel.trim() || transferDropoff.trim(),
            outboundDate: departDate,
            outboundTime: pickupTime,
            inboundDate: transferRoundtrip ? returnDate : undefined,
            inboundTime: transferRoundtrip ? dropoffTime : undefined,
            roundtrip: transferRoundtrip,
            adults,
            children,
            infants,
          }),
        );
        return;
      }
      if (!activityDest && !stayQuery) {
        throw new Error("أدخل الوجهة");
      }
      router.push(
        buildActivityResultsHref({
          destination: activityDest || stayQuery,
          destinationLabel: activityLabel || stayQuery,
          fromDate: departDate,
          toDate: returnDate,
          adults,
          children,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل البحث");
    } finally {
      setLoading(false);
    }
  }

  function scrollToSearch() {
    document.getElementById("search")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyDestination(dest: ShopDestination) {
    setMode("flights");
    setOrigin("KWI");
    setOriginLabel("KWI · الكويت");
    setDestination(dest.code);
    setDestinationLabel(`${dest.code} · ${dest.name}`);
    setStayQuery(dest.name);
    setActivityDest(dest.code);
    setActivityLabel(dest.name);
    setError("");
    setMessage("");
    scrollToSearch();
  }

  function applyOffer(offer: ShopOffer) {
    setMode(offer.mode);
    setError("");
    setMessage("");
    if (offer.mode === "flights") {
      setOrigin("KWI");
      setOriginLabel("KWI · الكويت");
      setDestination(offer.code || "DXB");
      setDestinationLabel(`${offer.code || "DXB"} · ${offer.destination || ""}`);
    }
    if (offer.mode === "stays" || offer.mode === "cars") {
      setStayQuery(offer.destination || "دبي");
    }
    if (offer.mode === "cars") {
      setTransferDropoff(offer.destination || "الكويت");
      setTransferDropoffLabel(offer.destination || "الكويت");
    }
    if (offer.mode === "activities") {
      setActivityDest(offer.code || "DXB");
      setActivityLabel(offer.destination || "دبي");
    }
    scrollToSearch();
  }

  const tripBuilderHref = undefined;

  function openRuheltiBoarding() {
    setBoardingMounted(true);
    const o = tripType === "multicity" ? flightLegs[0]?.origin || origin : origin;
    const d = tripType === "multicity" ? flightLegs[0]?.destination || destination : destination;
    const oLabel =
      tripType === "multicity" ? flightLegs[0]?.originLabel || originLabel : originLabel;
    const dLabel =
      tripType === "multicity" ? flightLegs[0]?.destinationLabel || destinationLabel : destinationLabel;
    const dep = tripType === "multicity" ? flightLegs[0]?.departDate || departDate : departDate;
    openBoarding({
      tripType,
      origin: o,
      originLabel: oLabel,
      destination: d,
      destinationLabel: dLabel,
      departDate: dep,
      returnDate: tripType === "roundtrip" ? returnDate : "",
      adults,
      children,
      infants,
      cabinClass,
      directOnly,
    });
  }

  return (
    <>
      <ShopHeroBanner
        mode={mode}
        onModeChange={setMode}
        tripType={tripType}
        onTripTypeChange={handleTripTypeChange}
        flightLegs={flightLegs}
        onFlightLegChange={updateFlightLeg}
        onAddFlightLeg={addFlightLeg}
        onRemoveFlightLeg={removeFlightLeg}
        transferRoundtrip={transferRoundtrip}
        onTransferRoundtripChange={setTransferRoundtrip}
        transferAirport={transferAirport}
        onTransferAirportChange={setTransferAirport}
        transferCarRental={transferCarRental}
        onTransferCarRentalChange={setTransferCarRental}
        transferDropoff={transferDropoff}
        transferDropoffLabel={transferDropoffLabel}
        onTransferDropoffClear={(text) => {
          setTransferDropoff(text);
          setTransferDropoffLabel(text);
        }}
        onTransferDropoffPick={(item) => {
          setTransferDropoff(item.title);
          setTransferDropoffLabel(item.title);
        }}
        cabinClass={cabinClass}
        onCabinClassChange={setCabinClass}
        directOnly={directOnly}
        onDirectOnlyChange={setDirectOnly}
        flexibleDates={flexibleDates}
        onFlexibleDatesChange={setFlexibleDates}
        origin={origin}
        originLabel={originLabel}
        destination={destination}
        destinationLabel={destinationLabel}
        stayQuery={stayQuery}
        activityDest={activityDest}
        activityLabel={activityLabel}
        departDate={departDate}
        returnDate={returnDate}
        pickupTime={pickupTime}
        dropoffTime={dropoffTime}
        adults={adults}
        children={children}
        infants={infants}
        rooms={rooms}
        onOriginClear={(text) => {
          setOrigin("");
          setOriginLabel(text);
        }}
        onOriginPick={(item) => {
          setOrigin(item.code);
          setOriginLabel(item.title);
        }}
        onDestinationClear={(text) => {
          setDestination("");
          setDestinationLabel(text);
        }}
        onDestinationPick={(item) => {
          setDestination(item.code);
          setDestinationLabel(item.title);
        }}
        onStayQueryChange={setStayQuery}
        onStayPick={(item) => setStayQuery(item.title)}
        onActivityClear={(text) => {
          setActivityDest(text);
          setActivityLabel(text);
        }}
        onActivityPick={(item) => {
          setActivityDest(item.code || item.title);
          setActivityLabel(item.title);
        }}
        onDepartDateChange={setDepartDate}
        onReturnDateChange={setReturnDate}
        onPickupTimeChange={setPickupTime}
        onDropoffTimeChange={setDropoffTime}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onInfantsChange={setInfants}
        onRoomsChange={setRooms}
        stayOccupancy={stayOccupancy}
        onStayOccupancyChange={setStayOccupancy}
        onSearch={() => void runSearch()}
        loading={loading}
        error={error}
        message={message}
        searchAirports={searchAirports}
        searchCities={searchCities}
        tripBuilderHref={tripBuilderHref}
        onRuheltiClick={openRuheltiBoarding}
      />

      {boardingMounted || boardingOpen ? (
        <RuheltiBoardingModal searchAirports={searchAirports} searchCities={searchCities} />
      ) : null}

      <ShopLanding
        onPickDestination={applyDestination}
        onPickOffer={applyOffer}
      />
    </>
  );
}
