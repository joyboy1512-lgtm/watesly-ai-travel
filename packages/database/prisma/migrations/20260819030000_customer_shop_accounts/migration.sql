-- Public shop customer accounts, family travelers, and booking ownership

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contactId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerTraveler" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'mr',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "relation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTraveler_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TravelInquiry" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE UNIQUE INDEX "Customer_organizationId_phone_key" ON "Customer"("organizationId", "phone");
CREATE INDEX "Customer_organizationId_status_idx" ON "Customer"("organizationId", "status");
CREATE INDEX "Customer_contactId_idx" ON "Customer"("contactId");
CREATE INDEX "CustomerTraveler_customerId_idx" ON "CustomerTraveler"("customerId");
CREATE INDEX "TravelInquiry_customerId_idx" ON "TravelInquiry"("customerId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerTraveler" ADD CONSTRAINT "CustomerTraveler_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelInquiry" ADD CONSTRAINT "TravelInquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
