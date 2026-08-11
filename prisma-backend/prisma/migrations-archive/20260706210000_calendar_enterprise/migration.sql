-- Calendar Enterprise (Module 8)

DO $$ BEGIN ALTER TYPE "CalendarEventType" ADD VALUE 'CALL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "CalendarEventType" ADD VALUE 'REMINDER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "CalendarEventType" ADD VALUE 'OUT_OF_OFFICE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TYPE "CalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');
CREATE TYPE "CalendarAttendeeStatus" AS ENUM ('NEEDS_ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE');
CREATE TYPE "CalendarSyncProvider" AS ENUM ('INTERNAL', 'GOOGLE', 'OUTLOOK', 'ICAL');
CREATE TYPE "CalendarHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'RESCHEDULED',
  'CANCELLED',
  'ATTENDEE_ADDED',
  'SYNC_UPDATED'
);

ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "status" "CalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "is_all_day" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "activity_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "series_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrence_frequency" "RecurrenceFrequency";
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrence_interval" INTEGER DEFAULT 1;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrence_end_at" TIMESTAMP(3);
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "sync_provider" "CalendarSyncProvider" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "external_calendar_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "external_event_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "calendar_event_attendees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "name" TEXT,
    "status" "CalendarAttendeeStatus" NOT NULL DEFAULT 'NEEDS_ACTION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_availability_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_minutes" INTEGER NOT NULL,
    "end_minutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_availability_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_event_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "CalendarHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calendar_events_company_id_idx" ON "calendar_events"("company_id");
CREATE INDEX IF NOT EXISTS "calendar_events_lead_id_idx" ON "calendar_events"("lead_id");
CREATE INDEX IF NOT EXISTS "calendar_events_activity_id_idx" ON "calendar_events"("activity_id");
CREATE INDEX IF NOT EXISTS "calendar_events_status_idx" ON "calendar_events"("status");
CREATE INDEX IF NOT EXISTS "calendar_events_series_id_idx" ON "calendar_events"("series_id");
CREATE INDEX IF NOT EXISTS "calendar_events_external_event_id_idx" ON "calendar_events"("external_event_id");
CREATE INDEX IF NOT EXISTS "calendar_events_endsAt_idx" ON "calendar_events"("endsAt");

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_availability_rules_user_id_day_of_week_start_minutes_end_minutes_key"
  ON "calendar_availability_rules"("user_id", "day_of_week", "start_minutes", "end_minutes");
CREATE INDEX IF NOT EXISTS "calendar_availability_rules_organization_id_idx" ON "calendar_availability_rules"("organization_id");
CREATE INDEX IF NOT EXISTS "calendar_availability_rules_user_id_idx" ON "calendar_availability_rules"("user_id");
CREATE INDEX IF NOT EXISTS "calendar_event_attendees_event_id_idx" ON "calendar_event_attendees"("event_id");
CREATE INDEX IF NOT EXISTS "calendar_event_attendees_organization_id_idx" ON "calendar_event_attendees"("organization_id");
CREATE INDEX IF NOT EXISTS "calendar_event_attendees_user_id_idx" ON "calendar_event_attendees"("user_id");
CREATE INDEX IF NOT EXISTS "calendar_event_history_event_id_idx" ON "calendar_event_history"("event_id");
CREATE INDEX IF NOT EXISTS "calendar_event_history_organization_id_idx" ON "calendar_event_history"("organization_id");

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_availability_rules" ADD CONSTRAINT "calendar_availability_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_availability_rules" ADD CONSTRAINT "calendar_availability_rules_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_history" ADD CONSTRAINT "calendar_event_history_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_history" ADD CONSTRAINT "calendar_event_history_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_event_history" ADD CONSTRAINT "calendar_event_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
