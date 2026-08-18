"use client";

import type { HotelRateOption, HotelRoomOption } from "@/lib/hotel-search";
import { formatPolicyDate } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";

type Props = {
  rooms: HotelRoomOption[];
  rateOptions?: HotelRateOption[];
  currency: string;
  nights: number;
  selectedRateKey?: string;
  onSelectRate?: (rate: HotelRateOption) => void;
  showAll?: boolean;
};

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "ادفع في الفندق";
  if (type === "AT_WEB") return "ادفع أونلاين";
  return type || "—";
}

export function HotelRateMatrix({
  rooms,
  rateOptions,
  currency,
  nights,
  selectedRateKey,
  onSelectRate,
  showAll = true,
}: Props) {
  const list = showAll
    ? rooms
    : rooms.map((room) => ({
        ...room,
        rates: room.rates.slice(0, 3),
      }));

  if (!list.length) {
    return <p className="hint">لا توجد غرف أو تعرفات متاحة.</p>;
  }

  return (
    <div className="hotel-rate-matrix">
      {rateOptions && rateOptions.length > 0 ? (
        <p className="hotel-rate-summary">
          {rateOptions.length} تعرفة · {rooms.length} نوع غرفة · {nights}{" "}
          {nights === 1 ? "ليلة" : "ليالي"}
        </p>
      ) : null}

      {list.map((room) => (
        <section key={room.code || room.name} className="hotel-rate-room">
          <header className="hotel-rate-room-head">
            <h4>{room.name}</h4>
            <span className="hotel-rate-room-code">{room.code}</span>
          </header>

          <div className="hotel-rate-table-wrap">
            <table className="hotel-rate-table">
              <thead>
                <tr>
                  <th>الوجبات</th>
                  <th>السعر</th>
                  <th>الدفع</th>
                  <th>الإلغاء</th>
                  <th>النوع</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {room.rates.map((rate) => {
                  const selected = selectedRateKey === rate.rateKey;
                  const totalMinor = Math.round(
                    rate.net *
                      (currency === "KWD" || currency === "BHD" || currency === "OMR"
                        ? 1000
                        : 100),
                  );
                  return (
                    <tr key={rate.rateKey} className={selected ? "selected" : undefined}>
                      <td>
                        <strong>{rate.boardName}</strong>
                        <small>{rate.boardCode}</small>
                        {rate.promotions?.length ? (
                          <ul className="hotel-rate-promos">
                            {rate.promotions.map((p, i) => (
                              <li key={i}>{p.name || p.remark || p.code}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td>
                        <strong>{formatMoneyMinor(totalMinor, currency)}</strong>
                        <small>
                          {formatMoneyMinor(
                            Math.round(totalMinor / Math.max(1, nights)),
                            currency,
                          )}{" "}
                          / ليلة
                        </small>
                        {rate.taxes?.items?.length ? (
                          <small className="hotel-rate-tax">
                            {rate.taxes.allIncluded ? "شامل الضرائب" : "+ ضرائب"}
                          </small>
                        ) : null}
                      </td>
                      <td>{paymentLabel(rate.paymentType)}</td>
                      <td>
                        {rate.freeCancellation ? (
                          <span className="tag good">إلغاء مجاني*</span>
                        ) : (
                          <span className="tag warn">غير قابل للاسترداد</span>
                        )}
                        {rate.cancellationPolicies?.length ? (
                          <ul className="hotel-rate-policies">
                            {rate.cancellationPolicies.map((p, i) => (
                              <li key={i}>
                                {formatMoneyMinor(
                                  Math.round(
                                    p.amount *
                                      (currency === "KWD" ||
                                      currency === "BHD" ||
                                      currency === "OMR"
                                        ? 1000
                                        : 100),
                                  ),
                                  p.currency || currency,
                                )}{" "}
                                من {formatPolicyDate(p.from)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td>
                        <span className={`tag ${rate.rateType === "BOOKABLE" ? "good" : "warn"}`}>
                          {rate.rateType === "BOOKABLE" ? "جاهز" : "يحتاج تحقق"}
                        </span>
                        {rate.allotment != null ? (
                          <small>{rate.allotment} متاح</small>
                        ) : null}
                      </td>
                      <td>
                        {onSelectRate ? (
                          <button
                            type="button"
                            className={`btn hotel-rate-pick${selected ? " on" : ""}`}
                            onClick={() => onSelectRate(rate)}
                          >
                            {selected ? "مختار" : "اختر"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
