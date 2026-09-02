import type { FlightOffer } from "@watesly-travel/shared";
import {
  currencyExponent,
  scenarioFromOfferRef,
  toMinor,
  toMinorKwd,
} from "../scenario";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";
import {
  MOCK_AIRLINES,
  MOCK_DESTINATION_LABELS,
  MOCK_FLIGHT_TEMPLATES,
  MOCK_ROUTE_MULTIPLIER,
  addMinutesToIsoDate,
  minutesToDuration,
  type MockFlightTemplate,
} from "./mock-flight-catalog";

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function normalizeAirport(code: string): string {
  return code.trim().toUpperCase();
}

function routeMultiplier(dest: string): number {
  return MOCK_ROUTE_MULTIPLIER[dest] ?? 1.2;
}

function filterTemplatesForCabin(
  templates: MockFlightTemplate[],
  cabin: string | null | undefined,
): MockFlightTemplate[] {
  const wanted = (cabin || "economy").toLowerCase();
  if (wanted === "business" || wanted === "first") {
    const biz = templates.filter((t) => t.cabin === "business");
    return biz.length ? [...biz, ...templates.filter((t) => t.scenario)] : templates;
  }
  // Economy search: show economy + scenarios; keep one business as upsell
  const economy = templates.filter((t) => t.cabin === "economy" || t.scenario);
  const upsell = templates.find((t) => t.id === "business-ku");
  return upsell ? [...economy, upsell] : economy;
}

function buildReturnSegments(
  outbound: Array<{
    from: string;
    to: string;
    flightNumber?: string;
    airline?: string;
  }>,
  returnDate: string,
  airlineCode: string,
  seed: number,
): { segments: Array<Record<string, unknown>>; durationMinutes: number } {
  const airline = MOCK_AIRLINES[airlineCode] || {
    code: airlineCode,
    name: airlineCode,
    nameAr: airlineCode,
  };
  const segs = [...outbound].reverse();
  let firstDepartOffset = 0;
  let lastArriveOffset = 0;
  const segments = segs.map((s, index) => {
    const departOffset = (10 + index * 3) * 60 + (seed % 40);
    const duration = 180 + (seed % 60);
    if (index === 0) firstDepartOffset = departOffset;
    lastArriveOffset = departOffset + duration;
    const dep = addMinutesToIsoDate(returnDate, departOffset);
    const arr = addMinutesToIsoDate(returnDate, departOffset + duration);
    return {
      from: s.to,
      to: s.from,
      date: returnDate,
      departAt: dep.isoLocal,
      arriveAt: arr.isoLocal,
      departTime: dep.clock,
      arriveTime: arr.clock,
      flightNumber: `${airlineCode}${500 + (seed % 400) + index}`,
      airline: airline.nameAr,
      airlineCode,
      durationMinutes: duration,
    };
  });
  return {
    segments,
    durationMinutes: Math.max(60, lastArriveOffset - firstDepartOffset),
  };
}

export class MockFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "mock";
  readonly displayName = "مزود تجريبي (Mock)";
  readonly liveMode = false;

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const origin = normalizeAirport(params.origin);
    const destination = normalizeAirport(params.destination);
    const seed = hashSeed(
      `${origin}-${destination}-${params.departDate}-${params.adults}-${params.children || 0}-${params.infants || 0}-${params.cabinClass || "economy"}`,
    );
    const currency = (params.currency || "KWD").toUpperCase();
    const adults = Math.max(1, params.adults);
    const children = Math.max(0, params.children || 0);
    const infants = Math.max(0, params.infants || 0);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const mult = routeMultiplier(destination);
    const isRoundTrip = Boolean(params.returnDate);
    const templates = filterTemplatesForCabin(
      MOCK_FLIGHT_TEMPLATES,
      params.cabinClass,
    );

    const offers: FlightOffer[] = templates.map((tpl, index) => {
      const airline = MOCK_AIRLINES[tpl.airlineCode] || {
        code: tpl.airlineCode,
        name: tpl.airlineCode,
        nameAr: tpl.airlineCode,
      };

      let totalDuration = 0;
      const segments = tpl.segments.map((segTpl, segIndex) => {
        const from =
          segTpl.from === "KWI"
            ? origin
            : segTpl.from === "DEST"
              ? destination
              : segTpl.from;
        const to =
          segTpl.to === "DEST"
            ? destination
            : segTpl.to === "KWI"
              ? origin
              : segTpl.to;
        const duration =
          segTpl.durationMin + ((seed + index + segIndex) % 25) - 10;
        const safeDuration = Math.max(60, duration);
        const dep = addMinutesToIsoDate(
          params.departDate,
          segTpl.departOffsetMin + ((seed + index) % 20),
        );
        const arr = addMinutesToIsoDate(
          params.departDate,
          segTpl.departOffsetMin + ((seed + index) % 20) + safeDuration,
        );
        totalDuration += safeDuration;
        if (segIndex > 0) {
          // rough connection padding already in offsets
        }
        return {
          from,
          to,
          date: params.departDate,
          departAt: dep.isoLocal,
          arriveAt: arr.isoLocal,
          departTime: dep.clock,
          arriveTime: arr.clock,
          flightNumber: `${segTpl.flightNumberPrefix}${100 + ((seed + index * 17 + segIndex * 3) % 800)}`,
          airline: airline.nameAr,
          airlineCode: airline.code,
          durationMinutes: safeDuration,
        };
      });

      if (tpl.stops > 0 && segments.length > 1) {
        const firstDep = segments[0]!.departAt;
        const lastArr = segments[segments.length - 1]!.arriveAt;
        const start = new Date(firstDep).getTime();
        const end = new Date(lastArr).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          totalDuration = Math.round((end - start) / 60000);
        }
      }

      const fareMajor = (tpl.baseFareKwd * mult + (seed % 7) * 0.4) * (isRoundTrip ? 1.85 : 1);
      const taxesMajor = tpl.taxesKwd * mult * (isRoundTrip ? 1.7 : 1);
      const perAdult = fareMajor + taxesMajor;
      const childFactor = 0.75;
      const infantFactor = 0.1;
      const totalMajor =
        perAdult * adults +
        perAdult * childFactor * children +
        perAdult * infantFactor * infants;
      const costAmountMinor = toMinor(totalMajor, currency);

      const scenario = tpl.scenario || "normal";
      const scenarioTag =
        scenario === "price_change"
          ? "PRICE-CHANGE"
          : scenario === "sold_out"
            ? "SOLD-OUT"
            : scenario === "provider_fail"
              ? "PROVIDER-FAIL"
              : null;
      const providerOfferRef = scenarioTag
        ? `MOCK-FLT-${scenarioTag}-${destination}-${index}`
        : `MOCK-FLT-${tpl.id.toUpperCase()}-${destination}-${(seed + index).toString(16).toUpperCase()}`;

      const returnBuilt =
        isRoundTrip && params.returnDate
          ? buildReturnSegments(
              segments,
              params.returnDate,
              tpl.airlineCode,
              seed + index,
            )
          : null;
      const returnSegments = returnBuilt?.segments || [];
      const returnDurationMinutes = returnBuilt?.durationMinutes || 0;

      const destLabel =
        MOCK_DESTINATION_LABELS[destination] || destination;
      const tripLabel = isRoundTrip ? "ذهاب وعودة" : "ذهاب فقط";

      return {
        providerKey: this.providerKey,
        providerOfferRef,
        description: `${airline.nameAr} ${origin} → ${destination} · ${tripLabel} · ${params.departDate}${
          params.returnDate ? ` → ${params.returnDate}` : ""
        } · ${adults} بالغ`,
        costAmountMinor,
        currency,
        revalidationToken: `rv_${scenario}_${seed + index}`,
        expiresAt,
        raw: {
          provider: "mock",
          liveMode: false,
          scenario,
          airline: airline.name,
          airlineAr: airline.nameAr,
          airlineCode: airline.code,
          cabin: tpl.cabin,
          duration: minutesToDuration(Math.max(totalDuration, 60)),
          durationMinutes: totalDuration,
          stops: tpl.stops,
          flexible: Boolean(tpl.flexible),
          departAt: segments[0]?.departAt,
          arriveAt: segments[segments.length - 1]?.arriveAt,
          segments,
          returnSegments,
          returnDate: params.returnDate ?? null,
          returnDuration:
            returnDurationMinutes > 0
              ? minutesToDuration(returnDurationMinutes)
              : null,
          returnDurationMinutes: returnDurationMinutes || null,
          returnStops: Math.max(0, returnSegments.length - 1),
          tripType: isRoundTrip ? "roundtrip" : "oneway",
          destinationLabel: destLabel,
          fare: {
            baseAmountMinor: toMinor(fareMajor * adults, currency),
            taxesAmountMinor: toMinor(taxesMajor * adults, currency),
            currency,
          },
          baggage: tpl.baggage,
          policies: tpl.policies,
          adults,
          children,
        },
      } satisfies FlightOffer;
    });

    return offers;
  }

  async revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult> {
    const scenario =
      scenarioFromOfferRef(offer.providerOfferRef) ||
      String(offer.raw?.scenario || "normal");

    if (scenario === "sold_out" || scenario === "unavailable") {
      return {
        available: false,
        priceChanged: false,
        previousCostMinor: offer.costAmountMinor,
        offer: {
          ...offer,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      };
    }

    if (scenario === "price_change") {
      const bumpMajor = 6.5;
      const bump = toMinorKwd(bumpMajor);
      // Scale bump if currency isn't KWD-like
      const scaled =
        currencyExponent(offer.currency) === 3
          ? bump
          : Math.round(bumpMajor * 100);
      const nextCost = offer.costAmountMinor + scaled;
      return {
        available: true,
        priceChanged: true,
        previousCostMinor: offer.costAmountMinor,
        offer: {
          ...offer,
          costAmountMinor: nextCost,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          raw: {
            ...offer.raw,
            scenario: "price_change",
            priceChangeNoteAr: "تم تحديث السعر من المزود التجريبي",
          },
        },
      };
    }

    return {
      available: true,
      priceChanged: false,
      previousCostMinor: offer.costAmountMinor,
      offer: {
        ...offer,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      },
    };
  }

  async createBooking(
    offer: FlightOffer,
    _passengers?: unknown,
  ): Promise<ProviderBookingResult> {
    const scenario =
      scenarioFromOfferRef(offer.providerOfferRef) ||
      String(offer.raw?.scenario || "normal");

    if (scenario === "sold_out" || scenario === "unavailable") {
      return {
        providerBookingRef: "",
        status: "failed",
      };
    }

    if (scenario === "provider_fail") {
      throw new Error(
        "فشل مزود الخدمة التجريبي (MOCK-PROVIDER-FAIL) — أعد المحاولة أو اختر عرضًا آخر",
      );
    }

    return {
      providerBookingRef: `PNR-MOCK-${offer.providerOfferRef.replace(/[^A-Z0-9]/gi, "").slice(-6) || "000000"}`,
      status: "confirmed",
    };
  }
}
