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
import { DESTINATION_GUIDES, WEEKEND_DEALS } from "@watesly-travel/shared";
import { platformEnabled } from "@/lib/platform-flags";

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

function destinationHref(dest: ShopDestination): string | null {
  if (!platformEnabled()) return null;
  if (DESTINATION_GUIDES.some((d) => d.slug === dest.id)) return `/destinations/${dest.id}`;
  return "/destinations";
}

function offerHref(offer: ShopOffer): string | null {
  if (!platformEnabled()) return null;
  const byCity = WEEKEND_DEALS.find(
    (d) =>
      d.active &&
      (d.destinationSlug === offer.code?.toLowerCase() ||
        d.city.includes(offer.destination || "") ||
        offer.title.includes(d.city)),
  );
  if (byCity) return `/deals/${byCity.slug}`;
  return "/deals";
}

export function ShopLanding({ onPickDestination, onPickOffer }: Props) {
  const footerStats = SHOP_STATS.filter(
    (row) => row.label !== "مسافر سعيد" && row.label !== "تقييم العملاء",
  );
  const platformOn = platformEnabled();

  return (
    <div className="shop-landing">
      {platformOn ? (
        <section className="shop-section" aria-label="منصّة WeekendGate">
          <div className="shop-section-head">
            <div>
              <p className="shop-kicker">منصّة الرحلة الكاملة</p>
              <h2>ابنِ رحلتك أو احجز عرض نهاية الأسبوع</h2>
              <p className="shop-lead">
                طيران + فندق + نقل + أنشطة في مكان واحد — أو اختر Weekend Deal جاهزاً.
              </p>
            </div>
          </div>
          <div className="shop-feature-grid">
            <Link href="/trip-builder" className="shop-feature-card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="shop-feature-icon" aria-hidden>
                🧩
              </span>
              <h3>رحّلتي — Trip Builder</h3>
              <p>كوّن رحلتك وغيّر أي جزء في أي وقت مع ظهور التوفير فوراً.</p>
            </Link>
            <Link href="/deals" className="shop-feature-card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="shop-feature-icon" aria-hidden>
                🔥
              </span>
              <h3>Weekend Deals</h3>
              <p>عروض دبي والبحرين والدوحة وإسطنبول وغيرها بأسعار مُجمّعة.</p>
            </Link>
            <Link href="/destinations" className="shop-feature-card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="shop-feature-icon" aria-hidden>
                🌍
              </span>
              <h3>صفحات الوجهات</h3>
              <p>لماذا تسافر، أفضل وقت، فنادق، أنشطة، ثم خطّط رحلتك.</p>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="shop-section" id="destinations">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">وجهات مميزة</p>
            <h2>اكتشف العالم بطريقتك</h2>
            <p className="shop-lead">
              {platformOn
                ? "اضغط الوجهة لفتح صفحتها، أو استخدم «املأ البحث» للبحث السريع."
                : "وجهات مختارة بصور حقيقية وتقييمات مسافرين — اضغط على أي وجهة لملء البحث فوراً."}
            </p>
          </div>
          {platformOn ? (
            <Link href="/destinations" className="shop-btn-ghost">
              كل الوجهات
            </Link>
          ) : (
            <Link href="/#search" className="shop-btn-ghost">
              ابحث الآن
            </Link>
          )}
        </div>
        <div className="shop-dest-grid">
          {SHOP_DESTINATIONS.map((dest) => {
            const href = destinationHref(dest);
            const body = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dest.image}
                  alt={dest.name}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.onerror = null;
                    el.src =
                      "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bfdbfe"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" fill="#334155" font-size="36" font-family="Arial">${dest.name}</text></svg>`,
                      );
                  }}
                />
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
              </>
            );
            if (href) {
              return (
                <div key={dest.id} className="shop-dest-card" style={{ padding: 0, display: "grid" }}>
                  <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    {body}
                  </Link>
                  <button
                    type="button"
                    className="shop-btn-ghost"
                    style={{ margin: "0.5rem 0.75rem 0.75rem" }}
                    onClick={() => onPickDestination(dest)}
                  >
                    املأ البحث
                  </button>
                </div>
              );
            }
            return (
              <button
                key={dest.id}
                type="button"
                className="shop-dest-card"
                onClick={() => onPickDestination(dest)}
              >
                {body}
              </button>
            );
          })}
        </div>
      </section>

      <section className="shop-section shop-section-soft" id="offers">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">عروض الأسبوع</p>
            <h2>باقات جاهزة بأسعار تبدأ من</h2>
          </div>
          {platformOn ? (
            <Link href="/deals" className="shop-btn-ghost">
              كل Weekend Deals
            </Link>
          ) : null}
        </div>
        <div className="shop-offer-grid">
          {SHOP_OFFERS.map((offer) => {
            const href = offerHref(offer);
            const body = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.image}
                  alt={offer.title}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.onerror = null;
                    el.src =
                      "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bfdbfe"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" fill="#334155" font-size="28" font-family="Arial">${offer.badge}</text></svg>`,
                      );
                  }}
                />
                <span className="shop-offer-badge">{offer.badge}</span>
                <div className="shop-offer-body">
                  <h3>{offer.title}</h3>
                  <p>{offer.subtitle}</p>
                  <strong>{offer.priceLabel}</strong>
                </div>
              </>
            );
            if (href) {
              return (
                <Link
                  key={offer.id}
                  href={href}
                  className="shop-offer-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {body}
                </Link>
              );
            }
            return (
              <button
                key={offer.id}
                type="button"
                className="shop-offer-card"
                onClick={() => onPickOffer(offer)}
              >
                {body}
              </button>
            );
          })}
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
          <h2>{platformOn ? "خطّط رحلتك الآن" : "خطّط رحلتك مع مساعد WeekendGate"}</h2>
          <p>
            {platformOn
              ? "ابدأ من Trip Builder أو Weekend Deals — أو تحدّث مع المساعد."
              : "أدخل جوالك وابدأ محادثة ذكية — أو ابحث مباشرة من الأعلى."}
          </p>
        </div>
        <div className="shop-cta-actions">
          {platformOn ? (
            <>
              <Link href="/trip-builder" className="shop-btn shop-btn-light">
                رحّلتي
              </Link>
              <Link href="/deals" className="shop-btn-ghost shop-btn-ghost-light">
                Weekend Deals
              </Link>
            </>
          ) : (
            <>
              <Link href="/chat" className="shop-btn shop-btn-light">
                تحدث مع المساعد
              </Link>
              <Link href="/#search" className="shop-btn-ghost shop-btn-ghost-light">
                ابحث عن رحلة
              </Link>
            </>
          )}
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
