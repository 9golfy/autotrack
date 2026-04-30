import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getDatabaseSetupMessage, hasValidDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

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

const PRIVATE_LIST_CACHE = "private, max-age=30, stale-while-revalidate=120";

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
          publicUrl: asString(mediaUpload.publicUrl) ?? asString(mediaUpload.mediaUrl) ?? asString(mediaUpload.url),
          url: asString(mediaUpload.url) ?? asString(mediaUpload.publicUrl) ?? asString(mediaUpload.mediaUrl),
          mediaUrl: asString(mediaUpload.mediaUrl) ?? asString(mediaUpload.publicUrl) ?? asString(mediaUpload.url),
          thumbnailUrl: asString(mediaUpload.thumbnailUrl),
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
  const mediaUrl = rawPayload.mediaUpload?.mediaUrl ?? message.contentUrl;
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
    contentUrl: message.contentUrl,
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

export async function GET() {
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
      ORDER BY "timestamp" DESC
      LIMIT 500
    `;

    const publicMessages = messages.map(toPublicMessage);
    const mediaCount = publicMessages.filter((message) => message.mediaUrl).length;

    console.info("mini-app API response", {
      route: "/api/messages",
      itemCount: publicMessages.length,
      rawPayloadIncluded: false,
      mediaCount,
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
