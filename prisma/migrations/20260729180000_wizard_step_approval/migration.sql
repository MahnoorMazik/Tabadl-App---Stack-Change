-- AlterTable
ALTER TABLE "application_wizard_steps" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "wizard_application_step_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "wizardStepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wizard_application_step_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "wizard_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_step_reviews_wizardStepId_fkey" FOREIGN KEY ("wizardStepId") REFERENCES "application_wizard_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_step_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "wizard_application_step_reviews_applicationId_wizardStepId_key" ON "wizard_application_step_reviews"("applicationId", "wizardStepId");
CREATE INDEX "wizard_application_step_reviews_applicationId_idx" ON "wizard_application_step_reviews"("applicationId");
CREATE INDEX "wizard_application_step_reviews_wizardStepId_idx" ON "wizard_application_step_reviews"("wizardStepId");
CREATE INDEX "wizard_application_step_reviews_status_idx" ON "wizard_application_step_reviews"("status");
