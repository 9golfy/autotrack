import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type LineWebhookEvent = {
  type: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    id?: string;
    type?: string;
    text?: string;
  };
  webhookEventId?: string;
};

type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};

type UploadedLineContent = {
  contentUrl: string | null;
  contentMimeType: string | null;
  bucketName: string;
  storagePath: string | null;
  fetchStatus: number | null;
  contentSizeBytes: number | null;
  error: string | null;
};

type ResolvedLineIdentity = {
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  groupName: string | null;
  error: string | null;
};

function verifySignature(body: string, signature: string | null) {
  const secret =
    process.env.LINE_MESSAGING_CHANNEL_SECRET ?? process.env.LINE_CHANNEL_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(body).digest("base64");
  if (digest.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function getLineMessagingAccessToken() {
  return (
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
  ).trim();
}

function getFileExtension(contentType: string) {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();

  switch (normalizedType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function fetchLineApiJson<T>(path: string): Promise<T> {
  const accessToken = getLineMessagingAccessToken();

  if (!accessToken) {
    throw new Error("Missing LINE messaging access token");
  }

  const response = await fetch(`https://api.line.me${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE API ${path} failed: ${response.status} ${errorBody}`.trim());
  }

  return (await response.json()) as T;
}

async function resolveLineIdentity(event: LineWebhookEvent): Promise<ResolvedLineIdentity> {
  const userId = event.source?.userId;
  const groupId = event.source?.groupId;
  const roomId = event.source?.roomId;
  const sourceType = event.source?.type;

  if (!userId) {
    return {
      displayName: null,
      pictureUrl: null,
      statusMessage: null,
      groupName: null,
      error: "Missing userId in webhook source",
    };
  }

  try {
    if (sourceType === "group" && groupId) {
      const [memberProfile, groupSummary] = await Promise.all([
        fetchLineApiJson<{
          displayName?: string;
          pictureUrl?: string;
          statusMessage?: string;
        }>(`/v2/bot/group/${groupId}/member/${userId}`),
        fetchLineApiJson<{
          groupName?: string;
        }>(`/v2/bot/group/${groupId}/summary`),
      ]);

      return {
        displayName: memberProfile.displayName ?? null,
        pictureUrl: memberProfile.pictureUrl ?? null,
        statusMessage: memberProfile.statusMessage ?? null,
        groupName: groupSummary.groupName ?? null,
        error: null,
      };
    }

    if (sourceType === "room" && roomId) {
      const memberProfile = await fetchLineApiJson<{
        displayName?: string;
        pictureUrl?: string;
        statusMessage?: string;
      }>(`/v2/bot/room/${roomId}/member/${userId}`);

      return {
        displayName: memberProfile.displayName ?? null,
        pictureUrl: memberProfile.pictureUrl ?? null,
        statusMessage: memberProfile.statusMessage ?? null,
        groupName: null,
        error: null,
      };
    }

    const profile = await fetchLineApiJson<{
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
    }>(`/v2/bot/profile/${userId}`);

    return {
      displayName: profile.displayName ?? null,
      pictureUrl: profile.pictureUrl ?? null,
      statusMessage: profile.statusMessage ?? null,
      groupName: null,
      error: null,
    };
  } catch (error) {
    console.error("Failed to resolve LINE identity", {
      sourceType,
      userId,
      groupId,
      roomId,
      error,
    });

    return {
      displayName: null,
      pictureUrl: null,
      statusMessage: null,
      groupName: null,
      error: error instanceof Error ? error.message : "Failed to resolve LINE identity",
    };
  }
}

async function uploadLineImageContent(messageId: string): Promise<UploadedLineContent> {
  const accessToken = getLineMessagingAccessToken();
  const bucketName = (process.env.LINE_MEDIA_BUCKET ?? "line-media").trim();

  if (!accessToken) {
    console.warn("Missing LINE messaging access token; skipping image download");
    return {
      contentUrl: null,
      contentMimeType: null,
      bucketName,
      storagePath: null,
      fetchStatus: null,
      contentSizeBytes: null,
      error: "Missing LINE messaging access token",
    };
  }

  try {
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Failed to fetch LINE content", {
        messageId,
        status: response.status,
        errorBody,
      });
      return {
        contentUrl: null,
        contentMimeType: null,
        bucketName,
        storagePath: null,
        fetchStatus: response.status,
        contentSizeBytes: null,
        error: `LINE content fetch failed: ${response.status} ${errorBody}`.trim(),
      };
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const fileExtension = getFileExtension(contentType);
    const filePath = `line-webhook/${messageId}.${fileExtension}`;
    const fileBuffer = await response.arrayBuffer();
    const contentSizeBytes = fileBuffer.byteLength;

    const supabase = getSupabaseAdminClient();
    const uploadResult = await supabase.storage.from(bucketName).upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (uploadResult.error) {
      console.error("Failed to upload LINE content to Supabase Storage", {
        messageId,
        bucketName,
        filePath,
        error: uploadResult.error,
      });
      return {
        contentUrl: null,
        contentMimeType: contentType,
        bucketName,
        storagePath: filePath,
        fetchStatus: response.status,
        contentSizeBytes,
        error: uploadResult.error.message,
      };
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    console.info("Stored LINE image content", {
      messageId,
      bucketName,
      filePath,
      contentType,
      contentSizeBytes,
      publicUrl: data.publicUrl,
    });

    return {
      contentUrl: data.publicUrl,
      contentMimeType: contentType,
      bucketName,
      storagePath: filePath,
      fetchStatus: response.status,
      contentSizeBytes,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected LINE image upload error", error);
    return {
      contentUrl: null,
      contentMimeType: null,
      bucketName,
      storagePath: null,
      fetchStatus: null,
      contentSizeBytes: null,
      error: error instanceof Error ? error.message : "Unexpected LINE image upload error",
    };
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
  }

  let payload: LineWebhookBody;

  try {
    payload = JSON.parse(body) as LineWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const messageEvents = (payload.events ?? []).filter(
    (event) => event.type === "message" && event.message?.id,
  );

  if (messageEvents.length > 0) {
    try {
      const uploadedContentByMessageId = new Map<string, UploadedLineContent>();
      const lineIdentityBySourceKey = new Map<string, ResolvedLineIdentity>();

      for (const event of messageEvents) {
        const sourceKey = [
          event.source?.type ?? "unknown",
          event.source?.groupId ?? "",
          event.source?.roomId ?? "",
          event.source?.userId ?? "",
        ].join(":");

        if (!lineIdentityBySourceKey.has(sourceKey)) {
          lineIdentityBySourceKey.set(sourceKey, await resolveLineIdentity(event));
        }

        if (event.message?.type === "image" && event.message.id) {
          uploadedContentByMessageId.set(
            event.message.id,
            await uploadLineImageContent(event.message.id),
          );
        }
      }

      await prisma.message.createMany({
        data: messageEvents.map((event) => {
          const uploadedContent = event.message?.id
            ? uploadedContentByMessageId.get(event.message.id)
            : undefined;
          const sourceKey = [
            event.source?.type ?? "unknown",
            event.source?.groupId ?? "",
            event.source?.roomId ?? "",
            event.source?.userId ?? "",
          ].join(":");
          const lineIdentity = lineIdentityBySourceKey.get(sourceKey);

          return {
            messageId: event.message?.id ?? event.webhookEventId ?? randomUUID(),
            userId: event.source?.userId ?? null,
            groupId: event.source?.groupId ?? event.source?.roomId ?? null,
            displayName: lineIdentity?.displayName ?? null,
            pictureUrl: lineIdentity?.pictureUrl ?? null,
            statusMessage: lineIdentity?.statusMessage ?? null,
            source: "webhook",
            text: event.message?.type === "text" ? event.message.text ?? null : null,
            contentUrl: uploadedContent?.contentUrl ?? null,
            contentMimeType: uploadedContent?.contentMimeType ?? null,
            type: event.message?.type ?? "unknown",
            rawPayload: {
              event,
              lineIdentity: {
                displayName: lineIdentity?.displayName ?? null,
                pictureUrl: lineIdentity?.pictureUrl ?? null,
                statusMessage: lineIdentity?.statusMessage ?? null,
                groupName: lineIdentity?.groupName ?? null,
                error: lineIdentity?.error ?? null,
              },
              mediaUpload:
                event.message?.type === "image"
                  ? {
                      bucketName: uploadedContent?.bucketName ?? null,
                      storagePath: uploadedContent?.storagePath ?? null,
                      publicUrl: uploadedContent?.contentUrl ?? null,
                      contentMimeType: uploadedContent?.contentMimeType ?? null,
                      fetchStatus: uploadedContent?.fetchStatus ?? null,
                      contentSizeBytes: uploadedContent?.contentSizeBytes ?? null,
                      error: uploadedContent?.error ?? null,
                    }
                  : null,
            },
            timestamp: BigInt(event.timestamp ?? Date.now()),
          };
        }),
        skipDuplicates: false,
      });
    } catch (error) {
      console.error("Failed to persist LINE webhook events", error);
      return NextResponse.json({ error: "Failed to save webhook events" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
