"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { boardLabelAr, normalizePaymentTypeAr, translateRoomNameAr } from "@watesly-travel/shared";
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
  classifyRoomFact,
  guestCountForRate,
  looksLikeBed,
  pickRoomFacts,
  VISIBLE_RATE_LIMIT,
  type RoomFactKind,
} from "@/lib/hotel-room-table";
import { formatMoneyMinor } from "@/lib/format";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { HotelMediaImage } from "@/components/hotels/HotelMediaImage";
import { TvlkRoomDetailsPanel } from "@/components/hotels/TvlkRoomDetailsPanel";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  neededRooms?: number;
  checkingRateKey?: string | null;
  onBookRate: (rate: HotelRateOption) => void;
  onBookRates?: (rates: HotelRateOption[]) => void;
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
      <path
        d="M3.1 8.2 6.5 11.5 12.9 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FactIcon({ kind }: { kind: RoomFactKind }) {
  const common = { viewBox: "0 0 16 16", width: 14, height: 14, "aria-hidden": true as const };
  if (kind === "size") {
    return (
      <svg {...common}>
        <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  if (kind === "bed") {
    return (
      <svg {...common}>
        <path
          d="M2 11.4V6.6A1.6 1.6 0 0 1 3.6 5h4.2A2.2 2.2 0 0 1 10 7.2V11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M2 11.4h12M10 7.4h2.4A1.6 1.6 0 0 1 14 9v2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  if (kind === "access") {
    return (
      <svg {...common}>
        <circle cx="8" cy="3.4" r="1.4" fill="currentColor" />
        <path
          d="M6.2 6.4h3.1l1.6 6.2M5.2 13.2l1.6-5.2M4.4 9.2h6.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "ac") {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="12" height="7.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4 12.8h8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "wifi") {
    return (
      <svg {...common}>
        <path
          d="M3 7.1a7 7 0 0 1 10 0M5.1 9.2a4.2 4.2 0 0 1 5.8 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="8" cy="12" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/** Traveloka-style room + rate table: photo, options, terms, nightly price, Choose. */
export function TvlkHotelRoomCards({
  hotel,
  nights,
  neededRooms = 1,
  checkingRateKey,
  onBookRate,
  onBookRates,
}: Props) {
  const { t } = useShopCopy();
  const rooms = useMemo(() => collectRooms(hotel), [hotel]);
  const slots = Math.max(1, neededRooms);
  const mixMatch = slots > 1;
  const [chip, setChip] = useState<RateChip>("all");
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [expandedRates, setExpandedRates] = useState<Record<string, boolean>>({});
  const [picks, setPicks] = useState<Array<HotelRateOption | null>>(() =>
    Array.from({ length: slots }, () => null),
  );
  const [activeSlot, setActiveSlot] = useState(0);
  const picksRef = useRef(picks);
  const activeSlotRef = useRef(activeSlot);

  useEffect(() => {
    const empty = Array.from({ length: slots }, () => null);
    setPicks(empty);
    setActiveSlot(0);
    picksRef.current = empty;
    activeSlotRef.current = 0;
  }, [slots, hotel.id]);

  const slotPicks = picks.length === slots ? picks : Array.from({ length: slots }, () => null);
  picksRef.current = slotPicks;
  activeSlotRef.current = activeSlot;
  const pickedRates = slotPicks.filter((p): p is HotelRateOption => Boolean(p));
  const pickTotalMinor = pickedRates.reduce(
    (sum, rate) => sum + rateDisplayMinor(rate, hotel, nights),
    0,
  );

  function assignRate(rate: HotelRateOption) {
    if (!mixMatch) {
      onBookRate(rate);
      return;
    }
    const current =
      picksRef.current.length === slots
        ? picksRef.current.slice()
        : Array.from({ length: slots }, () => null);
    let idx = activeSlotRef.current;
    if (idx < 0 || idx >= slots) {
      idx = current.findIndex((p) => !p);
    }
    if (idx < 0 || idx >= slots) idx = 0;
    current[idx] = rate;
    picksRef.current = current;
    const laterEmpty = current.findIndex((p, i) => i > idx && !p);
    const anyEmpty = current.findIndex((p) => !p);
    const nextSlot = laterEmpty >= 0 ? laterEmpty : anyEmpty >= 0 ? anyEmpty : idx;
    activeSlotRef.current = nextSlot;
    setPicks(current);
    setActiveSlot(nextSlot);
  }

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

      {mixMatch ? (
        <div className="tvlk-room-pick-bar">
          <p>{t("selectRoomSlotOf", { n: activeSlot + 1, total: slots })}</p>
          <ol>
            {slotPicks.map((pick, i) => {
              const names = pick ? translateRoomNameAr(pick.roomName) : null;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={activeSlot === i ? "on" : undefined}
                    onClick={() => setActiveSlot(i)}
                  >
                    <strong>{t("chooseRoomSlot", { n: i + 1 })}</strong>
                    <span>
                      {pick
                        ? `${names?.ar || pick.roomName} · ${boardLabelAr(pick.boardCode, pick.boardName)}`
                        : t("selectThisRoom")}
                    </span>
                  </button>
                  {pick ? (
                    <button
                      type="button"
                      className="tvlk-room-pick-clear"
                      onClick={() => {
                        setPicks((prev) => prev.map((p, idx) => (idx === i ? null : p)));
                        setActiveSlot(i);
                      }}
                    >
                      {t("changeRoomPick")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <div className="tvlk-room-pick-total">
            <span>{t("roomsPickedOf", { picked: pickedRates.length, total: slots })}</span>
            {pickedRates.length ? (
              <strong>{formatMoneyMinor(pickTotalMinor, hotel.currency)}</strong>
            ) : null}
            <button
              type="button"
              className="tvlk-rate-select"
              disabled={pickedRates.length !== slots || Boolean(checkingRateKey)}
              onClick={() => (onBookRates || ((rates) => onBookRate(rates[0]!)))(pickedRates)}
            >
              {t("continuePickedRooms")}
            </button>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? <p className="hint">{t("noMatchingRoomOffers")}</p> : null}

      {visible.map((room) => {
        const names = translateRoomNameAr(room.name);
        const photo = room.imageUrl || room.images?.[0];
        const facts = pickRoomFacts(room);
        const roomId = room.code || room.name;
        const breakfastDeal = cheapestBreakfastRateKey(room.rates);
        const ratesOpen = Boolean(expandedRates[roomId]);
        const visibleRates = ratesOpen ? room.rates : room.rates.slice(0, VISIBLE_RATE_LIMIT);
        const hiddenCount = Math.max(0, room.rates.length - VISIBLE_RATE_LIMIT);
        const cheapest = room.rates[0];
        const cheapestStay = cheapest ? rateDisplayMinor(cheapest, hotel, nights) : hotel.displayFromMinor;
        const cheapestMinor = nights > 0 ? Math.round(cheapestStay / nights) : cheapestStay;

        return (
          <article key={roomId} id={`tvlk-room-${roomId}`} className="tvlk-room-card tvlk-room-table-card">
            <h3 className="tvlk-room-title">{names.ar}</h3>
            <div className="tvlk-room-table-grid">
              <aside className="tvlk-room-aside">
                <button
                  type="button"
                  className="tvlk-room-photo-btn"
                  onClick={() => setOpenPanel(roomId)}
                  aria-label={t("seeRoomDetails")}
                >
                  <HotelMediaImage
                    src={photo}
                    alt={names.ar}
                    className="tvlk-room-photo-main"
                    preferMedium
                    compactEmpty
                  />
                </button>
                {facts.length ? (
                  <ul className="tvlk-room-facts">
                    {facts.map((fact) => (
                      <li key={fact}>
                        <FactIcon kind={classifyRoomFact(fact)} />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="tvlk-room-details-link"
                  onClick={() => setOpenPanel(roomId)}
                >
                  {t("seeRoomDetails")}
                </button>
              </aside>

              <div className="tvlk-room-table-wrap">
                <div className="tvlk-room-thead" aria-hidden>
                  <span>{t("roomOptionCol")}</span>
                  <span>{t("termsStatusCol")}</span>
                  <span>{t("guestsCol")}</span>
                  <span>{t("pricePerRoomNight")}</span>
                  <span>{t("roomsCountCol")}</span>
                  <span />
                </div>
                {visibleRates.map((rate) => {
                  const totalMinor = rateDisplayMinor(rate, hotel, nights);
                  const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                  const cancel = cancellationSummary(rate);
                  const busy = checkingRateKey === rate.rateKey;
                  const board = boardLabelAr(rate.boardCode, rate.boardName);
                  const guests = guestCountForRate(rate, room);
                  const roomCount = Math.max(1, Number(rate.rooms || 1));
                  const bedLine = facts.find(looksLikeBed);
                  const pay = normalizePaymentTypeAr(rate.paymentType).ar;
                  const picked = mixMatch && slotPicks.some((p) => p?.rateKey === rate.rateKey);

                  return (
                    <div
                      key={rate.rateKey}
                      className={`tvlk-rate-table-row${picked ? " is-picked" : ""}`}
                    >
                      <div className="tvlk-rate-option">
                        <strong>{board}</strong>
                        {bedLine ? <p className="tvlk-rate-bed">{bedLine}</p> : null}
                      </div>
                      <div className="tvlk-rate-terms">
                        <p className={cancel.good ? "good" : "warn"}>
                          {cancel.good ? <CheckIcon /> : null}
                          <span>{cancel.text}</span>
                        </p>
                        {pay ? <p className="tvlk-rate-pay">{pay}</p> : null}
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
                        onClick={() => assignRate(rate)}
                      >
                        {busy ? t("checkingPrice") : picked ? t("roomPickedShort") : t("chooseRate")}
                      </button>
                    </div>
                  );
                })}
                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    className="tvlk-rate-more"
                    onClick={() =>
                      setExpandedRates((prev) => ({ ...prev, [roomId]: !ratesOpen }))
                    }
                  >
                    {ratesOpen ? t("showLessRates") : t("showMoreRates", { n: hiddenCount })}
                  </button>
                ) : null}
              </div>
            </div>
            {openPanel === roomId ? (
              <TvlkRoomDetailsPanel
                room={room}
                hotel={hotel}
                fromMinor={cheapestMinor}
                onClose={() => setOpenPanel(null)}
                onSeeOptions={() => {
                  setOpenPanel(null);
                  document
                    .getElementById(`tvlk-room-${roomId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
