-- Supports mini-app timeline queries:
-- WHERE "groupId" = ? AND "timestamp" BETWEEN ? AND ?
-- ORDER BY "timestamp" DESC LIMIT ?
CREATE INDEX IF NOT EXISTS "Message_groupId_timestamp_idx"
ON "Message"("groupId", "timestamp" DESC);
