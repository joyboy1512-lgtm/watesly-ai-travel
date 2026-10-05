"use client";

import { useMemo, useState } from "react";
import {
  normalizePaymentTypeAr,
  translateRoomNameAr,
} from "@watesly-travel/shared";
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
  shopStyle?: boolean;
  onBookRate: (rate: HotelRateOption) => void;
};

function paymentLabel(type?: string) {
  return normalizePaymentTypeAr(type).ar || "—";
}

function occupancyLabel(room: HotelRoomOption) {
  const o = room.occupancy;
  if (!o) return null;
  const parts: string[] = [];
  if (o.maxAdults) parts.push(`حتى ${o.maxAdults} بالغ`);
  if (o.maxChildren) parts.push(`${o.maxChildren} طفل`);
  if (!parts.length && o.maxPax) parts.push(`حتى ${o.maxPax} نزيل`);
  return parts.length ? parts.join(" · ") : null;
}

function cancellationSummary(rate: HotelRateOption) {
  if (rate.freeCancellation) {
    const first = rate.cancellationPolicies.find((p) => Number(p.amount) === 0);
    if (first?.from) {
      const deadline = new Date(first.from);
      const now = Date.now();
      if (Number.isFinite(deadline.getTime()) && deadline.getTime() <= now) {
        return {
          text: "غير قابل للاسترداد الآن",
          deadline: "انتهت فترة الإلغاء المجاني",
          good: false,
        };
      }
      return {
        text: "إلغاء مجاني",
        deadline: `حتى ${formatPolicyDate(first.from)} (توقيت الكويت)`,
        good: true,
      };
    }
    return { text: "إلغاء مجاني*", deadline: "حسب سياسة الفندق", good: true };
  }
  const first = rate.cancellationPolicies[0];
  if (first?.from) {
    const fee = Number(first.amount);
    const feeLabel =
      Number.isFinite(fee) && fee > 0
        ? ` · رسوم ${fee} ${rate.currency}`
        : "";
    const partial = Number.isFinite(fee) && fee > 0;
    return {
      text: partial ? "استرداد جزئي" : "غير قابل للاسترداد",
      deadline: `من تاريخ ${formatPolicyDate(first.from)}${feeLabel}`,
      good: false,
    };
  }
  return { text: "غير قابل للاسترداد", deadline: "لا استرداد", good: false };
}

function nightlyHint(
  rate: HotelRateOption,
  nights: number,
  perNightMinor: number,
  currency: string,
  locale: "ar" | "en",
) {
  const daily = rate.dailyRates?.filter((d) => d.net != null) || [];
  if (daily.length) {
    const first = daily[0];
    const label = first?.date ? `ليلة ${first.date}` : "لليلة الأولى";
    return `${first?.net} ${rate.currency} ${label}`;
  }
  return `${formatMoneyMinor(perNightMinor, currency)} / ${locale === "en" ? "night" : "ليلة"} · ${shopNightCount(locale, nights)}`;
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

export function HotelRoomAccordion({
  hotel,
  nights,
  checkingRateKey,
  shopStyle,
  onBookRate,
}: Props) {
  const { t, locale } = useShopCopy();
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
    <div className={`hotel-room-accordion${shopStyle ? " hotel-room-accordion-shop" : ""}`}>
      <header className="hotel-room-accordion-head">
        <h2>اختر نوع الغرفة</h2>
        <p>
          {rooms.length} {rooms.length === 1 ? "نوع" : "أنواع"} · {hotel.matchingRates.length}{" "}
          {hotel.matchingRates.length === 1 ? t("priceOne") : t("prices")} · {shopNightCount(locale, nights)}
        </p>
      </header>

      {rooms.map((room) => {
        const open = openCode === room.code;
        const cheapest = room.rates[0];
        const fromMinor = cheapest ? rateDisplayMinor(cheapest, hotel, nights) : hotel.displayFromMinor;
        const perNight = nights > 0 ? Math.round(fromMinor / nights) : fromMinor;
        const occ = occupancyLabel(room);

        return (
          <section
            key={room.code || room.name}
            className={`hotel-room-panel${open ? " is-open" : ""}${shopStyle && open ? " is-open-shop" : ""}`}
          >
            <button
              type="button"
              className="hotel-room-panel-toggle"
              aria-expanded={open}
              onClick={() => setOpenCode(open ? null : room.code)}
            >
              <HotelMediaImage
                src={room.imageUrl}
                alt=""
                className="hotel-room-thumb"
                preferMedium
                compactEmpty
              />
              <div className="hotel-room-panel-title">
                <strong>{translateRoomNameAr(room.name).ar}</strong>
                {translateRoomNameAr(room.name).original ? (
                  <small className="hotel-room-original-name">
                    {translateRoomNameAr(room.name).original}
                  </small>
                ) : null}
                <span>
                  {room.rates.length} {room.rates.length === 1 ? "خيار إقامة" : "خيارات إقامة"}
                  {occ ? ` · ${occ}` : ""}
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
                {room.description ? <p className="hotel-room-desc">{room.description}</p> : null}
                {room.images && room.images.length > 1 ? (
                  <div className="hotel-room-gallery">
                    {room.images.slice(0, 6).map((src) => (
                      <HotelMediaImage
                        key={src}
                        src={src}
                        alt=""
                        className="hotel-room-gallery-item"
                        preferMedium
                      />
                    ))}
                  </div>
                ) : null}
                {room.facilities?.length ? (
                  <ul className="hotel-room-fac-chips">
                    {room.facilities.slice(0, 8).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : null}
                {room.rates.map((rate: HotelRateOption) => {
                  const totalMinor = rateDisplayMinor(rate, hotel, nights);
                  const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
                  const cancel = cancellationSummary(rate);
                  const taxes = taxHint(rate);
                  const busy = checkingRateKey === rate.rateKey;

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
                          {rate.allotment != null ? ` · متبقي ${rate.allotment}` : ""}
                        </small>
                      </div>
                      <div className="hotel-rate-col price">
                        <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
                        <small>{nightlyHint(rate, nights, perNightMinor, hotel.currency, locale)}</small>
                        {taxes ? <small>{taxes}</small> : null}
                        {rate.dailyRates && rate.dailyRates.length > 1 ? (
                          <details className="hotel-rate-daily">
                            <summary>تفصيل السعر اليومي</summary>
                            <ul>
                              {rate.dailyRates.map((day, i) => (
                                <li key={`${day.date || i}`}>
                                  <span>{day.date || `ليلة ${i + 1}`}</span>
                                  <em>
                                    {day.net != null
                                      ? `${day.net} ${rate.currency}`
                                      : "—"}
                                  </em>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={`btn hotel-rate-book-btn${shopStyle ? " hotel-rate-book-btn-shop" : ""}`}
                        disabled={Boolean(checkingRateKey)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookRate(rate);
                        }}
                      >
                        {busy ? "جاري إعادة التحقق من السعر…" : "احجز"}
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
