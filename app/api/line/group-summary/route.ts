import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getLineMessagingAccessToken() {
  return (process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "").trim();
}

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
  const accessToken = getLineMessagingAccessToken();

  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Missing LINE messaging access token" }, { status: 500 });
  }

  const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json({ error: `LINE API failed: ${response.status}`, detail: errorBody }, { status: response.status });
  }

  const data = (await response.json()) as { groupName?: string; pictureUrl?: string };

  return NextResponse.json({
    groupId,
    groupName: data.groupName ?? null,
    pictureUrl: data.pictureUrl ?? null,
  });
}
