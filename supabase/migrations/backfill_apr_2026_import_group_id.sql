UPDATE "Message"
SET "groupId" = 'Cc7dba355a1ec758b48ed0acd10bae9c5'
WHERE "importBatchId" = 'apr-2026-health-chat-import'
  AND ("groupId" IS NULL OR "groupId" = '');
