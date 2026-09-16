"use client";

import "../../prov-desk.css";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type FxRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  updatedAt: string;
};

type FxPayload = {
  displayCurrency: string;
  supportedCurrencies: Array<{ code: string; label: string; symbol: string }>;
  settings: {
    autoUpdateEnabled: boolean;
    autoUpdateSource: "frankfurter" | "open.er-api" | "custom";
    autoUpdateUrl?: string | null;
    lastAutoSyncAt?: string | null;
  };
  rates: FxRate[];
};

export default function CurrencyPage() {
  const [data, setData] = useState<FxPayload | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("KWD");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoSource, setAutoSource] =
    useState<FxPayload["settings"]["autoUpdateSource"]>("frankfurter");
  const [autoUrl, setAutoUrl] = useState("");
  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  async function load() {
    const payload = await apiFetch<FxPayload>("/fx");
    setData(payload);
    setDisplayCurrency(payload.displayCurrency);
    setAutoEnabled(payload.settings.autoUpdateEnabled);
    setAutoSource(payload.settings.autoUpdateSource);
    setAutoUrl(payload.settings.autoUpdateUrl || "");
    const next: Record<string, string> = {};
    for (const r of payload.rates) {
      next[`${r.fromCurrency}_${r.toCurrency}`] = String(r.rate);
    }
    setDraftRates(next);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const displayRates = useMemo(() => {
    if (!data) return [];
    return data.rates.filter((r) => r.toCurrency === displayCurrency);
  }, [data, displayCurrency]);

  async function saveSettings() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      await apiFetch("/fx/settings", {
        method: "PATCH",
        body: JSON.stringify({
          displayCurrency,
          autoUpdateEnabled: autoEnabled,
          autoUpdateSource: autoSource,
          autoUpdateUrl: autoSource === "custom" ? autoUrl : null,
        }),
      });
      setOk("تم حفظ إعدادات العملة");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setLoading(false);
    }
  }

  async function saveRates() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      const rates = Object.entries(draftRates)
        .map(([key, value]) => {
          const [fromCurrency, toCurrency] = key.split("_");
          return {
            fromCurrency: fromCurrency || "",
            toCurrency: toCurrency || displayCurrency,
            rate: Number(value),
          };
        })
        .filter((r) => r.fromCurrency && r.rate > 0);
      await apiFetch("/fx/rates", {
        method: "PUT",
        body: JSON.stringify({ rates }),
      });
      setOk("تم تحديث أسعار الصرف المعروضة");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ الأسعار");
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      await apiFetch("/fx/settings", {
        method: "PATCH",
        body: JSON.stringify({
          displayCurrency,
          autoUpdateEnabled: true,
          autoUpdateSource: autoSource,
          autoUpdateUrl: autoSource === "custom" ? autoUrl : null,
        }),
      });
      await apiFetch("/fx/sync", { method: "POST" });
      setOk("تمت مزامنة أسعار الصرف اليومية");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشلت المزامنة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="العملة وسعر الصرف">
      <div className="fx-desk">
        <section className="fx-hero">
          <p className="prov-kicker">Currency & FX</p>
          <h3>عملة العرض وسعر الصرف</h3>
          <p>
            Duffel قد يعيد السعر بالدولار — عند اختيار الدينار كعملة للموقع يتم
            التحويل تلقائيًا حسب الأسعار المعتمدة هنا. يمكن التعديل يدويًا أو
            الربط بمصدر يومي تلقائي.
          </p>
        </section>

        {error ? <div className="prov-alert err">{error}</div> : null}
        {ok ? <div className="prov-alert ok">{ok}</div> : null}

        <div className="fx-layout">
          <section className="fx-card">
            <h4>عملة الموقع</h4>
            <p>العملة الافتراضية لنتائج البحث والعروض المعروضة للعميل.</p>

            <label className="prov-field">
              <span>عملة العرض</span>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
              >
                {(data?.supportedCurrencies || []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="fx-toggle">
              <div>
                <strong>تحديث تلقائي يومي</strong>
                <span>جلب الأسعار من مصدر خارجي عند المزامنة</span>
              </div>
              <button
                type="button"
                className={`fx-switch ${autoEnabled ? "on" : ""}`}
                onClick={() => setAutoEnabled((v) => !v)}
                aria-pressed={autoEnabled}
              >
                <i />
              </button>
            </div>

            <label className="prov-field">
              <span>مصدر الأسعار</span>
              <select
                value={autoSource}
                onChange={(e) =>
                  setAutoSource(
                    e.target.value as FxPayload["settings"]["autoUpdateSource"],
                  )
                }
              >
                <option value="frankfurter">Frankfurter (ECB يومي)</option>
                <option value="open.er-api">Open Exchange Rates API</option>
                <option value="custom">رابط مخصص (JSON)</option>
              </select>
            </label>

            {autoSource === "custom" ? (
              <label className="prov-field">
                <span>رابط المصدر</span>
                <input
                  value={autoUrl}
                  onChange={(e) => setAutoUrl(e.target.value)}
                  placeholder="https://…/latest.json"
                />
              </label>
            ) : null}

            {data?.settings.lastAutoSyncAt ? (
              <p style={{ margin: 0, color: "#5c7078", fontSize: "0.82rem" }}>
                آخر مزامنة:{" "}
                {new Date(data.settings.lastAutoSyncAt).toLocaleString("ar")}
              </p>
            ) : null}

            <div className="prov-actions">
              <button
                type="button"
                className="prov-btn prov-btn-primary"
                disabled={loading}
                onClick={() => void saveSettings()}
              >
                حفظ الإعدادات
              </button>
              <button
                type="button"
                className="prov-btn prov-btn-soft"
                disabled={loading}
                onClick={() => void syncNow()}
              >
                مزامنة الآن
              </button>
            </div>
          </section>

          <section className="fx-card">
            <h4>أسعار الصرف المعروضة</h4>
            <p>
              1 وحدة من العملة المصدر = ؟ {displayCurrency}. عدّل يدويًا أو
              املأها بالمزامنة التلقائية.
            </p>

            <div>
              {displayRates.length === 0 ? (
                <div className="prov-empty">
                  <strong>لا أسعار بعد</strong>
                  <p>احفظ الإعدادات أو اضغط مزامنة الآن لملء الجدول.</p>
                </div>
              ) : (
                displayRates.map((r) => {
                  const key = `${r.fromCurrency}_${r.toCurrency}`;
                  return (
                    <div key={r.id} className="fx-rate-row">
                      <strong>{r.fromCurrency}</strong>
                      <span style={{ color: "#5c7078", fontSize: "0.84rem" }}>
                        → {r.toCurrency}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={draftRates[key] ?? String(r.rate)}
                        onChange={(e) =>
                          setDraftRates((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <span className={`prov-badge ${r.source === "auto" ? "ok" : "muted"}`}>
                        {r.source === "auto" ? "تلقائي" : "يدوي"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="prov-actions">
              <button
                type="button"
                className="prov-btn prov-btn-primary"
                disabled={loading}
                onClick={() => void saveRates()}
              >
                حفظ الأسعار
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
