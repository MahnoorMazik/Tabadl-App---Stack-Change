-- CreateTable: wizard_applications (WizardApplication model)
-- This table was missing from previous migrations

CREATE TABLE IF NOT EXISTS "wizard_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "wizardId" TEXT NOT NULL,
    "areaOfInterest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "adminNotes" TEXT,
    "submittedAt" DATETIME,
    "assignedToId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wizard_applications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wizard_applications_wizardId_fkey" FOREIGN KEY ("wizardId") REFERENCES "application_wizards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wizard_applications_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: wizard_application_answers (WizardApplicationAnswer model)
CREATE TABLE IF NOT EXISTS "wizard_application_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "wizardStepId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,
    "fileUrl" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wizard_application_answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "wizard_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_wizardStepId_fkey" FOREIGN KEY ("wizardStepId") REFERENCES "application_wizard_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "form_fields" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Unique constraint on applicationNumber
CREATE UNIQUE INDEX IF NOT EXISTS "wizard_applications_applicationNumber_key" ON "wizard_applications"("applicationNumber");

-- Indexes for wizard_applications
CREATE INDEX IF NOT EXISTS "wizard_applications_clientId_idx" ON "wizard_applications"("clientId");
CREATE INDEX IF NOT EXISTS "wizard_applications_wizardId_idx" ON "wizard_applications"("wizardId");
CREATE INDEX IF NOT EXISTS "wizard_applications_status_idx" ON "wizard_applications"("status");
CREATE INDEX IF NOT EXISTS "wizard_applications_areaOfInterest_idx" ON "wizard_applications"("areaOfInterest");
CREATE INDEX IF NOT EXISTS "wizard_applications_isDeleted_idx" ON "wizard_applications"("isDeleted");

-- Unique constraint on answers
CREATE UNIQUE INDEX IF NOT EXISTS "wizard_application_answers_applicationId_wizardStepId_fieldId_key" 
    ON "wizard_application_answers"("applicationId", "wizardStepId", "fieldId");

-- Indexes for wizard_application_answers
CREATE INDEX IF NOT EXISTS "wizard_application_answers_applicationId_idx" ON "wizard_application_answers"("applicationId");
CREATE INDEX IF NOT EXISTS "wizard_application_answers_wizardStepId_idx" ON "wizard_application_answers"("wizardStepId");

-- Update foreign key in wizard_application_step_reviews to now properly link
-- (The table reference was added in a previous migration but the target table was missing)
