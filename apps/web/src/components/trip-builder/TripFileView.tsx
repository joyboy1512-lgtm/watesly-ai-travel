"use client";

import { useState } from "react";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { useTripBuilder } from "./TripBuilderProvider";
import { MOCKUP_TRIP, money } from "./mockup-data";

export function TripFileView({ tripId }: { tripId: string }) {
  const { draft } = useTripBuilder();
  const [day, setDay] = useState(MOCKUP_TRIP.dayTabs[0]);
  const [assistantReply, setAssistantReply] = useState<string | null>(null);

  const dest =
    draft.flight.destinationLabel || draft.flight.destination || MOCKUP_TRIP.destinationAr;
  const ref = MOCKUP_TRIP.bookingRef;

  const timeline = [
    { time: "05:30", title: "تذكير بالمغادرة إلى المطار", kind: "reminder", action: null as string | null, meta: null as string | null },
    {
      time: "08:30",
      title: `${MOCKUP_TRIP.originCode} → ${MOCKUP_TRIP.destCode}`,
      kind: "flight",
      action: "عرض التذكرة",
      meta: "المدة 2س 45د",
    },
    {
      time: "11:30",
      title: "السائق بانتظارك في مطار دبي",
      kind: "transfer",
      action: "تفاصيل الاستقبال",
      meta: null,
    },
    {
      time: "13:00",
      title: `تسجيل الدخول — ${MOCKUP_TRIP.hotel.name}`,
      kind: "hotel",
      action: "قسيمة الفندق",
      meta: null,
    },
    {
      time: "18:00",
      title: "وقت حر — اقتراح من Ai: ممشى دبي مارينا",
      kind: "free",
      action: "اقتراحات المكان",
      meta: null,
    },
  ];

  function ask(q: string) {
    if (q.includes("المطار")) {
      setAssistantReply("يُفضّل الوصول قبل 3 ساعات من الإقلاع. رحلتك الساعة 08:30.");
    } else if (q.includes("السائق")) {
      setAssistantReply("سيجدك السائق عند صالة الوصول — التفاصيل في قسيمة المواصلات.");
    } else if (q.includes("مطعم")) {
      setAssistantReply(`اقتراح Ai قرب ${dest}: مطاعم دبي مارينا وممشى جميرا.`);
    } else {
      setAssistantReply("كيف يمكنني مساعدتك في رحلتك؟");
    }
  }

  return (
    <div className="wg-ru-page" dir="rtl">
      <header className="wg-ru-file-head">
        <div>
          <h1>🧳 ملف رحلتي إلى {dest}</h1>
          <p className="wg-ru-muted">
            {ref} · {MOCKUP_TRIP.dateFromAr} — {MOCKUP_TRIP.dateToAr}
          </p>
          <span className="wg-ru-badge-green">جميع الحجوزات مؤكدة</span>
        </div>
        <div className="wg-ru-file-actions">
          <button type="button" className="wg-ru-ghost-btn">
            📅 إضافة إلى التقويم
          </button>
          <button type="button" className="wg-ru-ghost-btn">
            مشاركة
          </button>
          <button type="button" className="wg-ru-outline-btn">
            تحميل ملف الرحلة PDF
          </button>
        </div>
      </header>

      <div className="wg-ru-next-event">
        <span className="wg-ru-next-tag">الموعد القادم</span>
        <div className="wg-ru-next-grid3">
          <div>
            <p className="wg-ru-countdown">⏱ متبقي يومان و 6 ساعات</p>
          </div>
          <div>
            <strong>
              رحلة {MOCKUP_TRIP.originAr} إلى {dest}
            </strong>
            <p>الأحد 25 مايو · الإقلاع 08:30</p>
            <button type="button" className="wg-ru-link-btn">
              تعليمات المطار
            </button>
          </div>
          <div>
            <button type="button" className="wg-ru-primary-btn">
              عرض التذكرة
            </button>
          </div>
        </div>
      </div>

      <div className="wg-ru-layout">
        <div className="wg-ru-main">
          <div className="wg-ru-form-card">
            <h3>جدول رحلتك</h3>
            <div className="wg-ru-day-tabs">
              {MOCKUP_TRIP.dayTabs.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`wg-ru-day-tab${day === d ? " active" : ""}`}
                  onClick={() => setDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="wg-ru-timeline">
              {timeline.map((item) => (
                <div key={item.time + item.title} className="wg-ru-timeline-row">
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.title}</strong>
                    {item.meta ? <p className="wg-ru-muted">{item.meta}</p> : null}
                    {item.action ? (
                      <button type="button" className="wg-ru-outline-btn">
                        {item.action}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wg-ru-form-card">
            <h3>أنشطة قادمة في رحلتك</h3>
            <div className="wg-ru-act-cards">
              {MOCKUP_TRIP.activities.map((a) => (
                <div key={a.title} className="wg-ru-act-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt={a.title} />
                  <div>
                    <strong>
                      اليوم {a.day}: {a.title}
                    </strong>
                    <p>
                      {a.dateAr} · {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="wg-ru-outline-btn full">
            احفظ الرحلة للاستخدام بدون إنترنت
          </button>
        </div>

        <aside className="wg-ru-aside">
          <div className="wg-ru-summary-card">
            <h3>مستندات رحلتي</h3>
            <ul className="wg-ru-docs">
              {["تذكرة الطيران", "قسيمة الفندق", "قسيمة المواصلات", "تذاكر الأنشطة"].map((doc) => (
                <li key={doc}>
                  <span>✓ {doc}</span>
                  <span>
                    <button type="button" className="wg-ru-ghost-btn">
                      عرض
                    </button>
                    <button type="button" className="wg-ru-ghost-btn">
                      تحميل
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="wg-ru-link-btn">
              تحميل جميع المستندات
            </button>
          </div>

          <div className="wg-ru-summary-card">
            <h3>معلومات مهمة</h3>
            <p>
              حالة الرحلة: <span className="ok">في الموعد</span>
            </p>
            <p>الطقس في {dest}: 34°</p>
            <p>تسجيل الدخول للفندق: 15:00</p>
            <p className="wg-ru-support-line">
              🎧 الدعم: {COMPANY_LEGAL.phoneDisplay}
              <a
                href={COMPANY_LEGAL.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="wg-ru-wa-inline"
                aria-label="واتساب"
              >
                واتساب
              </a>
            </p>
          </div>

          <div className="wg-ru-summary-card">
            <h3>مساعد رحلتك · Ai</h3>
            <div className="wg-ru-assistant-qs">
              {["متى أذهب إلى المطار؟", "أين سأجد السائق؟", "اقترح مطعماً قريباً"].map((q) => (
                <button key={q} type="button" onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
            {assistantReply ? <p className="wg-ru-assistant-reply">{assistantReply}</p> : null}
            <button type="button" className="wg-ru-primary-btn">
              اسأل Ai
            </button>
            <p className="wg-ru-muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
              الإجمالي المدفوع: {money(MOCKUP_TRIP.prices.total)} · {tripId.slice(-6)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
