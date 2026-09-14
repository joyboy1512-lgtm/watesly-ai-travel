"use client";

import { useRef, useState } from "react";
import { compressPassportImage } from "@/lib/compress-passport-image";
import { shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export type PassportFields = {
  title?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  gender?: string;
};

type Props = {
  onFields: (fields: PassportFields) => void;
};

export function PassportScanField({ onFields }: Props) {
  const { t } = useShopI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  async function onFile(file?: File | null) {
    if (!file) return;
    const looksImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
    if (!looksImage) {
      setHint(t("passportImageType"));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setHint(t("passportImageTooBig"));
      return;
    }
    setBusy(true);
    setHint(t("passportScanning"));
    try {
      const { base64, mimeType } = await compressPassportImage(file);
      const result = await shopFetch<{
        fields: PassportFields;
        confidence: number;
        notes?: string;
      }>("/shop/passport-scan", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const f = result.fields || {};
      const filled = Boolean(f.firstName || f.lastName || f.birthDate || f.passportNumber);
      if (!filled) {
        setHint(result.notes || t("passportScanEmpty"));
        return;
      }
      onFields({
        ...f,
        birthDate: f.birthDate?.slice(0, 10),
        passportExpiry: f.passportExpiry?.slice(0, 10),
        nationality: f.nationality?.toUpperCase(),
        passportNumber: f.passportNumber?.replace(/\s+/g, "").toUpperCase(),
        gender:
          f.gender ||
          (f.title === "mrs" || f.title === "ms" ? "female" : f.title === "mr" ? "male" : undefined),
      });
      const pct = Math.round((result.confidence || 0) * 100);
      setHint(
        result.notes ||
          `${t("passportScanOk")}${pct ? ` · ${pct}%` : ""}. ${t("passportScanReview")}`,
      );
    } catch (err) {
      setHint(err instanceof Error ? err.message : t("passportScanFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="shop-passport-scan-banner">
      <div>
        <strong>{t("scanPassport")}</strong>
        <p>{t("scanPassportHint")}</p>
      </div>
      <button
        type="button"
        className="shop-passport-scan-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? t("passportScanning") : t("uploadPassport")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="shop-passport-file-input"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {hint ? <p className="shop-passport-scan-hint">{hint}</p> : null}
    </div>
  );
}
