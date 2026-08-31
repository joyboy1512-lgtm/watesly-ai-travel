import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../auth/decorators";
import {
  CustomerAuthGuard,
  CurrentCustomer,
  type ShopCustomer,
} from "./shop-auth";
import { PlatformService } from "./platform.service";
import type { PackageComponent, WeekendDeal, CmsState, PointsRules } from "@watesly-travel/shared";

/**
 * Additive platform routes. Safe no-ops for production until clients call them
 * and WG_PLATFORM is enabled on the web.
 */
@Controller("shop/platform")
@Public()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get("catalog")
  catalog() {
    return this.platform.catalog();
  }

  @Get("deals")
  deals() {
    return this.platform.listDeals();
  }

  @Get("deals/:slug")
  deal(@Param("slug") slug: string) {
    return this.platform.getDeal(slug);
  }

  @Post("deals/:slug/book")
  bookDeal(@Param("slug") slug: string) {
    return this.platform.bookDealAsTrip(slug);
  }

  @Get("destinations")
  destinations() {
    return this.platform.listDestinations();
  }

  @Get("destinations/:slug")
  destination(@Param("slug") slug: string) {
    return this.platform.getDestination(slug);
  }

  @Get("cms")
  cms() {
    return this.platform.getCms();
  }

  @Patch("cms")
  updateCms(@Body() body: Partial<CmsState>) {
    return this.platform.updateCms(body);
  }

  @Post("cms/deals")
  upsertDeal(@Body() body: WeekendDeal) {
    return this.platform.upsertDeal(body);
  }

  @Get("trips/:id")
  trip(@Param("id") id: string) {
    return this.platform.tripPrice(id);
  }

  @Post("trips")
  createTrip() {
    return this.platform.getOrCreateTrip();
  }

  @Post("trips/:id/components")
  setComponent(
    @Param("id") id: string,
    @Body() body: PackageComponent,
  ) {
    return this.platform.setTripComponent(id, body);
  }

  @Post("trips/:id/components/remove")
  removeComponent(
    @Param("id") id: string,
    @Body() body: { kind: PackageComponent["kind"] },
  ) {
    return this.platform.removeTripComponent(id, body.kind);
  }

  @Get("me/points")
  @UseGuards(CustomerAuthGuard)
  points(@CurrentCustomer() customer: ShopCustomer) {
    return {
      account: this.platform.getPoints(customer),
      rules: this.platform.getPointsRules(),
    };
  }

  @Patch("admin/points-rules")
  pointsRules(@Body() body: Partial<PointsRules>) {
    return this.platform.setPointsRules(body);
  }

  @Get("me/referral")
  @UseGuards(CustomerAuthGuard)
  referral(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.getOrCreateReferral(customer);
  }

  @Post("me/referral/apply")
  @UseGuards(CustomerAuthGuard)
  applyReferral(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { code?: string },
  ) {
    return this.platform.applyReferral(String(body.code || ""), customer.id);
  }

  @Get("me/alerts")
  @UseGuards(CustomerAuthGuard)
  alerts(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listAlerts(customer.id);
  }

  @Post("me/alerts")
  @UseGuards(CustomerAuthGuard)
  createAlert(
    @CurrentCustomer() customer: ShopCustomer,
    @Body()
    body: {
      origin: string;
      destination: string;
      currentPriceMinor: number;
      targetPriceMinor: number;
      currency?: string;
      departDate?: string;
      returnDate?: string;
    },
  ) {
    return this.platform.createAlert(customer, body);
  }

  @Post("alerts/check")
  checkAlerts(
    @Body() body: { origin: string; destination: string; priceMinor: number },
  ) {
    return this.platform.checkAlerts(body);
  }

  @Get("me/notifications")
  @UseGuards(CustomerAuthGuard)
  notifications(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listNotifications(customer.id);
  }

  @Post("me/notifications/:id/read")
  @UseGuards(CustomerAuthGuard)
  readNotification(
    @CurrentCustomer() customer: ShopCustomer,
    @Param("id") id: string,
  ) {
    return this.platform.markNotificationRead(customer.id, id);
  }

  @Get("me/trips")
  @UseGuards(CustomerAuthGuard)
  myTrips(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.ensureDemoTrips(customer);
  }

  @Post("me/checkout")
  @UseGuards(CustomerAuthGuard)
  checkout(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { tripId: string; redeemPoints?: number },
  ) {
    return this.platform.createCheckout(
      customer,
      body.tripId,
      body.redeemPoints || 0,
    );
  }

  @Post("me/checkout/pay")
  @UseGuards(CustomerAuthGuard)
  pay(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { tripId: string; result?: "paid" | "failed" },
  ) {
    return this.platform.payCheckout(customer, body.tripId, body.result || "paid");
  }

  @Get("me/favorites")
  @UseGuards(CustomerAuthGuard)
  favorites(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listFavorites(customer.id);
  }

  @Post("me/favorites")
  @UseGuards(CustomerAuthGuard)
  toggleFav(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { slug: string },
  ) {
    return this.platform.toggleFavorite(customer.id, body.slug);
  }

  @Get("me/saved-searches")
  @UseGuards(CustomerAuthGuard)
  searches(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.savedSearches(customer.id);
  }

  @Post("me/saved-searches")
  @UseGuards(CustomerAuthGuard)
  saveSearch(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { label: string; href: string },
  ) {
    return this.platform.saveSearch(customer.id, body.label, body.href);
  }

  @Get("admin/stats")
  adminStats() {
    return this.platform.adminStats();
  }
}
