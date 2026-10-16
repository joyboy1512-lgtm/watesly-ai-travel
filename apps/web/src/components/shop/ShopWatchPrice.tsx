"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { currencyMinorFactor } from "@watesly-travel/shared";
import { createAlert } from "@/lib/platform-api";
import { getShopSession, saveShopSession, shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { airportPlaceLabel } from "@/lib/airport-cities";

type Props = {
  origin: string;
  destination: string;
  originLabel?: string;
  destinationLabel?: string;
  departDate?: string;
  returnDate?: string;
  currentPriceMinor: number;
  currency: string;
  compact?: boolean;
};

function openDatePicker(input: HTMLInputElement) {
  input.focus();
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* The browser opens the picker from the click itself. */
    }
  }
}

function formatTripDate(iso: string, locale: "ar" | "en") {
  if (!iso) return locale === "en" ? "Choose date" : "اختر التاريخ";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-KW-u-nu-latn", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function chanceLabel(target: number, current: number, locale: "ar" | "en") {
  const ratio = current > 0 ? target / current : 1;
  if (ratio >= 0.95) return locale === "en" ? "High chance" : "فرص نجاح عالية";
  if (ratio >= 0.82) return locale === "en" ? "Medium chance" : "فرص متوسطة";
  return locale === "en" ? "Lower chance" : "فرص أقل";
}

export function ShopWatchPrice(props: Props) {
  const { t, locale, formatMoneyCompact } = useShopI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [depart, setDepart] = useState(props.departDate || "");
  const [ret, setRet] = useState(props.returnDate || "");
  const [email, setEmail] = useState("");
  const [directOnly, setDirectOnly] = useState(false);
  const [target, setTarget] = useState(props.currentPriceMinor);

  const factor = currencyMinorFactor(props.currency || "KWD");
  const current = props.currentPriceMinor;
  const min = Math.max(factor, Math.round(current * 0.7));
  const max = Math.max(min, current);
  const step = Math.max(1, Math.round(factor / 20));

  useEffect(() => {
    if (!open) return;
    setDepart(props.departDate || "");
    setRet(props.returnDate || "");
    setTarget(current);
    setError("");
    const session = getShopSession();
    setEmail(session?.customer.email || "");
  }, [open, props.departDate, props.returnDate, current]);

  if (!props.origin || !props.destination || current <= 0) return null;

  function loginNext() {
    const next = encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
    );
    router.push(`/account/login?next=${next}`);
  }

  async function watch() {
    setError("");
    const session = getShopSession();
    if (!session) {
      loginNext();
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(
        locale === "en"
          ? "Enter a valid email address for the alert"
          : "أدخل بريداً إلكترونياً صالحاً لإرسال التنبيه",
      );
      return;
    }
    if (!depart) {
      setError(locale === "en" ? "Choose an outbound date" : "اختر تاريخ الذهاب");
      return;
    }
    if (ret && ret <= depart) {
      setError(
        locale === "en"
          ? "The return date must be after the outbound date"
          : "تاريخ العودة لازم يكون بعد تاريخ الذهاب",
      );
      return;
    }
    setBusy(true);
    try {
      if (cleanEmail !== (session.customer.email || "").toLowerCase()) {
        await shopFetch("/shop/me", {
          method: "PATCH",
          body: JSON.stringify({ email: cleanEmail }),
        });
        saveShopSession({
          ...session,
          customer: { ...session.customer, email: cleanEmail },
        });
      }
      await createAlert({
        origin: props.origin,
        destination: props.destination,
        currentPriceMinor: current,
        targetPriceMinor: target,
        currency: props.currency,
        departDate: depart,
        returnDate: ret || undefined,
        directOnly,
      });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("watchPriceNeedLogin"));
    } finally {
      setBusy(false);
    }
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="shop-price-alert-back" role="presentation" onClick={() => setOpen(false)}>
            <div
              className="shop-price-alert"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-price-alert-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shop-price-alert-head">
                <div>
                  <h2 id="shop-price-alert-title">
                    {locale === "en" ? "Price alert" : "تنبيه السعر"}
                  </h2>
                  <p className="shop-price-alert-route">
                    {locale === "en" ? "From" : "من"}{" "}
                    <b>
                      {locale === "en"
                        ? airportPlaceLabel(props.origin, "en")
                        : props.originLabel || props.origin}
                    </b>
                    <span aria-hidden="true"> ← </span>
                    {locale === "en" ? "to" : "إلى"}{" "}
                    <b>
                      {locale === "en"
                        ? airportPlaceLabel(props.destination, "en")
                        : props.destinationLabel || props.destination}
                    </b>
                  </p>
                </div>
                <button
                  type="button"
                  className="shop-price-alert-x"
                  onClick={() => setOpen(false)}
                  aria-label={locale === "en" ? "Close" : "إغلاق"}
                >
                  ×
                </button>
              </div>

              <div className="shop-price-alert-dates">
                <label>
                  <span>{locale === "en" ? "Outbound" : "الذهاب"}</span>
                  <strong>{formatTripDate(depart, locale)}</strong>
                  <input
                    type="date"
                    value={depart}
                    aria-label={locale === "en" ? "Outbound date" : "تاريخ الذهاب"}
                    onClick={(e) => openDatePicker(e.currentTarget)}
                    onChange={(e) => setDepart(e.target.value)}
                  />
                </label>
                <label>
                  <span>{locale === "en" ? "Return" : "العودة"}</span>
                  <strong>{formatTripDate(ret, locale)}</strong>
                  <input
                    type="date"
                    value={ret}
                    min={depart || undefined}
                    aria-label={locale === "en" ? "Return date" : "تاريخ العودة"}
                    onClick={(e) => openDatePicker(e.currentTarget)}
                    onChange={(e) => setRet(e.target.value)}
                  />
                </label>
              </div>

              <p className="shop-price-alert-lead">
                {locale === "en"
                  ? "Looking for a better fare? We will notify you when it drops below "
                  : "تبي سعراً أفضل؟ نعلمك إذا نزل السعر تحت "}
                <strong>{formatMoneyCompact(target, props.currency)}</strong>
              </p>
              <p className="shop-price-alert-chance">
                {chanceLabel(target, current, locale)}
              </p>

              <div className="shop-price-alert-slider" dir="ltr">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={target}
                  aria-label={locale === "en" ? "Maximum price" : "أقصى سعر"}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />
              </div>
              <div className="shop-price-alert-scale" dir="ltr">
                <span>{formatMoneyCompact(min, props.currency)}</span>
                <span>
                  {locale === "en" ? "Recommended" : "موصى به"}:{" "}
                  {formatMoneyCompact(current, props.currency)}
                </span>
              </div>

              <div className="shop-price-alert-mail">
                <strong>
                  {locale === "en" ? "Receive the alert by email" : "استلام التنبيه بالبريد"}
                </strong>
                <label>
                  <span>{locale === "en" ? "Email address" : "البريد الإلكتروني"}</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>

              <label className="shop-price-alert-direct">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                />
                {locale === "en" ? "Direct flights only" : "رحلات مباشرة فقط"}
              </label>

              {error ? <p className="shop-price-alert-error">{error}</p> : null}

              <button type="button" className="shop-price-alert-go" disabled={busy} onClick={() => void watch()}>
                {busy
                  ? locale === "en"
                    ? "Activating…"
                    : "جاري التفعيل…"
                  : locale === "en"
                    ? "Activate price tracking"
                    : "تفعيل متابعة السعر"}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`shop-watch-price${props.compact ? " is-compact" : ""}`}>
      <button
        type="button"
        className={`shop-btn-ghost shop-watch-price-btn${done ? " on" : ""}`}
        disabled={busy || done}
        onClick={() => setOpen(true)}
      >
        {props.compact ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.7V3.5a2 2 0 1 0-4 0v.8A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"
            />
          </svg>
        ) : null}
        {done
          ? t("watchPriceDone")
          : props.compact
            ? locale === "en"
              ? "Track price"
              : "نبّهني على السعر"
            : t("watchPrice")}
      </button>
      {props.compact ? null : <span className="shop-hint">{t("watchPriceHint")}</span>}
      {dialog}
    </div>
  );
}
