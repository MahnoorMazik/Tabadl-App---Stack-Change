-- AlterTable
ALTER TABLE "form_templates" ADD COLUMN "areaOfInterest" TEXT;

-- CreateIndex
CREATE INDEX "form_templates_areaOfInterest_idx" ON "form_templates"("areaOfInterest");
