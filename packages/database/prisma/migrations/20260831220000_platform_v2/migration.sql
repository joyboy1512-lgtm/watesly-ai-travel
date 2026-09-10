-- Platform v2 durable persistence (trips, loyalty, alerts, referrals, notifications, CMS deals)

CREATE TABLE "PlatformTrip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "totalSellMinor" INTEGER NOT NULL DEFAULT 0,
    "savingsMinor" INTEGER NOT NULL DEFAULT 0,
    "components" JSONB NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "destination" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documents" JSONB,
    "services" JSONB,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "tripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "currentPriceMinor" INTEGER NOT NULL,
    "targetPriceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerCustomerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerNotification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsDeal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destinationSlug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "includes" JSONB NOT NULL,
    "originalPriceMinor" INTEGER NOT NULL,
    "salePriceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "nights" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "countryFlag" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsDeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformTrip_organizationId_customerId_status_idx" ON "PlatformTrip"("organizationId", "customerId", "status");
CREATE INDEX "PlatformTrip_customerId_createdAt_idx" ON "PlatformTrip"("customerId", "createdAt");

CREATE INDEX "PointsLedger_customerId_createdAt_idx" ON "PointsLedger"("customerId", "createdAt");
CREATE INDEX "PointsLedger_organizationId_customerId_idx" ON "PointsLedger"("organizationId", "customerId");

CREATE INDEX "PriceAlert_customerId_active_idx" ON "PriceAlert"("customerId", "active");
CREATE INDEX "PriceAlert_origin_destination_active_idx" ON "PriceAlert"("origin", "destination", "active");
CREATE INDEX "PriceAlert_organizationId_customerId_idx" ON "PriceAlert"("organizationId", "customerId");

CREATE UNIQUE INDEX "Referral_organizationId_code_key" ON "Referral"("organizationId", "code");
CREATE INDEX "Referral_ownerCustomerId_idx" ON "Referral"("ownerCustomerId");

CREATE INDEX "CustomerNotification_customerId_createdAt_idx" ON "CustomerNotification"("customerId", "createdAt");
CREATE INDEX "CustomerNotification_organizationId_customerId_createdAt_idx" ON "CustomerNotification"("organizationId", "customerId", "createdAt");

CREATE UNIQUE INDEX "CmsDeal_organizationId_slug_key" ON "CmsDeal"("organizationId", "slug");
CREATE INDEX "CmsDeal_organizationId_active_idx" ON "CmsDeal"("organizationId", "active");
CREATE INDEX "CmsDeal_destinationSlug_idx" ON "CmsDeal"("destinationSlug");

ALTER TABLE "PlatformTrip" ADD CONSTRAINT "PlatformTrip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformTrip" ADD CONSTRAINT "PlatformTrip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_ownerCustomerId_fkey" FOREIGN KEY ("ownerCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CmsDeal" ADD CONSTRAINT "CmsDeal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
