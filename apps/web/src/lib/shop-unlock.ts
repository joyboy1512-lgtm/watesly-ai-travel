import { shopFetch, clearShopSession, saveShopSession } from "@/lib/shop-session";

export type ShopUnlockCustomer = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  status: string;
};

export type ShopUnlockResult = {
  accessToken: string;
  customer: ShopUnlockCustomer;
};

export type UnlockRequestResult = {
  ok: true;
  expiresInSec: number;
  requiresCode: boolean;
};

export async function requestShopUnlockOtp(phone: string) {
  return shopFetch<UnlockRequestResult>("/shop/unlock/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyShopUnlock(body: {
  phone?: string;
  code?: string;
  password?: string;
  name?: string;
  email?: string;
  guest?: boolean;
}) {
  return shopFetch<ShopUnlockResult>("/shop/unlock", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Secure unlock helper — never auto-issues a session without OTP/password
 * when the server requires proof. Guest sessions are random server-side.
 */
export async function unlockShopCustomer(input: {
  phone?: string;
  name?: string;
  email?: string;
  code?: string;
  password?: string;
  guest?: boolean;
}): Promise<ShopUnlockResult & { needsCode?: boolean }> {
  const phone = String(input.phone || "").trim();
  const asGuest = Boolean(input.guest) || !phone;

  if (asGuest) {
    return verifyShopUnlock({
      name: input.name,
      email: input.email,
      guest: true,
    });
  }

  if (input.password) {
    return verifyShopUnlock({
      phone,
      password: input.password,
      name: input.name,
      email: input.email,
    });
  }

  if (input.code && /^\d{6}$/.test(input.code.trim())) {
    return verifyShopUnlock({
      phone,
      code: input.code.trim(),
      name: input.name,
      email: input.email,
    });
  }

  const challenged = await requestShopUnlockOtp(phone);
  if (challenged.requiresCode) {
    return {
      accessToken: "",
      customer: {
        id: "",
        phone,
        email: input.email || null,
        name: input.name || null,
        status: "pending",
      },
      needsCode: true,
    };
  }

  throw new Error("يلزم رمز تحقق أو كلمة مرور");
}

export function logoutShopCustomer() {
  clearShopSession();
}

export function persistShopUnlock(result: ShopUnlockResult) {
  if (!result.accessToken && process.env.NEXT_PUBLIC_SHOP_COOKIE_AUTH !== "1") {
    return;
  }
  saveShopSession({
    accessToken: result.accessToken,
    customer: result.customer,
  });
}
