-- Business workflow: services catalog, packages, payment phases, profile completion

CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

CREATE TABLE "business_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "business_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "business_services_slug_key" ON "business_services"("slug");
CREATE INDEX "business_services_categoryId_sortOrder_idx" ON "business_services"("categoryId", "sortOrder");

CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "basePriceUsd" REAL NOT NULL,
    "basePriceSar" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "service_packages_slug_key" ON "service_packages"("slug");

CREATE TABLE "package_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "package_services_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "package_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "business_services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "package_services_packageId_serviceId_key" ON "package_services"("packageId", "serviceId");

CREATE TABLE "additional_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceUsd" REAL NOT NULL,
    "priceSar" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "additional_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "business_services" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "additional_services_slug_key" ON "additional_services"("slug");

CREATE TABLE "payment_phase_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percentage" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "payment_phase_templates_phaseNumber_key" ON "payment_phase_templates"("phaseNumber");

CREATE TABLE "profile_document_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputType" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "profile_document_requirements_code_key" ON "profile_document_requirements"("code");

CREATE TABLE "client_profile_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "notes" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_profile_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_profile_documents_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "profile_document_requirements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "client_profile_documents_clientId_requirementId_key" ON "client_profile_documents"("clientId", "requirementId");
CREATE INDEX "client_profile_documents_clientId_idx" ON "client_profile_documents"("clientId");

ALTER TABLE "clients" ADD COLUMN "servicePackageId" TEXT;
ALTER TABLE "clients" ADD COLUMN "profileCompletionStatus" TEXT NOT NULL DEFAULT 'INCOMPLETE';
ALTER TABLE "clients" ADD COLUMN "profileCompletedAt" DATETIME;
CREATE INDEX "clients_profileCompletionStatus_idx" ON "clients"("profileCompletionStatus");

ALTER TABLE "documents" ADD COLUMN "clientId" TEXT;
ALTER TABLE "documents" ADD COLUMN "profileRequirementId" TEXT;
CREATE INDEX "documents_clientId_isDeleted_idx" ON "documents"("clientId", "isDeleted");
