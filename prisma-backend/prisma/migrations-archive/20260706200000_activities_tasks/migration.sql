-- Activities & Tasks (Module 7)

CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActivityPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ActivityHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'ASSIGNED',
  'COMPLETED',
  'REOPENED',
  'CANCELLED',
  'REMINDER_SET',
  'RECURRENCE_UPDATED'
);
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "activities" ADD COLUMN "status" "ActivityStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "activities" ADD COLUMN "priority" "ActivityPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "activities" ADD COLUMN "company_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "lead_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "assignee_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "started_at" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "reminder_at" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "duration_minutes" INTEGER;
ALTER TABLE "activities" ADD COLUMN "location" TEXT;
ALTER TABLE "activities" ADD COLUMN "series_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "recurrence_frequency" "RecurrenceFrequency";
ALTER TABLE "activities" ADD COLUMN "recurrence_interval" INTEGER DEFAULT 1;
ALTER TABLE "activities" ADD COLUMN "recurrence_end_at" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "is_recurrence_template" BOOLEAN NOT NULL DEFAULT false;

UPDATE "activities"
SET "status" = 'COMPLETED'
WHERE "completed_at" IS NOT NULL;

UPDATE "activities"
SET "status" = 'COMPLETED'
WHERE "completed_at" IS NULL
  AND "type" IN ('NOTE', 'CALL', 'EMAIL', 'MEETING')
  AND "due_at" IS NULL;

CREATE TABLE "activity_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "ActivityHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activities_company_id_idx" ON "activities"("company_id");
CREATE INDEX "activities_lead_id_idx" ON "activities"("lead_id");
CREATE INDEX "activities_assignee_id_idx" ON "activities"("assignee_id");
CREATE INDEX "activities_reminder_at_idx" ON "activities"("reminder_at");
CREATE INDEX "activities_status_idx" ON "activities"("status");
CREATE INDEX "activities_series_id_idx" ON "activities"("series_id");
CREATE INDEX "activity_history_activity_id_idx" ON "activity_history"("activity_id");
CREATE INDEX "activity_history_organization_id_idx" ON "activity_history"("organization_id");

ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
