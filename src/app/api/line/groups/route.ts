import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/services/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_CACHE = "private, max-age=600, stale-while-revalidate=60";

// ── Server-side in-memory cache ──────────────────────────────────────────────
type GroupSummary = { groupId: string; groupName: string | null; pictureUrl: string | null };

let cachedGroups: GroupSummary[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 นาที

function getLineAccessToken() {
  return (process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "").trim();
}

async function fetchGroupSummary(groupId: string, accessToken: string): Promise<GroupSummary> {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) return { groupId, groupName: null, pictureUrl: null };

    const data = (await response.json()) as { groupName?: string; pictureUrl?: string };
    return {
      groupId,
      groupName: data.groupName ?? null,
      pictureUrl: data.pictureUrl ?? null,
    };
  } catch {
    return { groupId, groupName: null, pictureUrl: null };
  }
}

async function loadGroupsFromDb(): Promise<GroupSummary[]> {
  // ดึง distinct groupId พร้อม groupName จาก rawPayload ที่เก็บไว้ใน DB
  const rows = await prisma.message.findMany({
    where: { groupId: { not: null } },
    select: {
      groupId: true,
      rawPayload: true,
    },
    distinct: ["groupId"],
    orderBy: { timestamp: "desc" },
  });

  const groupIds = rows.map((row) => row.groupId as string);
  if (groupIds.length === 0) return [];

  // สร้าง map ของ groupName และ pictureUrl จาก DB (fallback)
  const dbGroupInfo = new Map<string, { groupName: string | null; pictureUrl: string | null }>();
  for (const row of rows) {
    const rp = row.rawPayload as Record<string, unknown> | null;
    const lineIdentity = rp?.lineIdentity as Record<string, unknown> | null;
    dbGroupInfo.set(row.groupId as string, {
      groupName: (lineIdentity?.groupName as string | null) ?? null,
      pictureUrl: (lineIdentity?.groupPictureUrl as string | null) ?? null,
    });
  }

  const accessToken = getLineAccessToken();

  return Promise.all(
    groupIds.map(async (id) => {
      if (!accessToken) {
        const db = dbGroupInfo.get(id);
        return { groupId: id, groupName: db?.groupName ?? null, pictureUrl: db?.pictureUrl ?? null };
      }

      const lineResult = await fetchGroupSummary(id, accessToken);

      // ถ้า LINE API ไม่ได้ชื่อ → fallback ไปใช้ชื่อจาก DB
      const db = dbGroupInfo.get(id);
      return {
        groupId: id,
        groupName: lineResult.groupName ?? db?.groupName ?? null,
        pictureUrl: lineResult.pictureUrl ?? db?.pictureUrl ?? null,
      };
    }),
  );
}

export async function GET(request: NextRequest) {
  const bust = request.nextUrl.searchParams.get("bust") === "1";

  // bust cache หรือ cache หมดอายุ → ดึงจาก DB + LINE API ใหม่
  if (bust || !cachedGroups || Date.now() > cacheExpiresAt) {
    cachedGroups = await loadGroupsFromDb();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  }

  return NextResponse.json(
    { groups: cachedGroups, cachedAt: new Date(cacheExpiresAt - CACHE_TTL_MS).toISOString() },
    { headers: { "Cache-Control": bust ? "no-store" : HTTP_CACHE } },
  );
}
