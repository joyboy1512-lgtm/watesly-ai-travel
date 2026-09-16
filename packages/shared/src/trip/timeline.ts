import type { TripDraftState, TripTimelineItem } from "./types";

/** بناء جدول زمني مبسّط لملف الرحلة من بيانات الـ draft */
export function buildTripTimeline(draft: TripDraftState): TripTimelineItem[] {
  const items: TripTimelineItem[] = [];
  const dest = draft.flight.destinationLabel || draft.flight.destination || "الوجهة";
  const depart = draft.flight.departDate;
  const ret = draft.flight.returnDate;

  if (draft.services.includes("flight") && depart) {
    items.push({
      id: "airport-reminder",
      day: depart,
      time: "05:30",
      kind: "reminder",
      title: "تذكير: التوجه إلى المطار",
      description: "يُنصح بالوصول قبل 3 ساعات من الإقلاع",
    });
    items.push({
      id: "flight-out",
      day: depart,
      time: "08:30",
      kind: "flight",
      title: `رحلة ${draft.flight.origin} → ${draft.flight.destination}`,
      description: draft.selectedOffers.flight?.label,
      actionLabel: "عرض التذكرة",
    });
  }

  if (draft.services.includes("transfer")) {
    items.push({
      id: "transfer-in",
      day: depart || draft.transfer.pickupDate,
      time: draft.transfer.pickupTime || "11:30",
      kind: "transfer",
      title: "استقبال من المطار",
      description: `${draft.transfer.pickup} → ${draft.transfer.dropoff}`,
      actionLabel: "تفاصيل الاستقبال",
    });
  }

  if (draft.services.includes("hotel") && draft.hotel.checkIn) {
    items.push({
      id: "hotel-checkin",
      day: draft.hotel.checkIn,
      time: "15:00",
      kind: "hotel",
      title: "تسجيل الدخول — الفندق",
      description: draft.selectedOffers.hotel?.label,
      actionLabel: "قسيمة الفندق",
    });
  }

  if (draft.services.includes("activity")) {
    items.push({
      id: "activity-1",
      day: draft.activity.startDate || depart,
      time: "18:00",
      kind: "activity",
      title: draft.selectedOffers.activity?.label || "نشاط مقترح",
      actionLabel: "تفاصيل النشاط",
    });
  }

  items.push({
    id: "free-time",
    day: depart,
    time: "—",
    kind: "free",
    title: "وقت حر",
    description: `استكشف ${dest} على راحتك`,
  });

  if (draft.services.includes("flight") && ret) {
    items.push({
      id: "flight-back",
      day: ret,
      time: "14:00",
      kind: "flight",
      title: `رحلة العودة ${draft.flight.destination} → ${draft.flight.origin}`,
      actionLabel: "عرض التذكرة",
    });
  }

  return items;
}
