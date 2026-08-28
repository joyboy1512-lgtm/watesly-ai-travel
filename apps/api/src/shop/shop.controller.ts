import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Public } from "../auth/decorators";
import {
  CustomerAuthGuard,
  CurrentCustomer,
  OptionalCustomer,
  ShopCustomerMaybe,
  type ShopCustomer,
} from "./shop-auth";
import { ShopService } from "./shop.service";
import { VOICE_MAX_BYTES } from "@watesly-travel/ai-core";

@Controller("shop")
@Public()
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get("bootstrap")
  bootstrap() {
    return this.shop.bootstrap();
  }

  @Get("airports")
  airports(@Query("q") q?: string, @Query("limit") limit?: string) {
    return this.shop.airports(q, limit ? Number(limit) : 20);
  }

  @Get("cities")
  cities(@Query("q") q?: string) {
    return this.shop.cities(q);
  }

  @Post("suggest-hotels")
  suggestHotels(
    @Body() body: { query?: string; checkIn?: string; checkOut?: string },
  ) {
    return this.shop.suggestHotels(body);
  }

  @Post("search-flights")
  @UseGuards(CustomerAuthGuard)
  @OptionalCustomer()
  searchFlights(
    @Body()
    body: {
      origin?: string;
      destination?: string;
      departDate?: string;
      returnDate?: string;
      adults?: number;
      children?: number;
      infants?: number;
      cabinClass?: string;
      preferences?: string;
    },
    @ShopCustomerMaybe() customer?: ShopCustomer,
  ) {
    return this.shop.searchFlights(body, customer);
  }

  @Post("search-hotels")
  @UseGuards(CustomerAuthGuard)
  @OptionalCustomer()
  searchHotels(
    @Body()
    body: {
      destination?: string;
      checkIn?: string;
      checkOut?: string;
      rooms?: number;
      adults?: number;
      children?: number;
      infants?: number;
      childrenAges?: string;
      preferences?: string;
    },
    @ShopCustomerMaybe() customer?: ShopCustomer,
  ) {
    return this.shop.searchHotels(body, customer);
  }

  @Post("search-transfers")
  searchTransfers(
    @Body()
    body: {
      city?: string;
      from?: string;
      to?: string;
      fromKind?: "IATA" | "ATLAS" | "GPS";
      toKind?: "IATA" | "ATLAS" | "GPS";
      outboundDate?: string;
      outboundTime?: string;
      inboundDate?: string;
      inboundTime?: string;
      adults?: number;
      children?: number;
      infants?: number;
      toLabel?: string;
    },
  ) {
    return this.shop.searchTransfers(body);
  }

  @Post("search-activities")
  searchActivities(
    @Body()
    body: {
      destination?: string;
      fromDate?: string;
      toDate?: string;
      adults?: number;
      children?: number;
    },
  ) {
    return this.shop.searchActivities(body);
  }

  @Post("checkrate-hotel")
  checkHotelRate(
    @Body()
    body: {
      rateKey: string;
      offer: {
        providerKey?: string;
        providerOfferRef?: string;
        description?: string;
        currency: string;
        revalidationToken?: string;
        expiresAt?: string;
        raw?: Record<string, unknown>;
      };
    },
  ) {
    return this.shop.checkHotelRate(body);
  }

  @Post("unlock")
  unlock(@Body() body: { phone?: string; name?: string; email?: string }) {
    return this.shop.unlock(body);
  }

  @Post("login")
  login(@Body() body: { phone?: string; password?: string }) {
    return this.shop.login(body);
  }

  @Get("me")
  @UseGuards(CustomerAuthGuard)
  me(@CurrentCustomer() customer: ShopCustomer) {
    return this.shop.me(customer);
  }

  @Patch("me")
  @UseGuards(CustomerAuthGuard)
  updateMe(
    @CurrentCustomer() customer: ShopCustomer,
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      currentPassword?: string;
    },
  ) {
    return this.shop.updateMe(customer, body);
  }

  @Post("travelers")
  @UseGuards(CustomerAuthGuard)
  addTraveler(
    @CurrentCustomer() customer: ShopCustomer,
    @Body()
    body: {
      title?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      nationality?: string;
      passportNumber?: string;
      passportExpiry?: string;
      relation?: string;
    },
  ) {
    return this.shop.addTraveler(customer, body);
  }

  @Patch("travelers/:id")
  @UseGuards(CustomerAuthGuard)
  updateTraveler(
    @CurrentCustomer() customer: ShopCustomer,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      nationality?: string;
      passportNumber?: string;
      passportExpiry?: string;
      relation?: string;
    },
  ) {
    return this.shop.updateTraveler(customer, id, body);
  }

  @Delete("travelers/:id")
  @UseGuards(CustomerAuthGuard)
  deleteTraveler(
    @CurrentCustomer() customer: ShopCustomer,
    @Param("id") id: string,
  ) {
    return this.shop.deleteTraveler(customer, id);
  }

  @Post("bookings/lookup")
  lookupBooking(
    @Body() body: { bookingRef?: string; contact?: string },
  ) {
    return this.shop.lookupBooking(body);
  }

  @Post("payments/intent")
  @UseGuards(CustomerAuthGuard)
  createPaymentIntent(
    @CurrentCustomer() customer: ShopCustomer,
    @Body()
    body: {
      bookingId?: string;
      amountMinor?: number;
      currency?: string;
      method?: "hosted_card" | "knet" | "apple_pay" | "manual";
      idempotencyKey?: string;
      returnUrl?: string;
      cancelUrl?: string;
    },
  ) {
    return this.shop.createPaymentIntent(customer, body);
  }

  @Post("payments/webhook")
  paymentWebhook(
    @Body() body: Record<string, unknown>,
    // Nest may parse JSON already — adapter still requires raw verification in real PSP
  ) {
    return this.shop.handlePaymentWebhook(body);
  }

  @Get("bookings")
  @UseGuards(CustomerAuthGuard)
  bookings(@CurrentCustomer() customer: ShopCustomer) {
    return this.shop.myBookings(customer);
  }

  @Get("bookings/:id")
  @UseGuards(CustomerAuthGuard)
  booking(
    @CurrentCustomer() customer: ShopCustomer,
    @Param("id") id: string,
  ) {
    return this.shop.myBooking(customer, id);
  }

  @Post("book")
  @UseGuards(CustomerAuthGuard)
  book(
    @CurrentCustomer() customer: ShopCustomer,
    @Body()
    body: {
      serviceType: "flight" | "hotel" | "transfer" | "activity";
      inquiryId?: string;
      quoteItemId?: string;
      offer: {
        id?: string;
        description: string;
        sellAmountMinor: number;
        currency: string;
        details?: Record<string, unknown>;
        providerKey?: string;
        providerOfferRef?: string;
      };
      route?: Record<string, unknown>;
      stay?: Record<string, unknown>;
      travelers?: Array<Record<string, unknown>>;
      guests?: Array<Record<string, unknown>>;
      adults?: number;
      children?: number;
      contact?: { email?: string; phone?: string };
      extras?: Record<string, unknown>;
      ticketType?: string;
      seatPref?: string;
    },
  ) {
    return this.shop.book(customer, body);
  }

  @Post("assistant/chat")
  @UseGuards(CustomerAuthGuard)
  assistantChat(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { message?: string },
  ) {
    return this.shop.assistantChat(customer, body);
  }

  @Post("assistant/voice")
  @UseGuards(CustomerAuthGuard)
  @UseInterceptors(
    FileInterceptor("audio", {
      storage: memoryStorage(),
      limits: { fileSize: VOICE_MAX_BYTES },
    }),
  )
  async assistantVoice(
    @CurrentCustomer() customer: ShopCustomer,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { durationSec?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("أرفق تسجيلاً صوتياً");
    }
    const durationSec = body?.durationSec ? Number(body.durationSec) : undefined;
    return this.shop.assistantVoiceTranscribe(customer, file, durationSec);
  }

  @Post("assistant/voice/confirm")
  @UseGuards(CustomerAuthGuard)
  assistantVoiceConfirm(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { transcript?: string },
  ) {
    return this.shop.assistantVoiceConfirm(customer, body);
  }

  @Post("assistant/tts")
  @UseGuards(CustomerAuthGuard)
  assistantTts(
    @CurrentCustomer() customer: ShopCustomer,
    @Body() body: { text?: string },
  ) {
    return this.shop.assistantTts(customer, body);
  }

  @Post("passport-scan")
  @UseGuards(CustomerAuthGuard)
  @OptionalCustomer()
  passportScan(
    @Body() body: { imageBase64?: string; mimeType?: string },
  ) {
    return this.shop.passportScan(body);
  }

  @Get("assistant/thread")
  @UseGuards(CustomerAuthGuard)
  assistantThread(@CurrentCustomer() customer: ShopCustomer) {
    return this.shop.assistantThread(customer);
  }
}
