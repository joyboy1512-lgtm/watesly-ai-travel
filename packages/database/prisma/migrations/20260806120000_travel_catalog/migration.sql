-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL,
    "iataCode" TEXT,
    "icaoCode" TEXT,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "country" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "iataCode" TEXT,
    "icaoCode" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airline_iataCode_key" ON "Airline"("iataCode");

-- CreateIndex
CREATE INDEX "Airline_name_idx" ON "Airline"("name");

-- CreateIndex
CREATE INDEX "Airline_country_idx" ON "Airline"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iataCode_key" ON "Airport"("iataCode");

-- CreateIndex
CREATE INDEX "Airport_city_idx" ON "Airport"("city");

-- CreateIndex
CREATE INDEX "Airport_country_idx" ON "Airport"("country");

-- CreateIndex
CREATE INDEX "Airport_name_idx" ON "Airport"("name");
