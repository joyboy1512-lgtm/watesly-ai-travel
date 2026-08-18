-- Per-chat AI credit limit and spend tracking

ALTER TABLE "AiThread" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AiThread" ADD COLUMN IF NOT EXISTS "creditLimitUsd" DECIMAL(12,6);
ALTER TABLE "AiThread" ADD COLUMN IF NOT EXISTS "spentUsd" DECIMAL(12,6) NOT NULL DEFAULT 0;
