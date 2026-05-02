import { NextRequest, NextResponse } from "next/server";

import { analyzeCareImage, type CareImageAnalysis } from "@/lib/analyze-care-image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ImageMessageRow = {
  messageId: string;
  timestamp: bigint | number | string;
};

type MealSlot = "breakfast" | "lunch" | "dinner" | "unknown";
type MedicationSlot = "morning" | "midday" | "afternoon" | "evening" | "night" | "unknown";

function getStoragePathFromPublicUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const marker = "/storage/v1/object/public/line-media/";
    const markerIndex = parsed.pathname.indexOf(marker);

    return markerIndex >= 0 ? decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length)) : null;
  } catch {
    return null;
  }
}

async function findImageMessage(imageUrl: string) {
  const storagePath = getStoragePathFromPublicUrl(imageUrl);
  const rows = await prisma.$queryRaw<ImageMessageRow[]>`
    SELECT "messageId", "timestamp"
    FROM "Message"
    WHERE "contentUrl" = ${imageUrl}
       OR "rawPayload"->'mediaUpload'->>'mediaUrl' = ${imageUrl}
       OR "rawPayload"->'mediaUpload'->>'publicUrl' = ${imageUrl}
       OR (${storagePath}::text IS NOT NULL AND "rawPayload"->'mediaUpload'->>'storagePath' = ${storagePath})
    ORDER BY "timestamp" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function getBangkokParts(timestamp: bigint | number | string) {
  const date = new Date(Number(timestamp));
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
    iso: date.toISOString(),
    localDate: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    localTime: `${getPart("hour")}:${getPart("minute")}:${getPart("second")}`,
    hour: Number(getPart("hour")),
  };
}

function inferMealSlot(hour: number): MealSlot {
  if (hour < 10) {
    return "breakfast";
  }

  if (hour >= 10 && hour <= 13) {
    return "lunch";
  }

  if (hour >= 15) {
    return "dinner";
  }

  return "unknown";
}

function inferMedicationSlot(hour: number): MedicationSlot {
  if (hour < 10) {
    return "morning";
  }

  if (hour >= 10 && hour <= 13) {
    return "midday";
  }

  if (hour >= 20) {
    return "night";
  }

  if (hour >= 15) {
    return "evening";
  }

  return "afternoon";
}

function enrichCareImageAnalysis(analysis: CareImageAnalysis, message: ImageMessageRow | null) {
  if (!message) {
    return {
      ...analysis,
      context: {
        receivedAt: null,
        localDate: null,
        localTime: null,
        mealSlot: null,
        medicationSlot: null,
        countsAsMealReceived: false,
      },
    };
  }

  const receivedAt = getBangkokParts(message.timestamp);
  const mealSlot = analysis.category === "meal" ? inferMealSlot(receivedAt.hour) : null;
  const medicationSlot = analysis.category === "medication" ? inferMedicationSlot(receivedAt.hour) : null;

  return {
    ...analysis,
    context: {
      messageId: message.messageId,
      receivedAt: receivedAt.iso,
      localDate: receivedAt.localDate,
      localTime: receivedAt.localTime,
      mealSlot,
      medicationSlot,
      countsAsMealReceived: Boolean(mealSlot && mealSlot !== "unknown"),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      imageUrl?: unknown;
    };
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const [analysis, message] = await Promise.all([
      analyzeCareImage(imageUrl),
      findImageMessage(imageUrl),
    ]);
    const result = enrichCareImageAnalysis(analysis, message);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Analyze image error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to analyze image" },
      { status: 500 },
    );
  }
}
