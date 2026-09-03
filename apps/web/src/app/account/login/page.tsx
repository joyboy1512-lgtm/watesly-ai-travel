"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { saveShopSession, shopFetch } from "@/lib/shop-session";
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import { safeNextPath } from "@/lib/safe-next-path";

export default function ShopLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [mode, setMode] = useState<"unlock" | "password">("unlock");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "password") {
        const result = await shopFetch<{
          accessToken: string;
          customer: {
            id: string;
            phone: string;
            email: string | null;
            name: string | null;
            status: string;
          };
        }>("/shop/login", {
          method: "POST",
          body: JSON.stringify({ phone, password }),
        });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        router.replace(safeNextPath("/account", "/account"));
        return;
      }

      if (needsCode) {
        const result = await verifyShopUnlock({ phone, name, code });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        router.replace("/account");
        return;
      }

      const result = await unlockShopCustomer({ phone, name });
      if (result.needsCode) {
        setNeedsCode(true);
        if (result.debugCode) setCode(result.debugCode);
        return;
      }
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      router.replace("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreFront>
      <section className="shop-panel">
        <h1>دخول العملاء</h1>
        <p className="shop-hint">
          حسابك مرتبط برقم الجوال. يظهر لك فقط ملفك وعائلتك وطلباتك.
        </p>
        {error ? <p className="shop-error">{error}</p> : null}
        <div className="shop-chips">
          <button
            type="button"
            className={mode === "unlock" ? "on" : undefined}
            onClick={() => {
              setMode("unlock");
              setNeedsCode(false);
              setCode("");
            }}
          >
            بالجوال
          </button>
          <button
            type="button"
            className={mode === "password" ? "on" : undefined}
            onClick={() => setMode("password")}
          >
            بكلمة المرور
          </button>
        </div>
        <form className="shop-form" onSubmit={onSubmit}>
          {mode === "unlock" ? (
            <label>
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          ) : null}
          <label>
            الجوال
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="965xxxxxxxx"
              disabled={needsCode}
            />
          </label>
          {mode === "unlock" && needsCode ? (
            <label>
              رمز التحقق
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 أرقام"
              />
            </label>
          ) : null}
          {mode === "password" ? (
            <label>
              كلمة المرور
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          ) : null}
          <button className="shop-btn" type="submit" disabled={busy}>
            {busy ? "..." : needsCode ? "تأكيد الرمز" : "دخول"}
          </button>
        </form>
      </section>
    </StoreFront>
  );
}
