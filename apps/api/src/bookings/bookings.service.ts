import { BadRequestException, Injectable } from "@nestjs/common";
import {
  applyPricingRule,
  selectPricingRule,
  toCustomerVisible,
} from "@watesly-travel/pricing-engine";
import {
  getFlightProvider,
  getHotelProvider,
  revalidatePricedOffer,
} from "@watesly-travel/travel-core";
import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import { Prisma } from "@watesly-travel/database";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { formatMoneyMinor } from "../common/money";
import { getActivityProviderForOrg, getHotelProviderForOrg, getTransferProviderForOrg } from "../common/provider-runtime";
import { BotPipelineService } from "../pipeline/bot-pipeline.service";

export type BookingDraftOfferInput = {
  id?: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details?: Record<string, unknown>;
  providerKey?: string;
  providerOfferRef?: string;
};

export type BookingDraftRouteInput = {
  origin?: string;
  destination?: string;
  originLabel?: string;
  destinationLabel?: string;
  departDate?: string;
  returnDate?: string;
  tripType?: string;
  cabinClass?: string;
};

export type BookingDraftStayInput = {
  location?: string;
  locationLabel?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
};

export type CreateFromDraftInput = {
  organizationId: string;
  actorUserId?: string;
  customerId?: string;
  canManagePayments: boolean;
  serviceType: "flight" | "hotel" | "transfer" | "activity";
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

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pipeline: BotPipelineService,
  ) {}

  async createFromQuote(input: {
    organizationId: string;
    quoteId: string;
    actorUserId?: string;
    requestedBy?: string;
    notes?: string;
    notifyCustomer?: boolean;
    selectedItemIndex?: number;
    selectedItemId?: string;
    confirmPriceChange?: boolean;
  }) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: input.quoteId, organizationId: input.organizationId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (!quote || !quote.items.length) {
      throw new BadRequestException("العرض غير موجود");
    }

    const pendingPriceChange = await this.prisma.bookingRequest.findFirst({
      where: {
        organizationId: input.organizationId,
        quoteId: quote.id,
        status: "price_changed",
      },
      orderBy: { createdAt: "desc" },
    });

    let item =
      (input.selectedItemId
        ? quote.items.find((row) => row.id === input.selectedItemId)
        : undefined) ||
      (typeof input.selectedItemIndex === "number"
        ? quote.items[input.selectedItemIndex]
        : undefined);

    if (!item) {
      const payload = quote.customerVisiblePayload as {
        selectedItemIndex?: number;
      } | null;
      const idx =
        typeof payload?.selectedItemIndex === "number"
          ? payload.selectedItemIndex
          : 0;
      item = quote.items[idx] || quote.items[0];
    }

    if (!item) {
      throw new BadRequestException("عنصر العرض غير موجود");
    }

    // Sync quote totals to the chosen option before booking.
    await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        totalCostAmount: item.costAmount,
        totalSellAmount: item.sellAmount,
        totalProfitAmount: item.profitAmount,
        customerVisiblePayload: asJson({
          ...((quote.customerVisiblePayload as object) || {}),
          selectedItemIndex: quote.items.findIndex((row) => row.id === item.id),
          selectedItemId: item.id,
          sellAmountMinor: item.sellAmount,
          currency: quote.currency,
          summary: item.description,
        }),
      },
    });

    const rules = await this.prisma.pricingRule.findMany({
      where: { organizationId: input.organizationId, isActive: true },
    });

    const offer: FlightOffer = {
      providerKey: item.providerKey,
      providerOfferRef: item.providerOfferRef,
      description: item.description,
      costAmountMinor: item.costAmount,
      currency: quote.currency,
      revalidationToken: item.revalidationToken || "",
      expiresAt: (item.expiresAt || new Date()).toISOString(),
      raw: (item.rawOfferSnapshot as Record<string, unknown>) || {},
    };

    const revalidated = await revalidatePricedOffer({
      offer,
      rules,
      providerKey: item.providerKey,
    });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "quotes.revalidate",
      entityType: "Quote",
      entityId: quote.id,
      after: {
        priceChanged: revalidated.priceChanged,
        sell: revalidated.pricing.sellAmountMinor,
        itemId: item.id,
      },
    });

    if (revalidated.priceChanged && !input.confirmPriceChange) {
      const request =
        pendingPriceChange ||
        (await this.prisma.bookingRequest.create({
          data: {
            organizationId: input.organizationId,
            quoteId: quote.id,
            status: "price_changed",
            requestedBy: input.requestedBy || "agent",
            notes:
              input.notes ||
              `تغير السعر إلى ${revalidated.pricing.sellAmountMinor} (وحدة صغرى) للخيار ${item.description}`,
          },
        }));

      await this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "accepted",
          totalCostAmount: revalidated.pricing.costAmountMinor,
          totalSellAmount: revalidated.pricing.sellAmountMinor,
          totalProfitAmount: revalidated.pricing.profitAmountMinor,
          customerVisiblePayload: asJson({
            ...((quote.customerVisiblePayload as object) || {}),
            selectedItemId: item.id,
            sellAmountMinor: revalidated.pricing.sellAmountMinor,
            currency: revalidated.pricing.currency,
            summary: item.description,
            priceChanged: true,
            awaitingPriceConfirm: true,
          }),
        },
      });

      if (input.notifyCustomer && quote.conversationId) {
        await this.pipeline.replyToConversation({
          organizationId: input.organizationId,
          conversationId: quote.conversationId,
          body: [
            "شكرًا لاختيارك.",
            "بعد إعادة التحقق تغيّر سعر البيع إلى:",
            formatMoneyMinor(
              revalidated.pricing.sellAmountMinor,
              revalidated.pricing.currency,
            ),
            "للتأكيد على السعر الجديد اكتب: أؤكد السعر",
            "لن يتم الإصدار تلقائيًا.",
          ].join("\n"),
        });
      }

      return {
        status: "price_changed" as const,
        bookingRequest: request,
        newSellAmountMinor: revalidated.pricing.sellAmountMinor,
        message: "تغير السعر بعد إعادة التحقق — يلزم تأكيد العميل/الموظف",
      };
    }

    if (pendingPriceChange) {
      await this.prisma.bookingRequest.update({
        where: { id: pendingPriceChange.id },
        data: { status: "ready_to_book" },
      });
    }

    const finalCost = revalidated.priceChanged
      ? revalidated.pricing.costAmountMinor
      : item.costAmount;
    const finalSell = revalidated.priceChanged
      ? revalidated.pricing.sellAmountMinor
      : item.sellAmount;
    const finalProfit = revalidated.priceChanged
      ? revalidated.pricing.profitAmountMinor
      : item.profitAmount;

    const request =
      pendingPriceChange ||
      (await this.prisma.bookingRequest.create({
        data: {
          organizationId: input.organizationId,
          quoteId: quote.id,
          status: "ready_to_book",
          requestedBy: input.requestedBy || "agent",
          notes: input.notes,
        },
      }));

    const booking = await this.prisma.booking.create({
      data: {
        organizationId: input.organizationId,
        bookingRequestId: request.id,
        quoteId: quote.id,
        status: "on_hold",
        totalCostAmount: finalCost,
        totalSellAmount: finalSell,
        totalProfitAmount: finalProfit,
        requiresApproval: true,
        passengerDetails: asJson({
          selectedQuoteItemId: item.id,
          serviceType: item.serviceType,
          description: item.description,
        }),
      },
    });

    await this.prisma.bookingRequest.update({
      where: { id: request.id },
      data: { status: "submitted" },
    });

    await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "accepted",
        totalCostAmount: finalCost,
        totalSellAmount: finalSell,
        totalProfitAmount: finalProfit,
        customerVisiblePayload: asJson({
          ...((quote.customerVisiblePayload as object) || {}),
          selectedItemId: item.id,
          awaitingPriceConfirm: false,
          priceChanged: false,
          sellAmountMinor: finalSell,
          summary: item.description,
        }),
      },
    });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "bookings.create",
      entityType: "Booking",
      entityId: booking.id,
      after: {
        quoteId: quote.id,
        status: booking.status,
        selectedItemId: item.id,
      },
    });

    if (input.notifyCustomer && quote.conversationId) {
      await this.pipeline.replyToConversation({
        organizationId: input.organizationId,
        conversationId: quote.conversationId,
        body: [
          "شكرًا لتأكيدك.",
          "تم إعادة التحقق من السعر والتوافر بنجاح.",
          `الخيار: ${item.description}`,
          `سعر البيع المعتمد: ${formatMoneyMinor(finalSell, quote.currency)}`,
          "طلب الحجز الآن قيد المراجعة لدى فريقنا قبل الإصدار.",
        ].join("\n"),
      });
    }

    return { status: "ready" as const, bookingRequest: request, booking };
  }

  async issue(input: {
    organizationId: string;
    bookingId: string;
    actorUserId: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: input.bookingId, organizationId: input.organizationId },
      include: {
        quote: { include: { items: { orderBy: { createdAt: "asc" } } } },
        bookingRequest: true,
      },
    });
    if (!booking) throw new BadRequestException("الحجز غير موجود");
    if (booking.bookingRequest?.status === "price_changed") {
      throw new BadRequestException(
        "لا يمكن الإصدار بعد تغير السعر دون تأكيد ومراجعة",
      );
    }

    const details = booking.passengerDetails as {
      selectedQuoteItemId?: string;
    } | null;
    const item =
      booking.quote.items.find(
        (row) => row.id === details?.selectedQuoteItemId,
      ) || booking.quote.items[0];

    let providerRef = `PNR-${Date.now()}`;
    if (item) {
      const isHotel = item.serviceType === "hotel";
      const provider = isHotel
        ? getHotelProvider(item.providerKey)
        : getFlightProvider(item.providerKey);
      const offer: FlightOffer = {
        providerKey: item.providerKey,
        providerOfferRef: item.providerOfferRef,
        description: item.description,
        costAmountMinor: item.costAmount,
        currency: booking.quote.currency,
        revalidationToken: item.revalidationToken || "",
        expiresAt: (item.expiresAt || new Date()).toISOString(),
        raw: (item.rawOfferSnapshot as Record<string, unknown>) || {},
      };
      if (provider.createBooking) {
        try {
          const created = await provider.createBooking(offer as never, {});
          if (
            created.status === "failed" ||
            !created.providerBookingRef?.trim()
          ) {
            await this.prisma.booking.update({
              where: { id: input.bookingId },
              data: { status: "failed" },
            });
            throw new BadRequestException(
              "العرض غير متاح أو نفدت المقاعد/الغرف من المزود",
            );
          }
          providerRef = created.providerBookingRef;
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          await this.prisma.booking.update({
            where: { id: input.bookingId },
            data: { status: "failed" },
          });
          throw new BadRequestException(
            error instanceof Error
              ? error.message
              : "فشل مزود الخدمة أثناء الإصدار",
          );
        }
      } else if (item.providerKey === "duffel") {
        throw new BadRequestException(
          "إصدار Duffel الحقيقي غير مفعّل بعد — استخدم المزود التجريبي أو فعّل createBooking",
        );
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        status: "confirmed",
        providerBookingRef: providerRef,
        issuedByUserId: input.actorUserId,
        issuedAt: new Date(),
        approvedByUserId: input.actorUserId,
        approvedAt: new Date(),
      },
    });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "bookings.issue",
      entityType: "Booking",
      entityId: input.bookingId,
      after: { providerBookingRef: providerRef, itemId: item?.id },
    });

    return updated;
  }

  async createFromDraft(input: CreateFromDraftInput) {
    let bookingId: string;

    if (input.quoteItemId) {
      const item = await this.prisma.quoteItem.findFirst({
        where: { id: input.quoteItemId, organizationId: input.organizationId },
      });
      if (!item) {
        throw new BadRequestException("عنصر العرض غير موجود");
      }

      const result = await this.createFromQuote({
        organizationId: input.organizationId,
        quoteId: item.quoteId,
        actorUserId: input.actorUserId,
        requestedBy: "customer",
        selectedItemId: item.id,
        confirmPriceChange: true,
        notifyCustomer: false,
      });

      if (result.status === "price_changed") {
        throw new BadRequestException(result.message);
      }
      bookingId = result.booking.id;
    } else {
      const booking = await this.createMinimalBookingFromOffer(input);
      bookingId = booking.id;
    }

    const existing = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId: input.organizationId },
    });
    if (!existing) throw new BadRequestException("الحجز غير موجود");

    const passengerDetails = {
      ...((existing.passengerDetails as Record<string, unknown>) || {}),
      serviceType: input.serviceType,
      travelers: input.travelers,
      guests: input.guests,
      contact: input.contact,
      extras: input.extras,
      ticketType: input.ticketType,
      seatPref: input.seatPref,
      route: input.route,
      stay: input.stay,
    };

    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        passengerDetails: asJson(passengerDetails),
        ...(input.customerId ? { customerId: input.customerId } : {}),
      },
      include: {
        quote: { include: { items: true } },
        bookingRequest: true,
        payments: true,
      },
    });

    if (input.customerId) {
      await this.prisma.travelInquiry.updateMany({
        where: {
          id: booking.quote.inquiryId,
          organizationId: input.organizationId,
        },
        data: { customerId: input.customerId },
      });
    }

    // Keep CRM contact in sync (Saffat-style: bookings feed customers).
    const phone = input.contact?.phone?.trim();
    if (phone) {
      const contact = await this.prisma.contact.upsert({
        where: {
          organizationId_waId: {
            organizationId: input.organizationId,
            waId: phone,
          },
        },
        update: {
          email: input.contact.email || undefined,
          lastContactedAt: new Date(),
        },
        create: {
          organizationId: input.organizationId,
          waId: phone,
          name:
            (input.travelers?.[0] as { firstName?: string; lastName?: string } | undefined)
              ? [
                  (input.travelers?.[0] as { firstName?: string }).firstName,
                  (input.travelers?.[0] as { lastName?: string }).lastName,
                ]
                  .filter(Boolean)
                  .join(" ") || phone
              : phone,
          email: input.contact.email,
          source: "booking",
          lastContactedAt: new Date(),
        },
      });
      await this.prisma.quote.update({
        where: { id: booking.quoteId },
        data: { contactId: contact.id },
      });
    }

    let payment = null;
    if (input.payment) {
      const unpaid =
        input.payment.status === "unpaid" || input.payment.status === "pending";
      if (input.canManagePayments || unpaid) {
        payment = await this.prisma.payment.create({
          data: {
            organizationId: input.organizationId,
            bookingId: booking.id,
            amount: booking.totalSellAmount,
            currency: booking.quote?.currency || "KWD",
            method: input.payment.method || "manual",
            status: unpaid ? input.payment.status || "unpaid" : input.payment.status || "paid",
            recordedByUserId: input.canManagePayments
              ? input.actorUserId
              : undefined,
          },
        });
      }
    }

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "bookings.create_from_draft",
      entityType: "Booking",
      entityId: booking.id,
      after: {
        serviceType: input.serviceType,
        viaQuoteItem: Boolean(input.quoteItemId),
        paymentRecorded: Boolean(payment),
      },
    });

    return { booking, payment };
  }

  private async resolveMinimalPricing(input: CreateFromDraftInput) {
    const currency = input.offer.currency || "KWD";
    const details = (input.offer.details || {}) as Record<string, unknown>;
    const serviceType =
      input.serviceType === "hotel" ? ("hotel" as const) : ("flight" as const);
    const rules = await this.prisma.pricingRule.findMany({
      where: { organizationId: input.organizationId, isActive: true },
    });
    const costFromDetails = Number(details.costAmountMinor) || 0;
    const sellFromClient = Math.round(input.offer.sellAmountMinor);
    const rawStars = details.stars;
    const rule = selectPricingRule(rules, serviceType, {
      provider: input.offer.providerKey,
      costAmountMinor:
        costFromDetails > 0 ? costFromDetails : Math.round(sellFromClient * 0.88),
      origin: input.route?.origin,
      destination: input.route?.destination || input.stay?.location,
      cabinClass: input.route?.cabinClass,
      checkIn: input.stay?.checkIn,
      city: input.stay?.location,
      stars:
        typeof rawStars === "number" || typeof rawStars === "string"
          ? rawStars
          : undefined,
    });

    if (costFromDetails > 0) {
      const pricing = applyPricingRule({
        costAmountMinor: costFromDetails,
        currency,
        serviceType,
        rule,
      });
      return {
        costAmount: pricing.costAmountMinor,
        sellAmount: pricing.sellAmountMinor,
        profitAmount: pricing.profitAmountMinor,
        pricingRuleId: pricing.pricingRuleId,
      };
    }

    const estimatedCost = Math.round(sellFromClient * 0.88);
    const pricing = applyPricingRule({
      costAmountMinor: estimatedCost,
      currency,
      serviceType,
      rule,
    });
    return {
      costAmount: pricing.costAmountMinor,
      sellAmount: sellFromClient,
      profitAmount: Math.max(0, sellFromClient - pricing.costAmountMinor),
      pricingRuleId: pricing.pricingRuleId,
    };
  }

  private async createMinimalBookingFromOffer(input: CreateFromDraftInput) {
    const currency = input.offer.currency || "KWD";
    const priced = await this.resolveMinimalPricing(input);
    const sellAmount = priced.sellAmount;
    const costAmount = priced.costAmount;
    const profitAmount = priced.profitAmount;

    const isFlight = input.serviceType === "flight";
    const isTransfer =
      input.serviceType === "transfer" || input.serviceType === "activity";
    const origin = isFlight || isTransfer ? input.route?.origin || null : null;
    const destination =
      isFlight || isTransfer
        ? input.route?.destination || null
        : input.stay?.location || null;
    const departDate = parseDateSafe(
      isFlight || isTransfer ? input.route?.departDate : input.stay?.checkIn,
    );
    const returnDate = parseDateSafe(
      isFlight || isTransfer ? input.route?.returnDate : input.stay?.checkOut,
    );

    const inquiry =
      (input.inquiryId
        ? await this.prisma.travelInquiry.findFirst({
            where: {
              id: input.inquiryId,
              organizationId: input.organizationId,
            },
          })
        : null) ||
      (await this.prisma.travelInquiry.create({
        data: {
          organizationId: input.organizationId,
          customerId: input.customerId,
          source: input.customerId ? "web_shop" : "direct",
          status: "quoted",
          origin,
          destination,
          departDate,
          returnDate,
          adults: input.adults ?? 1,
          children: input.children ?? 0,
          cabinClass: input.route?.cabinClass,
          serviceTypes: asJson([input.serviceType]),
          aiSummary: input.offer.description,
        },
      }));

    const quote = await this.prisma.quote.create({
      data: {
        organizationId: input.organizationId,
        inquiryId: inquiry.id,
        status: "accepted",
        currency,
        totalCostAmount: costAmount,
        totalSellAmount: sellAmount,
        totalProfitAmount: profitAmount,
        pricingRuleId: priced.pricingRuleId,
        customerVisiblePayload: asJson({
          summary: input.offer.description,
          sellAmountMinor: sellAmount,
          currency,
        }),
        createdByUserId: input.actorUserId,
        items: {
          create: [
            {
              organizationId: input.organizationId,
              serviceType: input.serviceType,
              providerKey: input.offer.providerKey || "manual",
              providerOfferRef:
                input.offer.providerOfferRef ||
                input.offer.id ||
                `manual-${Date.now()}`,
              description: input.offer.description,
              costAmount,
              sellAmount,
              profitAmount,
              rawOfferSnapshot: asJson(input.offer.details || {}),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
      include: { items: true },
    });

    const bookingRequest = await this.prisma.bookingRequest.create({
      data: {
        organizationId: input.organizationId,
        quoteId: quote.id,
        status: "submitted",
        requestedBy: "customer",
      },
    });

    const booking = await this.prisma.booking.create({
      data: {
        organizationId: input.organizationId,
        bookingRequestId: bookingRequest.id,
        quoteId: quote.id,
        customerId: input.customerId,
        status: "on_hold",
        totalCostAmount: costAmount,
        totalSellAmount: sellAmount,
        totalProfitAmount: profitAmount,
        requiresApproval: true,
        passengerDetails: asJson({
          selectedQuoteItemId: quote.items[0]?.id,
          serviceType: input.serviceType,
          description: input.offer.description,
        }),
      },
    });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "bookings.create",
      entityType: "Booking",
      entityId: booking.id,
      after: {
        quoteId: quote.id,
        status: booking.status,
        serviceType: input.serviceType,
        source: "draft",
      },
    });

    return booking;
  }

  async checkHotelRate(input: {
    organizationId: string;
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
  }) {
    const rateKey = String(input.rateKey || "").trim();
    if (!rateKey) {
      throw new BadRequestException("معرّف التعرفة مطلوب للتحقق من السعر");
    }
    const provider = await getHotelProviderForOrg(
      this.prisma,
      input.organizationId,
      input.offer.providerKey || "hotelbeds",
    );
    let token: Record<string, unknown> = {};
    try {
      token = JSON.parse(input.offer.revalidationToken || "{}") as Record<
        string,
        unknown
      >;
    } catch {
      token = {};
    }
    const offer: HotelOffer = {
      providerKey: input.offer.providerKey || provider.providerKey,
      providerOfferRef: input.offer.providerOfferRef || "",
      description: input.offer.description || "",
      costAmountMinor: Number(input.offer.costAmountMinor || 0),
      currency: input.offer.currency,
      revalidationToken: JSON.stringify({ ...token, rateKey }),
      expiresAt: input.offer.expiresAt || new Date().toISOString(),
      raw: input.offer.raw || {},
    };
    const rules = await this.prisma.pricingRule.findMany({
      where: { organizationId: input.organizationId, isActive: true },
    });
    const raw = await provider.revalidateOffer(offer);
    const rawStars = (raw.offer.raw as Record<string, unknown> | undefined)?.stars;
    const rule = selectPricingRule(rules, "hotel", {
      provider: raw.offer.providerKey,
      costAmountMinor: raw.offer.costAmountMinor,
      stars:
        typeof rawStars === "number" || typeof rawStars === "string"
          ? rawStars
          : undefined,
    });
    const pricing = applyPricingRule({
      costAmountMinor: raw.offer.costAmountMinor,
      currency: raw.offer.currency,
      serviceType: "hotel",
      rule,
    });
    return {
      available: raw.available,
      priceChanged: raw.priceChanged,
      previousCostMinor: raw.previousCostMinor,
      offer: raw.offer,
      selectedRate: raw.selectedRate,
      rateComments: raw.rateComments,
      pricing,
      customerVisible: toCustomerVisible({
        sellAmountMinor: pricing.sellAmountMinor,
        currency: pricing.currency,
        summary: raw.offer.description,
        expiresAt: raw.offer.expiresAt,
      }),
    };
  }

  async hotelRateComments(input: {
    organizationId: string;
    ids: string[];
    date: string;
    providerKey?: string;
  }) {
    const provider = await getHotelProviderForOrg(
      this.prisma,
      input.organizationId,
      input.providerKey || "hotelbeds",
    );
    if (!provider.fetchRateComments) return {};
    return provider.fetchRateComments(input.ids || [], input.date);
  }

  async searchTransfers(input: {
    organizationId: string;
    city?: string;
    from: string;
    to: string;
    fromKind?: "IATA" | "ATLAS" | "GPS";
    toKind?: "IATA" | "ATLAS" | "GPS";
    outboundDate: string;
    outboundTime?: string;
    inboundDate?: string;
    inboundTime?: string;
    adults: number;
    children?: number;
    infants?: number;
    toLabel?: string;
  }) {
    const from = String(input.from || "").trim();
    const to = String(input.to || "").trim() || from;
    const city = String(input.city || "").trim() || to || from;
    if (!from) {
      throw new BadRequestException("حدد نقطة الاستلام");
    }
    if (!input.outboundDate) {
      throw new BadRequestException("حدد تاريخ الذهاب");
    }
    const provider = await getTransferProviderForOrg(
      this.prisma,
      input.organizationId,
      process.env.TRANSFER_PROVIDER || "hotelbeds-transfers",
    );
    let offers;
    try {
      offers = await provider.searchTransfers({
        city,
        from,
        to,
        fromKind: input.fromKind,
        toKind: input.toKind,
        outboundDate: input.outboundDate,
        outboundTime: input.outboundTime,
        inboundDate: input.inboundDate,
        inboundTime: input.inboundTime,
        adults: Math.max(1, input.adults || 1),
        children: Math.max(0, input.children || 0),
        infants: Math.max(0, input.infants || 0),
        toLabel: input.toLabel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر البحث عن النقل";
      throw new BadRequestException(message);
    }
    return {
      providerKey: provider.providerKey,
      providerName: provider.displayName,
      liveMode: provider.liveMode,
      items: offers.map((offer) => ({
        id: offer.providerOfferRef,
        serviceType: "transfer" as const,
        name: offer.description,
        description: String(offer.raw.description || offer.description),
        sellAmountMinor: offer.costAmountMinor,
        costAmountMinor: offer.costAmountMinor,
        currency: offer.currency,
        expiresAt: offer.expiresAt,
        details: offer.raw,
      })),
    };
  }

  async suggestHotels(input: {
    organizationId: string;
    query: string;
    checkIn?: string;
    checkOut?: string;
  }) {
    const query = String(input.query || "").trim();
    if (query.length < 2) {
      return { items: [] as Array<{ code: string; name: string; city: string }> };
    }
    const today = new Date();
    const plus = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const checkIn = input.checkIn || plus(14);
    const checkOut =
      input.checkOut && input.checkOut > checkIn ? input.checkOut : plus(15);
    const provider = await getHotelProviderForOrg(
      this.prisma,
      input.organizationId,
      process.env.HOTEL_PROVIDER || "hotelbeds",
    );
    let offers: HotelOffer[] = [];
    try {
      offers = await provider.searchHotels({
        location: query,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: 1,
        maxHotels: 12,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر البحث عن الفنادق";
      throw new BadRequestException(message);
    }
    const seen = new Set<string>();
    const items: Array<{ code: string; name: string; city: string }> = [];
    for (const offer of offers) {
      const code = String(offer.raw?.hotelCode || "")
        .replace(/^hb-/i, "")
        .trim();
      const name = String(offer.raw?.name || offer.description || "").trim();
      const city = String(
        offer.raw?.destinationName || offer.raw?.city || offer.raw?.location || "",
      ).trim();
      if (!code || !/^\d+$/.test(code) || seen.has(code)) continue;
      seen.add(code);
      items.push({ code, name: name || `فندق ${code}`, city });
    }
    return { items };
  }

  async searchActivities(input: {
    organizationId: string;
    destination: string;
    fromDate: string;
    toDate: string;
    adults: number;
    children?: number;
  }) {
    const destination = String(input.destination || "").trim();
    if (!destination) {
      throw new BadRequestException("حدد وجهة النشاط");
    }
    if (!input.fromDate || !input.toDate) {
      throw new BadRequestException("حدد تاريخ البداية والنهاية");
    }
    const provider = await getActivityProviderForOrg(
      this.prisma,
      input.organizationId,
      process.env.ACTIVITY_PROVIDER || "hotelbeds-activities",
    );
    let offers;
    try {
      offers = await provider.searchActivities({
        destination,
        fromDate: input.fromDate,
        toDate: input.toDate,
        adults: Math.max(1, input.adults || 1),
        children: Math.max(0, input.children || 0),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر البحث عن الأنشطة";
      throw new BadRequestException(message);
    }
    return {
      providerKey: provider.providerKey,
      providerName: provider.displayName,
      liveMode: provider.liveMode,
      items: offers.map((offer) => ({
        id: offer.providerOfferRef,
        serviceType: "activity" as const,
        name: offer.description,
        description: String(offer.raw.description || offer.description),
        sellAmountMinor: offer.costAmountMinor,
        costAmountMinor: offer.costAmountMinor,
        currency: offer.currency,
        expiresAt: offer.expiresAt,
        details: offer.raw,
      })),
    };
  }
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseDateSafe(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
