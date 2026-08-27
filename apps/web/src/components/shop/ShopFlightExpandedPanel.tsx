"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoneyMinor } from "@/lib/format";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  buildFareOptions,
  buildProviderOffers,
  revalidateMockOffer,
  type MockFareOption,
  type MockProviderOffer,
} from "@/lib/flight-fare-mock";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  formatMinutesLabel,
  layoverMinutes,
  stopsLabel,
  type FlightSeg,
} from "@/lib/flight-search";
import type { SelectedLeg } from "@/lib/flight-leg-selection";

export type ExpandedPanelPhase =
  | "idle"
  | "loading"
  | "revalidating"
  | "success"
  | "unavailable"
  | "error";

type Props = {
  trip: ComposedTrip;
  passengers: number;
  cabinClass: string;
  departDate: string;
  returnDate?: string;
  originLabel?: string;
  destinationLabel?: string;
  onClose: () => void;
  onContinueReview: (payload: {
    fare: MockFareOption;
    provider: MockProviderOffer;
  }) => void;
  onRefreshResults: () => void;
};

function SegmentTimeline({
  segs,
  from,
  to,
  fallbackDate,
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
}) {
  if (!segs.length) {
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{from}</strong>
            <p>مغادرة</p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{to}</strong>
            <p>وصول</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-flight-timeline">
      {segs.map((seg, idx) => {
        const segFrom = String(seg.from || (idx === 0 ? from : ""));
        const segTo = String(seg.to || (idx === segs.length - 1 ? to : ""));
        const segDepAt = seg.departAt || seg.departTime || "";
        const segArrAt = seg.arriveAt || seg.arriveTime || "";
        const nextSeg = segs[idx + 1];
        const layover = nextSeg
          ? layoverMinutes(segArrAt, nextSeg.departAt || nextSeg.departTime)
          : null;
        const airline = String(seg.airline || "").slice(0, 2).toUpperCase();
        const logo = airlineLogo(airline);

        return (
          <div key={idx} className="shop-flight-timeline-segment">
            <div className="shop-flight-expanded-seg-head">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="shop-flight-expanded-seg-logo" />
              ) : (
                <div className="shop-ticket-logo-fallback">{airline || "✈"}</div>
              )}
              <div>
                <strong>{seg.airline || airline || "شركة طيران"}</strong>
                <span>
                  {seg.flightNumber ? `رحلة ${seg.flightNumber}` : ""}
                  {seg.aircraft ? ` · ${seg.aircraft}` : ""}
                </span>
              </div>
            </div>
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>
                  {formatDay(segDepAt || seg.date || fallbackDate)} · {formatClock(segDepAt)}
                </strong>
                <p>
                  {segFrom} · مغادرة
                </p>
              </div>
            </div>
            <div className="shop-flight-timeline-line" />
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>{formatClock(segArrAt)}</strong>
                <p>{segTo} · وصول</p>
              </div>
            </div>
            {nextSeg ? (
              <div className="shop-flight-timeline-layover">
                ترانزيت في {segTo}
                {layover ? ` · ${formatMinutesLabel(layover)}` : ""}
                {nextSeg.from && nextSeg.from !== segTo ? " · تغيير مطار" : ""}
                {nextSeg.airline && nextSeg.airline !== seg.airline
                  ? " · تغيير شركة طيران"
                  : ""}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LegSection({
  leg,
  title,
  fallbackDate,
  fromLabel,
  toLabel,
}: {
  leg: SelectedLeg;
  title: string;
  fallbackDate?: string;
  fromLabel?: string;
  toLabel?: string;
}) {
  const logo = airlineLogo(leg.airlineCode);
  return (
    <section className="shop-flight-expanded-leg">
      <header className="shop-flight-expanded-leg-head">
        <div>
          <h3>{title}</h3>
          <p>
            {leg.from} → {leg.to}
            {fromLabel || toLabel ? ` · ${fromLabel || ""} → ${toLabel || ""}` : ""}
          </p>
        </div>
        <div className="shop-flight-expanded-leg-meta">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" />
          ) : (
            <div className="shop-ticket-logo-fallback">{leg.airlineCode || "✈"}</div>
          )}
          <span>
            {stopsLabel(leg.stops)} · {leg.durationLabel}
          </span>
        </div>
      </header>
      <SegmentTimeline
        segs={leg.segments}
        from={leg.from}
        to={leg.to}
        fallbackDate={fallbackDate}
      />
      <footer className="shop-flight-expanded-leg-foot">
        <span>{leg.airlineName}</span>
        <span>{leg.flightNumbers || "—"}</span>
        <span>إجمالي مدة الرحلة {leg.durationLabel}</span>
      </footer>
    </section>
  );
}

export function ShopFlightExpandedPanel({
  trip,
  passengers,
  cabinClass,
  departDate,
  returnDate,
  originLabel,
  destinationLabel,
  onClose,
  onContinueReview,
  onRefreshResults,
}: Props) {
  const [phase, setPhase] = useState<ExpandedPanelPhase>("idle");
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyFareId, setBusyFareId] = useState<string | null>(null);

  const fares = useMemo(() => buildFareOptions(trip, passengers), [trip, passengers]);
  const selectedFare = fares.find((f) => f.id === selectedFareId) || fares[1] || fares[0];
  const providers = useMemo(
    () => (selectedFare ? buildProviderOffers(trip, selectedFare) : []),
    [trip, selectedFare],
  );

  useEffect(() => {
    if (fares.length && !selectedFareId) {
      setSelectedFareId(fares[1]?.id || fares[0]!.id);
    }
  }, [fares, selectedFareId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleContinue(fare: MockFareOption, provider: MockProviderOffer) {
    if (phase === "revalidating" || busyFareId) return;
    setBusyFareId(fare.id);
    setActiveProviderId(provider.id);
    setPhase("revalidating");
    setStatusMessage("");

    try {
      const result = await revalidateMockOffer(trip, fare.id, provider.id, passengers);
      if (!result.ok) {
        setPhase(result.reason);
        setStatusMessage(result.message);
        return;
      }
      setPhase("success");
      setStatusMessage("تم التحقق من السعر بنجاح");
      await new Promise((r) => setTimeout(r, 500));
      onContinueReview({ fare: result.fare, provider: result.provider });
    } catch {
      setPhase("error");
      setStatusMessage("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusyFareId(null);
    }
  }

  const titleRoute = `${trip.outbound.from} ↔ ${trip.outbound.to}`;

  return (
    <div className="shop-flight-expanded-backdrop" onClick={onClose} role="presentation">
      <div
        className="shop-flight-expanded-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-flight-expanded-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shop-flight-expanded-head">
          <div>
            <h2 id="shop-flight-expanded-title">اختيار الرحلة · {titleRoute}</h2>
            <p>
              {formatDay(departDate)}
              {returnDate ? ` – ${formatDay(returnDate)}` : ""}
              {" · "}
              {passengers} مسافر · {cabinLabel(cabinClass)}
              {trip.isMixMatch ? " · تركيبة مخصصة" : ""}
            </p>
          </div>
          <button type="button" className="shop-flight-modal-close" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="shop-flight-expanded-body">
          <LegSection
            leg={trip.outbound}
            title="رحلة الذهاب"
            fallbackDate={departDate}
            fromLabel={originLabel}
            toLabel={destinationLabel}
          />
          {trip.return ? (
            <LegSection
              leg={trip.return}
              title="رحلة العودة"
              fallbackDate={returnDate}
              fromLabel={destinationLabel}
              toLabel={originLabel}
            />
          ) : null}

          <section className="shop-flight-expanded-fares">
            <h3>خيارات الأسعار</h3>
            <div className="shop-flight-fare-grid">
              {fares.map((fare) => (
                <article
                  key={fare.id}
                  className={`shop-flight-fare-card${
                    selectedFare?.id === fare.id ? " selected" : ""
                  }`}
                >
                  <header>
                    <strong>{fare.labelAr}</strong>
                    <span>{fare.label}</span>
                  </header>
                  <p className="shop-flight-fare-price">
                    {formatMoneyMinor(fare.totalPriceMinor, trip.currency)}
                  </p>
                  {passengers > 1 ? (
                    <small>
                      {formatMoneyMinor(fare.perPassengerMinor, trip.currency)} / مسافر
                    </small>
                  ) : null}
                  <ul className="shop-flight-fare-features">
                    <li>🎒 {fare.cabinBag}</li>
                    <li>🧳 {fare.checkedBag}</li>
                    <li>{fare.refundable ? "✓" : "✗"} {fare.refundableLabel}</li>
                    <li>تعديل: {fare.changeFee}</li>
                    <li>إلغاء: {fare.cancelFee}</li>
                    <li>مقعد: {fare.seatSelection}</li>
                    <li>وجبات: {fare.meals}</li>
                  </ul>
                  <button
                    type="button"
                    className="shop-flight-fare-select-btn"
                    onClick={() => setSelectedFareId(fare.id)}
                  >
                    {selectedFare?.id === fare.id ? "محدّد" : "اختيار"}
                  </button>
                  <button
                    type="button"
                    className="shop-flight-fare-continue-btn"
                    disabled={Boolean(busyFareId)}
                    onClick={() => {
                      const prov = buildProviderOffers(trip, fare)[0];
                      if (prov) void handleContinue(fare, prov);
                    }}
                  >
                    {busyFareId === fare.id ? (
                      <span className="shop-flight-btn-loading">
                        <span className="shop-flight-spinner small" aria-hidden /> جاري التحقق…
                      </span>
                    ) : (
                      "متابعة بهذا السعر"
                    )}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {selectedFare && providers.length ? (
            <section className="shop-flight-expanded-providers">
              <h3>عروض المزوّدين (من الأرخص)</h3>
              <div className="shop-flight-provider-list">
                {providers.map((prov) => (
                  <div key={prov.id} className="shop-flight-provider-row">
                    <div>
                      <strong>{prov.providerName}</strong>
                      <span>{selectedFare.labelAr}</span>
                    </div>
                    <strong>{formatMoneyMinor(prov.totalPriceMinor, prov.currency)}</strong>
                    <button
                      type="button"
                      className="shop-flight-provider-btn"
                      disabled={Boolean(busyFareId)}
                      onClick={() => void handleContinue(selectedFare, prov)}
                    >
                      {busyFareId && activeProviderId === prov.id ? (
                        <span className="shop-flight-btn-loading">
                          <span className="shop-flight-spinner small" aria-hidden />
                        </span>
                      ) : (
                        "متابعة"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {phase === "success" ? (
            <div className="shop-flight-expanded-status success" role="status">
              {statusMessage}
            </div>
          ) : null}
          {phase === "unavailable" ? (
            <div className="shop-flight-expanded-status warn" role="alert">
              <p>{statusMessage || "السعر لم يعد متاحًا"}</p>
              <button type="button" onClick={onRefreshResults}>
                تحديث النتائج
              </button>
            </div>
          ) : null}
          {phase === "error" ? (
            <div className="shop-flight-expanded-status error" role="alert">
              <p>{statusMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  setStatusMessage("");
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : null}
        </div>

        <footer className="shop-flight-expanded-foot">
          <strong>{formatMoneyMinor(trip.totalPriceMinor, trip.currency)}</strong>
          <span>السعر الأساسي للتركيبة</span>
          <button type="button" className="shop-flight-expanded-close-btn" onClick={onClose}>
            إغلاق التفاصيل
          </button>
        </footer>
      </div>
    </div>
  );
}
