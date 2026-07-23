-- Chatbot settings and support conversation tracking

ALTER TABLE "support_messages" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "support_messages_visitorId_createdAt_idx" ON "support_messages"("visitorId", "createdAt");

CREATE TABLE "support_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'bot',
    "channel" TEXT NOT NULL DEFAULT 'website',
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "handedOffAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "support_conversations_visitorId_key" ON "support_conversations"("visitorId");
CREATE INDEX "support_conversations_status_lastMessageAt_idx" ON "support_conversations"("status", "lastMessageAt");

CREATE TABLE "chatbot_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledWebsiteChat" BOOLEAN NOT NULL DEFAULT false,
    "enabledWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "enabledEmail" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT NOT NULL DEFAULT 'TK Assistant',
    "ollamaApiKey" TEXT,
    "ollamaHost" TEXT NOT NULL DEFAULT 'https://ollama.com',
    "ollamaModel" TEXT NOT NULL DEFAULT 'qwen3:8b-cloud',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "systemPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
