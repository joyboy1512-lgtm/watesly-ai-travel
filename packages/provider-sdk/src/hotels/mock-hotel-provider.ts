import type { HotelOffer } from "@watesly-travel/shared";
import { buildMockAncillaryOffers } from "@watesly-travel/shared";
import { MOCK_DESTINATION_LABELS } from "../flights/mock-flight-catalog";
import { geocodeLocation } from "../locations";
import {
  currencyExponent,
  scenarioFromOfferRef,
  toMinor,
  toMinorKwd,
} from "../scenario";
import type {
  HotelProviderAdapter,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
} from "../types";
import { hotelsForDestination } from "./mock-hotel-catalog";

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export class MockHotelProvider implements HotelProviderAdapter {
  readonly providerKey = "mock";
  readonly displayName = "مزود تجريبي (Mock)";
  readonly liveMode = false;

  async searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
    const geo = await geocodeLocation(params.location);
    const seed = hashSeed(
      `${params.location}-${params.checkInDate}-${params.checkOutDate}-${params.adults}`,
    );
    const currency = (params.currency || "KWD").toUpperCase();
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const nights = Math.max(
      1,
      Math.round(
        (new Date(params.checkOutDate).getTime() -
          new Date(params.checkInDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    const locUpper = params.location.trim().toUpperCase();
    const destCode =
      MOCK_DESTINATION_LABELS[locUpper]
        ? locUpper
        : Object.entries(MOCK_DESTINATION_LABELS).find(([, label]) =>
            params.location.includes(label),
          )?.[0] || locUpper.slice(0, 3);
    const label = geo?.label || MOCK_DESTINATION_LABELS[destCode] || params.location;
    const hotels = hotelsForDestination(destCode, label);

    // Attach package/tour/transfer snapshots for quote enrichment (not sold as separate hotel rows)
    const ancillaries = buildMockAncillaryOffers({
      destinationLabel: label,
      adults: params.adults,
      nights,
    });

    return hotels.map((hotel, index) => {
      const variance = 1 + ((seed + index) % 9) * 0.02;
      const nightMajor =
        currency === "KWD" || currency === "BHD" || currency === "OMR"
          ? hotel.nightRateKwd * variance
          : hotel.nightRateKwd * variance * 10;
      const cost = toMinor(nightMajor * nights, currency);
      const scenario = hotel.scenario || "normal";
      const scenarioTag =
        scenario === "price_change"
          ? "PRICE-CHANGE"
          : scenario === "sold_out"
            ? "SOLD-OUT"
            : scenario === "unavailable"
              ? "UNAVAILABLE"
              : null;
      const providerOfferRef = scenarioTag
        ? `MOCK-HTL-${scenarioTag}-${index}`
        : `MOCK-HTL-${hotel.id.toUpperCase()}-${(seed + index).toString(16).toUpperCase()}`;

      return {
        providerKey: this.providerKey,
        providerOfferRef,
        description: `${hotel.nameAr} · ${nights} ليلة · ${params.checkInDate} → ${params.checkOutDate}`,
        costAmountMinor: cost,
        currency,
        revalidationToken: `htl_rv_${scenario}_${seed + index}`,
        expiresAt,
        raw: {
          provider: "mock",
          liveMode: false,
          scenario,
          name: hotel.nameAr,
          nameEn: hotel.nameEn,
          stars: hotel.stars,
          rating: hotel.rating,
          reviewCount: hotel.reviewCount,
          roomType: hotel.roomType,
          propertyType: hotel.propertyType,
          facilities: hotel.facilities,
          freeCancellation: hotel.freeCancellation,
          noPrepayment: hotel.noPrepayment,
          roomsAvailable: hotel.roomsAvailable,
          imageUrl: hotel.imageUrl,
          nights,
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          rooms: params.rooms || 1,
          adults: params.adults,
          location: label,
          neighborhood: hotel.neighborhood,
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          board: hotel.board,
          policies: {
            freeCancellation: hotel.freeCancellation,
            noPrepayment: hotel.noPrepayment,
            noteAr: hotel.freeCancellation
              ? "إلغاء مجاني حتى 48 ساعة قبل الوصول"
              : "غير قابل للإلغاء · رسوم كاملة عند الإلغاء",
          },
          taxesNoteAr: "يشمل الضرائب والرسوم المحلية",
          relatedAncillaries: ancillaries.filter((a) =>
            ["transfer", "tour", "package"].includes(a.serviceType),
          ),
        },
      } satisfies HotelOffer;
    });
  }

  async revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult> {
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
      const bumpMajor = 4.5;
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
    offer: HotelOffer,
    _guests?: unknown,
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
