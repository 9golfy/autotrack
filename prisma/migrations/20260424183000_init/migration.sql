-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "statusMessage" TEXT,
    "pictureUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "text" TEXT,
    "type" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_timestamp_idx" ON "Message"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt" DESC);
