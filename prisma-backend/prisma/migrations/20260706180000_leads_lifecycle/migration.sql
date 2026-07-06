-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'NURTURING', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadRating" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LeadHistoryAction" AS ENUM ('CREATED', 'STAGE_CHANGED', 'ASSIGNED', 'SCORED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED', 'FOLLOW_UP_SET', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "rating" "LeadRating",
    "next_follow_up_at" TIMESTAMP(3),
    "qualified_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "lost_reason" TEXT,
    "qualification_notes" TEXT,
    "last_scored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "LeadHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_history_pkey" PRIMARY KEY ("id")
);

-- Backfill leads for existing LEAD contacts
INSERT INTO "leads" ("id", "organizationId", "contact_id", "stage", "score", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "organizationId", "id", 'NEW', 0, NOW(), NOW()
FROM "contacts"
WHERE "status" = 'LEAD' AND "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "leads_contact_id_key" ON "leads"("contact_id");

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"("organizationId");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_score_idx" ON "leads"("score");

-- CreateIndex
CREATE INDEX "leads_rating_idx" ON "leads"("rating");

-- CreateIndex
CREATE INDEX "leads_next_follow_up_at_idx" ON "leads"("next_follow_up_at");

-- CreateIndex
CREATE INDEX "lead_history_lead_id_idx" ON "lead_history"("lead_id");

-- CreateIndex
CREATE INDEX "lead_history_organization_id_idx" ON "lead_history"("organization_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
