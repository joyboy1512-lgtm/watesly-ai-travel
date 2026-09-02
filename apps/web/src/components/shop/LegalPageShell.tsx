import Link from "next/link";
import type { ReactNode } from "react";
import { StoreFront } from "@/components/shop/StoreFront";
import "../../app/shop.css";

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  return (
    <StoreFront>
      <article className="shop-legal-page">
        <h1>{title}</h1>
        <div className="shop-legal-body">{children}</div>
        <p className="shop-legal-back">
          <Link href="/">← العودة للصفحة الرئيسية</Link>
        </p>
      </article>
    </StoreFront>
  );
}
