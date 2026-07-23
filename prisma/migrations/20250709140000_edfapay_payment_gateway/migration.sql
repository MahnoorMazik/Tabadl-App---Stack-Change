-- AlterTable: extend payments for gateway support
ALTER TABLE "payments" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Success';
ALTER TABLE "payments" ADD COLUMN "gateway" TEXT;
ALTER TABLE "payments" ADD COLUMN "edfaPayOrderId" TEXT;
ALTER TABLE "payments" ADD COLUMN "edfaPayTransactionId" TEXT;
ALTER TABLE "payments" ADD COLUMN "edfaPayResponse" TEXT;
ALTER TABLE "payments" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "payments" ADD COLUMN "paymentDate" DATETIME;
ALTER TABLE "payments" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'EdfaPay',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_intents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_intents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_gateway_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "apiKey" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_orderId_key" ON "payment_intents"("orderId");
CREATE INDEX "payment_intents_orderId_idx" ON "payment_intents"("orderId");
CREATE INDEX "payment_intents_invoiceId_idx" ON "payment_intents"("invoiceId");
CREATE INDEX "payment_intents_clientId_idx" ON "payment_intents"("clientId");
CREATE INDEX "payment_intents_userId_idx" ON "payment_intents"("userId");
CREATE INDEX "payments_edfaPayOrderId_idx" ON "payments"("edfaPayOrderId");
CREATE INDEX "payments_edfaPayTransactionId_idx" ON "payments"("edfaPayTransactionId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
