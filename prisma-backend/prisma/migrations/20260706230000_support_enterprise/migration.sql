-- Support Enterprise (Module 10)

CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "CaseHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'COMMENT_ADDED',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'SLA_BREACH'
);

ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "queue_id" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "sla_policy_id" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "first_response_due_at" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "first_responded_at" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "sla_breached" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "cases" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "cases" ALTER COLUMN "priority" TYPE "CasePriority" USING (
  CASE UPPER("priority"::text)
    WHEN 'LOW' THEN 'LOW'::"CasePriority"
    WHEN 'HIGH' THEN 'HIGH'::"CasePriority"
    WHEN 'URGENT' THEN 'URGENT'::"CasePriority"
    ELSE 'MEDIUM'::"CasePriority"
  END
);
ALTER TABLE "cases" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

ALTER TABLE "case_comments" ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "author_id" TEXT;

ALTER TABLE "sla_policies" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "sla_policies" ADD COLUMN IF NOT EXISTS "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "sla_policies" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "queues" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "queues" ADD COLUMN IF NOT EXISTS "sla_policy_id" TEXT;
ALTER TABLE "queues" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "case_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "CaseHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cases_organizationId_caseNumber_key" ON "cases"("organizationId", "caseNumber");
CREATE INDEX IF NOT EXISTS "cases_queue_id_idx" ON "cases"("queue_id");
CREATE INDEX IF NOT EXISTS "cases_sla_policy_id_idx" ON "cases"("sla_policy_id");
CREATE INDEX IF NOT EXISTS "cases_priority_idx" ON "cases"("priority");
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_articles_organizationId_slug_key" ON "knowledge_articles"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "knowledge_articles_category_idx" ON "knowledge_articles"("category");
CREATE INDEX IF NOT EXISTS "sla_policies_active_idx" ON "sla_policies"("active");
CREATE INDEX IF NOT EXISTS "queues_sla_policy_id_idx" ON "queues"("sla_policy_id");
CREATE INDEX IF NOT EXISTS "case_history_case_id_idx" ON "case_history"("case_id");
CREATE INDEX IF NOT EXISTS "case_history_organization_id_idx" ON "case_history"("organization_id");

ALTER TABLE "cases" ADD CONSTRAINT "cases_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "queues" ADD CONSTRAINT "queues_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
