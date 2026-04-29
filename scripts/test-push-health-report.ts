import "dotenv/config";
import { buildHealthReport, extractTimedVitalsSamples } from "../lib/health-report";
import { buildContextFlexMessage } from "../lib/line/flex/index";
import type { LineFlexMessage } from "../lib/line/flex/types";
import { prisma } from "../lib/prisma";

/**
 * ฟังก์ชันดึงชื่อกลุ่มจาก LINE API
 * (ถูกคอมเมนต์ออกเนื่องจาก groupName ถูก Hardcode สำหรับการทดสอบ)
 */
// async function fetchGroupName(groupId: string, accessToken: string): Promise<string | null> {
//   try {
//     const response = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });
//     if (!response.ok) return null;
//     const data = (await response.json()) as { groupName: string };
//     return data.groupName;
//   } catch (error) {
//     console.error("❌ Error fetching group name:", error);
//     return null;
//   }
// }

/**
 * สคริปต์สำหรับทดสอบยิง Push Message Health Report เข้า LINE Group หรือ User
 * วิธีรัน: npx tsx scripts/test-push-health-report.ts
 */
async function testPushHealthReport() {
  const { 
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: accessToken,
    LINE_TARGET_ID: envTargetId 
  } = process.env;

  const targetId = envTargetId || "Udcfa6d2df22e88ab744a94132e0bb08b";
  const dbRecordId = "cmogh0akm0000l504r4ctp7iq";

  if (!accessToken) {
    console.error("❌ ไม่พบ API Token ใน .env");
    return;
  }

  // 1. ดึงข้อมูลจริงจาก Supabase
  console.log(`📡 กำลังดึงข้อมูลจาก Database ID: ${dbRecordId}...`);
  const dbMessage = await prisma.message.findUnique({
    where: { id: dbRecordId }
  });

  if (!dbMessage || !dbMessage.text) {
    console.error("❌ ไม่พบข้อความใน Database หรือ field text ว่าง");
    return;
  }

  const inputData = {
    id: dbMessage.id,
    messageId: dbMessage.messageId,
    text: dbMessage.text,
    type: dbMessage.type,
    timestamp: Number(dbMessage.timestamp),
    displayName: dbMessage.displayName || "เจ้าหน้าที่ดูแล",
    userId: dbMessage.userId,
    groupId: dbMessage.groupId || targetId,
    groupName: "ศูนย์ดูแลบ้านแสนสุข (ชื่อกลุ่มทดสอบ)", 
  };

  const report = buildHealthReport([inputData]);
  const timedSamples = extractTimedVitalsSamples([inputData]);

  const flexMessage = buildContextFlexMessage({
    text: dbMessage.text,
    report,
    timedSamples,
    reportUrl: `https://autotrack-phi.vercel.app/mini-app?groupId=${targetId}`, 
    groupName: inputData.groupName,
  });

  console.log(`🚀 Sending Push to: ${targetId}`);

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: targetId,
      messages: [flexMessage],
    }),
  });

  const result = await response.json();
  console.log(response.ok ? "✅ ส่งสำเร็จ!" : "❌ ส่งไม่สำเร็จ:", JSON.stringify(result, null, 2));
}

testPushHealthReport();