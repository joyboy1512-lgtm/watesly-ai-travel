"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { StoreFront } from "@/components/shop/StoreFront";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import "../../app/shop.css";

type Props = {
  title: string;
  titleKey?: "navFaq" | "navAbout" | "navContact" | "terms" | "privacy" | "paymentPolicy" | "navPolicy";
  children: ReactNode;
};

function LegalInner({ title, titleKey, children }: Props) {
  const { t } = useShopI18n();
  return (
    <article className="shop-legal-page">
      <h1>{titleKey ? t(titleKey) : title}</h1>
      <div className="shop-legal-body">{children}</div>
      <p className="shop-legal-back">
        <Link href="/">{t("backHome")}</Link>
      </p>
    </article>
  );
}

export function LegalPageShell(props: Props) {
  return (
    <StoreFront>
      <LegalInner {...props} />
    </StoreFront>
  );
}
