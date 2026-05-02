import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSupabaseStorageClient } from "@/lib/supabase/admin";
import { buildStoragePublicUrl } from "@/lib/supabase/storage-url";
import { analyzeCareImage, type CareImageAnalysis } from "@/lib/analyze-care-image";
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
  mediaType: string | null;
  thumbnailUrl: string | null;
  bucketName: string;
  storagePath: string | null;
  fetchStatus: number | null;
  contentSizeBytes: number | null;
  error: string | null;
};

type ResolvedLineIdentity = {
  displayName: string | null;
  pictureUrl: string | null;
  userPictureUrl: string | null;
  groupPictureUrl: string | null;
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

type MediaAiAnalysis = CareImageAnalysis & {
  context: {
    localDate: string;
    localTime: string;
    mealSlot: "breakfast" | "lunch" | "dinner" | "unknown" | null;
    medicationSlot: "morning" | "midday" | "afternoon" | "evening" | "night" | "unknown" | null;
    countsAsMealReceived: boolean;
  };
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

function getBangkokDateTimeParts(timestamp: number) {
  const date = new Date(timestamp);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    localDate: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    localTime: `${getPart("hour")}:${getPart("minute")}:${getPart("second")}`,
    hour: Number(getPart("hour")),
  };
}

function inferMealSlot(hour: number): MediaAiAnalysis["context"]["mealSlot"] {
  if (hour < 10) return "breakfast";
  if (hour >= 10 && hour <= 13) return "lunch";
  if (hour >= 15) return "dinner";
  return "unknown";
}

function inferMedicationSlot(hour: number): MediaAiAnalysis["context"]["medicationSlot"] {
  if (hour < 10) return "morning";
  if (hour >= 10 && hour <= 13) return "midday";
  if (hour >= 20) return "night";
  if (hour >= 15) return "evening";
  return "afternoon";
}

function enrichMediaAiAnalysis(analysis: CareImageAnalysis, timestamp: number): MediaAiAnalysis {
  const dateTime = getBangkokDateTimeParts(timestamp);
  const mealSlot = analysis.category === "meal" ? inferMealSlot(dateTime.hour) : null;
  const medicationSlot = analysis.category === "medication" ? inferMedicationSlot(dateTime.hour) : null;

  return {
    ...analysis,
    context: {
      localDate: dateTime.localDate,
      localTime: dateTime.localTime,
      mealSlot,
      medicationSlot,
      countsAsMealReceived: Boolean(mealSlot && mealSlot !== "unknown"),
    },
  };
}

async function analyzeUploadedLineMedia(event: LineWebhookEvent, uploadedContent: UploadedLineContent): Promise<MediaAiAnalysis | null> {
  if (!uploadedContent.contentUrl || !["image", "video"].includes(event.message?.type ?? "")) {
    return null;
  }

  try {
    const analysis = await analyzeCareImage(uploadedContent.contentUrl);
    return enrichMediaAiAnalysis(analysis, event.timestamp ?? Date.now());
  } catch (error) {
    console.error("Failed to analyze LINE media with Gemini", {
      messageId: event.message?.id ?? null,
      mediaType: event.message?.type ?? null,
      error,
    });
    return null;
  }
}

function getMediaAiSupabaseContext(category: CareImageAnalysis["category"]): SupabaseMessageContext {
  switch (category) {
    case "meal":
      return "meal";
    case "medication":
      return "medication";
    case "vital_sign":
      return "vital_signs";
    case "activity":
    case "sleep":
      return "activity";
    case "expense":
      return "billing";
    default:
      return "other";
  }
}

function formatMediaAiSummary(analysis: MediaAiAnalysis) {
  const mealLabelBySlot: Record<Exclude<MediaAiAnalysis["context"]["mealSlot"], null>, string> = {
    breakfast: "อาหารเช้า",
    lunch: "อาหารกลางวัน",
    dinner: "อาหารเย็น",
    unknown: "ไม่ทราบมื้ออาหาร",
  };
  const medicationLabelBySlot: Record<Exclude<MediaAiAnalysis["context"]["medicationSlot"], null>, string> = {
    morning: "ยาตอนเช้า",
    midday: "ยาตอนกลางวัน",
    afternoon: "ยาตอนบ่าย",
    evening: "ยาตอนเย็น",
    night: "ยาก่อนนอน",
    unknown: "ไม่ทราบช่วงเวลากินยา",
  };

  if (analysis.category === "meal" && analysis.context.mealSlot) {
    return `${mealLabelBySlot[analysis.context.mealSlot]}: ${analysis.thaiSummary}`;
  }

  if (analysis.category === "medication" && analysis.context.medicationSlot) {
    return `${medicationLabelBySlot[analysis.context.medicationSlot]}: ${analysis.thaiSummary}`;
  }

  return analysis.thaiSummary;
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
    case "video/mp4":
      return "mp4";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    default:
      return "bin";
  }
}

function getLineMediaBucketName() {
  const bucketName = (
    process.env.SUPABASE_STORAGE_BUCKET ??
    process.env.LINE_MEDIA_BUCKET ??
    "line-media"
  ).trim();

  return bucketName || "line-media";
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
      userPictureUrl: null,
      groupPictureUrl: null,
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
        pictureUrl: memberProfile.pictureUrl ?? null,
        userPictureUrl: memberProfile.pictureUrl ?? null,
        groupPictureUrl: groupSummary.pictureUrl ?? null,
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
        userPictureUrl: memberProfile.pictureUrl ?? null,
        groupPictureUrl: null,
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
      userPictureUrl: profile.pictureUrl ?? null,
      groupPictureUrl: null,
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
      userPictureUrl: null,
      groupPictureUrl: null,
      statusMessage: null,
      groupName: null,
      error: error instanceof Error ? error.message : "Failed to resolve LINE identity",
    };
  }
}

function buildLineMediaPath(messageId: string, contentType: string, groupId: string | null | undefined) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safeGroupId = (groupId?.trim() || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeMessageId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileExtension = getFileExtension(contentType);

  return `line-webhook/${safeGroupId}/${yyyy}/${mm}/${dd}/${Date.now()}-${safeMessageId}.${fileExtension}`;
}

async function uploadLineMediaContent(
  messageId: string,
  groupId: string | null | undefined,
  mediaType: string | null | undefined,
): Promise<UploadedLineContent> {
  const accessToken = getLineMessagingAccessToken();
  const bucketName = getLineMediaBucketName();

  if (!accessToken) {
    console.warn("Missing LINE messaging access token; skipping media download");
    return {
      contentUrl: null,
      contentMimeType: null,
      mediaType: mediaType ?? null,
      thumbnailUrl: null,
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
        mediaType: mediaType ?? null,
        thumbnailUrl: null,
        bucketName,
        storagePath: null,
        fetchStatus: response.status,
        contentSizeBytes: null,
        error: `LINE content fetch failed: ${response.status} ${errorBody}`.trim(),
      };
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const filePath = buildLineMediaPath(messageId, contentType, groupId);
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const contentSizeBytes = fileBuffer.byteLength;

    // SECURITY: Store LINE binary content server-side using the service role key; never expose LINE content API tokens to clients.
    console.info("Uploading LINE media content", {
      messageId,
      bucketName,
      filePath,
      contentType,
      contentSizeBytes,
      mediaType: mediaType ?? null,
    });

    const storage = getSupabaseStorageClient();
    const uploadResult = await storage.from(bucketName).upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
      cacheControl: "604800",
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
        mediaType: mediaType ?? null,
        thumbnailUrl: null,
        bucketName,
        storagePath: filePath,
        fetchStatus: response.status,
        contentSizeBytes,
        error: uploadResult.error.message,
      };
    }

    const contentUrl = buildStoragePublicUrl(filePath, bucketName);
    console.info("Stored LINE media content", {
      messageId,
      bucketName,
      filePath,
      contentType,
      contentSizeBytes,
      mediaType: mediaType ?? null,
    });

    return {
      contentUrl,
      contentMimeType: contentType,
      mediaType: mediaType ?? null,
      thumbnailUrl: mediaType === "image" ? contentUrl : null,
      bucketName,
      storagePath: filePath,
      fetchStatus: response.status,
      contentSizeBytes,
      error: null,
    };
  } catch (error) {
    console.error("Failed to upload LINE media content", { messageId, error });
    return {
      contentUrl: null,
      contentMimeType: null,
      mediaType: mediaType ?? null,
      thumbnailUrl: null,
      bucketName,
      storagePath: null,
      fetchStatus: null,
      contentSizeBytes: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatSampleValue(value: number | null, unit: string) {
  return value === null ? "ไม่มีข้อมูล" : `${value} ${unit}`;
}

function formatSampleBloodPressure(sample: TimedVitalsSample) {
  return sample.systolic === null || sample.diastolic === null
    ? "ไม่มีข้อมูล"
    : `${sample.systolic}/${sample.diastolic} mmHg`;
}

function formatStatus(label: string) {
  return label ? `(${label})` : "";
}

function buildTimedVitalsFlexBlocks(samples: TimedVitalsSample[]) {
  const blocks = samples.map((sample) => ({
    type: "box",
    layout: "vertical",
    spacing: "xs",
    margin: "sm",
    paddingAll: "10px",
    cornerRadius: "12px",
    backgroundColor: "#F8FAFC",
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
      const mediaAiAnalysisByMessageId = new Map<string, MediaAiAnalysis>();
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

        if (
          event.message?.id &&
          ["image", "video", "audio", "file"].includes(event.message.type ?? "")
        ) {
          console.info("Received LINE media message", {
            messageId: event.message.id,
            messageType: event.message.type,
            sourceType: event.source?.type ?? null,
            groupId: event.source?.groupId ?? null,
            roomId: event.source?.roomId ?? null,
          });

          const uploadedContent = await uploadLineMediaContent(
            event.message.id,
            event.source?.groupId ?? event.source?.roomId,
            event.message.type,
          );
          uploadedContentByMessageId.set(event.message.id, uploadedContent);

          const mediaAiAnalysis = await analyzeUploadedLineMedia(event, uploadedContent);
          if (mediaAiAnalysis) {
            mediaAiAnalysisByMessageId.set(event.message.id, mediaAiAnalysis);
          }

          if (event.message.type === "image" && uploadedContent.contentUrl) {
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
          const mediaAiAnalysis = event.message?.id
            ? mediaAiAnalysisByMessageId.get(event.message.id)
            : undefined;
          const mediaAiContext = mediaAiAnalysis
            ? getMediaAiSupabaseContext(mediaAiAnalysis.category)
            : null;
          const context = structuredFields?.context ?? mediaAiContext ?? "other";

          return {
            messageId: event.message?.id ?? event.webhookEventId ?? randomUUID(),
            userId: event.source?.userId ?? null,
            groupId: event.source?.groupId ?? event.source?.roomId ?? null,
            displayName: lineIdentity?.displayName ?? null,
            pictureUrl: lineIdentity?.userPictureUrl ?? lineIdentity?.pictureUrl ?? null,
            statusMessage: lineIdentity?.statusMessage ?? null,
            context,
            contexts: structuredFields?.contexts ?? [context],
            parsed: structuredFields?.parsed ?? {},
            flexTemplate:
              structuredFields?.flexTemplate ?? getFlexTemplateForSupabaseContext(context),
            confidence: structuredFields?.confidence ?? mediaAiAnalysis?.confidence ?? 0,
            source: "webhook",
            text:
              event.message?.type === "text"
                ? event.message.text ?? null
                : mediaAiAnalysis
                  ? formatMediaAiSummary(mediaAiAnalysis)
                  : null,
            contentUrl: uploadedContent?.contentUrl ?? null,
            contentMimeType: uploadedContent?.contentMimeType ?? null,
            type: event.message?.type ?? "unknown",
            rawPayload: {
              event,
              lineIdentity: {
                displayName: lineIdentity?.displayName ?? null,
                pictureUrl: lineIdentity?.pictureUrl ?? null,
                userPictureUrl: lineIdentity?.userPictureUrl ?? null,
                memberPictureUrl: lineIdentity?.userPictureUrl ?? null,
                groupPictureUrl: lineIdentity?.groupPictureUrl ?? null,
                statusMessage: lineIdentity?.statusMessage ?? null,
                groupName: lineIdentity?.groupName ?? null,
                error: lineIdentity?.error ?? null,
              },
              mediaUpload:
                uploadedContent
                  ? {
                      bucketName: uploadedContent?.bucketName ?? null,
                      storagePath: uploadedContent?.storagePath ?? null,
                      publicUrl: uploadedContent?.contentUrl ?? null,
                      url: uploadedContent?.contentUrl ?? null,
                      mediaUrl: uploadedContent?.contentUrl ?? null,
                      thumbnailUrl: uploadedContent?.thumbnailUrl ?? null,
                      mediaType: uploadedContent?.mediaType ?? event.message?.type ?? null,
                      contentType: uploadedContent?.contentMimeType ?? null,
                      contentMimeType: uploadedContent?.contentMimeType ?? null,
                      fetchStatus: uploadedContent?.fetchStatus ?? null,
                      contentSizeBytes: uploadedContent?.contentSizeBytes ?? null,
                      error: uploadedContent?.error ?? null,
                    }
                  : null,
              aiAnalysis: mediaAiAnalysis ?? null,
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
