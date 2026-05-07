import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/services/prisma";
import {
  bustGroupCache,
  getCachedMembers,
  setCachedMembers,
  updateMemberRoleInCache,
  type CachedMember,
} from "@/services/group-members-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_CACHE = "private, max-age=600, stale-while-revalidate=60";

function getLineAccessToken() {
  return (process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "").trim();
}

/** ดึง members จาก LINE API โดยตรง — ได้ทุกคนในกลุ่มแม้ยังไม่เคยส่งข้อความ */
async function fetchMembersFromLineApi(groupId: string): Promise<{ userId: string; displayName: string; pictureUrl: string | null }[]> {
  const accessToken = getLineAccessToken();
  if (!accessToken) return [];

  const members: { userId: string; displayName: string; pictureUrl: string | null }[] = [];
  let start: string | undefined;

  // LINE API ส่งมาทีละ 100 คน ต้อง paginate
  for (let page = 0; page < 20; page++) {
    const url = new URL(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/members/list`);
    if (start) url.searchParams.set("start", start);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) break;

    const data = (await res.json()) as {
      members?: { type: string; userId: string; displayName: string; pictureUrl?: string }[];
      next?: string;
    };

    for (const m of data.members ?? []) {
      members.push({
        userId: m.userId,
        displayName: m.displayName,
        pictureUrl: m.pictureUrl ?? null,
      });
    }

    if (!data.next) break;
    start = data.next;
  }

  return members;
}

async function loadMembersFromDb(groupId: string): Promise<CachedMember[]> {
  const [rows, roles] = await Promise.all([
    prisma.message.findMany({
      where: {
        groupId,
        userId: { not: null },
        displayName: { not: null },
        // รวม join events ด้วย เพื่อให้เห็น member ที่เพิ่งแอดเข้ากลุ่ม
        NOT: { type: "outbound" },
      },
      select: { userId: true, displayName: true, pictureUrl: true },
      distinct: ["userId"],
      orderBy: { timestamp: "desc" },
    }),
    prisma.groupMemberRole.findMany({
      where: { groupId },
      select: { userId: true, role: true },
    }),
  ]);

  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  return rows.map((row) => ({
    userId: row.userId as string,
    displayName: row.displayName as string,
    pictureUrl: row.pictureUrl ?? null,
    role: roleMap.get(row.userId as string) ?? null,
  }));
}

/** Merge LINE API members กับ DB members — LINE API เป็น source of truth สำหรับรายชื่อ */
async function loadMembersWithLineApi(groupId: string): Promise<CachedMember[]> {
  const [lineMembers, roles] = await Promise.all([
    fetchMembersFromLineApi(groupId),
    prisma.groupMemberRole.findMany({
      where: { groupId },
      select: { userId: true, role: true },
    }),
  ]);

  // ถ้า LINE API ไม่ได้ข้อมูล fallback ไป DB
  if (lineMembers.length === 0) {
    return loadMembersFromDb(groupId);
  }

  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  return lineMembers.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    pictureUrl: m.pictureUrl,
    role: roleMap.get(m.userId) ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
  const bust = request.nextUrl.searchParams.get("bust") === "1";

  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  if (bust) bustGroupCache(groupId);

  const cached = getCachedMembers(groupId);
  if (cached) {
    return NextResponse.json(
      { members: cached, fromCache: true },
      { headers: { "Cache-Control": HTTP_CACHE } },
    );
  }

  // bust → ดึงจาก LINE API (ได้ทุกคนในกลุ่ม)
  // ปกติ → ดึงจาก DB (เฉพาะคนที่เคยส่งข้อความ)
  const members = bust
    ? await loadMembersWithLineApi(groupId)
    : await loadMembersFromDb(groupId);

  setCachedMembers(groupId, members);

  return NextResponse.json(
    { members, fromCache: false },
    { headers: { "Cache-Control": bust ? "no-store" : HTTP_CACHE } },
  );
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    groupId?: string;
    userId?: string;
    role?: string;
  };

  const groupId = body.groupId?.trim();
  const userId = body.userId?.trim();
  const role = body.role?.trim();

  if (!groupId || !userId || !role) {
    return NextResponse.json({ error: "Missing groupId, userId or role" }, { status: 400 });
  }

  await prisma.groupMemberRole.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId, role },
    update: { role },
  });

  updateMemberRoleInCache(groupId, userId, role);

  return NextResponse.json({ ok: true });
}
