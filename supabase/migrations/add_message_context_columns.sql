ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "context" text,
  ADD COLUMN IF NOT EXISTS "contexts" text[],
  ADD COLUMN IF NOT EXISTS "parsed" jsonb,
  ADD COLUMN IF NOT EXISTS "flexTemplate" text,
  ADD COLUMN IF NOT EXISTS "confidence" numeric,
  ADD COLUMN IF NOT EXISTS "importBatchId" text;

UPDATE "Message"
SET
  "contexts" = COALESCE("contexts", ARRAY[]::text[]),
  "parsed" = COALESCE("parsed", '{}'::jsonb)
WHERE "contexts" IS NULL OR "parsed" IS NULL;

ALTER TABLE "Message"
  ALTER COLUMN "contexts" SET DEFAULT ARRAY[]::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_messageId_key'
      AND conrelid = '"Message"'::regclass
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_messageId_key" UNIQUE ("messageId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Message_context_idx" ON "Message" ("context");
CREATE INDEX IF NOT EXISTS "Message_importBatchId_idx" ON "Message" ("importBatchId");
