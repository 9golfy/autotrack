import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getDatabaseSetupMessage, hasValidDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { rewriteStoragePublicUrl } from "@/lib/supabase/storage-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MessageRow = {
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
  rawPayload: unknown;
  timestamp: bigint | number | string;
  createdAt: Date | string;
  context: string | null;
  contexts: string[] | null;
  parsed: unknown;
  flexTemplate: string | null;
  confidence: unknown;
  importBatchId: string | null;
};

const PRIVATE_LIST_CACHE = "private, no-store, max-age=0";
const DEFAULT_MESSAGE_LIMIT = 500;
const MAX_MESSAGE_LIMIT = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function buildLeanRawPayload(message: MessageRow) {
  const rawPayload = isRecord(message.rawPayload) ? message.rawPayload : null;
  const lineIdentity = isRecord(rawPayload?.lineIdentity) ? rawPayload.lineIdentity : null;
  const mediaUpload = isRecord(rawPayload?.mediaUpload) ? rawPayload.mediaUpload : null;

  return {
    parsed: message.parsed ?? (isRecord(rawPayload?.parsed) ? rawPayload.parsed : undefined),
    context: message.context,
    contexts: message.contexts ?? [],
    flexTemplate: message.flexTemplate,
    lineIdentity: lineIdentity
      ? {
          groupName: asString(lineIdentity.groupName),
          pictureUrl: asString(lineIdentity.pictureUrl),
          error: asString(lineIdentity.error),
        }
      : null,
    mediaUpload: mediaUpload
      ? {
          publicUrl: rewriteStoragePublicUrl(asString(mediaUpload.publicUrl) ?? asString(mediaUpload.mediaUrl) ?? asString(mediaUpload.url)),
          url: rewriteStoragePublicUrl(asString(mediaUpload.url) ?? asString(mediaUpload.publicUrl) ?? asString(mediaUpload.mediaUrl)),
          mediaUrl: rewriteStoragePublicUrl(asString(mediaUpload.mediaUrl) ?? asString(mediaUpload.publicUrl) ?? asString(mediaUpload.url)),
          thumbnailUrl: rewriteStoragePublicUrl(asString(mediaUpload.thumbnailUrl)),
          mediaType: asString(mediaUpload.mediaType) ?? asString(mediaUpload.type),
          contentType: asString(mediaUpload.contentType) ?? asString(mediaUpload.contentMimeType),
          contentMimeType: asString(mediaUpload.contentMimeType) ?? asString(mediaUpload.contentType),
          error: asString(mediaUpload.error),
        }
      : null,
  };
}

function toPublicMessage(message: MessageRow) {
  const rawPayload = buildLeanRawPayload(message);
  const contentUrl = rewriteStoragePublicUrl(message.contentUrl);
  const mediaUrl = rawPayload.mediaUpload?.mediaUrl ?? contentUrl;
  const mediaType =
    rawPayload.mediaUpload?.mediaType ??
    (message.contentMimeType?.startsWith("image/")
      ? "image"
      : message.contentMimeType?.startsWith("video/")
        ? "video"
        : message.contentMimeType?.startsWith("audio/")
          ? "audio"
          : message.type);

  return {
    id: message.id,
    messageId: message.messageId,
    userId: message.userId,
    groupId: message.groupId,
    displayName: message.displayName,
    email: null,
    statusMessage: null,
    pictureUrl: message.pictureUrl,
    contentUrl,
    contentMimeType: message.contentMimeType,
    mediaUrl,
    thumbnailUrl: rawPayload.mediaUpload?.thumbnailUrl ?? (mediaType === "image" ? mediaUrl : null),
    mediaType,
    source: message.source,
    text: message.text,
    type: message.type,
    timestamp: message.timestamp.toString(),
    createdAt: message.createdAt,
    context: message.context,
    contexts: message.contexts,
    parsed: message.parsed,
    flexTemplate: message.flexTemplate,
    confidence: message.confidence === null || message.confidence === undefined ? null : String(message.confidence),
    importBatchId: message.importBatchId,
    rawPayload,
  };
}

function getMessageLimit(value: string | null) {
  const limit = Number(value);

  if (!Number.isFinite(limit)) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_MESSAGE_LIMIT);
}

function getTimestampBoundary(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return null;
  }

  return BigInt(Math.trunc(timestamp));
}

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId")?.trim() || null;
  const limit = getMessageLimit(request.nextUrl.searchParams.get("limit"));
  const fromTimestamp = getTimestampBoundary(request.nextUrl.searchParams.get("from"));
  const toTimestamp = getTimestampBoundary(request.nextUrl.searchParams.get("to"));

  if (!hasValidDatabaseUrl()) {
    return NextResponse.json(
      {
        messages: [],
        configured: false,
        setupMessage: getDatabaseSetupMessage(),
      },
      { headers: { "Cache-Control": PRIVATE_LIST_CACHE } },
    );
  }

  try {
    const messages = await prisma.$queryRaw<MessageRow[]>`
      SELECT
        "id",
        "messageId",
        "userId",
        "groupId",
        "displayName",
        "email",
        "statusMessage",
        "pictureUrl",
        "contentUrl",
        "contentMimeType",
        "source",
        "text",
        "type",
        jsonb_build_object(
          'parsed', "rawPayload"->'parsed',
          'lineIdentity', jsonb_build_object(
            'groupName', "rawPayload"->'lineIdentity'->>'groupName',
            'pictureUrl', "rawPayload"->'lineIdentity'->>'pictureUrl',
            'error', "rawPayload"->'lineIdentity'->>'error'
          ),
          'mediaUpload', jsonb_build_object(
            'publicUrl', "rawPayload"->'mediaUpload'->>'publicUrl',
            'url', "rawPayload"->'mediaUpload'->>'url',
            'mediaUrl', "rawPayload"->'mediaUpload'->>'mediaUrl',
            'thumbnailUrl', "rawPayload"->'mediaUpload'->>'thumbnailUrl',
            'mediaType', "rawPayload"->'mediaUpload'->>'mediaType',
            'type', "rawPayload"->'mediaUpload'->>'type',
            'contentType', "rawPayload"->'mediaUpload'->>'contentType',
            'contentMimeType', "rawPayload"->'mediaUpload'->>'contentMimeType',
            'error', "rawPayload"->'mediaUpload'->>'error'
          )
        ) AS "rawPayload",
        "timestamp",
        "createdAt",
        "context",
        "contexts",
        "parsed",
        "flexTemplate",
        "confidence",
        "importBatchId"
      FROM "Message"
      WHERE (${groupId}::text IS NULL OR "groupId" = ${groupId})
        AND (${fromTimestamp}::bigint IS NULL OR "timestamp" >= ${fromTimestamp}::bigint)
        AND (${toTimestamp}::bigint IS NULL OR "timestamp" < ${toTimestamp}::bigint)
      ORDER BY "timestamp" DESC
      LIMIT ${limit}
    `;

    const publicMessages = messages.map(toPublicMessage);
    const mediaCount = publicMessages.filter((message) => message.mediaUrl).length;

    console.info("mini-app API response", {
      route: "/api/messages",
      itemCount: publicMessages.length,
      rawPayloadIncluded: false,
      mediaCount,
      filteredByGroup: Boolean(groupId),
      filteredByDate: Boolean(fromTimestamp || toTimestamp),
      fromTimestamp: fromTimestamp?.toString() ?? null,
      toTimestamp: toTimestamp?.toString() ?? null,
      limit,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        messages: publicMessages,
        configured: true,
      },
      { headers: { "Cache-Control": PRIVATE_LIST_CACHE } },
    );
  } catch (error) {
    console.error("Failed to fetch messages", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500, headers: { "Cache-Control": PRIVATE_LIST_CACHE } },
    );
  }
}

export async function POST(request: Request) {
  if (!hasValidDatabaseUrl()) {
    return NextResponse.json(
      {
        error: getDatabaseSetupMessage(),
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      event?: string;
      userId?: string;
      displayName?: string;
      email?: string;
      statusMessage?: string;
      pictureUrl?: string;
      contentUrl?: string;
      contentMimeType?: string;
      text?: string;
      source?: string;
      groupId?: string;
      rawPayload?: unknown;
    };

    if (!body.userId && !body.text) {
      return NextResponse.json(
        { error: "userId or text is required to store a message event" },
        { status: 400 },
      );
    }

    const savedMessage = await prisma.message.create({
      data: {
        messageId: `${body.event ?? "liff-event"}-${randomUUID()}`,
        userId: body.userId ?? null,
        groupId: body.groupId ?? null,
        displayName: body.displayName ?? null,
        email: body.email ?? null,
        statusMessage: body.statusMessage ?? null,
        pictureUrl: body.pictureUrl ?? null,
        contentUrl: body.contentUrl ?? null,
        contentMimeType: body.contentMimeType ?? null,
        source: body.source ?? "liff",
        text: body.text ?? null,
        type: body.event ?? "liff-profile",
        rawPayload: body.rawPayload ?? {
          userId: body.userId ?? null,
          displayName: body.displayName ?? null,
          email: body.email ?? null,
          text: body.text ?? null,
        },
        timestamp: BigInt(Date.now()),
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        ...savedMessage,
        timestamp: savedMessage.timestamp.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to store LIFF message event", error);
    return NextResponse.json({ error: "Failed to store message event" }, { status: 500 });
  }
}
