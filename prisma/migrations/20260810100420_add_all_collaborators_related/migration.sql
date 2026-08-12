-- CreateTable
CREATE TABLE "client_collaborators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "collaboratorUserId" TEXT,
    "inviteEmail" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_collaborators_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_collaborators_collaboratorUserId_fkey" FOREIGN KEY ("collaboratorUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "client_collaborators_inviteToken_key" ON "client_collaborators"("inviteToken");

-- CreateIndex
CREATE INDEX "client_collaborators_inviteEmail_status_idx" ON "client_collaborators"("inviteEmail", "status");

-- CreateIndex
CREATE INDEX "client_collaborators_collaboratorUserId_status_idx" ON "client_collaborators"("collaboratorUserId", "status");

-- CreateIndex
CREATE INDEX "client_collaborators_status_idx" ON "client_collaborators"("status");

-- CreateIndex
CREATE UNIQUE INDEX "client_collaborators_clientId_inviteEmail_key" ON "client_collaborators"("clientId", "inviteEmail");
