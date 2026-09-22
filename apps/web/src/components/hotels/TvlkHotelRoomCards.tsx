"use client";

import { useMemo, useState } from "react";
import { boardLabelAr, translateRoomNameAr } from "@watesly-travel/shared";
import {
  formatPolicyDate,
  groupRatesIntoRooms,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
  type HotelRoomOption,
} from "@/lib/hotel-search";
import {
  cheapestBreakfastRateKey,
  guestCountForRate,
  pickRoomFacts,
} from "@/lib/hotel-room-table";
import { formatMoneyMinor } from "@/lib/format";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { HotelMediaImage } from "@/components/hotels/HotelMediaImage";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  checkingRateKey?: string | null;
  onBookRate: (rate: HotelRateOption) => void;
};

type RateChip = "all" | "breakfast" | "freeCancel" | "payHotel";

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

function GuestIcons({ count }: { count: number }) {
  const n = Math.min(6, Math.max(1, count));
  return (
    <span className="tvlk-rate-guests" aria-label={`${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <circle cx="8" cy="5" r="2.4" fill="currentColor" />
          <path
            d="M3.2 13.2c.4-2.6 2.3-4 4.8-4s4.4 1.4 4.8 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </span>
  );
}

/** Traveloka-style room + rate table: photo, options, nightly price, Choose. */
export function TvlkHotelRoomCards({ hotel, nights, checkingRateKey, onBookRate }: Props) {
  const { t } = useShopCopy();
  const rooms = useMemo(() => collectRooms(hotel), [hotel]);
  const [chip, setChip] = useState<RateChip>("all");
  const [openDetails, setOpenDetails] = useState<string | null>(null);

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
        const photo = room.imageUrl || room.images?.[0];
        const facts = pickRoomFacts(room);
        const roomId = room.code || room.name;
        const detailsOpen = openDetails === roomId;
        const extraFacilities = (room.facilities || []).filter((f) => !facts.includes(f));
        const breakfastDeal = cheapestBreakfastRateKey(room.rates);

        return (
          <article key={roomId} className="tvlk-room-card tvlk-room-table-card">
            <h3 className="tvlk-room-title">{names.ar}</h3>
            <div className="tvlk-room-table-grid">
              <aside className="tvlk-room-aside">
                <HotelMediaImage
                  src={photo}
                  alt={names.ar}
                  className="tvlk-room-photo-main"
                  preferMedium
                  compactEmpty
                />
                {facts.length ? (
                  <ul className="tvlk-room-facts">
                    {facts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                ) : null}
                {room.description || extraFacilities.length ? (
                  <button
                    type="button"
                    className="tvlk-room-details-link"
                    onClick={() => setOpenDetails(detailsOpen ? null : roomId)}
                  >
                    {detailsOpen ? t("hideRoomDetails") : t("seeRoomDetails")}
                  </button>
                ) : null}
                {detailsOpen ? (
                  <div className="tvlk-room-details-panel">
                    {room.description ? <p>{room.description}</p> : null}
                    {extraFacilities.length ? (
                      <ul>
                        {extraFacilities.map((fac) => (
                          <li key={fac}>{fac}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </aside>

              <div className="tvlk-room-table-wrap">
                <div className="tvlk-room-thead" aria-hidden>
                  <span>{t("roomOptionCol")}</span>
                  <span>{t("guestsCol")}</span>
                  <span>{t("pricePerRoomNight")}</span>
                  <span>{t("roomsCountCol")}</span>
                  <span />
                </div>
                {room.rates.map((rate) => {
                  const totalMinor = rateDisplayMinor(rate, hotel, nights);
                  const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                  const cancel = cancellationSummary(rate);
                  const busy = checkingRateKey === rate.rateKey;
                  const board = boardLabelAr(rate.boardCode, rate.boardName);
                  const guests = guestCountForRate(rate, room);
                  const roomCount = Math.max(1, Number(rate.rooms || 1));
                  const bedLine = facts.find((f) => /سرير|bed|sofa|كنبة/i.test(f));

                  return (
                    <div key={rate.rateKey} className="tvlk-rate-table-row">
                      <div className="tvlk-rate-option">
                        <strong>{board}</strong>
                        {bedLine ? <p className="tvlk-rate-bed">{bedLine}</p> : null}
                        <p className={cancel.good ? "good" : "warn"}>
                          {cancel.good ? "✓ " : ""}
                          {cancel.text}
                        </p>
                      </div>
                      <GuestIcons count={guests} />
                      <div className="tvlk-rate-price">
                        <strong>{formatMoneyMinor(perNightMinor, hotel.currency)}</strong>
                        <em>{t("nightNoTax")}</em>
                      </div>
                      <div className="tvlk-rate-qty">
                        {breakfastDeal === rate.rateKey ? (
                          <span className="tvlk-rate-deal">{t("cheapestWithBreakfast")}</span>
                        ) : null}
                        <span>{t("roomTimesN", { n: roomCount })}</span>
                      </div>
                      <button
                        type="button"
                        className="tvlk-rate-select"
                        disabled={Boolean(checkingRateKey)}
                        onClick={() => onBookRate(rate)}
                      >
                        {busy ? t("checkingPrice") : t("chooseRate")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
