import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildHealthReport } from "@/lib/health-report";

export const runtime = "nodejs";

type LineWebhookEvent = {
  type: string;
  timestamp?: number;
  replyToken?: string;
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

type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
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

async function replyWithHealthCard(event: LineWebhookEvent, origin: string) {
  if (!event.replyToken) {
    return;
  }

  const accessToken = getLineMessagingAccessToken();

  if (!accessToken) {
    console.warn("Missing LINE messaging access token; skipping reply card");
    return;
  }

  const report = buildHealthReport([
    {
      id: event.message?.id ?? event.webhookEventId ?? randomUUID(),
      text: event.message?.text ?? null,
      type: event.message?.type ?? "text",
      timestamp: event.timestamp ?? Date.now(),
      displayName: null,
      userId: event.source?.userId ?? null,
    },
  ]);

  const statusStyles = {
    green: { backgroundColor: "#E8F9EE", textColor: "#00C853" },
    orange: { backgroundColor: "#FFF5DF", textColor: "#FFB300" },
    red: { backgroundColor: "#FDECEC", textColor: "#E53935" },
  }[report.statusTone];

  const flexMessage: LineFlexMessage = {
    type: "flex",
    altText: `บันทึกข้อมูลสำเร็จ • ความดัน ${report.vitals.bloodPressure.value} • ชีพจร ${report.vitals.heartRate.value}`,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            justifyContent: "space-between",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: "บันทึกข้อมูลสำเร็จ",
                weight: "bold",
                size: "lg",
                color: "#0D47A1",
              },
              {
                type: "box",
                layout: "baseline",
                paddingAll: "6px",
                cornerRadius: "999px",
                backgroundColor: statusStyles.backgroundColor,
                contents: [
                  {
                    type: "text",
                    text: report.statusLabel,
                    size: "xs",
                    weight: "bold",
                    color: statusStyles.textColor,
                  },
                ],
              },
            ],
          },
          {
            type: "text",
            text: report.aiSummary,
            wrap: true,
            size: "sm",
            color: "#475569",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            margin: "md",
            paddingAll: "14px",
            cornerRadius: "20px",
            backgroundColor: "#F8FBFF",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                justifyContent: "space-between",
                contents: [
                  {
                    type: "text",
                    text: "ความดัน",
                    size: "sm",
                    color: "#64748B",
                  },
                  {
                    type: "text",
                    text: `${report.vitals.bloodPressure.value} ${report.vitals.bloodPressure.unit}`,
                    size: "sm",
                    weight: "bold",
                    color: "#111827",
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                justifyContent: "space-between",
                contents: [
                  {
                    type: "text",
                    text: "ชีพจร",
                    size: "sm",
                    color: "#64748B",
                  },
                  {
                    type: "text",
                    text: `${report.vitals.heartRate.value} ${report.vitals.heartRate.unit}`,
                    size: "sm",
                    weight: "bold",
                    color: "#111827",
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                justifyContent: "space-between",
                contents: [
                  {
                    type: "text",
                    text: "อุณหภูมิ",
                    size: "sm",
                    color: "#64748B",
                  },
                  {
                    type: "text",
                    text: `${report.vitals.temperature.value} ${report.vitals.temperature.unit}`,
                    size: "sm",
                    weight: "bold",
                    color: "#111827",
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#1976D2",
            action: {
              type: "uri",
              label: "ดูรายงาน",
              uri: `${origin}/mini-app`,
            },
          },
        ],
      },
    },
  };

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [flexMessage],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to send LINE reply card", {
      replyToken: event.replyToken,
      errorBody,
    });
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

      for (const event of messageEvents) {
        await replyWithHealthCard(event, request.nextUrl.origin);
      }
    } catch (error) {
      console.error("Failed to persist LINE webhook events", error);
      return NextResponse.json({ error: "Failed to save webhook events" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
