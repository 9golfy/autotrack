import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { buildHealthReport } from "@/services/health-report";

const PRIVATE_REPORT_CACHE = "private, max-age=30, stale-while-revalidate=120";

/**
 * API Route เธชเธณเธซเธฃเธฑเธเธ”เธถเธเธเนเธญเธกเธนเธฅเธฃเธฒเธขเธเธฒเธเธชเธธเธเธ เธฒเธเธชเธณเธซเธฃเธฑเธ Mini App
 * เธฃเธญเธเธฃเธฑเธ Query Parameters:
 * - groupId: (เธเธณเน€เธเนเธ) ID เธเธญเธเธเธฅเธธเนเธก LINE
 * - date: (เนเธกเนเธเธฑเธเธเธฑเธ) เธงเธฑเธเธ—เธตเนเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเธ”เธนเนเธเธฃเธนเธเนเธเธ DD/MM เน€เธเนเธ 27/04
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
    // เธเธณเธซเธเธ”เธเธญเธเน€เธเธ•เธเนเธญเธกเธนเธฅ: เธ”เธถเธเธเนเธญเธกเธนเธฅเธ—เธฑเนเธเธซเธกเธ”เธเธญเธเน€เธ”เธทเธญเธเธเธฑเธเธเธธเธเธฑเธเน€เธเธทเนเธญเธซเธฒเนเธเธงเนเธเนเธก
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

    // เนเธเธฅเธเธเนเธญเธกเธนเธฅเธเธฒเธ Database เนเธซเนเธ•เธฃเธเธเธฑเธ Input Type เธเธญเธ buildHealthReport
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

    // เธซเธฒเธเธกเธตเธเธฒเธฃเธฃเธฐเธเธธเธงเธฑเธเธ—เธตเน (เน€เธเนเธ 27/04) เนเธซเนเธเธฃเธญเธเธเนเธญเธกเธนเธฅเน€เธเธเธฒเธฐเธงเธฑเธเธเธฑเนเธ
    if (dateParam) {
      filteredMessages = mappedMessages.filter((m) => {
        const d = new Date(m.timestamp);
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        return label === dateParam;
      });
    }

    // เธเธณเธเธงเธ“เธฃเธฒเธขเธเธฒเธ (เธ–เนเธฒเธเนเธญเธกเธนเธฅเน€เธซเธฅเธทเธญเธงเธฑเธเน€เธ”เธตเธขเธง เธเธฃเธฒเธเธเธฐเนเธชเธ”เธเน€เธเนเธเธเนเธงเธเน€เธงเธฅเธฒ Morning/Afternoon เธ—เธฑเธเธ—เธต)
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
