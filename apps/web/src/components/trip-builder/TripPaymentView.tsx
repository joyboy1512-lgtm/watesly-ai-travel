"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildRepriceResult } from "@watesly-travel/shared";
import { formatKwdMinor } from "@/lib/platform-api";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";

type PayMethod = "card" | "knet" | "apple" | "link";

const METHODS: Array<{ key: PayMethod; label: string; enabled: boolean }> = [
  { key: "card", label: "بطاقة بنكية", enabled: true },
  { key: "knet", label: "K-Net", enabled: process.env.NEXT_PUBLIC_WG_KNET === "1" },
  { key: "apple", label: "Apple Pay", enabled: process.env.NEXT_PUBLIC_WG_APPLE_PAY === "1" },
  { key: "link", label: "رابط دفع", enabled: process.env.NEXT_PUBLIC_WG_PAY_LINK === "1" },
];

export function TripPaymentView() {
  const router = useRouter();
  const { draft, patchDraft } = useTripBuilder();
  const [method, setMethod] = useState<PayMethod>("card");
  const [paying, setPaying] = useState(false);
  const [repriceOpen, setRepriceOpen] = useState(false);
  const [repriceResult, setRepriceResult] = useState<ReturnType<typeof buildRepriceResult> | null>(
    null,
  );
  const [lockSeconds, setLockSeconds] = useState(600);

  const enabledMethods = METHODS.filter((m) => m.enabled);

  const total = useMemo(() => {
    let sum = 0;
    const o = draft.selectedOffers;
    if (o.flight) sum += o.flight.sellAmountMinor;
    if (o.hotel) sum += o.hotel.sellAmountMinor;
    if (o.transfer) sum += o.transfer.sellAmountMinor;
    if (o.activity) sum += o.activity.sellAmountMinor;
    return sum;
  }, [draft.selectedOffers]);

  useEffect(() => {
    const t = window.setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    patchDraft({ repriceStatus: "checking" });
    const timer = window.setTimeout(() => {
      const bumped = { ...draft.selectedOffers };
      if (bumped.flight && Math.random() > 0.7) {
        bumped.flight = {
          ...bumped.flight,
          sellAmountMinor: bumped.flight.sellAmountMinor + 2000,
        };
      }
      const result = buildRepriceResult(draft.selectedOffers, bumped);
      setRepriceResult(result);
      patchDraft({
        repriceStatus: result.status,
        repriceMessage: result.requiresApproval ? "تغيّر السعر — يلزم موافقتك" : undefined,
        priceLockExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (result.requiresApproval) setRepriceOpen(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pay() {
    if (repriceResult?.requiresApproval && repriceOpen) return;
    setPaying(true);
    try {
      sessionStorage.setItem(
        "wg_trip_booking_ref",
        JSON.stringify({
          tripId: draft.tripId,
          paidMinor: repriceResult?.totalNewMinor || total,
          contact: draft.contact,
          at: Date.now(),
        }),
      );
      patchDraft({ repriceStatus: "verified" });
      router.push("/trip-builder/confirm");
    } finally {
      setPaying(false);
    }
  }

  const lockLabel = `${String(Math.floor(lockSeconds / 60)).padStart(2, "0")}:${String(lockSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="wg-trip-flow">
      <TripProgressStepper current="payment" />

      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, color: "var(--tv-primary,#13357b)" }}>الدفع وإتمام الحجز</h1>
        <p style={{ color: "var(--wg-muted)" }}>دفعة واحدة لجميع خدمات رحلتك</p>
      </header>

      {repriceOpen && repriceResult?.requiresApproval ? (
        <div className="wg-trip-card" role="alert" style={{ marginBottom: "1rem", borderColor: "#f59e0b" }}>
          <strong>تغيّر السعر</strong>
          <p>
            من {formatKwdMinor(repriceResult.totalOldMinor)} إلى{" "}
            {formatKwdMinor(repriceResult.totalNewMinor)}
          </p>
          <button
            type="button"
            className="wg-trip-primary-btn"
            onClick={() => {
              setRepriceOpen(false);
              patchDraft({
                selectedOffers: Object.fromEntries(
                  repriceResult.lines.map((l) => [
                    l.kind,
                    { ...draft.selectedOffers[l.kind]!, sellAmountMinor: l.newMinor, currency: l.currency },
                  ]),
                ),
              });
            }}
          >
            أوافق على السعر الجديد
          </button>
        </div>
      ) : null}

      <div className="wg-trip-grid">
        <div>
          <div className="wg-trip-card" style={{ marginBottom: "1rem" }}>
            <h3>ملخص الرحلة</h3>
            <p>
              {draft.flight.origin} → {draft.flight.destination} · {draft.flight.departDate}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
              {draft.services.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.2rem 0.5rem",
                    background: "#e8f0fe",
                    borderRadius: 999,
                    color: "var(--tv-primary)",
                  }}
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>

          <div className="wg-trip-card">
            <h3>اختر طريقة الدفع</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {enabledMethods.map((m) => (
                <label
                  key={m.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.65rem",
                    border: `1px solid ${method === m.key ? "var(--tv-primary)" : "var(--wg-border)"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    checked={method === m.key}
                    onChange={() => setMethod(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>

            {method === "card" ? (
              <div className="wg-trip-form-grid" style={{ marginTop: "1rem" }}>
                <label>
                  الاسم على البطاقة
                  <input autoComplete="cc-name" />
                </label>
                <label>
                  رقم البطاقة
                  <input inputMode="numeric" autoComplete="cc-number" placeholder="•••• •••• •••• ••••" />
                </label>
                <label>
                  MM/YY
                  <input placeholder="MM/YY" autoComplete="cc-exp" />
                </label>
                <label>
                  CVV
                  <input inputMode="numeric" autoComplete="cc-csc" />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  بريد الإيصال
                  <input type="email" defaultValue={draft.contact.email} />
                </label>
              </div>
            ) : null}

            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)", marginTop: "1rem" }}>
              🔒 دفع مشفّر — لا نخزّن بيانات البطاقة على خوادمنا
            </p>
          </div>
        </div>

        <aside className="wg-trip-sticky-price">
          <h3>الإجمالي</h3>
          <p className="total">{formatKwdMinor(repriceResult?.totalNewMinor || total)}</p>
          <p style={{ fontSize: "0.82rem", color: "#18785a" }}>⏱ السعر مثبت لمدة {lockLabel}</p>
          <button
            type="button"
            className="wg-trip-primary-btn"
            disabled={paying || draft.repriceStatus === "checking"}
            onClick={() => void pay()}
          >
            {paying ? "جاري الدفع…" : `ادفع ${formatKwdMinor(repriceResult?.totalNewMinor || total)}`}
          </button>
          <button
            type="button"
            className="wg-trip-change-btn"
            style={{ marginTop: "0.75rem", width: "100%" }}
            onClick={() => router.push("/trip-builder/travelers")}
          >
            ← العودة لبيانات المسافر
          </button>
        </aside>
      </div>
    </div>
  );
}
