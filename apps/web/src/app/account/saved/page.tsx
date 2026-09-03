"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { formatMoneyMinor } from "@/lib/format";
import {
  listWishlist,
  removeWishlistItem,
  subscribeWishlist,
  type WishlistItem,
} from "@/lib/shop-wishlist";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export default function SavedPage() {
  const { t } = useShopI18n();
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(listWishlist());
    sync();
    return subscribeWishlist(sync);
  }, []);

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>{t("wishlistTitle")}</h1>
        {items.length === 0 ? (
          <p className="lead">{t("wishlistEmpty")}</p>
        ) : (
          <ul className="shop-wishlist-list">
            {items.map((item) => (
              <li key={item.id} className="wg-platform-card shop-wishlist-row">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <div className="shop-wishlist-ph" />
                )}
                <div>
                  <strong>{item.title}</strong>
                  {item.subtitle ? <p>{item.subtitle}</p> : null}
                  {item.priceMinor ? (
                    <span>{formatMoneyMinor(item.priceMinor, item.currency)}</span>
                  ) : null}
                </div>
                <div className="shop-wishlist-row-actions">
                  <Link href={item.href} className="wg-btn">
                    {t("openSaved")}
                  </Link>
                  <button
                    type="button"
                    className="wg-btn secondary"
                    onClick={() => removeWishlistItem(item.id)}
                  >
                    {t("wishlistRemove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StoreFront>
  );
}
