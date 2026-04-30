import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildHealthReport } from "@/lib/health-report";

const PRIVATE_REPORT_CACHE = "private, max-age=30, stale-while-revalidate=120";

/**
 * API Route สำหรับดึงข้อมูลรายงานสุขภาพสำหรับ Mini App
 * รองรับ Query Parameters:
 * - groupId: (จำเป็น) ID ของกลุ่ม LINE
 * - date: (ไม่บังคับ) วันที่ที่ต้องการดูในรูปแบบ DD/MM เช่น 27/04
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const dateParam = searchParams.get("date");

  if (!groupId) {
    return NextResponse.json(
      { error: "Missing groupId" },
      { status: 400, headers: { "Cache-Control": PRIVATE_REPORT_CACHE } },
    );
  }

  try {
    // กำหนดขอบเขตข้อมูล: ดึงข้อมูลทั้งหมดของเดือนปัจจุบันเพื่อหาแนวโน้ม
    const now = new Date();
    const startOfMonth = BigInt(new Date(now.getFullYear(), now.getMonth(), 1).getTime());

    const messages = await prisma.message.findMany({
      where: {
        groupId: groupId,
        timestamp: {
          gt: startOfMonth,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // แปลงข้อมูลจาก Database ให้ตรงกับ Input Type ของ buildHealthReport
    const mappedMessages = messages.map((m) => ({
      id: m.id,
      text: m.text,
      contentUrl: m.contentUrl,
      type: m.type,
      timestamp: Number(m.timestamp),
      displayName: m.displayName,
      userId: m.userId,
      groupId: m.groupId,
    }));

    let filteredMessages = mappedMessages;

    // หากมีการระบุวันที่ (เช่น 27/04) ให้กรองข้อมูลเฉพาะวันนั้น
    if (dateParam) {
      filteredMessages = mappedMessages.filter((m) => {
        const d = new Date(m.timestamp);
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        return label === dateParam;
      });
    }

    // คำนวณรายงาน (ถ้าข้อมูลเหลือวันเดียว กราฟจะแสดงเป็นช่วงเวลา Morning/Afternoon ทันที)
    const report = buildHealthReport(filteredMessages);

    return NextResponse.json(report, {
      headers: { "Cache-Control": PRIVATE_REPORT_CACHE },
    });
  } catch (error) {
    console.error("[MINI_APP_REPORT_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Cache-Control": PRIVATE_REPORT_CACHE } },
    );
  }
}
