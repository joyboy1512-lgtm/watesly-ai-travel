import { PrismaClient } from "@prisma/client";

/**
 * Seeds demo inquiries / quotes / bookings with varied statuses for the dashboard.
 * Idempotent via fixed IDs.
 */

const prisma = new PrismaClient();
const DEMO_ORG_SLUG = "watesly-demo";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedDemoBookings(client: PrismaClient = prisma) {
  const org = await client.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (!org) {
    // eslint-disable-next-line no-console
    console.warn("seedDemoBookings: org watesly-demo not found — skip");
    return;
  }

  const owner = await client.membership.findFirst({
    where: { organizationId: org.id, status: "active" },
    include: { user: true },
  });

  const fixtures: Array<{
    inquiryId: string;
    quoteId: string;
    requestId: string;
    bookingId: string;
    inquiryStatus: string;
    quoteStatus: string;
    requestStatus: string;
    bookingStatus: string;
    paymentStatus: string;
    serviceType: string;
    origin: string;
    destination: string;
    description: string;
    cost: number;
    sell: number;
    providerOfferRef: string;
    providerBookingRef?: string | null;
  }> = [
    {
      inquiryId: "demo-inq-confirmed-dxb",
      quoteId: "demo-qte-confirmed-dxb",
      requestId: "demo-breq-confirmed-dxb",
      bookingId: "demo-bkg-confirmed-dxb",
      inquiryStatus: "quoted",
      quoteStatus: "accepted",
      requestStatus: "submitted",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      serviceType: "flight",
      origin: "KWI",
      destination: "DXB",
      description: "Kuwait Airways KWI → DXB · ذهاب فقط · عرض تجريبي مؤكد",
      cost: 48000,
      sell: 54000,
      providerOfferRef: "MOCK-FLT-DIRECT-MORNING-KU-DXB-1",
      providerBookingRef: "PNR-MOCK-DXB001",
    },
    {
      inquiryId: "demo-inq-pending-ist",
      quoteId: "demo-qte-pending-ist",
      requestId: "demo-breq-pending-ist",
      bookingId: "demo-bkg-pending-ist",
      inquiryStatus: "quoted",
      quoteStatus: "sent",
      requestStatus: "pending_revalidation",
      bookingStatus: "on_hold",
      paymentStatus: "unpaid",
      serviceType: "flight",
      origin: "KWI",
      destination: "IST",
      description: "Turkish Airlines KWI → IST · بانتظار التأكيد",
      cost: 92000,
      sell: 105000,
      providerOfferRef: "MOCK-FLT-TRANSIT-IST-TK-IST-2",
      providerBookingRef: null,
    },
    {
      inquiryId: "demo-inq-cancelled-lhr",
      quoteId: "demo-qte-cancelled-lhr",
      requestId: "demo-breq-cancelled-lhr",
      bookingId: "demo-bkg-cancelled-lhr",
      inquiryStatus: "closed",
      quoteStatus: "canceled",
      requestStatus: "canceled",
      bookingStatus: "canceled",
      paymentStatus: "refunded",
      serviceType: "flight",
      origin: "KWI",
      destination: "LHR",
      description: "British Airways KWI → LHR · ملغى",
      cost: 185000,
      sell: 210000,
      providerOfferRef: "MOCK-FLT-SOLD-OUT-LHR-8",
      providerBookingRef: "PNR-MOCK-LHR000",
    },
    {
      inquiryId: "demo-inq-failed-cai",
      quoteId: "demo-qte-failed-cai",
      requestId: "demo-breq-failed-cai",
      bookingId: "demo-bkg-failed-cai",
      inquiryStatus: "searched",
      quoteStatus: "draft",
      requestStatus: "rejected",
      bookingStatus: "failed",
      paymentStatus: "failed",
      serviceType: "flight",
      origin: "KWI",
      destination: "CAI",
      description: "EgyptAir KWI → CAI · فشل المزود (سيناريو اختبار)",
      cost: 62000,
      sell: 72000,
      providerOfferRef: "MOCK-FLT-PROVIDER-FAIL-CAI-9",
      providerBookingRef: null,
    },
    {
      inquiryId: "demo-inq-hotel-dxb",
      quoteId: "demo-qte-hotel-dxb",
      requestId: "demo-breq-hotel-dxb",
      bookingId: "demo-bkg-hotel-dxb",
      inquiryStatus: "quoted",
      quoteStatus: "accepted",
      requestStatus: "submitted",
      bookingStatus: "ticketed",
      paymentStatus: "paid",
      serviceType: "hotel",
      origin: "KWI",
      destination: "DXB",
      description: "منتجع دبي بلازا · 3 ليالٍ · مؤكد ومُصدَر",
      cost: 240000,
      sell: 276000,
      providerOfferRef: "MOCK-HTL-HTL-5-PLAZA-A1",
      providerBookingRef: "HTL-MOCK-DXB55",
    },
    {
      inquiryId: "demo-inq-price-change",
      quoteId: "demo-qte-price-change",
      requestId: "demo-breq-price-change",
      bookingId: "demo-bkg-price-change",
      inquiryStatus: "quoted",
      quoteStatus: "sent",
      requestStatus: "price_changed",
      bookingStatus: "draft",
      paymentStatus: "unpaid",
      serviceType: "flight",
      origin: "KWI",
      destination: "GYD",
      description: "Emirates KWI → GYD · سيناريو تغير السعر",
      cost: 78000,
      sell: 89000,
      providerOfferRef: "MOCK-FLT-PRICE-CHANGE-GYD-7",
      providerBookingRef: null,
    },
    {
      inquiryId: "demo-inq-package-sel",
      quoteId: "demo-qte-package-sel",
      requestId: "demo-breq-package-sel",
      bookingId: "demo-bkg-package-sel",
      inquiryStatus: "quoted",
      quoteStatus: "accepted",
      requestStatus: "ready_to_book",
      bookingStatus: "confirmed",
      paymentStatus: "partial",
      serviceType: "package",
      origin: "KWI",
      destination: "ICN",
      description: "باقة سيول الكلاسيكية · طيران + فندق + نقل",
      cost: 420000,
      sell: 485000,
      providerOfferRef: "MOCK-PKG-CLASSIC-ICN",
      providerBookingRef: "PKG-MOCK-ICN01",
    },
  ];

  for (const f of fixtures) {
    await client.travelInquiry.upsert({
      where: { id: f.inquiryId },
      update: {
        status: f.inquiryStatus,
        origin: f.origin,
        destination: f.destination,
        departDate: daysFromNow(14),
        returnDate: daysFromNow(21),
        adults: 2,
        serviceTypes: [f.serviceType === "package" ? "flight" : f.serviceType],
        preferences:
          f.serviceType === "hotel" || f.serviceType === "package"
            ? JSON.stringify({ query: f.destination, rooms: 1 })
            : null,
        aiSummary: f.description,
      },
      create: {
        id: f.inquiryId,
        organizationId: org.id,
        source: "dashboard",
        status: f.inquiryStatus,
        origin: f.origin,
        destination: f.destination,
        departDate: daysFromNow(14),
        returnDate: daysFromNow(21),
        adults: 2,
        children: 0,
        cabinClass: "economy",
        serviceTypes: [f.serviceType === "package" ? "flight" : f.serviceType],
        preferences:
          f.serviceType === "hotel" || f.serviceType === "package"
            ? JSON.stringify({ query: f.destination, rooms: 1 })
            : null,
        aiSummary: f.description,
      },
    });

    const profit = f.sell - f.cost;
    await client.quote.upsert({
      where: { id: f.quoteId },
      update: {
        status: f.quoteStatus,
        currency: "KWD",
        totalCostAmount: f.cost,
        totalSellAmount: f.sell,
        totalProfitAmount: profit,
        expiresAt: daysFromNow(2),
        customerVisiblePayload: {
          summary: f.description,
          note: "بيانات تجريبية (Mock)",
          sellAmountMinor: f.sell,
          currency: "KWD",
        },
      },
      create: {
        id: f.quoteId,
        organizationId: org.id,
        inquiryId: f.inquiryId,
        status: f.quoteStatus,
        currency: "KWD",
        totalCostAmount: f.cost,
        totalSellAmount: f.sell,
        totalProfitAmount: profit,
        expiresAt: daysFromNow(2),
        createdByUserId: owner?.userId,
        customerVisiblePayload: {
          summary: f.description,
          note: "بيانات تجريبية (Mock)",
          sellAmountMinor: f.sell,
          currency: "KWD",
        },
      },
    });

    const itemId = `${f.quoteId}-item-1`;
    await client.quoteItem.upsert({
      where: { id: itemId },
      update: {
        description: f.description,
        costAmount: f.cost,
        sellAmount: f.sell,
        profitAmount: profit,
        providerOfferRef: f.providerOfferRef,
        serviceType: f.serviceType === "package" ? "flight" : f.serviceType,
        rawOfferSnapshot: {
          provider: "mock",
          liveMode: false,
          scenario: f.providerOfferRef.includes("PRICE-CHANGE")
            ? "price_change"
            : f.providerOfferRef.includes("PROVIDER-FAIL")
              ? "provider_fail"
              : f.providerOfferRef.includes("SOLD-OUT")
                ? "sold_out"
                : "normal",
          destination: f.destination,
          origin: f.origin,
        },
      },
      create: {
        id: itemId,
        quoteId: f.quoteId,
        organizationId: org.id,
        serviceType: f.serviceType === "package" ? "flight" : f.serviceType,
        providerKey: "mock",
        providerOfferRef: f.providerOfferRef,
        description: f.description,
        costAmount: f.cost,
        sellAmount: f.sell,
        profitAmount: profit,
        revalidationToken: `seed_rv_${f.bookingId}`,
        expiresAt: daysFromNow(2),
        rawOfferSnapshot: {
          provider: "mock",
          liveMode: false,
          scenario: f.providerOfferRef.includes("PRICE-CHANGE")
            ? "price_change"
            : f.providerOfferRef.includes("PROVIDER-FAIL")
              ? "provider_fail"
              : f.providerOfferRef.includes("SOLD-OUT")
                ? "sold_out"
                : "normal",
          destination: f.destination,
          origin: f.origin,
        },
      },
    });

    // Package gets a second hotel line item
    if (f.serviceType === "package") {
      const hotelItemId = `${f.quoteId}-item-2`;
      await client.quoteItem.upsert({
        where: { id: hotelItemId },
        update: {},
        create: {
          id: hotelItemId,
          quoteId: f.quoteId,
          organizationId: org.id,
          serviceType: "hotel",
          providerKey: "mock",
          providerOfferRef: "MOCK-HTL-HTL-4-CENTRAL-ICN",
          description: "فندق سيول سنترال · 5 ليالٍ (ضمن الباقة)",
          costAmount: Math.round(f.cost * 0.45),
          sellAmount: Math.round(f.sell * 0.45),
          profitAmount: Math.round((f.sell - f.cost) * 0.45),
          rawOfferSnapshot: {
            provider: "mock",
            name: "فندق سيول سنترال",
            stars: 4,
            relatedAncillaries: [
              {
                id: "trf-airport",
                serviceType: "transfer",
                nameAr: "نقل مطار سيول",
                priceKwd: 12,
              },
              {
                id: "tour-city",
                serviceType: "tour",
                nameAr: "جولة مدينة سيول نصف يوم",
                priceKwd: 44,
              },
            ],
          },
        },
      });
    }

    await client.bookingRequest.upsert({
      where: { id: f.requestId },
      update: { status: f.requestStatus, notes: "seed demo" },
      create: {
        id: f.requestId,
        organizationId: org.id,
        quoteId: f.quoteId,
        status: f.requestStatus,
        requestedBy: "seed",
        notes: "seed demo",
      },
    });

    await client.booking.upsert({
      where: { id: f.bookingId },
      update: {
        status: f.bookingStatus,
        providerBookingRef: f.providerBookingRef,
        totalCostAmount: f.cost,
        totalSellAmount: f.sell,
        totalProfitAmount: profit,
        passengerDetails: {
          contact: { email: "demo@watesly.travel", phone: "+96550000000" },
          travelers: [{ firstName: "Demo", lastName: "Traveler" }],
        },
        issuedAt:
          f.bookingStatus === "confirmed" || f.bookingStatus === "ticketed"
            ? new Date()
            : null,
        issuedByUserId:
          f.bookingStatus === "confirmed" || f.bookingStatus === "ticketed"
            ? owner?.userId
            : null,
      },
      create: {
        id: f.bookingId,
        organizationId: org.id,
        bookingRequestId: f.requestId,
        quoteId: f.quoteId,
        status: f.bookingStatus,
        providerBookingRef: f.providerBookingRef,
        totalCostAmount: f.cost,
        totalSellAmount: f.sell,
        totalProfitAmount: profit,
        passengerDetails: {
          contact: { email: "demo@watesly.travel", phone: "+96550000000" },
          travelers: [{ firstName: "Demo", lastName: "Traveler" }],
        },
        issuedAt:
          f.bookingStatus === "confirmed" || f.bookingStatus === "ticketed"
            ? new Date()
            : null,
        issuedByUserId:
          f.bookingStatus === "confirmed" || f.bookingStatus === "ticketed"
            ? owner?.userId
            : null,
      },
    });

    const paymentId = `${f.bookingId}-pay-1`;
    await client.payment.upsert({
      where: { id: paymentId },
      update: {
        status: f.paymentStatus,
        amount: f.sell,
        method: f.paymentStatus === "paid" ? "knet" : "manual",
      },
      create: {
        id: paymentId,
        organizationId: org.id,
        bookingId: f.bookingId,
        status: f.paymentStatus,
        method: f.paymentStatus === "paid" ? "knet" : "manual",
        amount: f.sell,
        currency: "KWD",
      },
    });
  }

  // Prefer mock provider for demo searches
  await client.travelProviderConfig.updateMany({
    where: { organizationId: org.id, providerKey: "mock" },
    data: { priority: 1, enabled: true, displayName: "مزود تجريبي (Mock)" },
  });
  await client.travelProviderConfig.updateMany({
    where: { organizationId: org.id, providerKey: "duffel" },
    data: { priority: 50 },
  });

  // eslint-disable-next-line no-console
  console.log(`seedDemoBookings: ${fixtures.length} demo bookings for ${DEMO_ORG_SLUG}`);
}

const isDirectRun = process.argv[1]?.includes("seed-demo-bookings");
if (isDirectRun) {
  seedDemoBookings()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
