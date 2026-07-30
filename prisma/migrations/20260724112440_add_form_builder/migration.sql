-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "helpText" TEXT,
    "placeholder" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "form_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_template_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "labelOverride" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "form_template_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_template_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "form_fields" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_template_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_template_services_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_template_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "business_services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "companyType" TEXT,
    "designation" TEXT,
    "natureOfBusiness" TEXT,
    "country" TEXT,
    "city" TEXT,
    "howDidYouHear" TEXT,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "servicePackageId" TEXT,
    "profileCompletionStatus" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "profileCompletedAt" DATETIME,
    CONSTRAINT "clients_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clients_servicePackageId_fkey" FOREIGN KEY ("servicePackageId") REFERENCES "service_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("city", "clientNumber", "company", "companyType", "country", "createdAt", "deletedAt", "designation", "email", "groupId", "howDidYouHear", "id", "isDeleted", "name", "natureOfBusiness", "phone", "profileCompletedAt", "profileCompletionStatus", "servicePackageId", "updatedAt", "userId") SELECT "city", "clientNumber", "company", "companyType", "country", "createdAt", "deletedAt", "designation", "email", "groupId", "howDidYouHear", "id", "isDeleted", "name", "natureOfBusiness", "phone", "profileCompletedAt", "profileCompletionStatus", "servicePackageId", "updatedAt", "userId" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE UNIQUE INDEX "clients_clientNumber_key" ON "clients"("clientNumber");
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");
CREATE INDEX "clients_email_isDeleted_idx" ON "clients"("email", "isDeleted");
CREATE INDEX "clients_isDeleted_idx" ON "clients"("isDeleted");
CREATE INDEX "clients_profileCompletionStatus_idx" ON "clients"("profileCompletionStatus");
CREATE TABLE "new_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "name" TEXT,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "applicationId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "profileRequirementId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_profileRequirementId_fkey" FOREIGN KEY ("profileRequirementId") REFERENCES "profile_document_requirements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_documents" ("applicationId", "clientId", "createdAt", "deletedAt", "description", "filename", "id", "isDeleted", "leadId", "mimeType", "name", "originalName", "path", "profileRequirementId", "reviewNotes", "reviewedById", "size", "status", "updatedAt", "uploadedById") SELECT "applicationId", "clientId", "createdAt", "deletedAt", "description", "filename", "id", "isDeleted", "leadId", "mimeType", "name", "originalName", "path", "profileRequirementId", "reviewNotes", "reviewedById", "size", "status", "updatedAt", "uploadedById" FROM "documents";
DROP TABLE "documents";
ALTER TABLE "new_documents" RENAME TO "documents";
CREATE INDEX "documents_isDeleted_idx" ON "documents"("isDeleted");
CREATE INDEX "documents_leadId_isDeleted_idx" ON "documents"("leadId", "isDeleted");
CREATE INDEX "documents_applicationId_isDeleted_idx" ON "documents"("applicationId", "isDeleted");
CREATE INDEX "documents_clientId_isDeleted_idx" ON "documents"("clientId", "isDeleted");
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "gateway" TEXT,
    "edfaPayOrderId" TEXT,
    "edfaPayTransactionId" TEXT,
    "edfaPayResponse" TEXT,
    "failureReason" TEXT,
    "paymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "clientId", "createdAt", "edfaPayOrderId", "edfaPayResponse", "edfaPayTransactionId", "failureReason", "gateway", "id", "invoiceId", "method", "paymentDate", "reference", "status", "updatedAt") SELECT "amount", "clientId", "createdAt", "edfaPayOrderId", "edfaPayResponse", "edfaPayTransactionId", "failureReason", "gateway", "id", "invoiceId", "method", "paymentDate", "reference", "status", "updatedAt" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_edfaPayOrderId_idx" ON "payments"("edfaPayOrderId");
CREATE INDEX "payments_edfaPayTransactionId_idx" ON "payments"("edfaPayTransactionId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "form_fields_type_idx" ON "form_fields"("type");

-- CreateIndex
CREATE INDEX "form_fields_isActive_idx" ON "form_fields"("isActive");

-- CreateIndex
CREATE INDEX "form_templates_isDeleted_idx" ON "form_templates"("isDeleted");

-- CreateIndex
CREATE INDEX "form_templates_isDeleted_updatedAt_idx" ON "form_templates"("isDeleted", "updatedAt");

-- CreateIndex
CREATE INDEX "form_templates_createdById_idx" ON "form_templates"("createdById");

-- CreateIndex
CREATE INDEX "form_template_fields_templateId_sortOrder_idx" ON "form_template_fields"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "form_template_fields_fieldId_idx" ON "form_template_fields"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_fields_templateId_fieldId_key" ON "form_template_fields"("templateId", "fieldId");

-- CreateIndex
CREATE INDEX "form_template_services_templateId_idx" ON "form_template_services"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_services_templateId_serviceId_key" ON "form_template_services"("templateId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_services_serviceId_key" ON "form_template_services"("serviceId");
