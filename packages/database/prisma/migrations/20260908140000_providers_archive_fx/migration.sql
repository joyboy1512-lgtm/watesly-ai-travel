-- Soft-archive for travel providers + org FX rates.
-- Also removes the experimental mock provider and its rows.

ALTER TABLE "TravelProviderConfig" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "TravelProviderConfig_organizationId_archivedAt_idx"
  ON "TravelProviderConfig"("organizationId", "archivedAt");

CREATE TABLE IF NOT EXISTS "OrganizationFxRate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationFxRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationFxRate_organizationId_fromCurrency_toCurrency_key"
  ON "OrganizationFxRate"("organizationId", "fromCurrency", "toCurrency");

CREATE INDEX IF NOT EXISTS "OrganizationFxRate_organizationId_toCurrency_idx"
  ON "OrganizationFxRate"("organizationId", "toCurrency");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationFxRate_organizationId_fkey'
  ) THEN
    ALTER TABLE "OrganizationFxRate"
      ADD CONSTRAINT "OrganizationFxRate_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Delete mock provider configs and any leftover mock-only data hooks.
DELETE FROM "TravelProviderConfig" WHERE lower("providerKey") = 'mock';
