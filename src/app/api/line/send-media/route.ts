import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/services/prisma";
import { getSupabaseAdminClient } from "@/services/supabase/admin";

export const runtime = "nodejs";

const MEDIA_BUCKET = "line-media";

async function uploadToStorage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `outbound/${randomUUID()}.${ext}`;
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: NextRequest) {
  const accessToken = (
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
  ).trim();

  if (!accessToken) {
    return NextResponse.json({ error: "Missing LINE access token" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const targetId = (formData.get("targetId") as string | null)?.trim();
    const caption = (formData.get("caption") as string | null)?.trim() ?? "";
    const file = formData.get("file") as File | null;

    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Upload ไป Supabase Storage เพื่อได้ public URL
    const publicUrl = await uploadToStorage(file);

    const isVideo = file.type.startsWith("video/");
    const lineMessages: object[] = [];

    if (isVideo) {
      lineMessages.push({
        type: "video",
        originalContentUrl: publicUrl,
        previewImageUrl: publicUrl,
      });
    } else {
      lineMessages.push({
        type: "image",
        originalContentUrl: publicUrl,
        previewImageUrl: publicUrl,
      });
    }

    // ถ้ามี caption ส่งเป็น text message ต่อท้าย
    if (caption) {
      lineMessages.push({ type: "text", text: caption });
    }

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: targetId, messages: lineMessages }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`LINE push failed ${res.status}: ${detail}`);
    }

    // บันทึกลง DB
    await prisma.message.create({
      data: {
        messageId: `outbound-media-${Date.now()}`,
        userId: targetId,
        groupId: targetId.startsWith("C") ? targetId : null,
        displayName: "AutoHealth Bot",
        source: "web",
        text: caption || null,
        type: "outbound",
        contentUrl: publicUrl,
        contentMimeType: file.type,
        rawPayload: {
          direction: "web-to-line",
          to: targetId,
          mediaUrl: publicUrl,
          caption,
        },
        timestamp: BigInt(Date.now()),
      },
    });

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (error) {
    console.error("send-media error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
