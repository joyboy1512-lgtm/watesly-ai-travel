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

const bagFlex = {
  personal: "حقيبة شخصية تحت المقعد",
  cabin: "حقيبة يد 7 كجم",
  checked: "أمتعة مسجّلة 23 كجم",
};

const bagEconFamily = {
  personal: "حقيبة شخصية تحت المقعد",
  cabin: "حقيبة يد 7 كجم",
  checked: "أمتعة مسجّلة 23 كجم",
};

const bagComfort = {
  personal: "حقيبة شخصية تحت المقعد",
  cabin: "حقيبة يد 10 كجم",
  checked: "أمتعة مسجّلة 32 كجم",
};

const bagBizFamily = {
  personal: "حقيبة شخصية تحت المقعد",
  cabin: "حقيبتا يد حتى 14 كجم",
  checked: "أمتعة مسجّلة 40 كجم × 2",
};

type FareFamilySpec = {
  key: string;
  brand: string;
  cabin: "economy" | "business";
  mult: number;
  baggage?: MockFlightTemplate["baggage"];
  policies?: MockFlightTemplate["policies"];
};

const JAZEERA_FAMILIES: FareFamilySpec[] = [
  {
    key: "economy",
    brand: "Economy",
    cabin: "economy",
    mult: 1,
    baggage: {
      personal: "حقيبة شخصية",
      cabin: "حقيبة يد 7 كجم",
      checked: "أمتعة مسجّلة غير مشمولة",
    },
    policies: {
      changeable: false,
      refundable: false,
      changeFeeKwd: null,
      cancelFeeKwd: null,
      noteAr: "Economy · بدون أمتعة مسجّلة",
    },
  },
  {
    key: "flex",
    brand: "Flex",
    cabin: "economy",
    mult: 1.12,
    baggage: bagFlex,
    policies: {
      changeable: true,
      refundable: false,
      changeFeeKwd: 10,
      cancelFeeKwd: null,
      noteAr: "Flex · تعديل بمقابل",
    },
  },
  {
    key: "flex_plus",
    brand: "Flex Plus",
    cabin: "economy",
    mult: 1.24,
    baggage: bagComfort,
    policies: {
      changeable: true,
      refundable: true,
      changeFeeKwd: 0,
      cancelFeeKwd: 15,
      noteAr: "Flex Plus · مقعد واختيار أمتعة أفضل",
    },
  },
  {
    key: "comfort",
    brand: "Comfort",
    cabin: "economy",
    mult: 1.38,
    baggage: bagComfort,
    policies: {
      changeable: true,
      refundable: true,
      changeFeeKwd: 0,
      cancelFeeKwd: 10,
      noteAr: "Comfort · مساحة أكبر",
    },
  },
  {
    key: "business",
    brand: "Business",
    cabin: "business",
    mult: 1.9,
    baggage: bagBizFamily,
    policies: {
      changeable: true,
      refundable: true,
      changeFeeKwd: 0,
      cancelFeeKwd: 0,
      noteAr: "Business · درجة رجال الأعمال",
    },
  },
];

const KUWAIT_FAMILIES: FareFamilySpec[] = [
  {
    key: "saver",
    brand: "Economy Saver",
    cabin: "economy",
    mult: 1,
    baggage: {
      personal: "حقيبة شخصية تحت المقعد",
      cabin: "حقيبة يد 7 كجم",
      checked: "أمتعة مسجّلة غير مشمولة",
    },
    policies: {
      changeable: false,
      refundable: false,
      changeFeeKwd: null,
      cancelFeeKwd: null,
      noteAr: "Economy Saver · أقل مرونة",
    },
  },
  {
    key: "economy",
    brand: "Economy",
    cabin: "economy",
    mult: 1.08,
    baggage: {
      personal: "حقيبة شخصية تحت المقعد",
      cabin: "حقيبة يد 7 كجم",
      checked: "أمتعة مسجّلة 23 كجم",
    },
    policies: {
      changeable: false,
      refundable: false,
      changeFeeKwd: 18,
      cancelFeeKwd: 30,
      noteAr: "Economy · أمتعة مسجّلة",
    },
  },
  {
    key: "economy_class",
    brand: "Economy Class",
    cabin: "economy",
    mult: 1.16,
    baggage: bagEconFamily,
    policies: {
      changeable: true,
      refundable: false,
      changeFeeKwd: 15,
      cancelFeeKwd: 25,
      noteAr: "Economy Class · أمتعة مسجّلة",
    },
  },
  {
    key: "flex",
    brand: "Economy Flexi",
    cabin: "economy",
    mult: 1.28,
    baggage: bagEconFamily,
    policies: {
      changeable: true,
      refundable: true,
      changeFeeKwd: 0,
      cancelFeeKwd: 20,
      noteAr: "Economy Flexi · تعديل أسهل",
    },
  },
  {
    key: "business_saver",
    brand: "Business Saver",
    cabin: "business",
    mult: 1.85,
    baggage: bagBizFamily,
    policies: {
      changeable: true,
      refundable: false,
      changeFeeKwd: 25,
      cancelFeeKwd: 40,
      noteAr: "Business Saver · درجة أعمال",
    },
  },
];

function expandAirlineFareFamilies(offer: FlightOffer): FlightOffer[] {
  const raw = (offer.raw || {}) as Record<string, unknown>;
  const scenario = String(raw.scenario || "normal");
  if (scenario !== "normal") return [offer];
  const code = String(raw.airlineCode || "").toUpperCase();
  const families =
    code === "J9" ? JAZEERA_FAMILIES : code === "KU" ? KUWAIT_FAMILIES : null;
  if (!families) {
    return [
      {
        ...offer,
        raw: {
          ...raw,
          fareBrand: String(raw.cabin || "Economy"),
        },
      },
    ];
  }
  if (String(raw.cabin || "") === "business") {
    const biz = families.find((f) => f.cabin === "business") || families[families.length - 1]!;
    return [
      {
        ...offer,
        providerOfferRef: `${offer.providerOfferRef}-${biz.key}`,
        raw: {
          ...raw,
          cabin: biz.cabin,
          fareBrand: biz.brand,
          baggage: biz.baggage || raw.baggage,
          policies: biz.policies || raw.policies,
        },
      },
    ];
  }
  return families.map((fam) => ({
    ...offer,
    providerOfferRef: `${offer.providerOfferRef}-${fam.key}`,
    costAmountMinor: Math.round(offer.costAmountMinor * fam.mult),
    raw: {
      ...raw,
      cabin: fam.cabin,
      fareBrand: fam.brand,
      baggage: fam.baggage || raw.baggage,
      policies: fam.policies || raw.policies,
    },
  }));
}

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

    return offers.flatMap(expandAirlineFareFamilies);
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
