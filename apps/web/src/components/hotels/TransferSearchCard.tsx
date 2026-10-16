"use client";

import "@/app/hotel-rich.css";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { HotelLiveBadge } from "./HotelLiveBadge";

export type TransferRow = {
  id: string;
  name: string;
  price: number;
  currency: string;
  details: string;
  extra?: Record<string, unknown>;
};

type Props = {
  item: TransferRow;
  from: string;
  to: string;
  onBook?: () => void;
};

export function TransferSearchCard({ item, from, to, onBook }: Props) {
  const { locale, currency: displayCurrency, formatMoney } = useShopCopy();
  const d = item.extra || {};
  const typeLabel = String(d.transferTypeLabel || (locale === "en" ? "Transfer" : "نقل"));
  const vehicle = String(d.vehicleName || "");
  const maxPax = d.maxPax != null ? Number(d.maxPax) : null;
  const imageUrl = typeof d.imageUrl === "string" ? d.imageUrl : "";
  const freeCancel = Boolean(d.freeCancellation);
  const liveMode = Boolean(d.liveMode);

  return (
    <article className="transfer-search-card">
      <div className="transfer-search-card-media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" />
        ) : (
          <div className="transfer-search-card-placeholder" />
        )}
      </div>
      <div className="transfer-search-card-main">
        <div className="transfer-search-card-head">
          <div>
            <h3>{vehicle || item.name}</h3>
            <p>
              {typeLabel}
              {maxPax
                ? ` · ${locale === "en" ? `Up to ${maxPax} passengers` : `حتى ${maxPax} ركاب`}`
                : ""}
            </p>
          </div>
          <HotelLiveBadge
            compact
            liveMode={liveMode}
            sourceLabel={
              typeof d.sourceLabel === "string" ? d.sourceLabel : undefined
            }
            fetchedAt={typeof d.fetchedAt === "string" ? d.fetchedAt : undefined}
          />
        </div>
        <p className="transfer-search-card-route">
          {String(d.fromLabel || from)} → {String(d.toLabel || to)}
        </p>
        {item.details ? <p className="transfer-search-card-desc">{item.details}</p> : null}
        <p className="transfer-search-card-policy">
          {freeCancel
            ? locale === "en"
              ? "Free cancellation*"
              : "إلغاء مجاني*"
            : locale === "en"
              ? "Review the cancellation policy at confirmation"
              : "راجع سياسة الإلغاء عند التأكيد"}
        </p>
      </div>
      <div className="transfer-search-card-action">
        <strong data-display-currency={displayCurrency}>
          {formatMoney(item.price, item.currency)}
        </strong>
        <small>{locale === "en" ? "Transfer total" : "إجمالي النقل"}</small>
        {onBook ? (
          <button
            type="button"
            className="btn hotel-search-card-cta"
            onClick={onBook}
          >
            {locale === "en" ? "Book" : "احجز"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
