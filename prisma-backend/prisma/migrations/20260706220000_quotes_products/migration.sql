-- Quotes & Products (Module 9)

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "QuoteHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'LINE_ITEMS_CHANGED'
);

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "quoteNumber" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);

ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "lineTotal" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "category" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quote_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "QuoteHistoryAction" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotes_organizationId_quoteNumber_key" ON "quotes"("organizationId", "quoteNumber");
CREATE INDEX IF NOT EXISTS "quotes_contactId_idx" ON "quotes"("contactId");
CREATE INDEX IF NOT EXISTS "quotes_companyId_idx" ON "quotes"("companyId");
CREATE INDEX IF NOT EXISTS "quotes_ownerId_idx" ON "quotes"("ownerId");
CREATE INDEX IF NOT EXISTS "quote_line_items_productId_idx" ON "quote_line_items"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "products_organization_id_sku_key" ON "products"("organization_id", "sku");
CREATE INDEX IF NOT EXISTS "products_organization_id_idx" ON "products"("organization_id");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
CREATE INDEX IF NOT EXISTS "quote_history_quote_id_idx" ON "quote_history"("quote_id");
CREATE INDEX IF NOT EXISTS "quote_history_organization_id_idx" ON "quote_history"("organization_id");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
