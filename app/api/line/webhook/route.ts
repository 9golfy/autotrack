import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildHealthReport, extractTimedVitalsSamples, type TimedVitalsSample } from "@/lib/health-report";
import {
  evaluateBloodPressure,
  evaluateHeartRate,
  evaluateRespiratoryRate,
  evaluateSpo2,
  evaluateTemperature,
} from "@/lib/health-thresholds";
import {
  buildContextFlexMessage,
  detectSupabaseMessageContexts,
  getFlexTemplateForSupabaseContext,
  type LineFlexMessage,
  type SupabaseFlexTemplate,
  type SupabaseMessageContext,
} from "@/lib/line/flex";

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

type StructuredWebhookFields = {
  context: SupabaseMessageContext;
  contexts: SupabaseMessageContext[];
  parsed: {
    report_date: string | null;
    shift: string | null;
    vital_signs: Array<{
      measured_date: string | null;
      measured_time: string;
      blood_pressure_systolic: number | null;
      blood_pressure_diastolic: number | null;
      heart_rate_bpm: number | null;
      respiratory_rate_per_min: number | null;
      temperature_c: number | null;
      spo2_percent: number | null;
    }>;
  };
  flexTemplate: SupabaseFlexTemplate;
  confidence: number;
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

function getLineTargetId() {
  return (process.env.LINE_TARGET_ID ?? "").trim();
}

function getMiniAppReportUrl(origin: string, event: LineWebhookEvent) {
  const reportUrl = new URL("/mini-app", origin);
  const groupId = event.source?.groupId ?? event.source?.roomId;

  if (groupId) {
    reportUrl.searchParams.set("groupId", groupId);
  }

  return reportUrl.toString();
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function parseThaiReportDate(text: string) {
  const normalizedMatch = text.match(
    /\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/,
  );
  const match = text.match(/ประจำวันที่\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/);

  if (!normalizedMatch && !match) {
    return null;
  }

  const dateMatch = normalizedMatch ?? match;
  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const rawYear = Number(dateMatch[3]);
  const buddhistYear = rawYear < 100 ? 2500 + rawYear : rawYear;
  const christianYear = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;

  if (!day || !month || !christianYear) {
    return null;
  }

  return new Date(christianYear, month - 1, day);
}

function detectShift(text: string) {
  if (/\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01|20[:. ]?00|20\.00|20:00/.test(text)) {
    return "night_shift";
  }

  if (/\u0e40\u0e27\u0e23\u0e40\u0e0a\u0e49\u0e32|08[:. ]?00|08\.00|08:00/.test(text)) {
    return "day_shift";
  }

  if (/เวรดึก|20[:. ]?00|20\.00|20:00/.test(text)) {
    return "night_shift";
  }

  if (/เวรเช้า|08[:. ]?00|08\.00|08:00/.test(text)) {
    return "day_shift";
  }

  return null;
}

function inferMeasuredDate(reportDate: Date | null, shift: string | null, sample: TimedVitalsSample) {
  if (!reportDate) {
    return null;
  }

  if (shift === "night_shift" && sample.hour < 8) {
    return toIsoDate(addDays(reportDate, 1));
  }

  return toIsoDate(reportDate);
}

function buildStructuredWebhookFields(event: LineWebhookEvent): StructuredWebhookFields | null {
  const text = event.message?.type === "text" ? event.message.text ?? "" : "";

  if (!text.trim()) {
    return null;
  }

  const samples = extractTimedVitalsSamples([
    {
      id: event.message?.id ?? event.webhookEventId ?? randomUUID(),
      text,
      type: event.message?.type ?? "text",
      timestamp: event.timestamp ?? Date.now(),
      userId: event.source?.userId ?? null,
      groupId: event.source?.groupId ?? event.source?.roomId ?? null,
    },
  ]);

  const contexts = new Set<string>(
    detectSupabaseMessageContexts({
      text,
      hasTimedVitals: samples.length > 0,
    }),
  );

  if (samples.length > 0) {
    contexts.add("health_report");
    contexts.add("vital_signs");
  }

  if (/ยา|ก่อนนอน|หลังอาหาร|ก่อนอาหาร/.test(text)) {
    contexts.add("medication");
  }

  if (/อาหาร|มื้อเช้า|มื้อกลางวัน|มื้อเย็น|ทานข้าว|รับประทาน/.test(text)) {
    contexts.add("meal");
  }

  if (/อารมณ์|หงุดหงิด|ยิ้มแย้ม|ซึม|รู้สึกตัว/.test(text)) {
    contexts.add("mood_behavior");
  }

  if (/ปัสสาวะ|ขับถ่าย/.test(text)) {
    contexts.add("excretion");
  }

  if (contexts.size === 0) {
    contexts.add("general_chat");
  }

  const contextOrder = [
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
  ];
  const orderedContexts = contextOrder.filter((context) => contexts.has(context));
  const context = orderedContexts[0] ?? "other";
  const flexTemplate = getFlexTemplateForSupabaseContext(context as SupabaseMessageContext);
  const reportDate = parseThaiReportDate(text);
  const shift = detectShift(text);

  return {
    context: context as SupabaseMessageContext,
    contexts: orderedContexts as SupabaseMessageContext[],
    parsed: {
      report_date: reportDate ? toIsoDate(reportDate) : null,
      shift,
      vital_signs: samples.map((sample) => ({
        measured_date: inferMeasuredDate(reportDate, shift, sample),
        measured_time: sample.label,
        blood_pressure_systolic: sample.systolic,
        blood_pressure_diastolic: sample.diastolic,
        heart_rate_bpm: sample.heartRate,
        respiratory_rate_per_min: sample.respiratoryRate,
        temperature_c: sample.temperature,
        spo2_percent: sample.spo2,
      })),
    },
    flexTemplate,
    confidence: samples.length > 0 ? 0.92 : 0.65,
  };
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
          pictureUrl?: string;
        }>(`/v2/bot/group/${groupId}/summary`),
      ]);

      return {
        displayName: memberProfile.displayName ?? null,
        pictureUrl: groupSummary.pictureUrl ?? null,
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

function formatSampleBloodPressure(sample: TimedVitalsSample) {
  return sample.systolic !== null && sample.diastolic !== null
    ? `${sample.systolic}/${sample.diastolic} mmHg`
    : "ไม่มีข้อมูล";
}

function formatSampleValue(value: number | null, unit: string) {
  return value !== null ? `${value} ${unit}` : "ไม่มีข้อมูล";
}

function formatStatus(status: string) {
  return `[${status}]`;
}

function buildTimedVitalsFlexBlocks(samples: TimedVitalsSample[]) {
  const timeOrder = new Map([
    ["10:00", 1],
    ["18:00", 2],
    ["22:00", 3],
    ["06:00", 4],
  ]);
  const orderedSamples = [...samples].sort((left, right) => {
    const leftOrder = timeOrder.get(left.label) ?? left.hour * 60 + left.minute;
    const rightOrder = timeOrder.get(right.label) ?? right.hour * 60 + right.minute;

    return leftOrder - rightOrder;
  });
  const blocks = orderedSamples.slice(0, 2).map((sample) => ({
    type: "box",
    layout: "vertical",
    spacing: "xs",
    margin: "sm",
    paddingAll: "12px",
    cornerRadius: "16px",
    backgroundColor: "#F8FBFF",
    contents: [
      { type: "text", text: `[${sample.label} น.]`, size: "sm", weight: "bold", color: "#0D47A1" },
      {
        type: "text",
        text: `👩‍⚕️ความดัน ${formatSampleBloodPressure(sample)} ${formatStatus(evaluateBloodPressure(sample.systolic, sample.diastolic).label)}`,
        size: "xs",
        color: "#111827",
        wrap: true,
      },
      {
        type: "text",
        text: `🫀อัตราการเต้นของหัวใจ ${formatSampleValue(sample.heartRate, "bpm")} ${formatStatus(evaluateHeartRate(sample.heartRate).label)}`,
        size: "xs",
        color: "#111827",
        wrap: true,
      },
      {
        type: "text",
        text: `🫁อัตราการหายใจ ${formatSampleValue(sample.respiratoryRate, "ครั้ง/นาที")} ${formatStatus(evaluateRespiratoryRate(sample.respiratoryRate).label)}`,
        size: "xs",
        color: "#111827",
        wrap: true,
      },
      {
        type: "text",
        text: `🌡อุณหภูมิร่างกาย ${
          sample.temperature !== null ? `${sample.temperature.toFixed(1)} °C` : "ไม่มีข้อมูล"
        } ${formatStatus(evaluateTemperature(sample.temperature).label)}`,
        size: "xs",
        color: "#111827",
        wrap: true,
      },
      {
        type: "text",
        text: `🩸ออกซิเจนในเลือด ${formatSampleValue(sample.spo2, "%")} ${formatStatus(evaluateSpo2(sample.spo2).label)}`,
        size: "xs",
        color: "#111827",
        wrap: true,
      },
    ],
  }));

  if (blocks.length === 0) {
    return [];
  }

  return [
    {
      type: "text",
      text: `ข้อมูลสัญญาณชีพ ${blocks.length} เวลา`,
      size: "xs",
      weight: "bold",
      color: "#0D47A1",
      margin: "sm",
    },
    ...blocks,
  ];
}

function buildHealthFlexMessage(event: LineWebhookEvent, origin: string): LineFlexMessage {
  const timedSamples = extractTimedVitalsSamples([
    {
      id: event.message?.id ?? event.webhookEventId ?? randomUUID(),
      text: event.message?.text ?? null,
      type: event.message?.type ?? "text",
      timestamp: event.timestamp ?? Date.now(),
      userId: event.source?.userId ?? null,
    },
  ]);
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
  const timedVitalsBlocks = buildTimedVitalsFlexBlocks(timedSamples);
  if (timedSamples.length > 0) {
    console.info("Extracted timed vitals for LINE health card", {
      messageId: event.message?.id,
      samples: timedSamples.map((sample) => ({
        time: sample.label,
        bloodPressure:
          sample.systolic !== null && sample.diastolic !== null
            ? `${sample.systolic}/${sample.diastolic}`
            : null,
        heartRate: sample.heartRate,
        respiratoryRate: sample.respiratoryRate,
        temperature: sample.temperature,
        spo2: sample.spo2,
      })),
    });
  }

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
            text: "ข้อมูลจากศูนย์ดูแลผู้สูงอายุ",
            wrap: true,
            size: "sm",
            color: "#475569",
          },
          ...timedVitalsBlocks,
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
              uri: getMiniAppReportUrl(origin, event),
            },
          },
        ],
      },
    },
  };

  return flexMessage;
}

function buildContextAwareFlexMessage(
  event: LineWebhookEvent,
  origin: string,
  imageUrl?: string | null,
): LineFlexMessage {
  const message = {
    id: event.message?.id ?? event.webhookEventId ?? randomUUID(),
    text: event.message?.text ?? null,
    type: event.message?.type ?? "text",
    timestamp: event.timestamp ?? Date.now(),
    userId: event.source?.userId ?? null,
  };

  const reportInput = {
    ...message,
    displayName: null,
    groupId: event.source?.groupId ?? event.source?.roomId ?? null,
  };

  const report = buildHealthReport([reportInput]);
  const timedSamples = extractTimedVitalsSamples([reportInput]);

  return buildContextFlexMessage({
    text: message.text ?? "",
    report,
    timedSamples,
    reportUrl: getMiniAppReportUrl(origin, event),
    imageUrl,
  });
}

async function replyWithHealthCard(
  event: LineWebhookEvent,
  origin: string,
  imageUrl?: string | null,
) {
  if (!event.replyToken) {
    return;
  }

  const accessToken = getLineMessagingAccessToken();

  if (!accessToken) {
    console.warn("Missing LINE messaging access token; skipping reply card");
    return;
  }

  const flexMessage = buildContextAwareFlexMessage(event, origin, imageUrl);

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

async function pushHealthCardToLineTarget(
  event: LineWebhookEvent,
  origin: string,
  imageUrl?: string | null,
) {
  const accessToken = getLineMessagingAccessToken();
  const targetId = getLineTargetId();

  if (!accessToken || !targetId) {
    console.warn("Missing LINE messaging access token or LINE_TARGET_ID; skipping OA push card");
    return;
  }

  const flexMessage = buildContextAwareFlexMessage(event, origin, imageUrl);

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: targetId,
      messages: [flexMessage],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to push LINE OA health card", {
      targetId,
      groupId: event.source?.groupId ?? event.source?.roomId ?? null,
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
      const uploadedImageUrlBySourceKey = new Map<string, string>();
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
          const uploadedContent = await uploadLineImageContent(event.message.id);
          uploadedContentByMessageId.set(event.message.id, uploadedContent);

          if (uploadedContent.contentUrl) {
            uploadedImageUrlBySourceKey.set(sourceKey, uploadedContent.contentUrl);
          }
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
          const structuredFields = buildStructuredWebhookFields(event);

          return {
            messageId: event.message?.id ?? event.webhookEventId ?? randomUUID(),
            userId: event.source?.userId ?? null,
            groupId: event.source?.groupId ?? event.source?.roomId ?? null,
            displayName: lineIdentity?.displayName ?? null,
            pictureUrl: lineIdentity?.pictureUrl ?? null,
            statusMessage: lineIdentity?.statusMessage ?? null,
            context: structuredFields?.context ?? "other",
            contexts: structuredFields?.contexts ?? ["other"],
            parsed: (structuredFields?.parsed as any) ?? {},
            flexTemplate: structuredFields?.flexTemplate ?? "plain_text",
            confidence: structuredFields?.confidence ?? 0,
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
        const sourceKey = [
          event.source?.type ?? "unknown",
          event.source?.groupId ?? "",
          event.source?.roomId ?? "",
          event.source?.userId ?? "",
        ].join(":");
        const imageUrl =
          (event.message?.id
            ? uploadedContentByMessageId.get(event.message.id)?.contentUrl
            : null) ?? uploadedImageUrlBySourceKey.get(sourceKey) ?? null;

        if (event.source?.type === "user") {
          await replyWithHealthCard(event, request.nextUrl.origin, imageUrl);
          continue;
        }

        if (event.source?.groupId || event.source?.roomId) {
          await pushHealthCardToLineTarget(event, request.nextUrl.origin, imageUrl);
        }
      }
    } catch (error) {
      console.error("Failed to persist LINE webhook events", error);
      return NextResponse.json({ error: "Failed to save webhook events" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
