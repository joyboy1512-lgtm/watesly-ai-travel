import type { FlightExtraDraft } from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";

export function FlightExtrasPicker({
  extras,
  selected,
  travelers,
  onChange,
}: {
  extras: FlightExtraDraft[];
  selected: FlightExtraDraft[];
  travelers: Array<{ firstName?: string; lastName?: string; type?: string }>;
  onChange: (next: FlightExtraDraft[]) => void;
}) {
  if (!extras.length) {
    return (
      <p className="shop-hint">
        لا توجد إضافات مدعومة من المورد لهذا العرض. لن نعرض أمتعة أو مقاعد أو وجبات
        مدفوعة غير موجودة في بيانات العرض.
      </p>
    );
  }

  function toggle(extra: FlightExtraDraft) {
    const exists = selected.some((row) => row.id === extra.id);
    onChange(exists ? selected.filter((row) => row.id !== extra.id) : [...selected, extra]);
  }

  return (
    <div className="shop-flight-extras">
      {extras.map((extra) => {
        const on = selected.some((row) => row.id === extra.id);
        const pax =
          extra.passengerIndex != null
            ? travelers[extra.passengerIndex]
            : undefined;
        const paxLabel = pax
          ? [pax.firstName, pax.lastName].filter(Boolean).join(" ") || `مسافر ${extra.passengerIndex! + 1}`
          : "حسب اختيارك عند الإصدار";
        return (
          <label key={extra.id} className={`shop-flight-extra-row${on ? " on" : ""}`}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(extra)}
            />
            <span>
              <strong>{extra.labelAr}</strong>
              <small>
                {extra.kind === "seat"
                  ? "طلب مقعد — غير مؤكد حتى تصدر التذكرة"
                  : extra.kind === "bag"
                    ? "أمتعة إضافية"
                    : extra.kind === "meal"
                      ? "وجبة"
                      : "ترقية باقة"}
                {" · "}
                {paxLabel}
                {extra.segmentKey ? ` · مقطع ${extra.segmentKey}` : ""}
              </small>
            </span>
            <em>{formatMoneyMinor(extra.amountMinor, extra.currency)}</em>
          </label>
        );
      })}
    </div>
  );
}
