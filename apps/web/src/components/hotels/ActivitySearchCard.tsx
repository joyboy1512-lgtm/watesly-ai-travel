"use client";

import { formatMoneyMinor } from "@/lib/format";
import { HotelLiveBadge } from "./HotelLiveBadge";

export type ActivityRow = {
  id: string;
  name: string;
  price: number;
  currency: string;
  details: string;
  extra?: Record<string, unknown>;
};

type Props = {
  item: ActivityRow;
  destination: string;
  onBook?: () => void;
};

export function ActivitySearchCard({ item, destination, onBook }: Props) {
  const d = item.extra || {};
  const title = String(d.activityName || item.name);
  const typeLabel = String(d.activityTypeLabel || "نشاط");
  const duration = typeof d.durationLabel === "string" ? d.durationLabel : "";
  const imageUrl = typeof d.imageUrl === "string" ? d.imageUrl : "";
  const dest = String(d.destinationName || destination);
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
            <h3>{title}</h3>
            <p>
              {typeLabel}
              {duration ? ` · ${duration}` : ""}
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
        <p className="transfer-search-card-route">{dest}</p>
        {item.details ? <p className="transfer-search-card-desc">{item.details}</p> : null}
        <p className="transfer-search-card-policy">
          {freeCancel ? "إلغاء مجاني*" : "راجع سياسة الإلغاء عند التأكيد"}
        </p>
      </div>
      <div className="transfer-search-card-action">
        <strong>{formatMoneyMinor(item.price, item.currency)}</strong>
        <small>إجمالي النشاط</small>
        {onBook ? (
          <button
            type="button"
            className="btn hotel-search-card-cta"
            onClick={onBook}
          >
            احجز
          </button>
        ) : null}
      </div>
    </article>
  );
}
