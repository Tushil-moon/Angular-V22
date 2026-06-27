-- Complete the remaining steps from the failed milestone2 migration.
-- Safe to run after the migration failed at the saved_views index step.

CREATE INDEX IF NOT EXISTS "saved_views_organizationId_user_id_entity_type_idx"
  ON "saved_views"("organizationId", "user_id", "entity_type");

DROP INDEX IF EXISTS "saved_views_user_id_entity_type_idx";

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invites"
  ADD CONSTRAINT "organization_invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invites"
  ADD CONSTRAINT "organization_invites_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deals"
  ADD CONSTRAINT "deals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activities"
  ADD CONSTRAINT "activities_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_views"
  ADD CONSTRAINT "saved_views_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tags"
  ADD CONSTRAINT "tags_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
