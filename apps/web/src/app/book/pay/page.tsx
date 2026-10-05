"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { FlightBookingSteps } from "@/components/shop/FlightBookingSteps";
import { FlightItineraryDetails } from "@/components/shop/FlightItineraryDetails";
import {
  getBookingDraft,
  saveFlightDraft,
  type FlightBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { unlockShopCustomer } from "@/lib/shop-unlock";
import {
  buildFlightPriceBreakdown,
  extrasTotalMinor,
  isRecentValidation,
  newShopIdempotencyKey,
  splitOfferSell,
} from "@watesly-travel/shared";

export default function FlightPayPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<FlightBookingDraft | null>(null);
  const [terms, setTerms] = useState(false);
  const [method, setMethod] = useState<"hosted_card" | "knet" | "apple_pay">("hosted_card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"ready" | "booking" | "paying" | "issuing">("ready");

  useEffect(() => {
    const loaded = getBookingDraft();
    if (
      !loaded ||
      loaded.serviceType !== "flight" ||
      (!loaded.bookingId && (!loaded.checkToken || !isRecentValidation(loaded.validatedAt)))
    ) {
      router.replace("/book/review");
      return;
    }
    if (!loaded.travelers?.length) {
      router.replace("/book");
      return;
    }
    if (!loaded.idempotencyKey) {
      const next = { ...loaded, idempotencyKey: newShopIdempotencyKey() };
      const { serviceType: _s, ...payload } = next;
      saveFlightDraft(payload);
      setDraft(next);
      return;
    }
    setDraft(loaded);
  }, [router]);

  const extrasMinor = extrasTotalMinor(draft?.extras || []);
  const breakdown = useMemo(() => {
    if (!draft) {
      return buildFlightPriceBreakdown({ ticketsMinor: 0, extrasMinor: 0, currency: "KWD" });
    }
    const split = splitOfferSell(draft.flight.details, draft.flight.sellAmountMinor);
    return buildFlightPriceBreakdown({
      ticketsMinor: split.ticketsMinor,
      taxesMinor: split.taxesMinor,
      extrasMinor,
      currency: draft.flight.currency,
    });
  }, [draft, extrasMinor]);

  async function ensureGuest() {
    if (getShopSession()) return;
    // The phone on this step is booking contact info, not a login; sign-in stays optional.
    const result = await unlockShopCustomer({
      name: draft?.contactName || undefined,
      email: draft?.contactEmail || undefined,
      guest: true,
    });
    if (result.needsCode) {
      throw new Error("أدخل رمز التحقق من صفحة المسافرين أو أكمل الحجز كضيف بدون جوال");
    }
    saveShopSession({
      accessToken: result.accessToken,
      customer: result.customer,
    });
  }

  async function pay(outcome: "captured" | "failed" = "captured") {
    if (!draft) return;
    if (!terms) {
      setError("وافق على شروط الحجز قبل الدفع");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ensureGuest();
      setPhase("booking");
      const booked = await shopFetch<{
        booking: { id: string; totalSellAmount: number };
        payment?: { status: string };
      }>("/shop/book", {
        method: "POST",
        timeoutMs: 30000,
        body: JSON.stringify({
          serviceType: "flight",
          inquiryId: draft.inquiryId,
          quoteItemId: draft.quoteItemId,
          idempotencyKey: draft.idempotencyKey,
          priceChangeConsent: Boolean(draft.priceChangeConsentAt || !draft.priceChanged),
          checkToken: draft.checkToken,
          offer: {
            id: draft.flight.id,
            description: draft.flight.description,
            sellAmountMinor: draft.flight.sellAmountMinor,
            currency: draft.flight.currency,
            details: {
              ...draft.flight.details,
              validatedAt: draft.validatedAt,
              priceChanged: draft.priceChanged,
              availableExtras: draft.availableExtras,
            },
            providerOfferRef: String(
              draft.checkedOfferRef || draft.flight.details.originalOfferId || draft.flight.id,
            ),
          },
          route: {
            origin: draft.origin,
            destination: draft.destination,
            originLabel: draft.originLabel,
            destinationLabel: draft.destinationLabel,
            departDate: draft.departDate,
            returnDate: draft.returnDate,
            tripType: draft.tripType,
            cabinClass: draft.cabinClass,
          },
          travelers: draft.travelers,
          adults: draft.adults,
          children: draft.children,
          contact: {
            email: draft.contactEmail,
            phone: draft.contactPhone,
          },
          extras: {
            guestName: draft.contactName,
            selectedExtras: draft.extras || [],
            validatedAt: draft.validatedAt,
            priceChangeConsent: Boolean(draft.priceChangeConsentAt || !draft.priceChanged),
          },
        }),
      });

      const bookingId = booked.booking.id;
      const { serviceType: _s, ...payload } = { ...draft, bookingId };
      saveFlightDraft(payload);

      if (booked.payment?.status === "paid") {
        setPhase("issuing");
        await shopFetch(`/shop/bookings/${bookingId}/issue`, { method: "POST" }).catch(() => undefined);
        router.push(`/book/status?id=${encodeURIComponent(bookingId)}`);
        return;
      }

      setPhase("paying");
      const intentRes = await shopFetch<{
        alreadyPaid?: boolean;
        intent?: { id: string };
      }>("/shop/payments/intent", {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          amountMinor: booked.booking.totalSellAmount,
          currency: draft.flight.currency,
          method,
          idempotencyKey: `pay:${draft.idempotencyKey}:${booked.booking.totalSellAmount}`,
        }),
      });

      if (intentRes.alreadyPaid) {
        setPhase("issuing");
        await shopFetch(`/shop/bookings/${bookingId}/issue`, { method: "POST" }).catch(() => undefined);
        router.push(`/book/status?id=${encodeURIComponent(bookingId)}`);
        return;
      }

      const intentId = intentRes.intent?.id;
      if (!intentId) throw new Error("تعذّر إنشاء نية الدفع");
      saveFlightDraft({ ...payload, paymentIntentId: intentId });

      const confirm = await shopFetch<{ status?: string; bookingId?: string }>(
        "/shop/payments/sandbox-confirm",
        {
          method: "POST",
          body: JSON.stringify({ intentId, outcome }),
        },
      );
      if (confirm.status !== "paid") {
        throw new Error("فشل الدفع. لم يُخصم مبلغ جديد. يمكنك إعادة المحاولة.");
      }
      setPhase("issuing");
      await shopFetch(`/shop/bookings/${bookingId}/issue`, {
        method: "POST",
        timeoutMs: 35000,
      }).catch(() => undefined);
      router.push(`/book/status?id=${encodeURIComponent(bookingId)}`);
    } catch (err) {
      if (draft.bookingId) {
        router.push(`/book/status?id=${encodeURIComponent(draft.bookingId)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "تعذّر إتمام الدفع");
      setPhase("ready");
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <StoreFront>
        <p className="shop-flight-review-loading">جاري تجهيز المراجعة…</p>
      </StoreFront>
    );
  }

  return (
    <StoreFront>
      <div className="shop-flight-review-page shop-flight-pay-page">
        <ShopMockBanner />
        <FlightBookingSteps current={3} />
        <header className="shop-flight-review-head">
          <h1>المراجعة والدفع</h1>
          <p>راجع الرحلة والمسافرين والإضافات ثم ادفع عبر الوسائل المتاحة في المشروع.</p>
        </header>
        {error ? <p className="shop-error">{error}</p> : null}

        <div className="shop-flight-review-grid">
          <div>
            <section className="shop-flight-review-card">
              <h2>الرحلة</h2>
              <FlightItineraryDetails booking={draft} />
            </section>
            <section className="shop-flight-review-card">
              <h2>المسافرون</h2>
              <ul className="shop-flight-pay-pax">
                {(draft.travelers || []).map((t, i) => (
                  <li key={`${t.firstName}-${t.lastName}-${i}`}>
                    <strong>
                      {t.firstName} {t.lastName}
                    </strong>
                    <span>
                      {t.type === "infant" ? "رضيع" : t.type === "child" ? "طفل" : "بالغ"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="shop-flight-review-card">
              <h2>الإضافات</h2>
              {draft.extras?.length ? (
                <ul className="shop-flight-pay-pax">
                  {draft.extras.map((ex) => (
                    <li key={ex.id}>
                      <strong>{ex.labelAr}</strong>
                      <span>{formatMoneyMinor(ex.amountMinor, ex.currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="shop-hint">لا إضافات مدفوعة مختارة.</p>
              )}
            </section>
          </div>

          <aside className="shop-flight-review-card shop-flight-pay-summary">
            <h2>ملخص السعر</h2>
            <dl className="shop-flight-review-breakdown">
              <div>
                <dt>التذاكر</dt>
                <dd>{formatMoneyMinor(breakdown.ticketsMinor, breakdown.currency)}</dd>
              </div>
              {breakdown.taxesMinor ? (
                <div>
                  <dt>الضرائب</dt>
                  <dd>{formatMoneyMinor(breakdown.taxesMinor, breakdown.currency)}</dd>
                </div>
              ) : null}
              {breakdown.serviceFeeMinor ? (
                <div>
                  <dt>رسوم الخدمة</dt>
                  <dd>{formatMoneyMinor(breakdown.serviceFeeMinor, breakdown.currency)}</dd>
                </div>
              ) : null}
              <div>
                <dt>الإضافات</dt>
                <dd>{formatMoneyMinor(breakdown.extrasMinor, breakdown.currency)}</dd>
              </div>
              <div className="total">
                <dt>الإجمالي النهائي</dt>
                <dd>{formatMoneyMinor(breakdown.totalMinor, breakdown.currency)}</dd>
              </div>
            </dl>
            <fieldset className="shop-flight-pay-methods">
              <legend>وسيلة الدفع</legend>
              <label>
                <input
                  type="radio"
                  name="pay"
                  checked={method === "hosted_card"}
                  onChange={() => setMethod("hosted_card")}
                />
                بطاقة عبر صفحة مستضافة
              </label>
              <label>
                <input
                  type="radio"
                  name="pay"
                  checked={method === "knet"}
                  onChange={() => setMethod("knet")}
                />
                كي نت
              </label>
              <label>
                <input
                  type="radio"
                  name="pay"
                  checked={method === "apple_pay"}
                  onChange={() => setMethod("apple_pay")}
                />
                Apple Pay
              </label>
            </fieldset>
            <label className="shop-flight-terms">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              أوافق على شروط الحجز وسياسة الإلغاء الواردة في العرض المختار
            </label>
            <p className="shop-hint">
              الدفع التجريبي لا يخصم مبلغًا حقيقيًا. التأكيد يتم من الخادم عبر بوابة الدفع وليس من صفحة العودة وحدها.
            </p>
          </aside>
        </div>

        <div className="shop-flight-pay-bar">
          <div>
            <strong>{formatMoneyMinor(breakdown.totalMinor, breakdown.currency)}</strong>
            <small>الإجمالي النهائي</small>
          </div>
          <button type="button" disabled={busy || !terms} onClick={() => void pay("captured")}>
            {busy
              ? phase === "booking"
                ? "جارٍ الحجز…"
                : phase === "paying"
                  ? "جارٍ الدفع…"
                  : phase === "issuing"
                    ? "جارٍ الإصدار…"
                    : "…"
              : "ادفع الآن (تجريبي)"}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => void pay("failed")}>
            محاكاة فشل الدفع
          </button>
          <button type="button" className="ghost" onClick={() => router.push("/book")}>
            رجوع
          </button>
        </div>
      </div>
    </StoreFront>
  );
}
