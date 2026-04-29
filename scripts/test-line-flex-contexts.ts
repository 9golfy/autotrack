import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildHealthReport, extractTimedVitalsSamples } from "../lib/health-report.js";
import { buildContextFlexMessage, detectFlexTemplateContext } from "../lib/line/flex/index.js";
import type { LineFlexMessage } from "../lib/line/flex/types.js";
import { prisma } from "../lib/prisma.js";

/**
 * Script สำหรับทดสอบ Push Message แยกตาม Context ต่างๆ
 * วิธีใช้: npx ts-node scripts/test-line-flex-contexts.ts
 */

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^([^#][^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

async function sendPush(flexMessage: LineFlexMessage) {
  const { LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: token, LINE_TARGET_ID: target } = process.env;

  if (!token || !target) {
    console.error("❌ Error: Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_TARGET_ID in .env");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      to: target,
      messages: [flexMessage]
    })
  });

  if (response.ok) {
    console.log(`✅ Sent successfully!`);
  } else {
    console.error(`❌ Failed: ${response.status} ${await response.text()}`);
  }
}

const MOCK_FALLBACKS: Record<string, string> = {
  meal: "อาหารกลางวันวันนี้: ข้าวผัดกุ้งและน้ำส้มค่ะ",
  medication: "ทานยาหลังอาหารเรียบร้อยแล้วค่ะ (มื้อเช้า)",
  bloodPressure: "ความดันปกติค่ะ 120/80 mmHg",
  heartRate: "ชีพจร 72 bpm",
  spo2: "ออกซิเจนในเลือด 98% ค่ะ",
  temperature: "อุณหภูมิร่างกาย 36.5 องศา",
  billing: "แจ้งยอดค่าใช้จ่ายประจำเดือนเมษายน 12,500 บาท",
  healthReport: "รายงานอาการคุณพ่อประจำวัน\n08:00 น. ความดัน 118/78 ชีพจร 68 อุณหภูมิ 36.4 ออกซิเจน 98%\n18:00 น. ความดัน 125/82 ชีพจร 74 อุณหภูมิ 36.7 ออกซิเจน 97%",
  simpleText: "วันนี้คุณพ่ออารมณ์ดี ยิ้มแย้มแจ่มใสครับ"
};

const MOCK_IMAGES: Record<string, string> = {
  meal: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
  medication: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800"
};

async function main() {
  loadEnv();
  console.log("🚀 Starting Context Testing...");
  const targetContext = process.argv[2]; // รับค่าจาก command line เช่น healthReport
  console.log(`📱 Target ID: ${process.env.LINE_TARGET_ID}`);
  if (targetContext) console.log(`🎯 Filtering for context: ${targetContext}`);

  // ปรับให้ดึงข้อมูลจากต้นเดือนปัจจุบันแทนการดึงแค่ 24 ชั่วโมง
  const now = new Date();
  const startOfMonth = BigInt(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
  const allContexts = ["meal", "medication", "bloodPressure", "heartRate", "spo2", "temperature", "billing", "healthReport", "simpleText"];
  
  // เตรียม Map สำหรับเก็บข้อมูลที่จะใช้ทดสอบ
  const testDataMap = new Map<string, any>();

  const realMessages = await prisma.message.findMany({
    where: {
      timestamp: {
        gt: startOfMonth,
      },
      source: "webhook", // กรองเอาเฉพาะข้อมูลที่ส่งมาจาก LINE จริงๆ
      text: { not: null },
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  // 1. ลองจับคู่ข้อมูลจริงเข้ากับ Context
  for (const msg of realMessages) {
    const context = detectFlexTemplateContext({
      text: msg.text ?? "",
      report: {} as any,
      timedSamples: extractTimedVitalsSamples([{ id: msg.messageId, text: msg.text, type: msg.type, timestamp: Number(msg.timestamp) }]),
      reportUrl: "",
    });

    if (!testDataMap.has(context)) {
      testDataMap.set(context, { 
        text: msg.text, 
        imageUrl: msg.contentUrl,
        isReal: true,
        input: { id: msg.messageId, text: msg.text, type: msg.type, timestamp: Number(msg.timestamp), displayName: msg.displayName, pictureUrl: msg.pictureUrl, groupId: msg.groupId, contentUrl: msg.contentUrl }
      });
    }
  }

  // 2. ถ้า Context ไหนไม่มีข้อมูลจริง ให้ใช้ Mock
  for (const ctx of allContexts) {
    if (!testDataMap.has(ctx)) {
      const text = MOCK_FALLBACKS[ctx];
      testDataMap.set(ctx, {
        text,
        imageUrl: MOCK_IMAGES[ctx] || null,
        isReal: false,
        input: { id: `mock-${ctx}`, text, type: "text", timestamp: Date.now(), displayName: "ระบบทดสอบ", groupId: "test-group" }
      });
    }
  }

  console.log(`\n📦 Prepared ${testDataMap.size} test cases. Sending...`);

  for (const [context, data] of testDataMap.entries()) {
    // ถ้ามีการระบุ context ใน CLI ให้ส่งเฉพาะอันนั้น
    if (targetContext && context !== targetContext) {
      continue;
    }

    console.log(`\n📝 Context: [${context}] ${data.isReal ? "(Real Data)" : "(Mock Fallback)"}`);
    console.log(`   Text: "${data.text?.substring(0, 60)}"`);

    const report = buildHealthReport([data.input]);
    const timedSamples = extractTimedVitalsSamples([data.input]);

    const flexMessage = buildContextFlexMessage({
      text: data.text ?? "",
      report,
      timedSamples,
      reportUrl: `https://autotrack-phi.vercel.app/mini-app?groupId=${data.input.groupId ?? process.env.LINE_TARGET_ID}`,
      imageUrl: data.imageUrl,
    });

    await sendPush(flexMessage);
    
    // หน่วงเวลา 1 วินาทีต่อรายการ
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n✨ All tests completed!");
}

main();