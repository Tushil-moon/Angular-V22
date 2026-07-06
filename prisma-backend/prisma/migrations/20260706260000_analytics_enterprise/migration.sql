-- Analytics Enterprise (Module 13)

DO $$ BEGIN CREATE TYPE "ReportChartType" AS ENUM ('TABLE', 'BAR', 'LINE', 'PIE', 'KPI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ReportRunStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "chartType" "ReportChartType" NOT NULL DEFAULT 'TABLE';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "report_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "dashboard_layouts" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "dashboard_layouts" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dashboard_layouts" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "reports_entityType_idx" ON "reports"("entityType");
CREATE INDEX IF NOT EXISTS "report_runs_organizationId_idx" ON "report_runs"("organizationId");
CREATE INDEX IF NOT EXISTS "report_runs_reportId_idx" ON "report_runs"("reportId");
CREATE INDEX IF NOT EXISTS "report_runs_status_idx" ON "report_runs"("status");

DO $$ BEGIN
  ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
