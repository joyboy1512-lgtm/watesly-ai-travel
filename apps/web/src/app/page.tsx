import "./hotel-rich.css";
import "./prc-search.css";
import "./shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopHomeClient } from "@/components/shop/ShopHomeClient";

export default function PublicHomePage() {
  return (
    <StoreFront>
      <ShopHomeClient />
    </StoreFront>
  );
}
