"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { formatMoneyMinor } from "@/lib/format";
import {
  getBookingDraft,
  saveActivityDraft,
  saveTransferDraft,
  type ActivityBookingDraft,
  type TransferBookingDraft,
} from "@/lib/booking-draft";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { formatDay } from "@/lib/flight-search";

type Kind = "transfer" | "activity";

export function AncillaryBookReview({ kind }: { kind: Kind }) {
  const { t, locale } = useShopI18n();
  const router = useRouter();
  const [transfer, setTransfer] = useState<TransferBookingDraft | null>(null);
  const [activity, setActivity] = useState<ActivityBookingDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = getBookingDraft();
    if (!loaded || loaded.serviceType !== kind) {
      router.replace("/");
      return;
    }
    if (loaded.serviceType === "transfer") setTransfer(loaded);
    if (loaded.serviceType === "activity") setActivity(loaded);
    setReady(true);
  }, [kind, router]);

  if (!ready || (kind === "transfer" && !transfer) || (kind === "activity" && !activity)) {
    return (
      <div className="shop-flight-review-loading">
        <div className="shop-flight-spinner" aria-hidden />
        <p>{t("loadingResults")}</p>
      </div>
    );
  }

  const title = transfer
    ? transfer.transfer.description
    : activity?.activity.description || "";
  const price = transfer
    ? transfer.transfer.sellAmountMinor
    : activity?.activity.sellAmountMinor || 0;
  const currency = transfer
    ? transfer.transfer.currency
    : activity?.activity.currency || "KWD";
  const image =
    (transfer
      ? String(transfer.transfer.details.imageUrl || "")
      : String(activity?.activity.details.imageUrl || "")) || "";
  const backHref =
    transfer?.resultsReturnHref ||
    activity?.resultsReturnHref ||
    (kind === "transfer" ? "/transfers/results" : "/activities/results");

  function continueBook() {
    if (transfer) {
      const { serviceType: _s, ...payload } = transfer;
      saveTransferDraft(payload);
    } else if (activity) {
      const { serviceType: _s, ...payload } = activity;
      saveActivityDraft(payload);
    }
    router.push("/book");
  }

  return (
    <div className="shop-flight-review-page">
      <ShopMockBanner kind="hotel" compact />
      <header className="shop-flight-review-head">
        <h1>{t("reviewBooking")}</h1>
        <p>{kind === "transfer" ? t("reviewTransferLead") : t("reviewActivityLead")}</p>
      </header>
      <div className="shop-flight-review-grid">
        <article className="shop-card shop-panel">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="shop-ancillary-review-photo" />
          ) : null}
          <h2>{title}</h2>
          {transfer ? (
            <ul className="hotel-policy-list">
              <li>
                <strong>{t("searchCars")}</strong>
                <span>
                  {transfer.from} → {transfer.to}
                </span>
              </li>
              <li>
                <strong>{t("date")}</strong>
                <span>
                  {formatDay(transfer.outboundDate, locale)}
                  {transfer.outboundTime ? ` · ${transfer.outboundTime}` : ""}
                </span>
              </li>
              {transfer.inboundDate ? (
                <li>
                  <strong>{t("returnDate")}</strong>
                  <span>
                    {formatDay(transfer.inboundDate, locale)}
                    {transfer.inboundTime ? ` · ${transfer.inboundTime}` : ""}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : null}
          {activity ? (
            <ul className="hotel-policy-list">
              <li>
                <strong>{t("searchActivities")}</strong>
                <span>{activity.destinationLabel || activity.destination}</span>
              </li>
              <li>
                <strong>{t("dates")}</strong>
                <span>
                  {formatDay(activity.fromDate, locale)}
                  {activity.toDate ? ` – ${formatDay(activity.toDate, locale)}` : ""}
                </span>
              </li>
            </ul>
          ) : null}
        </article>
        <aside className="shop-card shop-panel">
          <p className="shop-hint">
            {kind === "transfer" ? t("totalTransfer") : t("totalActivity")}
          </p>
          <strong className="shop-ancillary-review-price">
            {formatMoneyMinor(price, currency)}
          </strong>
          <button type="button" className="shop-btn" onClick={continueBook}>
            {t("continueToBook")}
          </button>
          <button
            type="button"
            className="shop-btn-ghost"
            onClick={() => router.push(backHref)}
          >
            {t("backToResults")}
          </button>
        </aside>
      </div>
    </div>
  );
}
