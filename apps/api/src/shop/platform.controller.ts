import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Public, RequirePermissions } from "../auth/decorators";
import {
  CustomerAuthGuard,
  CurrentCustomer,
  type ShopCustomer,
} from "./shop-auth";
import { PlatformService } from "./platform.service";
import { TripOrchestrationService } from "./trip-orchestration.service";
import type { TripDraftState } from "@watesly-travel/shared";
import type { PackageComponent, WeekendDeal, CmsState, PointsRules } from "@watesly-travel/shared";

/**
 * Additive platform routes. Public catalog stays open; CMS/admin mutations
 * require staff JWT (global JwtAuthGuard + permissions).
 */
@Controller("shop/platform")
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly tripOrchestration: TripOrchestrationService,
  ) {}

  @Public()
  @Get("catalog")
  catalog() {
    return this.platform.catalog();
  }

  @Public()
  @Get("deals")
  deals() {
    return this.platform.listDeals();
  }

  @Public()
  @Get("deals/:slug")
  deal(@Param("slug") slug: string) {
    return this.platform.getDeal(slug);
  }

  @Public()
  @Post("deals/:slug/book")
  bookDeal(@Param("slug") slug: string) {
    return this.platform.bookDealAsTrip(slug);
  }

  @Public()
  @Get("destinations")
  destinations() {
    return this.platform.listDestinations();
  }

  @Public()
  @Get("destinations/:slug")
  destination(@Param("slug") slug: string) {
    return this.platform.getDestination(slug);
  }

  @Public()
  @Get("cms")
  cms() {
    return this.platform.getCms();
  }

  @Patch("cms")
  @RequirePermissions("providers.manage")
  updateCms(@Body() body: Partial<CmsState>) {
    return this.platform.updateCms(body);
  }

  @Post("cms/deals")
  @RequirePermissions("providers.manage")
  upsertDeal(@Body() body: WeekendDeal) {
    return this.platform.upsertDeal(body);
  }

  @Public()
  @Post("trips/:id/search")
  searchTrip(
    @Param("id") id: string,
    @Body()
    body: Pick<
      TripDraftState,
      "services" | "flight" | "hotel" | "transfer" | "activity" | "sessionId"
    >,
  ) {
    return this.tripOrchestration.searchTrip(id, body);
  }

  @Public()
  @Post("trips/:id/reprice")
  repriceTrip(@Param("id") id: string) {
    return this.platform.tripPrice(id);
  }

  @Public()
  @Get("trips/:id")
  trip(@Param("id") id: string) {
    return this.platform.tripPrice(id);
  }

  @Public()
  @Post("trips")
  createTrip() {
    return this.platform.getOrCreateTrip();
  }

  @Public()
  @Post("trips/:id/components")
  setComponent(
    @Param("id") id: string,
    @Body() body: PackageComponent,
  ) {
    return this.platform.setTripComponent(id, body);
  }

  @Public()
  @Post("trips/:id/components/remove")
  removeComponent(
    @Param("id") id: string,
    @Body() body: { kind: PackageComponent["kind"] },
  ) {
    return this.platform.removeTripComponent(id, body.kind);
  }

  @Public()
  @Get("me/points")
  @UseGuards(CustomerAuthGuard)
  points(@CurrentCustomer() customer: ShopCustomer) {
    return Promise.all([
      this.platform.getPoints(customer),
      Promise.resolve(this.platform.getPointsRules()),
    ]).then(([account, rules]) => ({ account, rules }));
  }

  @Patch("admin/points-rules")
  @RequirePermissions("providers.manage")
  pointsRules(@Body() body: Partial<PointsRules>) {
    return this.platform.setPointsRules(body);
  }

  @Public()
  @Get("me/referral")
  @UseGuards(CustomerAuthGuard)
  referral(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.getOrCreateReferral(customer);
  }

  @Public()
  @Post("me/referral/apply")
  @UseGuards(CustomerAuthGuard)
  applyReferral(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { code?: string },
  ) {
    return this.platform.applyReferral(String(body.code || ""), customer);
  }

  @Public()
  @Get("me/alerts")
  @UseGuards(CustomerAuthGuard)
  alerts(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listAlerts(customer.id);
  }

  @Public()
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

  @Public()
  @Post("alerts/check")
  checkAlerts(
    @Body() body: { origin: string; destination: string; priceMinor: number },
  ) {
    return this.platform.checkAlerts(body);
  }

  @Public()
  @Get("me/notifications")
  @UseGuards(CustomerAuthGuard)
  notifications(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listNotifications(customer.id);
  }

  @Public()
  @Post("me/notifications/:id/read")
  @UseGuards(CustomerAuthGuard)
  readNotification(
    @CurrentCustomer() customer: ShopCustomer,
    @Param("id") id: string,
  ) {
    return this.platform.markNotificationRead(customer.id, id);
  }

  @Public()
  @Get("me/trips")
  @UseGuards(CustomerAuthGuard)
  myTrips(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.ensureDemoTrips(customer);
  }

  @Public()
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

  @Public()
  @Post("me/checkout/pay")
  @UseGuards(CustomerAuthGuard)
  pay(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { tripId: string; result?: "paid" | "failed" },
  ) {
    return this.platform.payCheckout(customer, body.tripId, body.result || "paid");
  }

  @Public()
  @Get("me/favorites")
  @UseGuards(CustomerAuthGuard)
  favorites(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.listFavorites(customer.id);
  }

  @Public()
  @Post("me/favorites")
  @UseGuards(CustomerAuthGuard)
  toggleFav(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { slug: string },
  ) {
    return this.platform.toggleFavorite(customer.id, body.slug);
  }

  @Public()
  @Get("me/saved-searches")
  @UseGuards(CustomerAuthGuard)
  searches(@CurrentCustomer() customer: ShopCustomer) {
    return this.platform.savedSearches(customer.id);
  }

  @Public()
  @Post("me/saved-searches")
  @UseGuards(CustomerAuthGuard)
  saveSearch(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { label: string; href: string },
  ) {
    return this.platform.saveSearch(customer.id, body.label, body.href);
  }

  @Get("admin/stats")
  @RequirePermissions("conversations.read")
  adminStats() {
    return this.platform.adminStats();
  }
}
