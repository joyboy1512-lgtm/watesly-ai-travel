-- AlterTable: Template header media (image / video / document)
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "headerType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "headerMediaUrl" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "headerMediaName" TEXT;
