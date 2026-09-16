"use client";

import { useEffect, useState } from "react";
import { getShopSession, shopFetch } from "@/lib/shop-session";
import {
  listWishlist,
  subscribeWishlist,
  toggleWishlistItem,
  wishlistHas,
  wishlistSlug,
  type WishlistItem,
} from "@/lib/shop-wishlist";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

type Props = {
  item: Omit<WishlistItem, "savedAt">;
  compact?: boolean;
};

export function ShopWishlistButton({ item, compact }: Props) {
  const { t } = useShopCopy();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(wishlistHas(item.id));
    sync();
    return subscribeWishlist(sync);
  }, [item.id]);

  function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleWishlistItem(item);
    setSaved(result.saved);
    if (getShopSession()) {
      void shopFetch("/shop/platform/me/favorites", {
        method: "POST",
        body: JSON.stringify({ slug: wishlistSlug(item) }),
      }).catch(() => undefined);
    }
  }

  return (
    <button
      type="button"
      className={`shop-wishlist-btn${saved ? " on" : ""}${compact ? " compact" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? t("savedToWishlist") : t("saveToWishlist")}
      title={saved ? t("savedToWishlist") : t("saveToWishlist")}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          d="M12.1 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5z"
        />
      </svg>
      {compact ? null : <span>{saved ? t("savedToWishlist") : t("saveToWishlist")}</span>}
    </button>
  );
}

export function useWishlistCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(listWishlist().length);
    sync();
    return subscribeWishlist(sync);
  }, []);
  return count;
}
