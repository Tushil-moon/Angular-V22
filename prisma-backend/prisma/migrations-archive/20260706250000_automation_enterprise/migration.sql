-- Automation Enterprise (Module 12)

DO $$ BEGIN CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "WorkflowStepRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TABLE IF EXISTS "workflow_step_runs";
DROP TABLE IF EXISTS "workflow_runs";

ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "runCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "workflow_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "context" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_step_runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" "WorkflowStepRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "responseStatus" INTEGER;
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "webhook_deliveries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "webhook_deliveries" ALTER COLUMN "status" TYPE "WebhookDeliveryStatus" USING (
  CASE UPPER("status"::text)
    WHEN 'DELIVERED' THEN 'DELIVERED'::"WebhookDeliveryStatus"
    WHEN 'FAILED' THEN 'FAILED'::"WebhookDeliveryStatus"
    ELSE 'PENDING'::"WebhookDeliveryStatus"
  END
);
ALTER TABLE "webhook_deliveries" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "workflows_ownerId_idx" ON "workflows"("ownerId");
CREATE INDEX IF NOT EXISTS "workflows_organizationId_trigger_idx" ON "workflows"("organizationId", "trigger");
CREATE INDEX IF NOT EXISTS "workflow_runs_organizationId_idx" ON "workflow_runs"("organizationId");
CREATE INDEX IF NOT EXISTS "workflow_runs_workflowId_idx" ON "workflow_runs"("workflowId");
CREATE INDEX IF NOT EXISTS "workflow_runs_status_idx" ON "workflow_runs"("status");
CREATE INDEX IF NOT EXISTS "workflow_step_runs_runId_idx" ON "workflow_step_runs"("runId");

DO $$ BEGIN
  ALTER TABLE "workflows" ADD CONSTRAINT "workflows_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
