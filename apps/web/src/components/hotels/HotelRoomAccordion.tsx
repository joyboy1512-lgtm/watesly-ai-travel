"use client";

import { useMemo, useState } from "react";
import {
  formatPolicyDate,
  groupRatesIntoRooms,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
  type HotelRoomOption,
} from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  onBookRate: (rate: HotelRateOption) => void;
};

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "ادفع في الفندق";
  if (type === "AT_WEB") return "ادفع أونلاين";
  return type || "—";
}

function cancellationSummary(rate: HotelRateOption, currency: string) {
  if (rate.freeCancellation) {
    const first = rate.cancellationPolicies.find((p) => Number(p.amount) === 0);
    if (first?.from) {
      return { text: "إلغاء مجاني", deadline: `حتى ${formatPolicyDate(first.from)}`, good: true };
    }
    return { text: "إلغاء مجاني*", deadline: "حسب سياسة الفندق", good: true };
  }
  const first = rate.cancellationPolicies[0];
  if (first?.from) {
    return {
      text: "غير قابل للاسترداد",
      deadline: `من ${formatPolicyDate(first.from)}`,
      good: false,
    };
  }
  return { text: "غير قابل للاسترداد", deadline: "لا استرداد", good: false };
}

export function HotelRoomAccordion({ hotel, nights, onBookRate }: Props) {
  const rooms = useMemo(() => {
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
  }, [hotel, hotel.matchingRates, hotel.details.rooms]);

  const [openCode, setOpenCode] = useState<string | null>(rooms[0]?.code || null);

  if (!rooms.length) {
    return <p className="hint">لا توجد غرف مطابقة للفلاتر الحالية.</p>;
  }

  return (
    <div className="hotel-room-accordion">
      <header className="hotel-room-accordion-head">
        <h2>اختر نوع الغرفة</h2>
        <p>
          {rooms.length} {rooms.length === 1 ? "نوع" : "أنواع"} ·{" "}
          {hotel.matchingRates.length}{" "}
          {hotel.matchingRates.length === 1 ? "سعر" : "أسعار"} · {nights}{" "}
          {nights === 1 ? "ليلة" : "ليالي"}
        </p>
      </header>

      {rooms.map((room) => {
        const open = openCode === room.code;
        const cheapest = room.rates[0];
        const fromMinor = cheapest
          ? rateDisplayMinor(cheapest, hotel, nights)
          : hotel.displayFromMinor;
        const perNight = nights > 0 ? Math.round(fromMinor / nights) : fromMinor;

        return (
          <section
            key={room.code || room.name}
            className={`hotel-room-panel${open ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="hotel-room-panel-toggle"
              aria-expanded={open}
              onClick={() => setOpenCode(open ? null : room.code)}
            >
              {room.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.imageUrl} alt="" className="hotel-room-thumb" />
              ) : null}
              <div className="hotel-room-panel-title">
                <strong>{room.name}</strong>
                <span>
                  {room.rates.length}{" "}
                  {room.rates.length === 1 ? "خيار إقامة" : "خيارات إقامة"}
                </span>
                {room.facilities?.length ? (
                  <em>{room.facilities.slice(0, 3).join(" · ")}</em>
                ) : null}
              </div>
              <div className="hotel-room-panel-from">
                <small>يبدأ من</small>
                <strong>{formatMoneyMinor(perNight, hotel.currency)}</strong>
                <em>/ ليلة</em>
              </div>
              <span className="hotel-room-panel-chevron" aria-hidden="true">
                {open ? "▴" : "▾"}
              </span>
            </button>

            {open ? (
              <div className="hotel-room-panel-body">
                {room.rates.map((rate: HotelRateOption) => {
                  const totalMinor = rateDisplayMinor(rate, hotel, nights);
                  const perNightMinor =
                    nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                  const cancel = cancellationSummary(rate, hotel.currency);

                  return (
                    <article key={rate.rateKey} className="hotel-rate-row">
                      <div className="hotel-rate-col meal">
                        <strong>{rate.boardName}</strong>
                        <small>{rate.boardCode}</small>
                      </div>
                      <div className={`hotel-rate-col cancel ${cancel.good ? "good" : "warn"}`}>
                        <strong>{cancel.text}</strong>
                        <small>{cancel.deadline}</small>
                      </div>
                      <div className="hotel-rate-col pay">
                        <strong>{paymentLabel(rate.paymentType)}</strong>
                        <small>
                          {rate.rateType === "BOOKABLE" ? "جاهز للحجز" : "يحتاج تحقق"}
                        </small>
                      </div>
                      <div className="hotel-rate-col price">
                        <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
                        <small>
                          {formatMoneyMinor(perNightMinor, hotel.currency)} / ليلة · {nights}{" "}
                          {nights === 1 ? "ليلة" : "ليالي"}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn hotel-rate-book-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookRate(rate);
                        }}
                      >
                        احجز
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
