import "./shop.css";
import "./shop-showcase.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopHomeClient } from "@/components/shop/ShopHomeClient";

export default function PublicHomePage() {
  return (
    <StoreFront wide>
      <ShopHomeClient />
    </StoreFront>
  );
}
