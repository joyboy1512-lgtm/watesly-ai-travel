"use client";

import "../../../../hotel-rich.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import {
  clearBookingDraft,
  getBookingDraft,
  type ActivityBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";

export default function ActivityBookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ActivityBookingDraft | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored) {
      router.replace("/dashboard/inquiries");
      return;
    }
    if (stored.serviceType !== "activity") {
      router.replace("/dashboard/inquiries/book");
      return;
    }
    setDraft(stored);
  }, [router]);

  async function submit() {
    if (!draft) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("أدخل الاسم والبريد والجوال");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ booking: { id: string } }>(
        "/bookings/from-draft",
        {
          method: "POST",
          body: JSON.stringify({
            serviceType: "activity",
            inquiryId: draft.inquiryId,
            offer: {
              id: draft.activity.id,
              description: draft.activity.description,
              sellAmountMinor: draft.activity.sellAmountMinor,
              currency: draft.activity.currency,
              details: draft.activity.details,
              providerKey: String(
                draft.activity.details.provider || "hotelbeds-activities",
              ),
              providerOfferRef: draft.activity.id,
            },
            route: {
              origin: draft.destination,
              destination: draft.destination,
              originLabel: draft.destinationLabel,
              destinationLabel: draft.destinationLabel,
              departDate: draft.fromDate,
              returnDate: draft.toDate,
            },
            adults: draft.adults,
            children: draft.children,
            contact: { email, phone },
            extras: { guestName: name },
            payment: { method: "manual", status: "unpaid" },
          }),
        },
      );
      clearBookingDraft();
      setBookingId(result.booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الحجز");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) return null;

  const title = String(
    draft.activity.details.activityName || draft.activity.description,
  );

  return (
    <AppShell title="حجز نشاط">
      {bookingId ? (
        <section className="panel">
          <h2>تم حفظ طلب النشاط</h2>
          <p>رقم الحجز: {bookingId}</p>
          <p className="hint">
            تأكيد المزوّد الحي غير مفعّل بعد — يمكنك متابعة الطلب من الحجوزات.
          </p>
          <Link href="/dashboard/bookings" className="btn">
            عرض الحجوزات
          </Link>
        </section>
      ) : (
        <section className="panel">
          <h2>{title}</h2>
          <p>
            {draft.destinationLabel} · {draft.fromDate} → {draft.toDate} ·{" "}
            {draft.adults} بالغ
            {draft.children ? ` · ${draft.children} طفل` : ""}
          </p>
          <p>
            <strong>
              {formatMoneyMinor(
                draft.activity.sellAmountMinor,
                draft.activity.currency,
              )}
            </strong>
          </p>
          {error ? <p className="flight-status error">{error}</p> : null}
          <label>
            الاسم
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            البريد
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            الجوال
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="hotel-modal-toolbar">
            <button
              type="button"
              className="btn"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? "..." : "حفظ الطلب"}
            </button>
            <Link href="/dashboard/inquiries">رجوع للبحث</Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
