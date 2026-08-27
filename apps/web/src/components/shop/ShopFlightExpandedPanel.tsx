"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoneyMinor } from "@/lib/format";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  buildFareOptions,
  buildProviderOffers,
  computePriceBreakdown,
  revalidateMockOffer,
  type MockFareOption,
  type MockProviderOffer,
} from "@/lib/flight-fare-mock";
import { airlineNameAr } from "@/lib/flight-airlines";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  formatMinutesLabel,
  layoverMinutes,
  segmentAirlineCode,
  stopsLabel,
  type FlightSeg,
} from "@/lib/flight-search";
import type { SelectedLeg } from "@/lib/flight-leg-selection";

export type ExpandedPanelPhase =
  | "idle"
  | "revalidating"
  | "success"
  | "price_changed"
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
  packageCode,
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
  packageCode: string;
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
        const code = segmentAirlineCode(seg, packageCode);
        const logo = airlineLogo(code, 64);
        const name = airlineNameAr(code, seg.airline);

        return (
          <div key={idx} className="shop-flight-timeline-segment">
            <div className="shop-flight-expanded-seg-head">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={name} className="shop-flight-expanded-seg-logo" width={32} height={32} />
              ) : (
                <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
              )}
              <div>
                <strong>{name}</strong>
                <span>
                  {seg.flightNumber ? `رحلة ${seg.flightNumber}` : code}
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
                <p>{segFrom} · مغادرة</p>
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
  packageCode,
}: {
  leg: SelectedLeg;
  title: string;
  fallbackDate?: string;
  packageCode: string;
}) {
  const logo = airlineLogo(leg.airlineCode, 64);
  const bag = leg.baggage;
  return (
    <section className="shop-flight-expanded-leg">
      <header className="shop-flight-expanded-leg-head">
        <div>
          <h3>{title}</h3>
          <p>
            {leg.from} → {leg.to}
          </p>
        </div>
        <div className="shop-flight-expanded-leg-meta">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={leg.airlineName} width={36} height={36} />
          ) : (
            <div className="shop-ticket-logo-fallback">{leg.airlineCode || "✈"}</div>
          )}
          <span>
            {leg.airlineName} · {stopsLabel(leg.stops)} · {leg.durationLabel}
          </span>
        </div>
      </header>
      <SegmentTimeline
        segs={leg.segments}
        from={leg.from}
        to={leg.to}
        fallbackDate={fallbackDate}
        packageCode={packageCode}
      />
      <ul className="shop-flight-leg-baggage">
        <li>🎒 {bag.cabin || bag.personal || "حقيبة مقصورة حسب الفئة"}</li>
        <li>🧳 {bag.checked || "الأمتعة المسجّلة حسب الفئة المختارة"}</li>
      </ul>
      <footer className="shop-flight-expanded-leg-foot">
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
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmedPriceMinor, setConfirmedPriceMinor] = useState<number | null>(null);
  const [validatedOffer, setValidatedOffer] = useState<{
    fare: MockFareOption;
    provider: MockProviderOffer;
  } | null>(null);

  const packageCode = trip.outbound.airlineCode;
  const fares = useMemo(() => buildFareOptions(trip, passengers), [trip, passengers]);
  const selectedFare = fares.find((f) => f.id === selectedFareId) || fares[1] || fares[0];
  const providers = useMemo(
    () => (selectedFare ? buildProviderOffers(trip, selectedFare) : []),
    [trip, selectedFare],
  );
  const selectedProvider =
    providers.find((p) => p.id === selectedProviderId) || providers[0] || null;

  const footerBreakdown = useMemo(() => {
    if (!selectedProvider) return null;
    return computePriceBreakdown(selectedProvider.totalPriceMinor, trip.currency);
  }, [selectedProvider, trip.currency]);

  useEffect(() => {
    if (fares.length && !selectedFareId) {
      setSelectedFareId(fares[1]?.id || fares[0]!.id);
    }
  }, [fares, selectedFareId]);

  useEffect(() => {
    if (providers.length) {
      setSelectedProviderId((prev) =>
        prev && providers.some((p) => p.id === prev) ? prev : providers[0]!.id,
      );
    }
  }, [providers]);

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

  async function handleContinue() {
    if (!selectedFare || !selectedProvider || busy) return;
    setBusy(true);
    setPhase("revalidating");
    setStatusMessage("");

    try {
      const result = await revalidateMockOffer(
        trip,
        selectedFare.id,
        selectedProvider.id,
        passengers,
      );
      if (!result.ok) {
        setPhase(result.reason);
        setStatusMessage(result.message);
        return;
      }
      if (result.priceChanged) {
        setPhase("price_changed");
        setConfirmedPriceMinor(result.provider.totalPriceMinor);
        setValidatedOffer({ fare: result.fare, provider: result.provider });
        setStatusMessage(
          `تغيّر السعر من ${formatMoneyMinor(result.previousTotalMinor, trip.currency)} إلى ${formatMoneyMinor(result.provider.totalPriceMinor, trip.currency)}`,
        );
        return;
      }
      setPhase("success");
      setStatusMessage("تم التحقق من السعر بنجاح");
      await new Promise((r) => setTimeout(r, 450));
      onContinueReview({ fare: result.fare, provider: result.provider });
    } catch {
      setPhase("error");
      setStatusMessage("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptPriceChange() {
    if (!validatedOffer) return;
    setBusy(true);
    setPhase("revalidating");
    await new Promise((r) => setTimeout(r, 400));
    onContinueReview(validatedOffer);
    setBusy(false);
  }

  const titleRoute = `${trip.outbound.from} ↔ ${trip.outbound.to}`;

  return (
    <div className="shop-flight-expanded-backdrop" onClick={onClose} role="presentation">
      <div
        className="shop-flight-expanded-panel has-sticky-foot"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-flight-expanded-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shop-flight-expanded-head">
          <div>
            <h2 id="shop-flight-expanded-title">تفاصيل الرحلة · {titleRoute}</h2>
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
            packageCode={packageCode}
          />
          {trip.return ? (
            <LegSection
              leg={trip.return}
              title="رحلة العودة"
              fallbackDate={returnDate}
              packageCode={trip.return.airlineCode || packageCode}
            />
          ) : null}

          <section className="shop-flight-expanded-fares">
            <h3>اختر فئة السعر</h3>
            <p className="shop-flight-fares-hint">
              اقتصادي / قياسي / مرن — مع شروط التعديل والإلغاء لكل فئة
            </p>
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
                    <small className="shop-flight-fare-per-pax">
                      {formatMoneyMinor(fare.perPassengerMinor, trip.currency)} / مسافر
                    </small>
                  ) : (
                    <small className="shop-flight-fare-per-pax">إجمالي {passengers} مسافر</small>
                  )}
                  <ul className="shop-flight-fare-features">
                    <li>🎒 {fare.cabinBag}</li>
                    <li>🧳 {fare.checkedBag}</li>
                    <li>{fare.refundableLabel}</li>
                    <li>
                      <strong>تعديل:</strong> {fare.changeFee}
                    </li>
                    <li>
                      <strong>إلغاء:</strong> {fare.cancelFee}
                    </li>
                    <li>مقعد: {fare.seatSelection}</li>
                    <li>وجبات: {fare.meals}</li>
                  </ul>
                  <button
                    type="button"
                    className="shop-flight-fare-select-btn"
                    onClick={() => setSelectedFareId(fare.id)}
                  >
                    {selectedFare?.id === fare.id ? "✓ محدّد" : "اختيار هذه الفئة"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {selectedFare && providers.length ? (
            <section className="shop-flight-expanded-providers">
              <h3>المزوّد (من الأرخص)</h3>
              <div className="shop-flight-provider-list">
                {providers.map((prov) => (
                  <label key={prov.id} className="shop-flight-provider-row selectable">
                    <input
                      type="radio"
                      name="provider"
                      checked={selectedProvider?.id === prov.id}
                      onChange={() => setSelectedProviderId(prov.id)}
                    />
                    <div>
                      <strong>{prov.providerName}</strong>
                      <span>{selectedFare.labelAr}</span>
                    </div>
                    <strong>{formatMoneyMinor(prov.totalPriceMinor, prov.currency)}</strong>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {phase === "success" ? (
            <div className="shop-flight-expanded-status success" role="status">
              {statusMessage}
            </div>
          ) : null}
          {phase === "price_changed" ? (
            <div className="shop-flight-expanded-status warn" role="alert">
              <p>{statusMessage}</p>
              <button type="button" onClick={() => void acceptPriceChange()}>
                قبول السعر الجديد والمتابعة
              </button>
              <button type="button" className="ghost" onClick={onRefreshResults}>
                تحديث النتائج
              </button>
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

        {selectedFare && selectedProvider && footerBreakdown ? (
          <footer className="shop-flight-expanded-foot sticky">
            <div className="shop-flight-expanded-foot-breakdown">
              <div>
                <span>الأساسي</span>
                <em>{formatMoneyMinor(footerBreakdown.baseMinor, trip.currency)}</em>
              </div>
              <div>
                <span>الضرائب</span>
                <em>{formatMoneyMinor(footerBreakdown.taxesMinor, trip.currency)}</em>
              </div>
              <div>
                <span>رسوم الخدمة</span>
                <em>{formatMoneyMinor(footerBreakdown.serviceFeeMinor, trip.currency)}</em>
              </div>
              <div className="total">
                <span>الإجمالي</span>
                <strong>
                  {formatMoneyMinor(
                    confirmedPriceMinor ?? footerBreakdown.totalMinor,
                    trip.currency,
                  )}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="shop-flight-expanded-continue-btn"
              disabled={busy}
              onClick={() => void handleContinue()}
            >
              {busy || phase === "revalidating" ? (
                <span className="shop-flight-btn-loading">
                  <span className="shop-flight-spinner small" aria-hidden /> جاري التحقق…
                </span>
              ) : (
                "متابعة لمراجعة الحجز"
              )}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
