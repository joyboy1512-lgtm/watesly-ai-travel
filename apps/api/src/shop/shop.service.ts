import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { Prisma } from "@watesly-travel/database";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";
import { AssistantService } from "../assistant/assistant.service";
import { VoiceAssistantService } from "../assistant/voice-assistant.service";
import { PublicOrgService } from "./public-org";
import type { CustomerJwtPayload, ShopCustomer } from "./shop-auth";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function normalizeShopPhone(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  let value = trimmed.replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (value.startsWith("0") && !value.startsWith("00")) {
    value = `+965${value.slice(1)}`;
  }
  if (!value.startsWith("+")) {
    if (value.length === 8) value = `+965${value}`;
    else value = `+${value}`;
  }
  return value;
}

function publicOffer<T extends { costAmountMinor?: number; profitAmountMinor?: number }>(
  row: T,
) {
  const { costAmountMinor: _c, profitAmountMinor: _p, ...rest } = row;
  return rest;
}

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly orgs: PublicOrgService,
    private readonly bookings: BookingsService,
    private readonly pipeline: BotPipelineService,
    private readonly assistant: AssistantService,
    private readonly voice: VoiceAssistantService,
  ) {}

  bootstrap() {
    return this.orgs.resolve().then((org) => ({
      brand: org.name || "WeekendGate",
      currency: org.defaultCurrency || "KWD",
      timezone: org.timezone || "Asia/Kuwait",
    }));
  }

  async airports(q?: string, limit = 20) {
    const query = String(q || "").trim();
    const take = Math.min(50, Math.max(5, limit));
    if (!query) {
      return this.prisma.airport.findMany({
        where: { iataCode: { in: ["KWI", "DXB", "DOH", "RUH", "BAH", "MCT"] } },
        take,
        orderBy: { city: "asc" },
      });
    }
    return this.prisma.airport.findMany({
      where: {
        OR: [
          { iataCode: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { city: "asc" },
    });
  }

  async cities(q?: string) {
    const query = String(q || "").trim();
    if (query.length < 2) {
      return [
        { city: "الكويت", country: "الكويت", iataCode: "KWI" },
        { city: "دبي", country: "الإمارات", iataCode: "DXB" },
        { city: "الدوحة", country: "قطر", iataCode: "DOH" },
      ];
    }
    const rows = await this.prisma.airport.findMany({
      where: {
        OR: [
          { city: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
          { iataCode: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 40,
      orderBy: { city: "asc" },
    });
    const seen = new Set<string>();
    const out: Array<{ city: string | null; country: string | null; iataCode?: string | null }> =
      [];
    for (const row of rows) {
      const key = `${row.city || ""}|${row.country || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        city: row.city,
        country: row.country,
        iataCode: row.iataCode,
      });
    }
    return out;
  }

  async suggestHotels(body: { query?: string; checkIn?: string; checkOut?: string }) {
    const org = await this.orgs.resolve();
    return this.bookings.suggestHotels({
      organizationId: org.id,
      query: body.query || "",
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });
  }

  private async createShopInquiry(input: {
    organizationId: string;
    customerId?: string;
    contactId?: string;
    serviceTypes: string[];
    origin?: string;
    destination?: string;
    departDate: string;
    returnDate?: string;
    adults?: number;
    children?: number;
    infants?: number;
    cabinClass?: string;
    preferences?: string;
    budgetCurrency?: string;
  }) {
    const hotelOnly =
      input.serviceTypes.includes("hotel") &&
      !input.serviceTypes.includes("flight");
    return this.prisma.travelInquiry.create({
      data: {
        organizationId: input.organizationId,
        customerId: input.customerId,
        contactId: input.contactId,
        source: "web_shop",
        status: "ready_to_search",
        origin: input.origin?.trim().toUpperCase() || null,
        destination: input.destination
          ? hotelOnly
            ? input.destination.trim()
            : input.destination.trim().toUpperCase()
          : null,
        departDate: new Date(input.departDate),
        returnDate: input.returnDate ? new Date(input.returnDate) : null,
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        infants: input.infants ?? 0,
        cabinClass: input.cabinClass || "economy",
        preferences: input.preferences,
        serviceTypes: asJson(input.serviceTypes),
        budgetCurrency: input.budgetCurrency || "KWD",
        missingFields: asJson([]),
        aiSummary: [input.origin, input.destination, input.departDate]
          .filter(Boolean)
          .join(" → "),
      },
    });
  }

  private mapPricedOffer(row: {
    id: string;
    serviceType: "flight" | "hotel";
    description: string;
    sellAmountMinor: number;
    costAmountMinor?: number;
    currency: string;
    expiresAt: string;
    details: Record<string, unknown>;
  }) {
    return {
      id: row.id,
      serviceType: row.serviceType,
      description: row.description,
      sellAmountMinor: row.sellAmountMinor,
      // Keep cost for markup/fee math on the shop UI (not a secret — net already in details.rates)
      costAmountMinor: row.costAmountMinor,
      currency: row.currency,
      expiresAt: row.expiresAt,
      details: row.details,
    };
  }

  async searchFlights(
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
    customer?: ShopCustomer,
  ) {
    if (!body.origin || !body.destination || !body.departDate) {
      throw new BadRequestException("أدخل المغادرة والوجهة وتاريخ الذهاب");
    }
    const org = await this.orgs.resolve();
    const inquiry = await this.createShopInquiry({
      organizationId: org.id,
      customerId: customer?.id,
      contactId: customer?.contactId || undefined,
      serviceTypes: ["flight"],
      origin: body.origin,
      destination: body.destination,
      departDate: body.departDate,
      returnDate: body.returnDate,
      adults: body.adults,
      children: body.children,
      infants: body.infants,
      cabinClass: body.cabinClass,
      preferences: body.preferences,
      budgetCurrency: org.defaultCurrency,
    });
    try {
      const result = await this.pipeline.searchAndCreateQuote({
        organizationId: org.id,
        inquiryId: inquiry.id,
        sendToCustomer: false,
        includeHotels: false,
      });
      return {
        inquiryId: inquiry.id,
        quoteId: result.quote?.id,
        quoteItems: (result.quote?.items || []).map((item) => ({
          id: item.id,
          providerOfferRef: item.providerOfferRef,
          serviceType: item.serviceType,
        })),
        providerKey: result.flightProviderKey || result.providerKey,
        providerName: result.flightProviderName || result.providerName,
        liveMode: result.flightLiveMode ?? result.liveMode,
        flights: result.flights.map((row) => this.mapPricedOffer(row)),
      };
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "تعذر البحث عن الرحلات",
      );
    }
  }

  async searchHotels(
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
    customer?: ShopCustomer,
  ) {
    if (!body.destination || !body.checkIn || !body.checkOut) {
      throw new BadRequestException("أدخل الوجهة وتاريخ الوصول والمغادرة");
    }
    const childCount = Math.max(0, body.children || 0);
    if (childCount > 0) {
      const ages = String(body.childrenAges || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (ages.length < childCount) {
        throw new BadRequestException(
          "يجب تحديد عمر كل طفل قبل البحث عن الفنادق",
        );
      }
    }
    const org = await this.orgs.resolve();
    const preferences =
      body.preferences ||
      JSON.stringify({
        query: body.destination,
        rooms: body.rooms || 1,
        childrenAges: body.childrenAges || undefined,
      });
    const inquiry = await this.createShopInquiry({
      organizationId: org.id,
      customerId: customer?.id,
      contactId: customer?.contactId || undefined,
      serviceTypes: ["hotel"],
      destination: body.destination,
      departDate: body.checkIn,
      returnDate: body.checkOut,
      adults: body.adults,
      children: body.children,
      infants: body.infants,
      preferences,
      budgetCurrency: org.defaultCurrency,
    });
    try {
      const result = await this.pipeline.searchAndCreateQuote({
        organizationId: org.id,
        inquiryId: inquiry.id,
        sendToCustomer: false,
        includeHotels: true,
      });
      return {
        inquiryId: inquiry.id,
        quoteId: result.quote?.id,
        quoteItems: (result.quote?.items || []).map((item) => ({
          id: item.id,
          providerOfferRef: item.providerOfferRef,
          serviceType: item.serviceType,
        })),
        providerKey: result.hotelProviderKey || result.providerKey,
        providerName: result.hotelProviderName || result.providerName,
        liveMode: result.hotelLiveMode ?? result.liveMode,
        hotels: result.hotels.map((row) => this.mapPricedOffer(row)),
        hotelError: result.hotelError,
      };
    } catch (err) {
      const raw = err instanceof Error ? err.message : "تعذر البحث عن الفنادق";
      const message = /quota has been exceeded/i.test(raw)
        ? "تم تجاوز حد طلبات مزود الفنادق التجريبي مؤقتًا. أعد المحاولة بعد قليل."
        : raw;
      throw new BadRequestException(message);
    }
  }

  async searchTransfers(
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
    const org = await this.orgs.resolve();
    const result = await this.bookings.searchTransfers({
      organizationId: org.id,
      city: body.city || "",
      from: body.from || "",
      to: body.to || "",
      fromKind: body.fromKind,
      toKind: body.toKind,
      outboundDate: body.outboundDate || "",
      outboundTime: body.outboundTime,
      inboundDate: body.inboundDate,
      inboundTime: body.inboundTime,
      adults: body.adults || 1,
      children: body.children || 0,
      infants: body.infants || 0,
      toLabel: body.toLabel,
    });
    return {
      ...result,
      items: result.items.map((row) => publicOffer(row)),
    };
  }

  async searchActivities(body: {
    destination?: string;
    fromDate?: string;
    toDate?: string;
    adults?: number;
    children?: number;
  }) {
    const org = await this.orgs.resolve();
    const result = await this.bookings.searchActivities({
      organizationId: org.id,
      destination: body.destination || "",
      fromDate: body.fromDate || "",
      toDate: body.toDate || "",
      adults: body.adults || 1,
      children: body.children || 0,
    });
    return {
      ...result,
      items: result.items.map((row) => publicOffer(row)),
    };
  }

  async checkHotelRate(body: {
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
  }) {
    const org = await this.orgs.resolve();
    if (!body?.offer?.currency || !body?.rateKey) {
      throw new BadRequestException("بيانات التعرفة غير مكتملة");
    }
    return this.bookings.checkHotelRate({
      organizationId: org.id,
      rateKey: body.rateKey,
      offer: body.offer,
    });
  }

  private async issueCustomerToken(customer: {
    id: string;
    organizationId: string;
    phone: string;
  }) {
    const payload: CustomerJwtPayload = {
      sub: customer.id,
      typ: "customer",
      organizationId: customer.organizationId,
      phone: customer.phone,
    };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: "30d" });
    return accessToken;
  }

  private serializeCustomer(row: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    status: string;
    hasPassword?: boolean;
  }) {
    return {
      id: row.id,
      phone: row.phone,
      email: row.email,
      name: row.name,
      status: row.status,
      hasPassword: Boolean(row.hasPassword),
    };
  }

  async unlock(body: { phone?: string; name?: string; email?: string }) {
    const phone = normalizeShopPhone(body.phone || "");
    if (!phone || phone.length < 8) {
      throw new BadRequestException("أدخل رقم الجوال");
    }
    const org = await this.orgs.resolve();
    const name = body.name?.trim() || undefined;
    const email = body.email?.trim().toLowerCase() || undefined;

    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_waId: { organizationId: org.id, waId: phone },
      },
      update: {
        name: name || undefined,
        email: email || undefined,
        lastContactedAt: new Date(),
      },
      create: {
        organizationId: org.id,
        waId: phone,
        name: name || phone,
        email,
        source: "web_shop",
        lastContactedAt: new Date(),
      },
    });

    const existing = await this.prisma.customer.findUnique({
      where: {
        organizationId_phone: { organizationId: org.id, phone },
      },
    });
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            email: email || existing.email,
            contactId: contact.id,
            lastLoginAt: new Date(),
            status: "active",
          },
        })
      : await this.prisma.customer.create({
          data: {
            organizationId: org.id,
            phone,
            name: name || phone,
            email,
            contactId: contact.id,
            status: "active",
            lastLoginAt: new Date(),
          },
        });

    const accessToken = await this.issueCustomerToken(customer);
    return {
      accessToken,
      tokenType: "Bearer",
      customer: this.serializeCustomer({
        ...customer,
        hasPassword: Boolean(customer.passwordHash),
      }),
    };
  }

  async login(body: { phone?: string; password?: string }) {
    const phone = normalizeShopPhone(body.phone || "");
    const password = body.password || "";
    if (!phone || !password) {
      throw new BadRequestException("الجوال وكلمة المرور مطلوبان");
    }
    const org = await this.orgs.resolve();
    const customer = await this.prisma.customer.findUnique({
      where: {
        organizationId_phone: { organizationId: org.id, phone },
      },
    });
    if (!customer?.passwordHash || customer.status !== "active") {
      throw new UnauthorizedException("بيانات الدخول غير صحيحة");
    }
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("بيانات الدخول غير صحيحة");
    }
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    const accessToken = await this.issueCustomerToken(customer);
    return {
      accessToken,
      tokenType: "Bearer",
      customer: this.serializeCustomer({
        ...customer,
        hasPassword: true,
      }),
    };
  }

  async me(customer: ShopCustomer) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customer.id, organizationId: customer.organizationId },
      include: { travelers: { orderBy: { createdAt: "asc" } } },
    });
    if (!row) throw new UnauthorizedException("الحساب غير موجود");
    return {
      customer: this.serializeCustomer({
        ...row,
        hasPassword: Boolean(row.passwordHash),
      }),
      travelers: row.travelers,
    };
  }

  async updateMe(
    customer: ShopCustomer,
    body: {
      name?: string;
      email?: string;
      password?: string;
      currentPassword?: string;
    },
  ) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customer.id, organizationId: customer.organizationId },
    });
    if (!row) throw new UnauthorizedException("الحساب غير موجود");

    let passwordHash: string | undefined;
    if (body.password) {
      if (body.password.length < 8) {
        throw new BadRequestException("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      }
      if (row.passwordHash) {
        const ok = await bcrypt.compare(
          body.currentPassword || "",
          row.passwordHash,
        );
        if (!ok) {
          throw new UnauthorizedException("كلمة المرور الحالية غير صحيحة");
        }
      }
      passwordHash = await bcrypt.hash(body.password, 12);
    }

    const updated = await this.prisma.customer.update({
      where: { id: row.id },
      data: {
        name: body.name?.trim() || row.name,
        email: body.email?.trim().toLowerCase() || row.email,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    if (updated.contactId) {
      await this.prisma.contact.update({
        where: { id: updated.contactId },
        data: {
          name: updated.name || undefined,
          email: updated.email || undefined,
        },
      });
    }
    return {
      customer: this.serializeCustomer({
        ...updated,
        hasPassword: Boolean(updated.passwordHash),
      }),
    };
  }

  async addTraveler(
    customer: ShopCustomer,
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
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException("الاسم الأول والأخير مطلوبان");
    }
    return this.prisma.customerTraveler.create({
      data: {
        customerId: customer.id,
        title: body.title || "mr",
        firstName,
        lastName,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        nationality: body.nationality?.trim() || undefined,
        passportNumber: body.passportNumber?.trim() || undefined,
        passportExpiry: body.passportExpiry
          ? new Date(body.passportExpiry)
          : undefined,
        relation: body.relation?.trim() || undefined,
      },
    });
  }

  async updateTraveler(
    customer: ShopCustomer,
    id: string,
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
    const existing = await this.prisma.customerTraveler.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!existing) throw new BadRequestException("المسافر غير موجود");
    return this.prisma.customerTraveler.update({
      where: { id },
      data: {
        title: body.title || existing.title,
        firstName: body.firstName?.trim() || existing.firstName,
        lastName: body.lastName?.trim() || existing.lastName,
        birthDate: body.birthDate ? new Date(body.birthDate) : existing.birthDate,
        nationality: body.nationality?.trim() || existing.nationality,
        passportNumber: body.passportNumber?.trim() || existing.passportNumber,
        passportExpiry: body.passportExpiry
          ? new Date(body.passportExpiry)
          : existing.passportExpiry,
        relation: body.relation?.trim() || existing.relation,
      },
    });
  }

  async deleteTraveler(customer: ShopCustomer, id: string) {
    const existing = await this.prisma.customerTraveler.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!existing) throw new BadRequestException("المسافر غير موجود");
    await this.prisma.customerTraveler.delete({ where: { id } });
    return { ok: true };
  }

  async myBookings(customer: ShopCustomer) {
    const rows = await this.prisma.booking.findMany({
      where: {
        organizationId: customer.organizationId,
        customerId: customer.id,
      },
      include: {
        quote: {
          include: {
            items: true,
            inquiry: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      totalSellAmount: row.totalSellAmount,
      currency: row.quote?.currency || "KWD",
      description:
        row.quote?.items[0]?.description ||
        ((row.passengerDetails as { extras?: { guestName?: string } } | null)
          ?.extras && "") ||
        "حجز",
      serviceType:
        row.quote?.items[0]?.serviceType ||
        (row.passengerDetails as { serviceType?: string } | null)?.serviceType,
      paymentStatus: row.payments[0]?.status || "unpaid",
      passengerDetails: row.passengerDetails,
    }));
  }

  async myBooking(customer: ShopCustomer, id: string) {
    const row = await this.prisma.booking.findFirst({
      where: {
        id,
        organizationId: customer.organizationId,
        customerId: customer.id,
      },
      include: {
        quote: { include: { items: true, inquiry: true } },
        payments: true,
      },
    });
    if (!row) throw new BadRequestException("الحجز غير موجود");
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      totalSellAmount: row.totalSellAmount,
      currency: row.quote?.currency || "KWD",
      items: row.quote?.items.map((item) => ({
        id: item.id,
        serviceType: item.serviceType,
        description: item.description,
        sellAmount: item.sellAmount,
      })),
      payments: row.payments.map((p) => ({
        id: p.id,
        status: p.status,
        method: p.method,
        amount: p.amount,
        currency: p.currency,
      })),
      passengerDetails: row.passengerDetails,
    };
  }

  async book(
    customer: ShopCustomer,
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
    if (!body?.offer?.description || body.offer.sellAmountMinor == null) {
      throw new BadRequestException("بيانات العرض غير مكتملة");
    }

    // P6: hotel bookings require a recent reprice/checkrate before confirm
    if (body.serviceType === "hotel") {
      const details = (body.offer.details || {}) as Record<string, unknown>;
      const validatedAt = String(
        details.validatedAt || details.revalidatedAt || details.checkRateAt || "",
      );
      const validatedMs = validatedAt ? Date.parse(validatedAt) : NaN;
      const fresh =
        Number.isFinite(validatedMs) && Date.now() - validatedMs < 20 * 60 * 1000;
      if (!fresh && !body.quoteItemId) {
        throw new BadRequestException(
          "يجب التحقق من السعر (إعادة التسعير) قبل تأكيد حجز الفندق. ارجع للتفاصيل وأعد التحقق.",
        );
      }
    }

    const result = await this.bookings.createFromDraft({
      organizationId: customer.organizationId,
      customerId: customer.id,
      canManagePayments: false,
      serviceType: body.serviceType,
      inquiryId: body.inquiryId,
      quoteItemId: body.quoteItemId,
      offer: body.offer,
      route: body.route as never,
      stay: body.stay as never,
      travelers: body.travelers,
      guests: body.guests,
      adults: body.adults,
      children: body.children,
      contact: {
        email: body.contact?.email || customer.email || "",
        phone: body.contact?.phone || customer.phone,
      },
      extras: {
        ...(body.extras || {}),
        customerId: customer.id,
        channel: "web_shop",
      },
      ticketType: body.ticketType,
      seatPref: body.seatPref,
      payment: { method: "manual", status: "unpaid" },
    });
    return {
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        totalSellAmount: result.booking.totalSellAmount,
      },
      payment: result.payment
        ? {
            id: result.payment.id,
            status: result.payment.status,
            method: result.payment.method,
          }
        : { status: "unpaid", method: "manual" },
    };
  }

  async lookupBooking(body: { bookingRef?: string; contact?: string }) {
    const ref = String(body.bookingRef || "").trim();
    const contact = String(body.contact || "").trim().toLowerCase();
    if (ref.length < 4 || contact.length < 4) {
      throw new BadRequestException("أدخل رقم الحجز وبيانات التواصل");
    }
    const org = await this.orgs.resolve();
    const phoneNorm = normalizeShopPhone(contact);
    const row = await this.prisma.booking.findFirst({
      where: {
        organizationId: org.id,
        OR: [{ id: ref }, { id: { startsWith: ref } }],
      },
      include: {
        quote: { include: { items: true } },
        payments: true,
      },
    });
    if (!row) throw new BadRequestException("لم يتم العثور على الحجز");
    const pd = (row.passengerDetails || {}) as Record<string, unknown>;
    const contactInfo = (pd.contact || {}) as { email?: string; phone?: string };
    const email = String(contactInfo.email || pd.email || "").toLowerCase();
    const phone = normalizeShopPhone(String(contactInfo.phone || pd.phone || ""));
    const contactOk =
      (email && email === contact) ||
      (phone && (phone === phoneNorm || phone.endsWith(contact.replace(/\D/g, ""))));
    if (!contactOk) {
      throw new BadRequestException("بيانات التواصل لا تطابق الحجز");
    }
    return {
      id: row.id,
      weekendgateRef: String(pd.weekendgateRef || row.id),
      providerRef: String(pd.providerBookingRef || pd.pnr || "") || undefined,
      status: row.status,
      paymentStatus: row.payments[0]?.status || "unpaid",
      paymentMethod: row.payments[0]?.method,
      description: row.quote?.items[0]?.description || "حجز",
      totalSellAmount: row.totalSellAmount,
      currency: row.quote?.currency || "KWD",
      createdAt: row.createdAt,
      timeline: [
        { at: row.createdAt.toISOString(), label: "تم إنشاء الطلب" },
        ...(row.status === "confirmed"
          ? [{ at: (row.updatedAt || row.createdAt).toISOString(), label: "تم التأكيد" }]
          : []),
      ],
    };
  }

  async createPaymentIntent(
    customer: ShopCustomer,
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
    const bookingId = String(body.bookingId || "").trim();
    if (!bookingId) throw new BadRequestException("bookingId مطلوب");
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        organizationId: customer.organizationId,
        customerId: customer.id,
      },
      include: { quote: true, payments: true },
    });
    if (!booking) throw new BadRequestException("الحجز غير موجود");

    const amountMinor = Number(body.amountMinor ?? booking.totalSellAmount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException("مبلغ الدفع غير صالح");
    }
    if (Math.round(amountMinor) !== Math.round(Number(booking.totalSellAmount))) {
      throw new BadRequestException("مبلغ الدفع لا يطابق آخر تسعير للحجز");
    }

    const { getPaymentGateway } = await import("@watesly-travel/provider-sdk");
    const gateway = getPaymentGateway();
    const intent = await gateway.createIntent({
      amountMinor: Math.round(amountMinor),
      currency: (body.currency || booking.quote?.currency || "KWD").toUpperCase(),
      bookingId: booking.id,
      weekendgateRef: booking.id,
      customerEmail: customer.email || undefined,
      customerPhone: customer.phone,
      method: body.method || "hosted_card",
      idempotencyKey: String(body.idempotencyKey || `book:${booking.id}:${amountMinor}`),
      returnUrl: body.returnUrl || "https://www.weekendgate.com/bookings/manage",
      cancelUrl: body.cancelUrl || "https://www.weekendgate.com/bookings/manage",
    });
    return {
      intent,
      note:
        gateway.environment === "sandbox"
          ? "وضع Sandbox — لا يتم خصم حقيقي. التأكيد يعتمد على Webhook موقّع وليس على Redirect فقط."
          : undefined,
    };
  }

  async handlePaymentWebhook(body: Record<string, unknown>) {
    const { getPaymentGateway } = await import("@watesly-travel/provider-sdk");
    const { normalizeShopPaymentStatus } = await import("@watesly-travel/shared");
    const gateway = getPaymentGateway();
    const event = await gateway.verifyAndParseWebhook(
      { "x-weekendgate-signature": "sandbox" },
      JSON.stringify(body),
    );
    // Redirect alone is never enough — webhook drives Payment.status
    const shopStatus = normalizeShopPaymentStatus(event.status);
    const intent = await gateway.getIntent(event.intentId);
    const bookingId =
      intent?.bookingId ||
      String(body.bookingId || body.weekendgateRef || "").trim() ||
      null;

    if (
      bookingId &&
      (shopStatus === "paid" ||
        event.status === "captured" ||
        event.status === "authorized")
    ) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId },
        include: { payments: true, quote: true },
      });
      if (booking) {
        const paidStatus = normalizeShopPaymentStatus(
          event.status === "authorized" ? "paid" : event.status,
        );
        if (booking.payments.length) {
          await this.prisma.payment.updateMany({
            where: { bookingId: booking.id },
            data: {
              status: paidStatus,
              reference: event.providerRef || event.intentId,
              method: intent?.method || booking.payments[0]?.method || "hosted_card",
            },
          });
        } else {
          await this.prisma.payment.create({
            data: {
              organizationId: booking.organizationId,
              bookingId: booking.id,
              status: paidStatus,
              method: intent?.method || "hosted_card",
              amount: event.amountMinor ?? booking.totalSellAmount,
              currency:
                event.currency ||
                booking.quote?.currency ||
                intent?.currency ||
                "KWD",
              reference: event.providerRef || event.intentId,
            },
          });
        }
        if (
          paidStatus === "paid" &&
          booking.status !== "issued" &&
          booking.status !== "completed" &&
          booking.status !== "cancelled"
        ) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              status:
                booking.status === "draft" || booking.status === "on_hold"
                  ? "on_hold"
                  : booking.status,
            },
          });
        }
      }
    } else if (
      bookingId &&
      (shopStatus === "failed" ||
        shopStatus === "refunded" ||
        shopStatus === "partially_refunded")
    ) {
      await this.prisma.payment.updateMany({
        where: { bookingId },
        data: {
          status: shopStatus,
          reference: event.providerRef || event.intentId,
        },
      });
    }

    return { ok: true, status: shopStatus, intentId: event.intentId, bookingId };
  }

  async assistantChat(customer: ShopCustomer, body: { message?: string }) {
    const text = String(body.message || "").trim();
    if (!text) throw new BadRequestException("نص الرسالة مطلوب");
    return this.assistant.chat({
      organizationId: customer.organizationId,
      channel: "web_chat",
      text,
      contactId: customer.contactId || undefined,
      externalRef: `customer:${customer.id}`,
    });
  }

  async assistantThread(customer: ShopCustomer) {
    return this.assistant.thread({
      organizationId: customer.organizationId,
      channel: "web_chat",
      externalRef: `customer:${customer.id}`,
      createIfMissing: false,
    });
  }

  async assistantVoiceTranscribe(
    customer: ShopCustomer,
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    durationSec?: number,
  ) {
    return this.voice.transcribeUpload({
      organizationId: customer.organizationId,
      customerKey: customer.id,
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      durationSec,
    });
  }

  async assistantVoiceConfirm(
    customer: ShopCustomer,
    body: { transcript?: string },
  ) {
    const text = String(body.transcript || "").trim();
    if (!text) throw new BadRequestException("راجع النص الصوتي قبل الإرسال");
    return this.voice.chatFromTranscript({
      organizationId: customer.organizationId,
      channel: "web_chat",
      text,
      contactId: customer.contactId || undefined,
      externalRef: `customer:${customer.id}`,
    });
  }

  async assistantTts(customer: ShopCustomer, body: { text?: string }) {
    void customer;
    return this.voice.synthesizeReply(String(body.text || ""));
  }

  async passportScan(body: { imageBase64?: string; mimeType?: string }) {
    const { extractPassportFromImage } = await import("@watesly-travel/ai-core");
    const imageBase64 = String(body.imageBase64 || "").trim();
    const mimeType = String(body.mimeType || "image/jpeg").trim();
    if (!imageBase64) {
      throw new BadRequestException("صورة الجواز مطلوبة");
    }
    return extractPassportFromImage({ imageBase64, mimeType });
  }
}
