import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const IMPORT_BATCH_ID = "apr-2026-health-chat-import";
const DATA_FILE = path.resolve(process.cwd(), "data/autohealth_context_messages_apr_2026.json");
const BATCH_SIZE = 100;

const SUPPORTED_CONTEXTS = new Set([
  "health_report",
  "vital_signs",
  "medication",
  "meal",
  "mood_behavior",
  "excretion",
  "billing",
  "activity",
  "general_chat",
  "other",
]);

const FLEX_TEMPLATE_BY_CONTEXT: Record<string, string> = {
  health_report: "health_report_summary",
  vital_signs: "vital_signs_card",
  medication: "medication_card",
  meal: "meal_card",
  mood_behavior: "mood_behavior_card",
  excretion: "excretion_card",
  billing: "billing_notice",
  activity: "activity_card",
  general_chat: "plain_text",
  other: "plain_text",
};

type SourceRecord = {
  id?: unknown;
  messageId?: unknown;
  userId?: unknown;
  groupId?: unknown;
  displayName?: unknown;
  email?: unknown;
  statusMessage?: unknown;
  pictureUrl?: unknown;
  contentUrl?: unknown;
  contentMimeType?: unknown;
  text?: unknown;
  type?: unknown;
  timestamp?: unknown;
  createdAt?: unknown;
  context?: unknown;
  contexts?: unknown;
  parsed?: unknown;
  flexTemplate?: unknown;
  confidence?: unknown;
};

type ImportRow = {
  id: string;
  messageId: string;
  userId: string | null;
  groupId: string | null;
  displayName: string | null;
  email: string | null;
  statusMessage: string | null;
  pictureUrl: string | null;
  contentUrl: string | null;
  contentMimeType: string | null;
  source: string;
  text: string | null;
  type: string;
  rawPayload: SourceRecord;
  timestamp: number;
  createdAt: string;
  context: string;
  contexts: string[];
  parsed: Record<string, unknown>;
  flexTemplate: string;
  confidence: number | null;
  importBatchId: string;
};

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeContext(value: unknown): string {
  const context = asString(value) ?? "other";
  return SUPPORTED_CONTEXTS.has(context) ? context : "other";
}

function normalizeContexts(value: unknown, mainContext: string): string[] {
  const sourceContexts = Array.isArray(value) ? value : [mainContext];
  const normalized = sourceContexts
    .map((item) => normalizeContext(item))
    .filter((item, index, array) => array.indexOf(item) === index);

  return normalized.length > 0 ? normalized : ["other"];
}

function normalizeTimestamp(record: SourceRecord): number {
  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) {
    return Math.trunc(record.timestamp);
  }

  if (typeof record.timestamp === "string" && record.timestamp.trim()) {
    const numeric = Number(record.timestamp);
    if (Number.isFinite(numeric)) {
      return Math.trunc(numeric);
    }

    const parsed = Date.parse(record.timestamp);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const createdAt = asString(record.createdAt);
  if (createdAt) {
    const parsed = Date.parse(createdAt);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function normalizeCreatedAt(record: SourceRecord, timestamp: number): string {
  const createdAt = asString(record.createdAt);
  if (createdAt && Number.isFinite(Date.parse(createdAt))) {
    return new Date(createdAt).toISOString();
  }

  return new Date(timestamp).toISOString();
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function toImportRow(record: SourceRecord): ImportRow {
  const id = asString(record.id) ?? randomUUID();
  const messageId = asString(record.messageId) ?? id;
  const context = normalizeContext(record.context);
  const contexts = normalizeContexts(record.contexts, context);
  const timestamp = normalizeTimestamp(record);
  const flexTemplate = asString(record.flexTemplate) ?? FLEX_TEMPLATE_BY_CONTEXT[context] ?? "simple_text";

  return {
    id,
    messageId,
    userId: asString(record.userId),
    groupId: asString(record.groupId),
    displayName: asString(record.displayName),
    email: asString(record.email),
    statusMessage: asString(record.statusMessage),
    pictureUrl: asString(record.pictureUrl),
    contentUrl: asString(record.contentUrl),
    contentMimeType: asString(record.contentMimeType),
    source: "historical_import",
    text: asString(record.text),
    type: asString(record.type) ?? "text",
    rawPayload: record,
    timestamp,
    createdAt: normalizeCreatedAt(record, timestamp),
    context,
    contexts,
    parsed: asObject(record.parsed),
    flexTemplate,
    confidence: normalizeConfidence(record.confidence),
    importBatchId: IMPORT_BATCH_ID,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const filePayload = JSON.parse(readFileSync(DATA_FILE, "utf8")) as { messages?: SourceRecord[] };
  const records = Array.isArray(filePayload.messages) ? filePayload.messages : [];
  const rows = records.map(toImportRow);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let insertedRecords = 0;
  let skippedDuplicateRecords = 0;
  const failedRecords: { messageId: string; error: string }[] = [];

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const messageIds = batch.map((row) => row.messageId);
    const { data: existing, error: selectError } = await supabase
      .from("Message")
      .select("messageId")
      .in("messageId", messageIds);

    if (selectError) {
      for (const row of batch) {
        failedRecords.push({ messageId: row.messageId, error: selectError.message });
      }
      continue;
    }

    const existingIds = new Set((existing ?? []).map((row) => row.messageId as string));
    const rowsToInsert = batch.filter((row) => !existingIds.has(row.messageId));
    skippedDuplicateRecords += batch.length - rowsToInsert.length;

    if (rowsToInsert.length === 0) {
      continue;
    }

    const { error: insertError } = await supabase.from("Message").insert(rowsToInsert);
    if (insertError) {
      for (const row of rowsToInsert) {
        failedRecords.push({ messageId: row.messageId, error: insertError.message });
      }
      continue;
    }

    insertedRecords += rowsToInsert.length;
  }

  console.log(
    JSON.stringify(
      {
        importBatchId: IMPORT_BATCH_ID,
        totalRecords: rows.length,
        insertedRecords,
        skippedDuplicateRecords,
        failedRecords: failedRecords.length,
        failures: failedRecords.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (failedRecords.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
