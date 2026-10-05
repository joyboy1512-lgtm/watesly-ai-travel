"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearBookingDraft,
  saveFlightDraft,
  type FlightBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import { shopFetch } from "@/lib/shop-session";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { FlightBookingSteps } from "@/components/shop/FlightBookingSteps";
import { FlightItineraryDetails } from "@/components/shop/FlightItineraryDetails";
import { buildFlightPriceBreakdown, splitOfferSell } from "@watesly-travel/shared";

type CheckResult = {
  available: boolean;
  expired: boolean;
  priceChanged: boolean;
  previousSellAmountMinor?: number;
  sellAmountMinor: number;
  currency: string;
  expiresAt?: string;
  holdGuaranteed?: boolean;
  holdExpiresAt?: string;
  extras?: FlightBookingDraft["availableExtras"];
  validatedAt: string;
  offer?: { raw?: Record<string, unknown>; providerOfferRef?: string };
  messageAr?: string;
};

export function FlightBookReview({ booking }: { booking: FlightBookingDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState(booking);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState("");
  const [consent, setConsent] = useState(Boolean(booking.priceChangeConsentAt));

  const breakdown = buildFlightPriceBreakdown({
    ...splitOfferSell(draft.flight.details, draft.flight.sellAmountMinor),
    extrasMinor: 0,
    currency: draft.flight.currency,
  });

  function persist(next: FlightBookingDraft) {
    const { serviceType: _serviceType, ...payload } = next;
    saveFlightDraft(payload);
    setDraft(next);
  }

  async function checkOffer() {
    setChecking(true);
    setCheckError("");
    try {
      const companionRef = draft.selectedReturn?.sourceOfferRef;
      const outboundRef = draft.selectedOutbound?.sourceOfferRef;
      const mixMatch =
        Boolean(companionRef && outboundRef && companionRef !== outboundRef);
      const result = await shopFetch<CheckResult>("/shop/check-flight-offer", {
        method: "POST",
        auth: false,
        timeoutMs: 25000,
        body: JSON.stringify({
          offer: {
            providerKey: String(draft.flight.details.providerKey || ""),
            providerOfferRef: String(
              draft.flight.details.originalOfferId ||
                draft.flight.details.selectedFareOfferId ||
                draft.flight.id,
            ),
            description: draft.flight.description,
            sellAmountMinor: draft.flight.sellAmountMinor,
            costAmountMinor: Number(draft.flight.details.costAmountMinor || 0),
            currency: draft.flight.currency,
            expiresAt: String(draft.flight.details.expiresAt || ""),
            details: draft.flight.details,
          },
          companionOffer: mixMatch
            ? {
                providerOfferRef: companionRef,
                currency: draft.flight.currency,
                raw: { originalOfferId: companionRef },
              }
            : undefined,
          previousSellAmountMinor: draft.previousTotalMinor || draft.flight.sellAmountMinor,
        }),
      });
      const nextSell = result.sellAmountMinor;
      persist({
        ...draft,
        flight: {
          ...draft.flight,
          sellAmountMinor: nextSell || draft.flight.sellAmountMinor,
          details: {
            ...draft.flight.details,
            ...(result.offer?.raw || {}),
            validatedAt: result.validatedAt,
            priceChanged: result.priceChanged,
            availableExtras: result.extras || [],
            holdGuaranteed: result.holdGuaranteed === true,
            holdExpiresAt: result.holdExpiresAt,
          },
        },
        validatedAt: result.validatedAt,
        priceChanged: result.priceChanged,
        previousTotalMinor: result.priceChanged
          ? result.previousSellAmountMinor || draft.flight.sellAmountMinor
          : undefined,
        availableExtras: result.extras || [],
        holdGuaranteed: result.holdGuaranteed === true,
        holdExpiresAt: result.holdExpiresAt,
      });
      if (!result.available) {
        setCheckError(result.messageAr || "انتهى هذا العرض.");
      }
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "تعذّر التحقق من العرض");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expired = Boolean(checkError && /انتهى|لم يعد متاح/.test(checkError));
  const canContinue =
    !checking &&
    !expired &&
    !checkError.includes("تعذّر") &&
    (!draft.priceChanged || consent);

  function continueToTravelers() {
    persist({
      ...draft,
      priceChangeConsentAt: consent ? new Date().toISOString() : draft.priceChangeConsentAt,
    });
    router.push("/book");
  }

  return (
    <div className="shop-flight-review-page">
      <ShopMockBanner />
      <FlightBookingSteps current={1} />
      <header className="shop-flight-review-head">
        <h1>تفاصيل الرحلة المختارة</h1>
        <p>راجع المقاطع والأمتعة والشروط. نتحقق من السعر والتوافر من المورد قبل المتابعة.</p>
      </header>

      {checking ? (
        <p className="shop-hint">جارٍ التحقق من السعر والتوافر…</p>
      ) : null}
      {checkError ? <p className="shop-error">{checkError}</p> : null}

      {draft.priceChanged && draft.previousTotalMinor != null ? (
        <section className="shop-flight-price-change">
          <p>
            تغيّر السعر: من{" "}
            <s>{formatMoneyMinor(draft.previousTotalMinor, draft.flight.currency)}</s>
            {" إلى "}
            <strong>{formatMoneyMinor(draft.flight.sellAmountMinor, draft.flight.currency)}</strong>
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            أوافق على السعر الجديد وأريد المتابعة
          </label>
        </section>
      ) : null}

      {draft.holdGuaranteed && draft.holdExpiresAt ? (
        <p className="shop-flight-hold-timer">
          المورد يضمن حفظ السعر حتى {new Date(draft.holdExpiresAt).toLocaleString("ar-KW")}
        </p>
      ) : (
        <p className="shop-hint">لا يعرض المورد مدة حفظ سعر مضمونة لهذا العرض.</p>
      )}

      <div className="shop-flight-review-grid">
        <section className="shop-flight-review-card">
          <h2>الرحلة</h2>
          <FlightItineraryDetails booking={draft} />
        </section>
        <section className="shop-flight-review-card">
          <h2>السعر الحالي</h2>
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
            <div className="total">
              <dt>الإجمالي</dt>
              <dd>{formatMoneyMinor(breakdown.totalMinor, breakdown.currency)}</dd>
            </div>
          </dl>
          <p className="shop-hint">
            {breakdown.taxesMinor
              ? "فُصلت الضرائب كما وردت من العرض. لا يُحتسب أي بند مرتين."
              : "يشمل هذا الإجمالي الضرائب والرسوم الواردة في سعر العرض."}
          </p>
        </section>
      </div>

      <footer className="shop-flight-review-foot">
        <button
          type="button"
          className="shop-flight-review-back"
          onClick={() => router.push(draft.resultsReturnHref || "/flights/results")}
        >
          العودة إلى النتائج
        </button>
        {checkError && !expired ? (
          <button type="button" className="shop-flight-review-continue" onClick={() => void checkOffer()}>
            إعادة التحقق
          </button>
        ) : null}
        <button
          type="button"
          className="shop-flight-review-continue"
          disabled={!canContinue}
          onClick={continueToTravelers}
        >
          متابعة لبيانات المسافرين
        </button>
        <button
          type="button"
          className="shop-flight-review-cancel"
          onClick={() => {
            clearBookingDraft();
            router.push("/");
          }}
        >
          إلغاء
        </button>
      </footer>
    </div>
  );
}
