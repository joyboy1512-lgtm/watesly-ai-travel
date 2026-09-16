import type { Metadata } from "next";
import "./ui-preview.css";

export const metadata: Metadata = {
  title: "UI Preview — WeekendGate Mobile Prototype",
  robots: { index: false, follow: false },
};

export default function UiPreviewPage() {
  return (
    <div className="ui-preview-root">
      <div className="ui-preview-intro">
        <h1>نموذج واجهة WeekendGate — معاينة فقط</h1>
        <p>
          هذا <strong>prototype</strong> معزول — لا يغيّر الموقع الحالي. يوضح الشكل المقترح
          للموبايل مع الحفاظ على نفس المسارات والبحث والحجز.
        </p>
      </div>

      <div className="ui-preview-grid">
        {/* Screen 1 — Welcome */}
        <div className="ui-preview-phone-wrap">
          <span className="ui-preview-label">1 — ترحيب / Onboarding</span>
          <div className="ui-preview-phone rtl">
            <div className="ui-preview-screen">
              <div className="ui-welcome-bg" />
              <div className="ui-welcome-content">
                <h2>احجز رحلتك في أي وقت وأي مكان</h2>
                <p>
                  ابحث، قارن، واحجز طيران وفنادق بسهولة — WeekendGate من الكويت إلى العالم.
                </p>
                <button type="button" className="ui-btn-gradient">
                  <span className="icon">✈</span>
                  <span>ابدأ الآن</span>
                  <span>›››</span>
                </button>
              </div>
              <nav className="ui-bottom-nav" aria-hidden="true">
                <span className="ui-nav-item active">
                  <span className="ico">🏠</span>
                  الرئيسية
                </span>
                <span className="ui-nav-item">
                  <span className="ico">✈</span>
                  طيران
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🏨</span>
                  فنادق
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🔥</span>
                  عروض
                </span>
                <span className="ui-nav-item">
                  <span className="ico">👤</span>
                  حسابي
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Screen 2 — Home */}
        <div className="ui-preview-phone-wrap">
          <span className="ui-preview-label">2 — الرئيسية + اكتشاف</span>
          <div className="ui-preview-phone rtl">
            <div className="ui-preview-screen">
              <div className="ui-home-screen">
                <div className="ui-home-top">
                  <h2>ابدأ رحلتك اليوم</h2>
                  <div className="ui-icon-row">
                    <span className="ui-icon-btn">🔍</span>
                    <span className="ui-icon-btn">🔔</span>
                  </div>
                </div>
                <div className="ui-pills">
                  <span className="ui-pill">🏨 فنادق</span>
                  <span className="ui-pill active">✈ طيران</span>
                  <span className="ui-pill">🚐 نقل</span>
                  <span className="ui-pill">🎯 أنشطة</span>
                </div>
                <article className="ui-glass-card">
                  <div className="ui-flight-card-img">
                    <span className="badge-go">↗</span>
                  </div>
                  <div className="ui-flight-card-body">
                    <div className="ui-route-row">
                      <div>
                        <strong>KWI</strong>
                        <small>3:30 م</small>
                      </div>
                      <div className="ui-route-mid">رحلة مباشرة · 2س 15د</div>
                      <div style={{ textAlign: "left" }}>
                        <strong>DXB</strong>
                        <small>5:45 م</small>
                      </div>
                    </div>
                  </div>
                </article>
                <article className="ui-glass-card ui-deal-mini">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/media/destinations/bahrain.jpg?v=2" alt="عطلة البحرين" />
                  <div>
                    <span className="ui-deal-tag">خصم 20 د.ك</span>
                    <h3>عطلة البحرين — نهاية الأسبوع</h3>
                    <small style={{ color: "#64748b" }}>129.000 KWD · طيران + فندق</small>
                  </div>
                </article>
              </div>
              <nav className="ui-bottom-nav" aria-hidden="true">
                <span className="ui-nav-item active">
                  <span className="ico">🏠</span>
                  الرئيسية
                </span>
                <span className="ui-nav-item">
                  <span className="ico">✈</span>
                  طيران
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🏨</span>
                  فنادق
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🔥</span>
                  عروض
                </span>
                <span className="ui-nav-item">
                  <span className="ico">👤</span>
                  حسابي
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Screen 3 — Search */}
        <div className="ui-preview-phone-wrap">
          <span className="ui-preview-label">3 — بحث طيران + نتيجة</span>
          <div className="ui-preview-phone rtl">
            <div className="ui-preview-screen">
              <div className="ui-search-screen">
                <h2>احجز الطيران</h2>
                <p className="sub">ابحث عن الرحلات بسهولة</p>
                <div className="ui-search-form">
                  <div className="ui-field">
                    <label>من</label>
                    <div className="ui-field-box">
                      <span>
                        KWI
                        <small>الكويت</small>
                      </span>
                      <span>📍</span>
                    </div>
                  </div>
                  <div className="ui-swap">⇅</div>
                  <div className="ui-field">
                    <label>إلى</label>
                    <div className="ui-field-box">
                      <span>
                        DXB
                        <small>دبي</small>
                      </span>
                      <span>📍</span>
                    </div>
                  </div>
                  <div className="ui-field">
                    <label>المسافرون</label>
                    <div className="ui-field-box">
                      <span>2 مسافر</span>
                      <span>👥</span>
                    </div>
                  </div>
                  <div className="ui-dates-row">
                    <div className="ui-field">
                      <label>المغادرة</label>
                      <div className="ui-field-box">
                        <span>15 سب 2026</span>
                        <span>📅</span>
                      </div>
                    </div>
                    <div className="ui-field">
                      <label>العودة</label>
                      <div className="ui-field-box">
                        <span>22 سب 2026</span>
                        <span>📅</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="ui-btn-gradient" style={{ marginTop: "0.35rem" }}>
                    <span className="icon">✈</span>
                    <span>بحث الرحلات</span>
                    <span>›</span>
                  </button>
                </div>
                <article className="ui-result-card">
                  <div className="ui-result-head">
                    <div>
                      <strong>Emirates · اقتصادية</strong>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>مباشرة</div>
                    </div>
                    <div className="ui-result-price">
                      89.500 KWD
                      <small>للشخص</small>
                    </div>
                  </div>
                  <div className="ui-timeline">
                    <div>
                      <strong style={{ fontSize: "0.78rem" }}>KWI</strong>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>04:30 م</div>
                    </div>
                    <div className="ui-timeline-line" />
                    <div style={{ textAlign: "left" }}>
                      <strong style={{ fontSize: "0.78rem" }}>DXB</strong>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>06:45 م</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.4rem", fontSize: "0.62rem", color: "#64748b" }}>
                    2س 15د · بدون توقف
                  </div>
                </article>
              </div>
              <nav className="ui-bottom-nav" aria-hidden="true">
                <span className="ui-nav-item">
                  <span className="ico">🏠</span>
                  الرئيسية
                </span>
                <span className="ui-nav-item active">
                  <span className="ico">✈</span>
                  طيران
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🏨</span>
                  فنادق
                </span>
                <span className="ui-nav-item">
                  <span className="ico">🔥</span>
                  عروض
                </span>
                <span className="ui-nav-item">
                  <span className="ico">👤</span>
                  حسابي
                </span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="ui-preview-note">
        <strong>ما الذي يبقى كما هو عند التطبيق الحقيقي؟</strong>
        <br />
        نفس URLs، SEO (metadata / sitemap / canonical)، APIs، مسارات الحجز، لوحة التحكم،
        وعربي/English. يتغيّر الشكل فقط (CSS + ترتيب المكوّنات).
        <br />
        <br />
        <strong>صفحات إضافية يمكن skin-ها بنفس الأسلوب:</strong> نتائج الفنادق، تفاصيل
        الفندق، `/deals`، `/trip-builder`، `/account`، `/chat`.
      </div>
    </div>
  );
}
