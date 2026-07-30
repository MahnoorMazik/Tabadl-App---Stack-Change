-- CreateTable
CREATE TABLE "application_wizards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "areaOfInterest" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "application_wizards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_wizard_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wizardId" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "application_wizard_steps_wizardId_fkey" FOREIGN KEY ("wizardId") REFERENCES "application_wizards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_wizard_steps_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_wizard_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wizardId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_wizard_services_wizardId_fkey" FOREIGN KEY ("wizardId") REFERENCES "application_wizards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_wizard_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "business_services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "application_wizards_isDeleted_idx" ON "application_wizards"("isDeleted");

-- CreateIndex
CREATE INDEX "application_wizards_isDeleted_updatedAt_idx" ON "application_wizards"("isDeleted", "updatedAt");

-- CreateIndex
CREATE INDEX "application_wizards_createdById_idx" ON "application_wizards"("createdById");

-- CreateIndex
CREATE INDEX "application_wizards_areaOfInterest_idx" ON "application_wizards"("areaOfInterest");

-- CreateIndex
CREATE INDEX "application_wizard_steps_wizardId_sortOrder_idx" ON "application_wizard_steps"("wizardId", "sortOrder");

-- CreateIndex
CREATE INDEX "application_wizard_steps_formTemplateId_idx" ON "application_wizard_steps"("formTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "application_wizard_steps_wizardId_formTemplateId_key" ON "application_wizard_steps"("wizardId", "formTemplateId");

-- CreateIndex
CREATE INDEX "application_wizard_services_wizardId_idx" ON "application_wizard_services"("wizardId");

-- CreateIndex
CREATE INDEX "application_wizard_services_serviceId_idx" ON "application_wizard_services"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "application_wizard_services_wizardId_serviceId_key" ON "application_wizard_services"("wizardId", "serviceId");
