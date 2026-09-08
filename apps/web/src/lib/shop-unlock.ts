import { shopFetch } from "@/lib/shop-session";

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
  /** Present only in non-production for local testing */
  debugCode?: string;
};

export async function requestShopUnlockOtp(phone: string) {
  return shopFetch<UnlockRequestResult>("/shop/unlock/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyShopUnlock(body: {
  phone: string;
  code?: string;
  name?: string;
  email?: string;
}) {
  return shopFetch<ShopUnlockResult>("/shop/unlock", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Request OTP when required; otherwise unlock immediately. */
export async function unlockShopCustomer(input: {
  phone: string;
  name?: string;
  email?: string;
  code?: string;
}): Promise<ShopUnlockResult & { needsCode?: boolean; debugCode?: string }> {
  const phone = input.phone.trim();
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
      debugCode: challenged.debugCode,
    };
  }

  return verifyShopUnlock({
    phone,
    name: input.name,
    email: input.email,
  });
}
