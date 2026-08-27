"use client";

import Link from "next/link";
import {
  SHOP_DESTINATIONS,
  SHOP_FEATURES,
  SHOP_OFFERS,
  SHOP_REVIEWS,
  SHOP_STATS,
  type ShopDestination,
  type ShopOffer,
} from "@/lib/shop-content";

type Props = {
  onPickDestination: (dest: ShopDestination) => void;
  onPickOffer: (offer: ShopOffer) => void;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="shop-stars" aria-label={`${value} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < Math.round(value) ? "on" : undefined}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ShopLanding({ onPickDestination, onPickOffer }: Props) {
  const footerStats = SHOP_STATS.filter(
    (row) => row.label !== "مسافر سعيد" && row.label !== "تقييم العملاء",
  );

  return (
    <div className="shop-landing">
      <section className="shop-section" id="destinations">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">وجهات مميزة</p>
            <h2>اكتشف العالم بطريقتك</h2>
            <p className="shop-lead">
              وجهات مختارة بصور حقيقية وتقييمات مسافرين — اضغط على أي وجهة لملء
              البحث فوراً.
            </p>
          </div>
          <Link href="/#search" className="shop-btn-ghost">
            ابحث الآن
          </Link>
        </div>
        <div className="shop-dest-grid">
          {SHOP_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              type="button"
              className="shop-dest-card"
              onClick={() => onPickDestination(dest)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dest.image} alt={dest.name} loading="lazy" />
              <span className="shop-dest-tag">{dest.tag}</span>
              <div className="shop-dest-body">
                <div>
                  <h3>{dest.name}</h3>
                  <p>{dest.country}</p>
                </div>
                <div className="shop-dest-meta">
                  <Stars value={dest.rating} />
                  <small>{dest.reviews.toString()} تقييم</small>
                  <strong>{dest.fromPrice}</strong>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="offers">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">عروض الأسبوع</p>
            <h2>باقات جاهزة بأسعار تبدأ من</h2>
          </div>
        </div>
        <div className="shop-offer-grid">
          {SHOP_OFFERS.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className="shop-offer-card"
              onClick={() => onPickOffer(offer)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={offer.image} alt={offer.title} loading="lazy" />
              <span className="shop-offer-badge">{offer.badge}</span>
              <div className="shop-offer-body">
                <h3>{offer.title}</h3>
                <p>{offer.subtitle}</p>
                <strong>{offer.priceLabel}</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="shop-section">
        <div className="shop-section-head center">
          <p className="shop-kicker">لماذا WeekendGate؟</p>
          <h2>تجربة حجز كاملة بلمسة بحرية هادئة</h2>
        </div>
        <div className="shop-feature-grid">
          {SHOP_FEATURES.map((f) => (
            <article key={f.title} className="shop-feature-card">
              <span className="shop-feature-icon" aria-hidden>
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="reviews">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">آراء المسافرين</p>
            <h2>آراء مسافرين</h2>
          </div>
          <div className="shop-rating-summary">
            <strong>4.9</strong>
            <Stars value={5} />
            <span>أمثلة من تجارب مستخدمين</span>
          </div>
        </div>
        <div className="shop-review-grid">
          {SHOP_REVIEWS.map((review) => (
            <article key={review.id} className="shop-review-card">
              <div className="shop-review-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={review.avatar} alt={review.name} />
                <div>
                  <strong>{review.name}</strong>
                  <span>{review.city}</span>
                </div>
                <Stars value={review.rating} />
              </div>
              <p>&ldquo;{review.text}&rdquo;</p>
              <small>{review.trip}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="shop-cta-banner">
        <div>
          <p className="shop-kicker light">جاهز للانطلاق؟</p>
          <h2>خطّط رحلتك مع مساعد WeekendGate</h2>
          <p>أدخل جوالك وابدأ محادثة ذكية — أو ابحث مباشرة من الأعلى.</p>
        </div>
        <div className="shop-cta-actions">
          <Link href="/chat" className="shop-btn shop-btn-light">
            تحدث مع المساعد
          </Link>
          <Link href="/#search" className="shop-btn-ghost shop-btn-ghost-light">
            ابحث عن رحلة
          </Link>
        </div>
      </section>

      {footerStats.length > 0 ? (
        <section className="shop-stats-bar shop-stats-bar-footer" aria-label="أرقام WeekendGate">
          {footerStats.map((row) => (
            <div key={row.label} className="shop-stat">
              <strong>{row.value}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
