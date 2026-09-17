"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_CMS, normalizeCmsState, type CmsState } from "@watesly-travel/shared";

const ShopCmsContext = createContext<CmsState>(DEFAULT_CMS);

export function ShopCmsProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CmsState>(DEFAULT_CMS);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
    fetch(`${apiBase}/shop/platform/cms`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCms(normalizeCmsState(data));
      })
      .catch(() => undefined);
  }, []);

  return <ShopCmsContext.Provider value={cms}>{children}</ShopCmsContext.Provider>;
}

export function useShopCms(): CmsState {
  return useContext(ShopCmsContext);
}
