-- AlterTable
ALTER TABLE "activities" ADD COLUMN "due_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "activities_due_at_idx" ON "activities"("due_at");
