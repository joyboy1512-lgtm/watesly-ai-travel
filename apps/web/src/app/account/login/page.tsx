"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { saveShopSession, shopFetch } from "@/lib/shop-session";

export default function ShopLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"unlock" | "password">("unlock");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "password"
          ? await shopFetch<{
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
            })
          : await shopFetch<{
              accessToken: string;
              customer: {
                id: string;
                phone: string;
                email: string | null;
                name: string | null;
                status: string;
              };
            }>("/shop/unlock", {
              method: "POST",
              body: JSON.stringify({ phone, name }),
            });
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
            onClick={() => setMode("unlock")}
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
            />
          </label>
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
            {busy ? "..." : "دخول"}
          </button>
        </form>
      </section>
    </StoreFront>
  );
}
