import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { message } = (await request.json().catch(() => ({ message: "" }))) as {
    message?: string;
  };

  const trimmedMessage = message?.trim();

  if (!trimmedMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const accessToken =
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_ID;

  if (!accessToken || !targetId) {
    return NextResponse.json(
      {
        error:
          "Missing LINE_MESSAGING_CHANNEL_ACCESS_TOKEN (or LINE_CHANNEL_ACCESS_TOKEN) or LINE_TARGET_ID",
      },
      { status: 500 },
    );
  }

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: targetId,
        messages: [
          {
            type: "text",
            text: trimmedMessage,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    await prisma.message.create({
      data: {
        messageId: `outbound-${Date.now()}`,
        userId: targetId,
        displayName: "LINE Target",
        source: "web",
        text: trimmedMessage,
        type: "outbound",
        rawPayload: {
          direction: "web-to-line",
          to: targetId,
          text: trimmedMessage,
        },
        timestamp: BigInt(Date.now()),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const lineError = error.response?.data;
      console.error("LINE push API failed", lineError ?? error.message);

      return NextResponse.json(
        {
          error: "Failed to send message to LINE",
          details: lineError ?? error.message,
        },
        { status: error.response?.status ?? 500 },
      );
    }

    console.error("Unexpected send API error", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
