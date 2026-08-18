import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { stripCostFields } from "../common/money";
import {
  BookingsService,
  type BookingDraftOfferInput,
  type BookingDraftRouteInput,
  type BookingDraftStayInput,
} from "./bookings.service";

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  draft: ["on_hold", "cancelled"],
  on_hold: ["issued", "cancelled"],
  issued: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

type FromDraftBody = {
  serviceType: "flight" | "hotel";
  inquiryId?: string;
  quoteItemId?: string;
  offer: BookingDraftOfferInput;
  route?: BookingDraftRouteInput;
  stay?: BookingDraftStayInput;
  travelers?: Array<Record<string, unknown>>;
  guests?: Array<Record<string, unknown>>;
  adults?: number;
  children?: number;
  contact: { email: string; phone: string };
  extras?: Record<string, unknown>;
  ticketType?: string;
  seatPref?: string;
  payment?: { method: string; status?: string };
};

function parseDayStart(value?: string) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDayEnd(value?: string) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T23:59:59.999+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value?: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function includesLoose(hay?: string | null, needle?: string) {
  if (!needle) return true;
  return String(hay || "")
    .toLowerCase()
    .includes(needle.toLowerCase());
}

@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bookings: BookingsService,
  ) {}

  @Get()
  @RequirePermissions("conversations.read")
  async list(
    @CurrentUser() user: AuthUser,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("serviceType") serviceType?: string,
    @Query("bookedFrom") bookedFrom?: string,
    @Query("bookedTo") bookedTo?: string,
    @Query("travelFrom") travelFrom?: string,
    @Query("travelTo") travelTo?: string,
    @Query("origin") origin?: string,
    @Query("destination") destination?: string,
  ) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const bookedStart = parseDayStart(bookedFrom);
    const bookedEnd = parseDayEnd(bookedTo);
    const originNeedle = origin?.trim() || "";
    const destNeedle = destination?.trim() || "";
    const travelStart = travelFrom?.trim() || "";
    const travelEnd = travelTo?.trim() || "";

    const rows = await this.prisma.booking.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status } : {}),
        ...(serviceType
          ? {
              quote: {
                items: { some: { serviceType } },
              },
            }
          : {}),
        ...(bookedStart || bookedEnd
          ? {
              createdAt: {
                ...(bookedStart ? { gte: bookedStart } : {}),
                ...(bookedEnd ? { lte: bookedEnd } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                {
                  providerBookingRef: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  quote: {
                    inquiry: {
                      OR: [
                        { origin: { contains: q, mode: "insensitive" } },
                        {
                          destination: {
                            contains: q,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        quote: {
          include: {
            items: true,
            contact: true,
            inquiry: true,
            pricingRule: true,
          },
        },
        bookingRequest: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const needle = q?.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const details = (row.passengerDetails || {}) as {
        contact?: { email?: string; phone?: string };
        travelers?: Array<{ firstName?: string; lastName?: string }>;
        route?: {
          origin?: string;
          destination?: string;
          originLabel?: string;
          destinationLabel?: string;
          departDate?: string;
        };
        stay?: {
          location?: string;
          locationLabel?: string;
          checkIn?: string;
        };
      };

      if (needle) {
        const hay = [
          row.id,
          row.providerBookingRef,
          details.contact?.email,
          details.contact?.phone,
          details.travelers
            ?.map((t) => `${t.firstName || ""} ${t.lastName || ""}`)
            .join(" "),
          row.quote?.inquiry?.origin,
          row.quote?.inquiry?.destination,
          details.route?.origin,
          details.route?.destination,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      if (originNeedle) {
        const origins = [
          row.quote?.inquiry?.origin,
          details.route?.origin,
          details.route?.originLabel,
        ];
        if (!origins.some((value) => includesLoose(value, originNeedle))) {
          return false;
        }
      }

      if (destNeedle) {
        const dests = [
          row.quote?.inquiry?.destination,
          details.route?.destination,
          details.route?.destinationLabel,
          details.stay?.location,
          details.stay?.locationLabel,
        ];
        if (!dests.some((value) => includesLoose(value, destNeedle))) {
          return false;
        }
      }

      if (travelStart || travelEnd) {
        const travelDay =
          dayKey(details.route?.departDate) ||
          dayKey(details.stay?.checkIn) ||
          dayKey(row.quote?.inquiry?.departDate);
        if (!travelDay) return false;
        if (travelStart && travelDay < travelStart) return false;
        if (travelEnd && travelDay > travelEnd) return false;
      }

      return true;
    });

    return stripCostFields(filtered, canViewCost);
  }

  @Get(":id")
  @RequirePermissions("conversations.read")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const canViewCost = user.permissions.includes("pricing.view_cost");
    const row = await this.prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        quote: {
          include: {
            items: true,
            contact: true,
            inquiry: true,
            pricingRule: true,
          },
        },
        bookingRequest: true,
        payments: true,
      },
    });
    if (!row) throw new NotFoundException("الحجز غير موجود");
    return stripCostFields(row, canViewCost);
  }

  @Post("from-quote/:quoteId")
  @RequirePermissions("bookings.create")
  createFromQuote(
    @CurrentUser() user: AuthUser,
    @Param("quoteId") quoteId: string,
    @Body()
    body: {
      notes?: string;
      selectedItemIndex?: number;
      selectedItemId?: string;
      confirmPriceChange?: boolean;
    },
  ) {
    return this.bookings.createFromQuote({
      organizationId: user.organizationId,
      quoteId,
      actorUserId: user.userId,
      requestedBy: "agent",
      notes: body.notes,
      selectedItemIndex: body.selectedItemIndex,
      selectedItemId: body.selectedItemId,
      confirmPriceChange: body.confirmPriceChange,
    });
  }

  @Post("from-draft")
  @RequirePermissions("bookings.create")
  createFromDraft(@CurrentUser() user: AuthUser, @Body() body: FromDraftBody) {
    return this.bookings.createFromDraft({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      canManagePayments: user.permissions.includes("payments.manage"),
      serviceType: body.serviceType,
      inquiryId: body.inquiryId,
      quoteItemId: body.quoteItemId,
      offer: body.offer,
      route: body.route,
      stay: body.stay,
      travelers: body.travelers,
      guests: body.guests,
      adults: body.adults,
      children: body.children,
      contact: body.contact,
      extras: body.extras,
      ticketType: body.ticketType,
      seatPref: body.seatPref,
      payment: body.payment,
    });
  }

  @Post("checkrate-hotel")
  @RequirePermissions("conversations.read")
  checkrateHotel(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      rateKey: string;
      offer: {
        providerKey?: string;
        providerOfferRef?: string;
        description?: string;
        costAmountMinor?: number;
        currency: string;
        revalidationToken?: string;
        expiresAt?: string;
        raw?: Record<string, unknown>;
      };
    },
  ) {
    if (!body?.offer?.currency || !body?.rateKey) {
      throw new BadRequestException("بيانات التعرفة غير مكتملة");
    }
    return this.bookings.checkHotelRate({
      organizationId: user.organizationId,
      rateKey: body.rateKey,
      offer: body.offer,
    });
  }

  @Post("hotel-rate-comments")
  @RequirePermissions("conversations.read")
  hotelRateComments(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { ids?: string[]; date?: string; providerKey?: string },
  ) {
    return this.bookings.hotelRateComments({
      organizationId: user.organizationId,
      ids: body.ids || [],
      date: body.date || "",
      providerKey: body.providerKey,
    });
  }

  @Post(":id/issue")
  @RequirePermissions("bookings.issue")
  issue(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.bookings.issue({
      organizationId: user.organizationId,
      bookingId: id,
      actorUserId: user.userId,
    });
  }

  @Post(":id/transition")
  @RequirePermissions("bookings.issue")
  async transition(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!booking) throw new BadRequestException("الحجز غير موجود");

    const next = String(body.status || "").trim();
    const allowed = BOOKING_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `لا يمكن الانتقال من ${booking.status} إلى ${next || "—"}`,
      );
    }

    const row = await this.prisma.booking.update({
      where: { id },
      data: {
        status: next,
        ...(next === "issued"
          ? { issuedAt: new Date(), issuedByUserId: user.userId }
          : {}),
      },
      include: {
        quote: { include: { items: true, contact: true, inquiry: true } },
        payments: true,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "bookings.transition",
      entityType: "Booking",
      entityId: id,
      before: { status: booking.status },
      after: { status: next, notes: body.notes },
    });

    return row;
  }

  @Post(":id/payments")
  @RequirePermissions("payments.manage")
  async recordPayment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: { amount: number; method?: string; reference?: string; status?: string },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { quote: { select: { currency: true } } },
    });
    if (!booking) throw new BadRequestException("الحجز غير موجود");

    const payment = await this.prisma.payment.create({
      data: {
        organizationId: user.organizationId,
        bookingId: id,
        amount: body.amount,
        currency: booking.quote.currency || "KWD",
        method: body.method || "manual",
        status: body.status || "paid",
        reference: body.reference,
        recordedByUserId: user.userId,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.userId,
      action: "payments.record",
      entityType: "Payment",
      entityId: payment.id,
      after: {
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      },
    });

    return payment;
  }
}
