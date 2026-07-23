-- AlterTable: add entity fields to notifications
ALTER TABLE "notifications" ADD COLUMN "entityType" TEXT;
ALTER TABLE "notifications" ADD COLUMN "entityId" TEXT;
ALTER TABLE "notifications" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "page_access_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "pageTitle" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_event_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendInApp" BOOLEAN NOT NULL DEFAULT true,
    "sendPush" BOOLEAN NOT NULL DEFAULT false,
    "recipients" TEXT NOT NULL DEFAULT 'assigned',
    "scheduleHour" INTEGER,
    "scheduleMinute" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "page_access_logs_userId_idx" ON "page_access_logs"("userId");
CREATE INDEX "page_access_logs_path_idx" ON "page_access_logs"("path");
CREATE INDEX "page_access_logs_createdAt_idx" ON "page_access_logs"("createdAt");
CREATE UNIQUE INDEX "notification_event_settings_eventType_key" ON "notification_event_settings"("eventType");
