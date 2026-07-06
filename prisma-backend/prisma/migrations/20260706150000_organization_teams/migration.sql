-- Organization & Teams (Module 2)

CREATE TYPE "OrgUnitType" AS ENUM ('BRANCH', 'DEPARTMENT', 'TEAM');

ALTER TABLE "organization_members" ADD COLUMN "managerUserId" TEXT;
ALTER TABLE "organization_members" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "organization_members" ADD COLUMN "employeeCode" TEXT;

CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "OrgUnitType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "managerUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_unit_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_unit_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_units_organizationId_code_key" ON "org_units"("organizationId", "code");
CREATE INDEX "org_units_organizationId_parentId_idx" ON "org_units"("organizationId", "parentId");
CREATE INDEX "org_units_organizationId_type_idx" ON "org_units"("organizationId", "type");
CREATE INDEX "org_units_organizationId_deletedAt_idx" ON "org_units"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "org_unit_members_orgUnitId_userId_key" ON "org_unit_members"("orgUnitId", "userId");
CREATE INDEX "org_unit_members_organizationId_userId_idx" ON "org_unit_members"("organizationId", "userId");
CREATE INDEX "organization_members_organizationId_managerUserId_idx" ON "organization_members"("organizationId", "managerUserId");
CREATE UNIQUE INDEX "organization_members_organizationId_employeeCode_key" ON "organization_members"("organizationId", "employeeCode");

ALTER TABLE "org_units" ADD CONSTRAINT "org_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_unit_members" ADD CONSTRAINT "org_unit_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_unit_members" ADD CONSTRAINT "org_unit_members_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_unit_members" ADD CONSTRAINT "org_unit_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
