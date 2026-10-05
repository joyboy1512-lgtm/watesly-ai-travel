import type { FlightBookingDraft } from "@/lib/booking-draft";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  stopsLabel,
} from "@/lib/flight-search";
import {
  analyzeFarePolicy,
  analyzeFlightLeg,
  type FlightInclusion,
} from "@watesly-travel/shared";

function inclusionText(row: FlightInclusion) {
  if (row.status === "unknown") return "المعلومة غير متوفرة";
  if (row.status === "not_included") return row.labelAr || "غير مشمول";
  return row.labelAr;
}

function BagBlock({
  title,
  bags,
}: {
  title: string;
  bags: ReturnType<typeof analyzeFlightLeg>["bags"];
}) {
  return (
    <div className="shop-flight-itin-bags">
      <strong>{title}</strong>
      <ul>
        <li>
          <span>حقيبة شخصية</span>
          <em data-status={bags.personal.status}>{inclusionText(bags.personal)}</em>
        </li>
        <li>
          <span>حقيبة مقصورة</span>
          <em data-status={bags.cabin.status}>{inclusionText(bags.cabin)}</em>
        </li>
        <li>
          <span>أمتعة مشحونة</span>
          <em data-status={bags.checked.status}>{inclusionText(bags.checked)}</em>
        </li>
      </ul>
    </div>
  );
}

export function FlightItineraryDetails({ booking }: { booking: FlightBookingDraft }) {
  const trip = booking.composedTrip;
  const outbound = booking.selectedOutbound || trip?.outbound;
  const returnLeg = booking.selectedReturn ?? trip?.return ?? null;
  const details = booking.flight.details || {};
  const fare = analyzeFarePolicy(details);
  const outFact = outbound
    ? analyzeFlightLeg({
        kind: "outbound",
        from: outbound.from,
        to: outbound.to,
        stops: outbound.stops,
        durationLabel: outbound.durationLabel,
        segments: outbound.segments as Array<Record<string, unknown>>,
        baggage: outbound.baggage,
        details,
      })
    : null;
  const retFact = returnLeg
    ? analyzeFlightLeg({
        kind: "return",
        from: returnLeg.from,
        to: returnLeg.to,
        stops: returnLeg.stops,
        durationLabel: returnLeg.durationLabel,
        segments: returnLeg.segments as Array<Record<string, unknown>>,
        baggage: returnLeg.baggage,
        details: {
          ...details,
          selfConnect: details.returnSelfConnect,
          separateTickets: details.returnSeparateTickets,
        },
      })
    : null;

  return (
    <div className="shop-flight-itin">
      <p className="shop-flight-review-route">
        {booking.originLabel || booking.origin} ↔ {booking.destinationLabel || booking.destination}
      </p>
      <p className="shop-flight-review-dates">
        {formatDay(booking.departDate)}
        {booking.returnDate ? ` – ${formatDay(booking.returnDate)}` : ""}
        {" · "}
        {booking.adults} بالغ
        {booking.children ? ` · ${booking.children} طفل` : ""}
        {booking.infants ? ` · ${booking.infants} رضيع` : ""}
        {" · "}
        {cabinLabel(booking.cabinClass)}
      </p>

      {[outFact, retFact].filter(Boolean).map((leg) => (
        <article key={leg!.kind} className="shop-flight-review-leg">
          <h3>{leg!.titleAr}</h3>
          <p className="shop-flight-itin-meta">
            {stopsLabel(leg!.stops)} · {leg!.durationLabel}
          </p>
          {leg!.segments.map((seg, idx) => (
            <div key={`${seg.flightNumber}-${idx}`} className="shop-flight-itin-seg">
              <div className="shop-flight-review-leg-row">
                {airlineLogo(seg.marketingAirlineCode) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={airlineLogo(seg.marketingAirlineCode)!} alt="" />
                ) : null}
                <div>
                  <strong>
                    {seg.marketingAirlineName || seg.marketingAirlineCode || "شركة الطيران"}
                    {seg.flightNumber ? ` · ${seg.flightNumber}` : ""}
                  </strong>
                  <p>
                    {seg.departClock || formatClock(seg.departAt)} {seg.from}
                    {" → "}
                    {seg.to} {seg.arriveClock || formatClock(seg.arriveAt)}
                  </p>
                  <small>
                    {seg.departDate ? formatDay(seg.departDate) : ""}
                    {seg.departDate ? " · توقيت محلي" : ""}
                    {seg.durationLabel ? ` · ${seg.durationLabel}` : ""}
                  </small>
                  {seg.codeshare ? (
                    <p className="shop-flight-itin-flag">
                      التشغيل الفعلي: {seg.operatingAirlineName || seg.operatingAirlineCode}
                    </p>
                  ) : null}
                  {seg.nextDayArrival ? (
                    <p className="shop-flight-itin-flag warn">الوصول في يوم لاحق</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {leg!.airportChange ? (
            <p className="shop-flight-itin-flag warn">تغيير المطار بين المقاطع</p>
          ) : null}
          {leg!.selfConnect ? (
            <p className="shop-flight-itin-flag warn">ربط ذاتي — الحماية غير مضمونة من شركة واحدة</p>
          ) : null}
          {leg!.separateTickets ? (
            <p className="shop-flight-itin-flag warn">تذاكر منفصلة حسب بيانات المورد</p>
          ) : null}
          <BagBlock title={`الأمتعة · ${leg!.titleAr} · لكل مسافر`} bags={leg!.bags} />
        </article>
      ))}

      {trip?.isMixMatch ? (
        <p className="shop-flight-review-mix-tag">تركيبة مخصصة (ذهاب + عودة من عروض مختلفة)</p>
      ) : null}

      <section className="shop-flight-itin-fare">
        <h3>الدرجة والباقة</h3>
        <p className="shop-flight-review-fare-name">
          {fare.cabinLabelAr}
          {fare.brandName ? <span> · {fare.brandName}</span> : null}
        </p>
        <ul className="shop-flight-review-fare-meta">
          <li>التعديل: {inclusionText(fare.change)}</li>
          <li>الإلغاء: {inclusionText(fare.cancel)}</li>
          <li>عدم الحضور: {inclusionText(fare.noShow)}</li>
          {fare.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
