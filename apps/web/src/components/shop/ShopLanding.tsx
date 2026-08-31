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

function guideToShopDest(slug: string): ShopDestination | null {
  const g = DESTINATION_GUIDES.find((d) => d.slug === slug);
  if (!g) return null;
  return {
    id: g.slug,
    name: g.nameAr,
    country: g.countryAr,
    code: g.airportCode,
    tag: g.flag,
    image: g.image,
    fromPrice: g.costHintAr.replace(/^[^~]*~?/, "من ").slice(0, 24) || "عرض خاص",
    rating: 4.9,
    reviews: 500,
  };
}

export function ShopLanding({ onPickDestination, onPickOffer }: Props) {
  const footerStats = SHOP_STATS.filter(
    (row) => row.label !== "مسافر سعيد" && row.label !== "تقييم العملاء",
  );
  const platformOn = platformEnabled();
  const destCards = platformOn
    ? DESTINATION_GUIDES.map((g) => ({
        slug: g.slug,
        name: g.nameAr,
        country: g.countryAr,
        flag: g.flag,
        image: g.image,
        tag: g.bestTimeAr.slice(0, 28),
        fromPrice: g.costHintAr.match(/~\s*(\d+)/)?.[1]
          ? `من ${g.costHintAr.match(/~\s*(\d+)/)?.[1]} د.ك`
          : "عرض خاص",
        shop: guideToShopDest(g.slug),
      }))
    : null;

  return (
    <div className="shop-landing">
      <section className="shop-section" id="destinations">
        <div className="shop-section-head">
          <div>
            <p className="shop-kicker">وجهات مميزة</p>
            <h2>اكتشف العالم بطريقتك</h2>
            <p className="shop-lead">
              {platformOn
                ? "وجهات مختارة بصفحات كاملة — افتح الوجهة أو املأ محرك البحث فوراً."
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
          {platformOn && destCards
            ? destCards.map((dest) => (
                <div key={dest.slug} className="shop-dest-card" style={{ padding: 0, display: "grid" }}>
                  <Link
                    href={`/destinations/${dest.slug}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dest.image} alt={dest.name} loading="lazy" />
                    <span className="shop-dest-tag">
                      {dest.flag} {dest.name}
                    </span>
                    <div className="shop-dest-body">
                      <div>
                        <h3>
                          {dest.flag} {dest.name}
                        </h3>
                        <p>{dest.country}</p>
                      </div>
                      <div className="shop-dest-meta">
                        <Stars value={4.9} />
                        <small>{dest.tag}</small>
                        <strong>{dest.fromPrice}</strong>
                      </div>
                    </div>
                  </Link>
                  {dest.shop ? (
                    <button
                      type="button"
                      className="shop-btn-ghost"
                      style={{ margin: "0.5rem 0.75rem 0.75rem" }}
                      onClick={() => onPickDestination(dest.shop!)}
                    >
                      املأ البحث
                    </button>
                  ) : null}
                </div>
              ))
            : SHOP_DESTINATIONS.map((dest) => (
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
            <p className="shop-kicker">{platformOn ? "Weekend Deals" : "عروض الأسبوع"}</p>
            <h2>{platformOn ? "عروض نهاية الأسبوع من الكويت" : "باقات جاهزة بأسعار تبدأ من"}</h2>
          </div>
          {platformOn ? (
            <Link href="/deals" className="shop-btn-ghost">
              كل العروض
            </Link>
          ) : null}
        </div>
        <div className="shop-offer-grid">
          {platformOn
            ? WEEKEND_DEALS.filter((d) => d.active)
                .slice(0, 4)
                .map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.slug}`}
                    className="shop-offer-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deal.image} alt={deal.titleAr} loading="lazy" />
                    <span className="shop-offer-badge">{deal.countryFlag} عرض</span>
                    <div className="shop-offer-body">
                      <h3>{deal.titleAr}</h3>
                      <p>{deal.descriptionAr}</p>
                      <strong>
                        {(deal.salePriceMinor / 1000).toFixed(0)} {deal.currency}
                      </strong>
                    </div>
                  </Link>
                ))
            : SHOP_OFFERS.map((offer) => (
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
          <h2>{platformOn ? "ابدأ من البحث أو رحّلتي" : "خطّط رحلتك مع مساعد WeekendGate"}</h2>
          <p>
            {platformOn
              ? "استخدم محرك البحث أعلاه ثم اضغط «ابدأ بناء رحلتي»، أو تصفّح الوجهات والعروض."
              : "أدخل جوالك وابدأ محادثة ذكية — أو ابحث مباشرة من الأعلى."}
          </p>
        </div>
        <div className="shop-cta-actions">
          {platformOn ? (
            <>
              <Link href="/#search" className="shop-btn shop-btn-light">
                محرك البحث
              </Link>
              <Link href="/destinations" className="shop-btn-ghost shop-btn-ghost-light">
                الوجهات
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
