-- AlterTable: WhatsAppAccount channel fields
ALTER TABLE "WhatsAppAccount" ADD COLUMN "channelName" TEXT;
ALTER TABLE "WhatsAppAccount" ADD COLUMN "channelType" TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE "WhatsAppAccount" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Template metadata fields
ALTER TABLE "Template" ADD COLUMN "header" TEXT;
ALTER TABLE "Template" ADD COLUMN "footer" TEXT;
ALTER TABLE "Template" ADD COLUMN "exampleValues" JSONB;
ALTER TABLE "Template" ADD COLUMN "metaTemplateId" TEXT;

-- AlterTable: Organization defaults (KWD / Asia/Kuwait)
ALTER TABLE "Organization" ALTER COLUMN "defaultCurrency" SET DEFAULT 'KWD';
ALTER TABLE "Organization" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kuwait';

-- Backfill existing rows still on the old SAR/Riyadh defaults
UPDATE "Organization" SET "defaultCurrency" = 'KWD' WHERE "defaultCurrency" = 'SAR';
UPDATE "Organization" SET "timezone" = 'Asia/Kuwait' WHERE "timezone" = 'Asia/Riyadh';

-- Mark the oldest connected WhatsApp account per organization as default
UPDATE "WhatsAppAccount" AS w
SET "isDefault" = true
WHERE w."id" = (
  SELECT w2."id"
  FROM "WhatsAppAccount" AS w2
  WHERE w2."organizationId" = w."organizationId"
  ORDER BY w2."createdAt" ASC
  LIMIT 1
);
