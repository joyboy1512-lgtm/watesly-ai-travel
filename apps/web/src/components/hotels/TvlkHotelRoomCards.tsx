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
import { summarizeRateCommentsAr } from "@/lib/hotel-rate-comments";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  checkingRateKey?: string | null;
  onBookRate: (rate: HotelRateOption) => void;
};

type RateChip = "all" | "breakfast" | "freeCancel" | "payHotel";

function occupancyBits(room: HotelRoomOption, t: ReturnType<typeof useShopCopy>["t"]) {
  const o = room.occupancy;
  const bits: string[] = [];
  if (o?.maxPax) bits.push(t("maxGuestsN", { n: o.maxPax }));
  else if (o?.maxAdults) bits.push(t("maxAdultsN", { n: o.maxAdults }));
  if (o?.maxChildren) bits.push(t("maxChildrenN", { n: o.maxChildren }));
  return bits;
}

function cancellationSummary(rate: HotelRateOption) {
  const policies = rate.cancellationPolicies || [];
  if (rate.freeCancellation) {
    const first = policies.find((p) => Number(p.amount) === 0);
    if (first?.from) {
      const deadline = new Date(first.from);
      if (Number.isFinite(deadline.getTime()) && deadline.getTime() <= Date.now()) {
        return { text: "غير قابل للاسترداد الآن", deadline: "انتهت فترة الإلغاء المجاني", good: false };
      }
      return {
        text: "إلغاء مجاني",
        deadline: `حتى ${formatPolicyDate(first.from)} (توقيت الكويت)`,
        good: true,
      };
    }
    return { text: "إلغاء مجاني", deadline: "حسب سياسة الفندق", good: true };
  }
  const first = policies[0];
  if (first?.from) {
    const fee = Number(first.amount);
    const feeLabel = Number.isFinite(fee) && fee > 0 ? ` · رسوم ${fee} ${rate.currency}` : "";
    return {
      text: Number.isFinite(fee) && fee > 0 ? "استرداد جزئي" : "غير قابل للاسترداد",
      deadline: `من تاريخ ${formatPolicyDate(first.from)}${feeLabel}`,
      good: false,
    };
  }
  return { text: "غير قابل للاسترداد", deadline: "لا استرداد", good: false };
}

function taxHint(rate: HotelRateOption) {
  const items = rate.taxes?.items || [];
  if (!items.length) return rate.taxes?.allIncluded ? "شامل الضرائب" : null;
  const extra = items.filter((t) => !t.included && t.amount > 0);
  if (extra.length) {
    const sum = extra.reduce((s, t) => s + t.amount, 0);
    return `+ ${sum} ${extra[0]?.currency || rate.currency} ضرائب غير مشمولة`;
  }
  return "شامل الضرائب";
}

function rateMatchesChip(rate: HotelRateOption, chip: RateChip) {
  if (chip === "all") return true;
  if (chip === "breakfast") return ["BB", "HB", "FB", "AI", "DB"].includes(rate.boardCode);
  if (chip === "freeCancel") return rate.freeCancellation;
  if (chip === "payHotel") return rate.paymentType === "AT_HOTEL";
  return true;
}

function collectRooms(
  hotel: Props["hotel"],
): HotelRoomOption[] {
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

/**
 * Traveloka-style room-type cards: every type stays open, each rate is a
 * full-detail row (board, cancel, pay, leftovers, nightly + stay total).
 */
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
      {
        id: "payHotel" as const,
        label: t("filterPayHotel"),
        count: hotel.matchingRates.filter((r) => r.paymentType === "AT_HOTEL").length,
      },
    ] satisfies Array<{ id: RateChip; label: string; count: number }>
  ).filter((c) => c.id === "all" || c.count > 0);

  if (!rooms.length) {
    return <p className="hint">{t("noMatchingRoomOffers")}</p>;
  }

  return (
    <div className="tvlk-room-list">
      <header className="tvlk-room-list-head">
        <div>
          <h2>{t("availableRoomTypes")}</h2>
          <p>
            {t("roomTypeCount", { n: rooms.length })} · {t("stayOptionCount", { n: hotel.matchingRates.length })} ·{" "}
            {shopNightCount(locale, nights)}
          </p>
        </div>
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
                <em>{c.count}</em>
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {visible.length === 0 ? <p className="hint">{t("noMatchingRoomOffers")}</p> : null}

      {visible.map((room) => {
        const names = translateRoomNameAr(room.name);
        const occ = occupancyBits(room, t);
        const photos = (room.images?.length ? room.images : room.imageUrl ? [room.imageUrl] : []).filter(Boolean);

        return (
          <article key={room.code || room.name} className="tvlk-room-card">
            <div className="tvlk-room-card-top">
              <div className="tvlk-room-photos">
                <HotelMediaImage
                  src={photos[0]}
                  alt={names.ar}
                  className="tvlk-room-photo-main"
                  preferMedium
                  compactEmpty
                />
                {photos.length > 1 ? (
                  <div className="tvlk-room-photo-thumbs">
                    {photos.slice(1, 4).map((src) => (
                      <HotelMediaImage
                        key={src}
                        src={src}
                        alt=""
                        className="tvlk-room-photo-thumb"
                        preferMedium
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="tvlk-room-meta">
                <h3>{names.ar}</h3>
                {names.original ? <small className="tvlk-room-original">{names.original}</small> : null}
                {occ.length ? (
                  <p className="tvlk-room-occ">
                    <span>{t("guestCapacity")}</span>
                    {occ.join(" · ")}
                  </p>
                ) : null}
                {room.facilities?.length ? (
                  <ul className="tvlk-room-facs">
                    {room.facilities.slice(0, 10).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : null}
                {room.description ? <p className="tvlk-room-desc">{room.description}</p> : null}
              </div>
            </div>

            <div className="tvlk-room-rates">
              {room.rates.map((rate) => {
                const totalMinor = rateDisplayMinor(rate, hotel, nights);
                const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                const cancel = cancellationSummary(rate);
                const taxes = taxHint(rate);
                const busy = checkingRateKey === rate.rateKey;
                const pay = normalizePaymentTypeAr(rate.paymentType).ar || "—";
                const notes = summarizeRateCommentsAr(rate.rateComments);
                const board = boardLabelAr(rate.boardCode, rate.boardName);

                return (
                  <div key={rate.rateKey} className="tvlk-rate-row">
                    <div className="tvlk-rate-facts">
                      <strong className="tvlk-rate-board">{board}</strong>
                      <ul>
                        <li className={cancel.good ? "good" : "warn"}>
                          <b>{cancel.text}</b>
                          <span>{cancel.deadline}</span>
                        </li>
                        <li>
                          <b>{pay}</b>
                          <span>
                            {rate.rateType === "BOOKABLE" ? t("readyToBook") : t("needsRecheck")}
                            {rate.allotment != null ? ` · ${t("roomsRemaining", { n: rate.allotment })}` : ""}
                          </span>
                        </li>
                        {rate.promotions?.length
                          ? rate.promotions.slice(0, 2).map((p) => (
                              <li key={p.code || p.name} className="promo">
                                <b>{p.name || p.code || "عرض"}</b>
                                {p.remark ? <span>{p.remark}</span> : null}
                              </li>
                            ))
                          : null}
                        {notes.summaryAr ? (
                          <li>
                            <b>{t("rateNotes")}</b>
                            <span>{notes.summaryAr}</span>
                          </li>
                        ) : null}
                      </ul>
                      {rate.dailyRates && rate.dailyRates.length > 1 ? (
                        <details className="tvlk-rate-daily">
                          <summary>{t("dailyPriceBreakdown")}</summary>
                          <ul>
                            {rate.dailyRates.map((day, i) => (
                              <li key={`${day.date || i}`}>
                                <span>{day.date || `ليلة ${i + 1}`}</span>
                                <em>{day.net != null ? `${day.net} ${rate.currency}` : "—"}</em>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                    <div className="tvlk-rate-price">
                      <small>{t("nightlyPrice")}</small>
                      <strong>{formatMoneyMinor(perNightMinor, hotel.currency)}</strong>
                      <em>
                        {formatMoneyMinor(totalMinor, hotel.currency)} {t("stayTotalLabel")} · {shopNightCount(locale, nights)}
                      </em>
                      {taxes ? <span>{taxes}</span> : <span>{t("cityTaxNotIncl")}</span>}
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
