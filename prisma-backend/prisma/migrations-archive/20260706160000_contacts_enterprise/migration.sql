-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'CAMPAIGN', 'COLD_CALL', 'TRADE_SHOW', 'PARTNER', 'IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactEmailType" AS ENUM ('WORK', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactPhoneType" AS ENUM ('MOBILE', 'WORK', 'HOME', 'FAX', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactAddressType" AS ENUM ('BILLING', 'SHIPPING', 'HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM', 'GITHUB', 'WEBSITE', 'OTHER');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "lead_source" "LeadSource",
ADD COLUMN "source_detail" TEXT;

-- CreateTable
CREATE TABLE "contact_emails" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "ContactEmailType" NOT NULL DEFAULT 'WORK',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_phones" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" "ContactPhoneType" NOT NULL DEFAULT 'MOBILE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_addresses" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "type" "ContactAddressType" NOT NULL DEFAULT 'WORK',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_social_links" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_social_links_pkey" PRIMARY KEY ("id")
);

-- Backfill primary email/phone rows from legacy columns
INSERT INTO "contact_emails" ("id", "contact_id", "email", "type", "is_primary")
SELECT gen_random_uuid()::text, "id", LOWER(TRIM("email")), 'WORK', true
FROM "contacts"
WHERE "email" IS NOT NULL AND TRIM("email") <> '' AND "deletedAt" IS NULL;

INSERT INTO "contact_phones" ("id", "contact_id", "phone", "type", "is_primary")
SELECT gen_random_uuid()::text, "id", TRIM("phone"), 'MOBILE', true
FROM "contacts"
WHERE "phone" IS NOT NULL AND TRIM("phone") <> '' AND "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "contact_emails_contact_id_email_key" ON "contact_emails"("contact_id", "email");

-- CreateIndex
CREATE INDEX "contact_emails_email_idx" ON "contact_emails"("email");

-- CreateIndex
CREATE INDEX "contact_emails_contact_id_idx" ON "contact_emails"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_phones_contact_id_phone_key" ON "contact_phones"("contact_id", "phone");

-- CreateIndex
CREATE INDEX "contact_phones_phone_idx" ON "contact_phones"("phone");

-- CreateIndex
CREATE INDEX "contact_phones_contact_id_idx" ON "contact_phones"("contact_id");

-- CreateIndex
CREATE INDEX "contact_addresses_contact_id_idx" ON "contact_addresses"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_social_links_contact_id_platform_url_key" ON "contact_social_links"("contact_id", "platform", "url");

-- CreateIndex
CREATE INDEX "contact_social_links_contact_id_idx" ON "contact_social_links"("contact_id");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

-- CreateIndex
CREATE INDEX "contacts_organizationId_firstName_lastName_idx" ON "contacts"("organizationId", "firstName", "lastName");

-- AddForeignKey
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_phones" ADD CONSTRAINT "contact_phones_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_addresses" ADD CONSTRAINT "contact_addresses_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_social_links" ADD CONSTRAINT "contact_social_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
