"use client";

import { useMemo, useState } from "react";
import { buildTripTimeline } from "@watesly-travel/shared";
import { formatKwdMinor } from "@/lib/platform-api";
import { useTripBuilder } from "./TripBuilderProvider";

const QUICK_QUESTIONS = [
  "متى أذهب إلى المطار؟",
  "أين سأجد السائق؟",
  "ما موعد تسجيل الفندق؟",
  "ما أنشطتي اليوم؟",
  "اقترح مطعمًا قريبًا",
  "هل يوجد تعارض في البرنامج؟",
];

export function TripFileView({ tripId }: { tripId: string }) {
  const { draft } = useTripBuilder();
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(draft.flight.departDate);

  const dest = draft.flight.destinationLabel || draft.flight.destination || "الوجهة";
  const bookingRef = `TRP-${tripId.slice(-8).toUpperCase()}`;
  const timeline = useMemo(() => buildTripTimeline(draft), [draft]);

  const days = useMemo(() => {
    const set = new Set(timeline.map((t) => t.day).filter(Boolean));
    return Array.from(set);
  }, [timeline]);

  const dayItems = timeline.filter((t) => t.day === selectedDay || !selectedDay);

  const allConfirmed = draft.services.every((s) => draft.selectedOffers[s]);

  function askAssistant(q: string) {
    if (q.includes("المطار")) {
      setAssistantReply("يُنصح بالوصول قبل 3 ساعات من إقلاع رحلتك. رحلتك القادمة في 08:30.");
    } else if (q.includes("السائق")) {
      setAssistantReply(
        `سيجدك السائق عند صالة الوصول — ${draft.transfer.pickup || "مطار الوصول"}. تفاصيل الاستقبال في قسيمة المواصلات.`,
      );
    } else if (q.includes("الفندق")) {
      setAssistantReply("موعد تسجيل الدخول المعتاد 15:00. يمكن طلب وصول مبكر حسب التوفر.");
    } else if (q.includes("أنشطتي")) {
      setAssistantReply(draft.selectedOffers.activity?.label || "لا أنشطة محددة لهذا اليوم.");
    } else if (q.includes("مطعم")) {
      setAssistantReply(`يمكنني اقتراح مطاعم قرب ${dest} — هل تفضّل مطبخًا معينًا؟`);
    } else if (q.includes("تعارض")) {
      setAssistantReply("لا يوجد تعارض واضح في برنامجك الحالي.");
    } else {
      setAssistantReply("كيف يمكنني مساعدتك في رحلتك؟");
    }
  }

  const total = useMemo(() => {
    let sum = 0;
    const o = draft.selectedOffers;
    if (o.flight) sum += o.flight.sellAmountMinor;
    if (o.hotel) sum += o.hotel.sellAmountMinor;
    if (o.transfer) sum += o.transfer.sellAmountMinor;
    if (o.activity) sum += o.activity.sellAmountMinor;
    return sum;
  }, [draft.selectedOffers]);

  return (
    <div className="wg-trip-flow">
      <header className="wg-trip-card" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, color: "var(--tv-primary,#13357b)" }}>
          ملف رحلتي إلى {dest}
        </h1>
        <p style={{ margin: "0.35rem 0", color: "var(--wg-muted)" }}>
          {draft.flight.departDate}
          {draft.flight.returnDate ? ` — ${draft.flight.returnDate}` : ""} · {bookingRef}
        </p>
        <span
          style={{
            display: "inline-block",
            padding: "0.25rem 0.65rem",
            borderRadius: 999,
            background: allConfirmed ? "#dcfce7" : "#fef3c7",
            color: allConfirmed ? "#18785a" : "#b45309",
            fontSize: "0.82rem",
          }}
        >
          {allConfirmed ? "جميع الحجوزات مؤكدة" : "بعض الخدمات قيد المعالجة"}
        </span>
      </header>

      <div className="wg-trip-card" style={{ marginBottom: "1rem", background: "#f0f7ff" }}>
        <h3 style={{ margin: "0 0 0.5rem" }}>الموعد القادم</h3>
        <p style={{ margin: 0 }}>
          <strong>رحلة {draft.flight.origin} → {draft.flight.destination}</strong>
          {" · "}
          {draft.flight.departDate} 08:30
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--wg-muted)" }}>
          البوابة: تظهر عند توفرها
        </p>
        <button type="button" className="wg-trip-primary-btn" style={{ maxWidth: 200, marginTop: "0.5rem" }}>
          عرض التذكرة
        </button>
      </div>

      <div className="wg-trip-grid">
        <div>
          <div className="wg-trip-card" style={{ marginBottom: "1rem" }}>
            <h3>جدول الرحلة</h3>
            {days.length > 1 ? (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="wg-trip-tier-tab"
                    aria-pressed={selectedDay === d}
                    onClick={() => setSelectedDay(d)}
                    style={{ flex: "0 0 auto", minWidth: 80 }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="wg-trip-timeline">
              {dayItems.map((item) => (
                <div key={item.id} className="wg-trip-timeline-item">
                  <time style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>
                    {item.time}
                  </time>
                  <strong>{item.title}</strong>
                  {item.description ? (
                    <p style={{ margin: "0.15rem 0", fontSize: "0.85rem" }}>{item.description}</p>
                  ) : null}
                  {item.actionLabel ? (
                    <button type="button" className="wg-trip-change-btn">
                      {item.actionLabel}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="wg-trip-assistant">
            <h3 style={{ margin: 0 }}>مساعد رحلتك</h3>
            <div className="wg-trip-assistant-quick">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => askAssistant(q)}>
                  {q}
                </button>
              ))}
            </div>
            {assistantReply ? (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>{assistantReply}</p>
            ) : null}
            <button type="button" className="wg-trip-primary-btn" style={{ marginTop: "0.5rem" }}>
              اسأل المساعد
            </button>
          </div>
        </div>

        <aside>
          <div className="wg-trip-card" style={{ marginBottom: "1rem" }}>
            <h3>مستندات الرحلة</h3>
            <ul style={{ margin: 0, paddingInlineStart: "1.1rem", fontSize: "0.88rem" }}>
              {draft.selectedOffers.flight ? <li>تذكرة الطيران ✓</li> : null}
              {draft.selectedOffers.hotel ? <li>قسيمة الفندق ✓</li> : null}
              {draft.selectedOffers.transfer ? <li>قسيمة المواصلات</li> : null}
              {draft.selectedOffers.activity ? <li>تذاكر الأنشطة</li> : null}
              <li>إيصال الدفع</li>
            </ul>
            <button type="button" className="wg-trip-primary-btn" style={{ marginTop: "0.75rem" }}>
              تحميل جميع المستندات
            </button>
          </div>

          <div className="wg-trip-card">
            <h3>معلومات مهمة</h3>
            <p style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>
              حالة الرحلة: في الموعد
            </p>
            <p style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>
              الطقس في {dest}: تظهر عند توفرها
            </p>
            <p style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>
              الدعم: +965 2222 0000
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)", marginTop: "0.5rem" }}>
              الإجمالي المدفوع: {formatKwdMinor(total)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
