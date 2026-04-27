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

export async function GET() {
  if (!hasValidDatabaseUrl()) {
    return NextResponse.json({
      messages: [],
      configured: false,
      setupMessage: getDatabaseSetupMessage(),
    });
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
        "rawPayload",
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

    return NextResponse.json(
      {
      messages: messages.map((message) => ({
        ...message,
        timestamp: message.timestamp.toString(),
        confidence: message.confidence === null || message.confidence === undefined ? null : String(message.confidence),
      })),
      configured: true,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch messages", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
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
