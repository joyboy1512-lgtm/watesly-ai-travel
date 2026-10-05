const STEPS = [
  "تفاصيل الرحلة",
  "المسافرون والإضافات",
  "المراجعة والدفع",
  "التأكيد والتذاكر",
] as const;

export function FlightBookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="shop-flight-flow-steps" aria-label="مراحل حجز الطيران">
      {STEPS.map((label, idx) => {
        const n = idx + 1;
        const state = n < current ? "done" : n === current ? "on" : "";
        return (
          <li key={label} className={state} aria-current={n === current ? "step" : undefined}>
            <i>{n}</i>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
