-- AlterTable
ALTER TABLE "companies" ADD COLUMN "parent_company_id" TEXT,
ADD COLUMN "employee_count" INTEGER,
ADD COLUMN "annual_revenue" DECIMAL(15,2),
ADD COLUMN "revenue_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ADD COLUMN "ownership_percent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "company_locations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_locations_pkey" PRIMARY KEY ("id")
);

-- Backfill HQ locations from legacy address column
INSERT INTO "company_locations" ("id", "company_id", "line1", "is_primary", "is_headquarters")
SELECT gen_random_uuid()::text, "id", TRIM("address"), true, true
FROM "companies"
WHERE "address" IS NOT NULL AND TRIM("address") <> '' AND "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "companies_parent_company_id_idx" ON "companies"("parent_company_id");

-- CreateIndex
CREATE INDEX "companies_domain_idx" ON "companies"("domain");

-- CreateIndex
CREATE INDEX "company_locations_company_id_idx" ON "company_locations"("company_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_parent_company_id_fkey" FOREIGN KEY ("parent_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_locations" ADD CONSTRAINT "company_locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
