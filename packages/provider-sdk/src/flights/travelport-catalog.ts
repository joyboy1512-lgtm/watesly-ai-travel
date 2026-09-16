import type { FlightOffer } from "@watesly-travel/shared";
import { normalizeAirlineNameAr } from "@watesly-travel/shared";
import { amountToMinor, type FlightSearchParams } from "../types";

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

function str(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export function parseTravelportDurationMinutes(raw?: string | null): number | null {
  if (!raw || typeof raw !== "string") return null;
  const iso = raw.trim().match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) {
    const days = Number(iso[1] || 0);
    const hours = Number(iso[2] || 0);
    const mins = Number(iso[3] || 0);
    const secs = Number(iso[4] || 0);
    const total = days * 24 * 60 + hours * 60 + mins + Math.round(secs / 60);
    return Number.isFinite(total) ? total : null;
  }
  const hm = raw.trim().match(/^(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (hm && (hm[1] || hm[2])) {
    const total = Number(hm[1] || 0) * 60 + Number(hm[2] || 0);
    return Number.isFinite(total) ? total : null;
  }
  return null;
}

export function travelportCabin(raw?: string | null): string {
  const c = str(raw).toLowerCase().replace(/[\s_-]+/g, "");
  if (c.includes("premiumfirst") || c === "first") return "first";
  if (c.includes("business")) return "business";
  if (c.includes("premiumeconomy") || c.includes("premium")) return "premium_economy";
  return "economy";
}

export function travelportCabinPreference(cabinClass?: string | null): string | null {
  const c = str(cabinClass).toLowerCase();
  if (!c) return null;
  if (c.includes("first")) return "First";
  if (c.includes("business")) return "Business";
  if (c.includes("premium")) return "PremiumEconomy";
  if (c.includes("economy")) return "Economy";
  return null;
}

function durationLabel(mins: number | null): string | null {
  if (mins == null || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

function localDateTime(date?: string, time?: string): string | undefined {
  const d = str(date);
  const t = str(time);
  if (!d) return undefined;
  if (!t) return d;
  return `${d}T${t.length === 5 ? `${t}:00` : t}`;
}

function brandRefOf(offering: Rec): string {
  const brand = asRecord(offering.Brand);
  return str(brand.BrandRef || offering.BrandRef || brand.id);
}

function productRefsOf(offering: Rec): string[] {
  return asArray(offering.Product)
    .map((row) => {
      const rec = asRecord(row);
      return str(rec.productRef || rec.id);
    })
    .filter(Boolean);
}

function combinabilityOf(offering: Rec): string[] {
  return asArray(offering.CombinabilityCode).map((c) => str(c)).filter(Boolean);
}

function termsRefOf(offering: Rec): string {
  const terms = asRecord(offering.TermsAndConditions);
  return str(terms.termsAndConditionsRef || terms.id);
}

function unwrapCatalog(payload: unknown): Rec {
  const rec = asRecord(payload);
  const wrapped = asRecord(rec.CatalogProductOfferingsResponse);
  return Object.keys(wrapped).length ? wrapped : rec;
}

function indexById(rows: Rec[], keys: string[]): Map<string, Rec> {
  const map = new Map<string, Rec>();
  for (const row of rows) {
    for (const key of keys) {
      const id = str(row[key]);
      if (id) map.set(id, row);
    }
  }
  return map;
}

type MappedSegment = {
  from: string;
  to: string;
  departAt?: string;
  arriveAt?: string;
  airline: string;
  airlineAr: string;
  airlineCode?: string;
  marketingAirlineCode?: string;
  operatingAirlineCode?: string;
  operatingAirlineName?: string;
  flightNumber?: string;
  aircraft?: string;
  durationMinutes?: number;
  departureTerminal?: string;
  arrivalTerminal?: string;
};

function mapFlightSegment(flight: Rec): MappedSegment | null {
  const dep = asRecord(flight.Departure);
  const arr = asRecord(flight.Arrival);
  const from = str(dep.location).toUpperCase();
  const to = str(arr.location).toUpperCase();
  if (!from || !to) return null;
  const carrier = str(flight.carrier || flight.operatingCarrier).toUpperCase();
  const number = str(flight.number || flight.operatingCarrierNumber);
  const operating = str(flight.operatingCarrier).toUpperCase();
  const airlineName = str(flight.operatingCarrierName) || carrier;
  const airlineAr = normalizeAirlineNameAr(carrier, airlineName).ar;
  const durationMinutes = parseTravelportDurationMinutes(str(flight.duration)) ?? undefined;
  let flightNumber: string | undefined;
  if (number) {
    const upper = number.toUpperCase();
    flightNumber =
      carrier && !upper.startsWith(carrier) ? `${carrier}${upper.replace(/^[A-Z]+/, "")}` : upper;
  }
  return {
    from,
    to,
    departAt: localDateTime(str(dep.date), str(dep.time)),
    arriveAt: localDateTime(str(arr.date), str(arr.time)),
    airline: airlineName,
    airlineAr,
    airlineCode: carrier || undefined,
    marketingAirlineCode: carrier || undefined,
    operatingAirlineCode: operating || undefined,
    operatingAirlineName: str(flight.operatingCarrierName) || undefined,
    flightNumber,
    aircraft: str(flight.equipment) || undefined,
    durationMinutes,
    departureTerminal: str(dep.terminal) || undefined,
    arrivalTerminal: str(arr.terminal) || undefined,
  };
}

function splitRoundTrip(
  segments: MappedSegment[],
  destination: string,
): { outbound: MappedSegment[]; inbound: MappedSegment[] } {
  const dest = destination.toUpperCase();
  const splitAt = segments.findIndex((seg, i) => i > 0 && seg.from === dest);
  if (splitAt > 0) {
    return { outbound: segments.slice(0, splitAt), inbound: segments.slice(splitAt) };
  }
  return { outbound: segments, inbound: [] };
}

function totalPriceOf(offering: Rec): { total: number; currency: string } | null {
  const price = asRecord(offering.BestCombinablePrice);
  const currency = str(asRecord(price.CurrencyCode).value || price.CurrencyCode).toUpperCase();
  const totalRaw = price.TotalPrice;
  const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
  if (!Number.isFinite(total) || total <= 0) return null;
  return { total, currency: currency || "KWD" };
}

function cabinFromProduct(product: Rec | undefined): string {
  if (!product) return "";
  const pax = asRecord(asArray(product.PassengerFlight)[0]);
  const fare = asRecord(asArray(pax.FlightProduct)[0]);
  return str(fare.cabin);
}

type BrandAttrs = {
  name: string;
  cabinBag?: string;
  checkedBag?: string;
  changeable?: boolean;
  refundable?: boolean;
};

function inclusionOf(attrs: Rec[], classification: string): string {
  const hit = attrs.find(
    (row) => str(asRecord(row).classification).toLowerCase() === classification.toLowerCase(),
  );
  return str(asRecord(hit).inclusion);
}

function bagCopy(inclusion: string, includedAr: string): string | undefined {
  if (inclusion === "Included") return includedAr;
  if (inclusion === "Chargeable") return "برسوم إضافية";
  if (inclusion === "NotOffered") return "غير مشمولة";
  return undefined;
}

function brandAttrsOf(brand: Rec | undefined): BrandAttrs {
  const rec = brand || {};
  const attrs = asArray<Rec>(rec.BrandAttribute).map(asRecord);
  const rebook = inclusionOf(attrs, "Rebooking");
  const refund = inclusionOf(attrs, "Refund");
  return {
    name: str(rec.name),
    cabinBag: bagCopy(inclusionOf(attrs, "CarryOn"), "حقيبة مقصورة"),
    checkedBag: bagCopy(inclusionOf(attrs, "CheckedBag"), "حقيبة شحن"),
    changeable:
      rebook === "Included" || rebook === "Chargeable"
        ? true
        : rebook === "NotOffered"
          ? false
          : undefined,
    refundable:
      refund === "Included" || refund === "Chargeable"
        ? true
        : refund === "NotOffered"
          ? false
          : undefined,
  };
}

function matchInbound(outbound: Rec, inboundOfferings: Rec[]): Rec | undefined {
  const codes = new Set(combinabilityOf(outbound));
  if (codes.size) {
    const hit = inboundOfferings.find((row) => combinabilityOf(row).some((c) => codes.has(c)));
    if (hit) return hit;
  }
  const brand = brandRefOf(outbound);
  if (brand) {
    const hit = inboundOfferings.find((row) => brandRefOf(row) === brand);
    if (hit) return hit;
  }
  return inboundOfferings[0];
}

function catalogError(result: Rec): string | null {
  const errors = asArray<Rec>(result.Error ?? result.Errors);
  const first = asRecord(errors[0]);
  const msg = str(first.Message || first.message || first.StatusMessage || first.Description);
  return msg || null;
}

export function buildTravelportSearchBody(
  params: FlightSearchParams,
  opts?: { maxUpsells?: number; offersPerPage?: number; contentSources?: string[] },
): Rec {
  const origin = params.origin.trim().toUpperCase();
  const destination = params.destination.trim().toUpperCase();
  const passengers: Rec[] = [
    {
      "@type": "PassengerCriteria",
      number: Math.max(1, params.adults || 1),
      passengerTypeCode: "ADT",
    },
  ];
  if (params.children) {
    passengers.push({
      "@type": "PassengerCriteria",
      number: params.children,
      passengerTypeCode: "CNN",
      age: 8,
    });
  }
  if (params.infants) {
    passengers.push({
      "@type": "PassengerCriteria",
      number: params.infants,
      passengerTypeCode: "INF",
      age: 1,
    });
  }

  const flights: Rec[] = [
    {
      "@type": "SearchCriteriaFlight",
      departureDate: params.departDate.slice(0, 10),
      From: { value: origin },
      To: { value: destination },
    },
  ];
  if (params.returnDate) {
    flights.push({
      "@type": "SearchCriteriaFlight",
      departureDate: params.returnDate.slice(0, 10),
      From: { value: destination },
      To: { value: origin },
    });
  }

  const request: Rec = {
    "@type": "CatalogProductOfferingsRequestAir",
    contentSourceList: opts?.contentSources?.length ? opts.contentSources : ["GDS"],
    maxNumberOfUpsellsToReturn: opts?.maxUpsells ?? 4,
    offersPerPage: opts?.offersPerPage ?? 50,
    PassengerCriteria: passengers,
    SearchCriteriaFlight: flights,
    CustomResponseModifiersAir: {
      SearchRepresentation: "Journey",
    },
  };

  const cabin = travelportCabinPreference(params.cabinClass);
  if (cabin) {
    request.SearchModifiersAir = {
      "@type": "SearchModifiersAir",
      CabinPreference: [
        {
          "@type": "CabinPreference",
          preferenceType: "Permitted",
          cabins: [cabin],
        },
      ],
    };
  }

  return {
    "@type": "CatalogProductOfferingsQueryRequest",
    CatalogProductOfferingsRequest: request,
  };
}

export function mapTravelportCatalogSearch(
  payload: unknown,
  params: FlightSearchParams,
): FlightOffer[] {
  const catalog = unwrapCatalog(payload);
  const resultMsg = catalogError(asRecord(catalog.Result));
  const offeringsRoot = asRecord(catalog.CatalogProductOfferings);
  const offerings = asArray<Rec>(offeringsRoot.CatalogProductOffering).map(asRecord);
  if (!offerings.length) {
    if (resultMsg) throw new Error(resultMsg);
    return [];
  }

  const referenceLists = asArray<Rec>(catalog.ReferenceList).map(asRecord);
  const flights = indexById(
    asArray<Rec>(
      referenceLists.find((row) => str(row["@type"]).includes("Flight"))?.Flight,
    ).map(asRecord),
    ["id", "FlightRef"],
  );
  const products = indexById(
    asArray<Rec>(
      referenceLists.find((row) => str(row["@type"]).includes("Product"))?.Product,
    ).map(asRecord),
    ["id"],
  );
  const brands = indexById(
    asArray<Rec>(
      referenceLists.find((row) => str(row["@type"]).includes("Brand"))?.Brand,
    ).map(asRecord),
    ["id"],
  );

  const origin = params.origin.trim().toUpperCase();
  const destination = params.destination.trim().toUpperCase();
  const mapped: FlightOffer[] = [];

  const pushOffer = (input: {
    catalogId: string;
    optionFlightRefs: string[];
    inboundFlightRefs: string[];
    offering: Rec;
    inboundOffering?: Rec;
  }) => {
    const priced = totalPriceOf(input.offering);
    if (!priced) return;
    const brandId = brandRefOf(input.offering);
    const brand = brandAttrsOf(brands.get(brandId));
    const productId = productRefsOf(input.offering)[0];
    const cabin = travelportCabin(
      cabinFromProduct(productId ? products.get(productId) : undefined) || params.cabinClass,
    );
    const outSegs = input.optionFlightRefs
      .map((id) => flights.get(id))
      .filter(Boolean)
      .map((row) => mapFlightSegment(row as Rec))
      .filter((row): row is MappedSegment => Boolean(row));
    const inSegs = input.inboundFlightRefs
      .map((id) => flights.get(id))
      .filter(Boolean)
      .map((row) => mapFlightSegment(row as Rec))
      .filter((row): row is MappedSegment => Boolean(row));

    let outbound = outSegs;
    let inbound = inSegs;
    if (!inbound.length && params.returnDate) {
      const split = splitRoundTrip(outSegs, destination);
      outbound = split.outbound;
      inbound = split.inbound;
    }
    const first = outbound[0];
    const lastOut = outbound[outbound.length - 1];
    const airlineCode = (first?.airlineCode || "XX").toUpperCase();
    const airlineName = first?.airline || airlineCode;
    const airlineAr = first?.airlineAr || normalizeAirlineNameAr(airlineCode, airlineName).ar;
    const fareBrand = brand.name || cabin;
    const outDuration =
      outbound.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0) || null;
    const retDuration =
      inbound.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0) || null;
    const currency = (priced.currency || params.currency || "KWD").toUpperCase();
    const id = [
      "tp",
      input.catalogId,
      brandId || productId || mapped.length,
      first?.flightNumber || `${origin}${destination}`,
    ].join("_");

    mapped.push({
      providerKey: "travelport",
      providerOfferRef: id,
      description: `${airlineAr} ${origin || first?.from || ""} → ${destination || lastOut?.to || ""}`,
      costAmountMinor: amountToMinor(priced.total, currency),
      currency: currency as FlightOffer["currency"],
      revalidationToken: str(catalog.transactionId) || id,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      raw: {
        provider: "travelport",
        airline: airlineName,
        airlineAr,
        airlineCode,
        cabin,
        fareBrand,
        baggage: {
          cabin: brand.cabinBag,
          checked: brand.checkedBag,
        },
        policies: {
          changeable: brand.changeable,
          refundable: brand.refundable,
        },
        duration: durationLabel(outDuration),
        durationMinutes: outDuration,
        stops: Math.max(0, outbound.length - 1),
        departAt: first?.departAt,
        arriveAt: lastOut?.arriveAt,
        segments: outbound,
        returnSegments: inbound,
        returnDate: params.returnDate ?? null,
        returnDuration: durationLabel(retDuration),
        returnDurationMinutes: retDuration,
        returnStops: Math.max(0, inbound.length - 1),
        tripType: inbound.length ? "roundtrip" : "oneway",
        brandRef: brandId || undefined,
        productRef: productId || undefined,
        termsRef: termsRefOf(input.offering) || undefined,
        combinabilityCode: combinabilityOf(input.offering),
        contentSource: str(input.offering.ContentSource) || undefined,
        catalogProductOfferingId: input.catalogId,
        transactionId: str(catalog.transactionId) || undefined,
        offering: input.offering,
        inboundOffering: input.inboundOffering,
      },
    });
  };

  for (const offering of offerings) {
    const catalogId = str(offering.id) || `o${mapped.length + 1}`;
    const options = asArray<Rec>(offering.ProductBrandOptions).map(asRecord);
    if (!options.length) continue;

    const roundTripPair = Boolean(params.returnDate) && options.length >= 2;
    if (roundTripPair) {
      const outboundOption = options[0];
      const inboundOption = options[1];
      if (!outboundOption || !inboundOption) continue;
      const inboundOfferings = asArray<Rec>(inboundOption.ProductBrandOffering).map(asRecord);
      for (const brandOffering of asArray<Rec>(outboundOption.ProductBrandOffering).map(asRecord)) {
        pushOffer({
          catalogId,
          optionFlightRefs: asArray(outboundOption.flightRefs).map(str).filter(Boolean),
          inboundFlightRefs: asArray(inboundOption.flightRefs).map(str).filter(Boolean),
          offering: brandOffering,
          inboundOffering: matchInbound(brandOffering, inboundOfferings),
        });
      }
      continue;
    }

    for (const option of options) {
      const refs = asArray(option.flightRefs).map(str).filter(Boolean);
      for (const brandOffering of asArray<Rec>(option.ProductBrandOffering).map(asRecord)) {
        pushOffer({
          catalogId,
          optionFlightRefs: refs,
          inboundFlightRefs: [],
          offering: brandOffering,
        });
      }
    }
  }

  if (!mapped.length && resultMsg) throw new Error(resultMsg);
  return mapped.slice(0, 80);
}
