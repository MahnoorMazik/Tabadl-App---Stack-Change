/*
  Warnings:

  - A unique constraint covering the columns `[resetPasswordToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `updatedById` on table `wizard_application_answers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "wizard_applications_clientId_isDeleted_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "resetPasswordExpiry" DATETIME;
ALTER TABLE "users" ADD COLUMN "resetPasswordToken" TEXT;

-- CreateTable
CREATE TABLE "general_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "clientWhatsAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_wizard_application_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "wizardStepId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,
    "fileUrl" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wizard_application_answers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "form_fields" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_wizardStepId_fkey" FOREIGN KEY ("wizardStepId") REFERENCES "application_wizard_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wizard_application_answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "wizard_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_wizard_application_answers" ("applicationId", "createdAt", "fieldId", "fileUrl", "id", "updatedAt", "updatedById", "value", "wizardStepId") SELECT "applicationId", "createdAt", "fieldId", "fileUrl", "id", "updatedAt", "updatedById", "value", "wizardStepId" FROM "wizard_application_answers";
DROP TABLE "wizard_application_answers";
ALTER TABLE "new_wizard_application_answers" RENAME TO "wizard_application_answers";
CREATE INDEX "wizard_application_answers_applicationId_idx" ON "wizard_application_answers"("applicationId");
CREATE INDEX "wizard_application_answers_wizardStepId_idx" ON "wizard_application_answers"("wizardStepId");
CREATE UNIQUE INDEX "wizard_application_answers_applicationId_wizardStepId_fieldId_key" ON "wizard_application_answers"("applicationId", "wizardStepId", "fieldId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordToken_key" ON "users"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "wizard_applications_clientId_idx" ON "wizard_applications"("clientId");
