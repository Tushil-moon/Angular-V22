-- Marketing Enterprise (Module 11)

CREATE TYPE "CampaignMemberStatus" AS ENUM (
  'PENDING',
  'SENT',
  'OPENED',
  'CLICKED',
  'BOUNCED',
  'UNSUBSCRIBED'
);

CREATE TYPE "CampaignHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'ACTIVATED',
  'COMPLETED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'EMAIL_SENT'
);

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "email_template_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "email_sequence_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "sent_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "opened_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "clicked_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);

ALTER TABLE "campaign_members" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "campaign_members" ALTER COLUMN "status" TYPE "CampaignMemberStatus" USING (
  CASE UPPER("status"::text)
    WHEN 'SENT' THEN 'SENT'::"CampaignMemberStatus"
    WHEN 'OPENED' THEN 'OPENED'::"CampaignMemberStatus"
    WHEN 'CLICKED' THEN 'CLICKED'::"CampaignMemberStatus"
    WHEN 'BOUNCED' THEN 'BOUNCED'::"CampaignMemberStatus"
    WHEN 'UNSUBSCRIBED' THEN 'UNSUBSCRIBED'::"CampaignMemberStatus"
    ELSE 'PENDING'::"CampaignMemberStatus"
  END
);
ALTER TABLE "campaign_members" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "preview_text" TEXT;
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "email_sequences" ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE TABLE IF NOT EXISTS "campaign_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "CampaignHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "campaigns_owner_id_idx" ON "campaigns"("owner_id");
CREATE INDEX IF NOT EXISTS "campaigns_email_template_id_idx" ON "campaigns"("email_template_id");
CREATE INDEX IF NOT EXISTS "campaigns_email_sequence_id_idx" ON "campaigns"("email_sequence_id");
CREATE INDEX IF NOT EXISTS "campaign_members_status_idx" ON "campaign_members"("status");
CREATE INDEX IF NOT EXISTS "email_templates_active_idx" ON "email_templates"("active");
CREATE INDEX IF NOT EXISTS "email_sequences_active_idx" ON "email_sequences"("active");
CREATE INDEX IF NOT EXISTS "campaign_history_campaign_id_idx" ON "campaign_history"("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_history_organization_id_idx" ON "campaign_history"("organization_id");

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_email_template_id_fkey" FOREIGN KEY ("email_template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_email_sequence_id_fkey" FOREIGN KEY ("email_sequence_id") REFERENCES "email_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
