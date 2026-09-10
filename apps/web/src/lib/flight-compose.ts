import type { FlightOfferRow } from "./flight-search";
import { getReturnSegments } from "./flight-search";
import { extractLeg, type SelectedLeg } from "./flight-leg-selection";

export type ComposedTrip = {
  id: string;
  outbound: SelectedLeg;
  return: SelectedLeg | null;
  totalPriceMinor: number;
  currency: string;
  isMixMatch: boolean;
  /** When the trip comes from a single bundled package card. */
  sourcePackageId?: string;
  sourcePackage?: FlightOfferRow;
};

function composeId(outbound: SelectedLeg, returnLeg: SelectedLeg | null, packageId?: string) {
  if (packageId) return `pkg-${packageId}`;
  return `mix-${outbound.key}__${returnLeg?.key || "oneway"}`;
}

export function composeFromPackage(flight: FlightOfferRow): ComposedTrip | null {
  const outbound = extractLeg(flight, "outbound");
  if (!outbound) return null;
  const returnLeg = extractLeg(flight, "return");
  const hasReturn = getReturnSegments(flight.details).length > 0;
  return {
    id: composeId(outbound, returnLeg, flight.id),
    outbound,
    return: returnLeg,
    totalPriceMinor: flight.sellAmountMinor,
    currency: flight.currency,
    isMixMatch: false,
    sourcePackageId: flight.id,
    sourcePackage: flight,
  };
}

export function composeFromLegs(outbound: SelectedLeg, returnLeg: SelectedLeg | null): ComposedTrip {
  const total = outbound.priceMinor + (returnLeg?.priceMinor || 0);
  const isMixMatch = Boolean(
    returnLeg && outbound.sourceFlightId !== returnLeg.sourceFlightId,
  );

  return {
    id: composeId(outbound, returnLeg),
    outbound,
    return: returnLeg,
    totalPriceMinor: total,
    currency: outbound.currency,
    isMixMatch,
  };
}

export function tripReadyForSelection(trip: ComposedTrip, isRoundTrip: boolean): boolean {
  if (!isRoundTrip) return true;
  return Boolean(trip.return);
}
