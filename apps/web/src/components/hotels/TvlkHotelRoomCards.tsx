"use client";

import { useMemo, useState } from "react";
import { boardLabelAr, normalizePaymentTypeAr, translateRoomNameAr } from "@watesly-travel/shared";
import {
  formatPolicyDate,
  groupRatesIntoRooms,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
  type HotelRoomOption,
} from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { shopNightCount } from "@/lib/hotel-occupancy";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { HotelMediaImage } from "@/components/hotels/HotelMediaImage";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  checkingRateKey?: string | null;
  onBookRate: (rate: HotelRateOption) => void;
};

type RateChip = "all" | "breakfast" | "freeCancel" | "payHotel";

function occupancyLine(room: HotelRoomOption, t: ReturnType<typeof useShopCopy>["t"]) {
  const o = room.occupancy;
  if (o?.maxPax) return t("maxGuestsN", { n: o.maxPax });
  if (o?.maxAdults) return t("maxAdultsN", { n: o.maxAdults });
  return "";
}

function cancellationSummary(rate: HotelRateOption) {
  const policies = rate.cancellationPolicies || [];
  if (rate.freeCancellation) {
    const first = policies.find((p) => Number(p.amount) === 0);
    if (first?.from) {
      const deadline = new Date(first.from);
      if (Number.isFinite(deadline.getTime()) && deadline.getTime() <= Date.now()) {
        return { text: "غير قابل للاسترداد", good: false };
      }
      return { text: `إلغاء مجاني حتى ${formatPolicyDate(first.from)}`, good: true };
    }
    return { text: "إلغاء مجاني", good: true };
  }
  return { text: "غير قابل للاسترداد", good: false };
}

function rateMatchesChip(rate: HotelRateOption, chip: RateChip) {
  if (chip === "all") return true;
  if (chip === "breakfast") return ["BB", "HB", "FB", "AI", "DB"].includes(rate.boardCode);
  if (chip === "freeCancel") return rate.freeCancellation;
  if (chip === "payHotel") return rate.paymentType === "AT_HOTEL";
  return true;
}

function collectRooms(hotel: Props["hotel"]): HotelRoomOption[] {
  const raw = hotel.details.rooms;
  const fromDetails = Array.isArray(raw) ? (raw as HotelRoomOption[]) : [];
  const filtered = fromDetails
    .map((room) => ({
      ...room,
      rates: room.rates
        .filter((r) => hotel.matchingRates.some((m) => m.rateKey === r.rateKey))
        .sort((a, b) => a.net - b.net),
    }))
    .filter((room) => room.rates.length > 0);
  if (filtered.length) return filtered;
  return groupRatesIntoRooms(hotel.matchingRates);
}

/** Compact Traveloka-style room cards: name, a few facts, price, select. */
export function TvlkHotelRoomCards({ hotel, nights, checkingRateKey, onBookRate }: Props) {
  const { t, locale } = useShopCopy();
  const rooms = useMemo(() => collectRooms(hotel), [hotel]);
  const [chip, setChip] = useState<RateChip>("all");

  const visible = rooms
    .map((room) => ({ ...room, rates: room.rates.filter((r) => rateMatchesChip(r, chip)) }))
    .filter((room) => room.rates.length > 0);

  const chips = (
    [
      { id: "all" as const, label: t("allRoomOffers"), count: hotel.matchingRates.length },
      {
        id: "breakfast" as const,
        label: t("filterBreakfast"),
        count: hotel.matchingRates.filter((r) => rateMatchesChip(r, "breakfast")).length,
      },
      {
        id: "freeCancel" as const,
        label: t("filterFreeCancel"),
        count: hotel.matchingRates.filter((r) => r.freeCancellation).length,
      },
    ] satisfies Array<{ id: RateChip; label: string; count: number }>
  ).filter((c) => c.id === "all" || c.count > 0);

  if (!rooms.length) {
    return <p className="hint">{t("noMatchingRoomOffers")}</p>;
  }

  return (
    <div className="tvlk-room-list">
      <header className="tvlk-room-list-head">
        <h2>{t("availableRoomTypes")}</h2>
        {chips.length > 1 ? (
          <div className="tvlk-room-chips" role="tablist" aria-label={t("roomsAndPrices")}>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={chip === c.id}
                className={chip === c.id ? "on" : undefined}
                onClick={() => setChip(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {visible.length === 0 ? <p className="hint">{t("noMatchingRoomOffers")}</p> : null}

      {visible.map((room) => {
        const names = translateRoomNameAr(room.name);
        const occ = occupancyLine(room, t);
        const photo = room.imageUrl || room.images?.[0];

        return (
          <article key={room.code || room.name} className="tvlk-room-card">
            <div className="tvlk-room-card-top">
              <HotelMediaImage
                src={photo}
                alt={names.ar}
                className="tvlk-room-photo-main"
                preferMedium
                compactEmpty
              />
              <div className="tvlk-room-meta">
                <h3>{names.ar}</h3>
                {occ ? <p className="tvlk-room-occ">{occ}</p> : null}
                {room.facilities?.length ? (
                  <p className="tvlk-room-facs">{room.facilities.slice(0, 3).join(" · ")}</p>
                ) : null}
              </div>
            </div>

            <div className="tvlk-room-rates">
              {room.rates.map((rate) => {
                const totalMinor = rateDisplayMinor(rate, hotel, nights);
                const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                const cancel = cancellationSummary(rate);
                const busy = checkingRateKey === rate.rateKey;
                const pay = normalizePaymentTypeAr(rate.paymentType).ar || "";
                const board = boardLabelAr(rate.boardCode, rate.boardName);

                return (
                  <div key={rate.rateKey} className="tvlk-rate-row">
                    <div className="tvlk-rate-facts">
                      <strong className="tvlk-rate-board">{board}</strong>
                      <p className={cancel.good ? "good" : "warn"}>{cancel.text}</p>
                      {pay ? <p>{pay}</p> : null}
                    </div>
                    <div className="tvlk-rate-price">
                      <strong>{formatMoneyMinor(perNightMinor, hotel.currency)}</strong>
                      <em>
                        {formatMoneyMinor(totalMinor, hotel.currency)} · {shopNightCount(locale, nights)}
                      </em>
                      <button
                        type="button"
                        className="tvlk-rate-select"
                        disabled={Boolean(checkingRateKey)}
                        onClick={() => onBookRate(rate)}
                      >
                        {busy ? t("checkingPrice") : t("selectThisRoom")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
