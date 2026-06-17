-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organizationId","userId")
);

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable organizationId columns
ALTER TABLE "companies" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "contacts" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "deals" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "activities" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "saved_views" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "tags" ADD COLUMN "organizationId" TEXT;

-- Seed default organization and backfill existing CRM data
INSERT INTO "organizations" ("id", "name", "slug", "timezone", "currency", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Default Organization', 'default', 'UTC', 'USD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "companies" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;
UPDATE "contacts" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;
UPDATE "deals" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;
UPDATE "activities" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;
UPDATE "saved_views" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;
UPDATE "tags" SET "organizationId" = '00000000-0000-4000-8000-000000000001' WHERE "organizationId" IS NULL;

INSERT INTO "organization_members" ("organizationId", "userId", "role", "joinedAt")
SELECT '00000000-0000-4000-8000-000000000001', "id", 'MEMBER', CURRENT_TIMESTAMP
FROM "users"
WHERE "deletedAt" IS NULL
ON CONFLICT DO NOTHING;

UPDATE "organization_members"
SET "role" = 'OWNER'
WHERE "organizationId" = '00000000-0000-4000-8000-000000000001'
  AND "userId" = (
    SELECT "userId" FROM "user_roles" ur
    JOIN "roles" r ON r."id" = ur."roleId"
    WHERE r."name" = 'Admin'
    LIMIT 1
  );

-- Make organizationId required
ALTER TABLE "companies" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "deals" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "saved_views" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "tags" ALTER COLUMN "organizationId" SET NOT NULL;

-- Tags: org-scoped uniqueness
DROP INDEX IF EXISTS "tags_name_key";
CREATE UNIQUE INDEX "tags_organizationId_name_key" ON "tags"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");
CREATE INDEX "organization_invites_organizationId_idx" ON "organization_invites"("organizationId");
CREATE INDEX "organization_invites_email_idx" ON "organization_invites"("email");
CREATE INDEX "companies_organizationId_idx" ON "companies"("organizationId");
CREATE INDEX "contacts_organizationId_idx" ON "contacts"("organizationId");
CREATE INDEX "deals_organizationId_idx" ON "deals"("organizationId");
CREATE INDEX "activities_organizationId_idx" ON "activities"("organizationId");
CREATE INDEX "tags_organizationId_idx" ON "tags"("organizationId");
CREATE INDEX "saved_views_organizationId_user_id_entity_type_idx" ON "saved_views"("organizationId", "user_id", "entity_type");

-- DropIndex (old saved_views index if exists)
DROP INDEX IF EXISTS "saved_views_user_id_entity_type_idx";

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
