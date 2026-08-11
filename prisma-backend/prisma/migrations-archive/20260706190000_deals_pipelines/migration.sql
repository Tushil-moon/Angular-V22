-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DealHistoryAction" AS ENUM ('CREATED', 'STAGE_CHANGED', 'VALUE_CHANGED', 'ASSIGNED', 'WON', 'LOST', 'REOPENED', 'NOTE_ADDED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "pipelines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage_key" "DealStage" NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "pipeline_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "pipeline_stage_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "probability" INTEGER;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "win_reason" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "loss_reason" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "competitor" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "deal_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "DealHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_history_pkey" PRIMARY KEY ("id")
);

-- Seed default pipeline per organization
INSERT INTO "pipelines" ("id", "organization_id", "name", "is_default", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    o."id",
    'Sales Pipeline',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
    SELECT 1 FROM "pipelines" p WHERE p."organization_id" = o."id" AND p."is_default" = true
);

-- Seed pipeline stages for each default pipeline missing stages
INSERT INTO "pipeline_stages" ("id", "pipeline_id", "name", "stage_key", "probability", "sort_order", "is_closed", "is_won", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", stage.name, stage.stage_key::"DealStage", stage.probability, stage.sort_order, stage.is_closed, stage.is_won, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "pipelines" p
CROSS JOIN (
    VALUES
        ('Lead', 'LEAD', 10, 0, false, false),
        ('Qualified', 'QUALIFIED', 25, 1, false, false),
        ('Proposal', 'PROPOSAL', 50, 2, false, false),
        ('Negotiation', 'NEGOTIATION', 75, 3, false, false),
        ('Won', 'WON', 100, 4, true, true),
        ('Lost', 'LOST', 0, 5, true, false)
) AS stage(name, stage_key, probability, sort_order, is_closed, is_won)
WHERE p."is_default" = true
  AND NOT EXISTS (SELECT 1 FROM "pipeline_stages" ps WHERE ps."pipeline_id" = p."id");

-- Backfill deal pipeline references
UPDATE "deals" AS d
SET
    "pipeline_id" = p."id",
    "pipeline_stage_id" = ps."id",
    "probability" = COALESCE(d."probability", ps."probability")
FROM "pipelines" p
INNER JOIN "pipeline_stages" ps ON ps."pipeline_id" = p."id"
WHERE p."organization_id" = d."organizationId"
  AND p."is_default" = true
  AND ps."stage_key" = d."stage"
  AND d."pipeline_id" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pipelines_organization_id_idx" ON "pipelines"("organization_id");
CREATE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_sort_order_idx" ON "pipeline_stages"("pipeline_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_stage_key_key" ON "pipeline_stages"("pipeline_id", "stage_key");
CREATE INDEX IF NOT EXISTS "deals_company_id_idx" ON "deals"("company_id");
CREATE INDEX IF NOT EXISTS "deals_lead_id_idx" ON "deals"("lead_id");
CREATE INDEX IF NOT EXISTS "deals_pipeline_id_idx" ON "deals"("pipeline_id");
CREATE INDEX IF NOT EXISTS "deals_pipeline_stage_id_idx" ON "deals"("pipeline_stage_id");
CREATE INDEX IF NOT EXISTS "deal_history_deal_id_idx" ON "deal_history"("deal_id");
CREATE INDEX IF NOT EXISTS "deal_history_organization_id_idx" ON "deal_history"("organization_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
