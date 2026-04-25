type HealthMessageInput = {
  id: string;
  text?: string | null;
  contentUrl?: string | null;
  type?: string | null;
  timestamp?: number;
  displayName?: string | null;
  userId?: string | null;
};

type VitalMetric = {
  value: string;
  unit: string;
  tone: "green" | "orange" | "red";
};

type TimelineEntry = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
};

type EvidenceEntry = {
  id: string;
  title: string;
  subtitle: string;
  type: "image" | "medication" | "meal" | "message";
  imageUrl?: string | null;
};

type TimeBucketLabel = "Morning" | "Afternoon" | "Evening" | "Night";

type HealthSeriesPoint = {
  label: TimeBucketLabel;
  heartRate: number;
  systolic: number;
  temperature: number;
};

export type HealthReport = {
  patientName: string;
  dateLabel: string;
  statusLabel: "ปกติ" | "เฝ้าระวัง" | "เสี่ยง";
  statusTone: "green" | "orange" | "red";
  aiSummary: string;
  vitals: {
    bloodPressure: VitalMetric;
    heartRate: VitalMetric;
    temperature: VitalMetric;
  };
  keywordTags: string[];
  messageTypeTags: string[];
  timeline: TimelineEntry[];
  evidence: EvidenceEntry[];
  series: HealthSeriesPoint[];
};

type ParsedVitals = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
};

const DEFAULT_VITALS: ParsedVitals = {
  systolic: 122,
  diastolic: 78,
  heartRate: 74,
  temperature: 36.8,
};

const HEALTH_KEYWORDS = ["ยา", "ความดัน", "ปวด", "ไข้", "หมอ", "นัด", "เวียนหัว", "หัวใจ"];

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function getBucketLabel(hour: number): TimeBucketLabel {
  if (hour < 11) {
    return "Morning";
  }

  if (hour < 16) {
    return "Afternoon";
  }

  if (hour < 20) {
    return "Evening";
  }

  return "Night";
}

function getStatusFromVitals(vitals: ParsedVitals): HealthReport["statusLabel"] {
  if (
    vitals.systolic >= 140 ||
    vitals.diastolic >= 90 ||
    vitals.heartRate > 110 ||
    vitals.heartRate < 50 ||
    vitals.temperature >= 38
  ) {
    return "เสี่ยง";
  }

  if (
    vitals.systolic >= 130 ||
    vitals.diastolic >= 85 ||
    vitals.heartRate > 100 ||
    vitals.temperature >= 37.5
  ) {
    return "เฝ้าระวัง";
  }

  return "ปกติ";
}

function getStatusTone(status: HealthReport["statusLabel"]): HealthReport["statusTone"] {
  if (status === "เสี่ยง") {
    return "red";
  }

  if (status === "เฝ้าระวัง") {
    return "orange";
  }

  return "green";
}

function getMetricTone(
  value: number,
  type: "pressure" | "heartRate" | "temperature",
): VitalMetric["tone"] {
  if (type === "pressure") {
    if (value >= 140) {
      return "red";
    }
    if (value >= 130) {
      return "orange";
    }
    return "green";
  }

  if (type === "heartRate") {
    if (value > 110 || value < 50) {
      return "red";
    }
    if (value > 100 || value < 60) {
      return "orange";
    }
    return "green";
  }

  if (value >= 38) {
    return "red";
  }
  if (value >= 37.5) {
    return "orange";
  }
  return "green";
}

function parseHealthVitals(text: string | null | undefined): Partial<ParsedVitals> {
  if (!text) {
    return {};
  }

  const pressureMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  const heartRateMatch =
    text.match(/(?:hr|heart rate|pulse|ชีพจร|หัวใจ)[^\d]{0,8}(\d{2,3})/i) ??
    text.match(/(\d{2,3})\s*(?:bpm)/i);
  const temperatureMatch =
    text.match(/(?:temp|temperature|อุณหภูมิ|ไข้)[^\d]{0,8}(\d{2}(?:\.\d)?)/i) ??
    text.match(/(\d{2}(?:\.\d)?)\s*(?:c|°c)/i);

  return {
    systolic: pressureMatch ? Number(pressureMatch[1]) : undefined,
    diastolic: pressureMatch ? Number(pressureMatch[2]) : undefined,
    heartRate: heartRateMatch ? Number(heartRateMatch[1]) : undefined,
    temperature: temperatureMatch ? Number(temperatureMatch[1]) : undefined,
  };
}

function mergeVitals(
  baseVitals: ParsedVitals,
  nextVitals: Partial<ParsedVitals>,
): ParsedVitals {
  return {
    systolic: nextVitals.systolic ?? baseVitals.systolic,
    diastolic: nextVitals.diastolic ?? baseVitals.diastolic,
    heartRate: nextVitals.heartRate ?? baseVitals.heartRate,
    temperature: nextVitals.temperature ?? baseVitals.temperature,
  };
}

function createAiSummary(status: HealthReport["statusLabel"], vitals: ParsedVitals) {
  if (status === "เสี่ยง") {
    return `AI พบค่าสุขภาพที่ควรติดตามทันที โดยเฉพาะความดัน ${vitals.systolic}/${vitals.diastolic} และอุณหภูมิ ${vitals.temperature.toFixed(1)}°C`;
  }

  if (status === "เฝ้าระวัง") {
    return `AI แนะนำให้ติดตามต่อเนื่อง ค่าโดยรวมเริ่มสูงกว่าช่วงปกติเล็กน้อย แต่ยังสามารถประเมินซ้ำได้ในวันนี้`;
  }

  return "AI ประเมินว่าค่าสุขภาพโดยรวมอยู่ในเกณฑ์ปกติ สามารถบันทึกต่อเนื่องเพื่อดูแนวโน้มรายวันได้";
}

export function buildHealthReport(messages: HealthMessageInput[]): HealthReport {
  const sortedMessages = [...messages].sort(
    (left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0),
  );
  const latestMessage = sortedMessages[0];

  let latestVitals = DEFAULT_VITALS;

  for (const message of sortedMessages) {
    const parsed = parseHealthVitals(message.text);
    if (
      parsed.systolic ||
      parsed.diastolic ||
      parsed.heartRate ||
      parsed.temperature
    ) {
      latestVitals = mergeVitals(latestVitals, parsed);
      break;
    }
  }

  const statusLabel = getStatusFromVitals(latestVitals);
  const statusTone = getStatusTone(statusLabel);

  const keywordTags = HEALTH_KEYWORDS.filter((keyword) =>
    sortedMessages.some((message) => (message.text ?? "").includes(keyword)),
  ).slice(0, 6);

  const typeSet = new Set<string>();
  for (const message of sortedMessages) {
    if (message.contentUrl && message.type === "image") {
      typeSet.add("image");
    } else if ((message.text ?? "").includes("http://") || (message.text ?? "").includes("https://")) {
      typeSet.add("link");
    } else {
      typeSet.add(message.type === "outbound" ? "text" : message.type ?? "text");
    }
  }

  const bucketMap = new Map<TimeBucketLabel, ParsedVitals>();
  const initialSeriesOrder: TimeBucketLabel[] = ["Morning", "Afternoon", "Evening", "Night"];

  initialSeriesOrder.forEach((bucket) => bucketMap.set(bucket, latestVitals));

  for (const message of [...sortedMessages].reverse()) {
    const messageTime = message.timestamp ?? Date.now();
    const hour = new Date(messageTime).getHours();
    const bucket = getBucketLabel(hour);
    const parsed = parseHealthVitals(message.text);
    bucketMap.set(bucket, mergeVitals(bucketMap.get(bucket) ?? latestVitals, parsed));
  }

  const series = initialSeriesOrder.map((label) => {
    const bucketVitals = bucketMap.get(label) ?? latestVitals;

    return {
      label,
      heartRate: bucketVitals.heartRate,
      systolic: bucketVitals.systolic,
      temperature: bucketVitals.temperature,
    };
  });

  const timeline = sortedMessages.slice(0, 5).map((message) => ({
    id: message.id,
    title: message.contentUrl
      ? "แนบหลักฐานสุขภาพ"
      : message.type === "outbound"
        ? "ระบบตอบกลับอัตโนมัติ"
        : "บันทึกข้อมูลจาก LINE",
    detail: message.text ?? (message.contentUrl ? "แนบรูปภาพประกอบการประเมิน" : "อัปเดตข้อมูลสุขภาพ"),
    timeLabel: formatClock(message.timestamp ?? Date.now()),
  }));

  const evidence: EvidenceEntry[] = sortedMessages
    .filter((message) => message.contentUrl || message.text)
    .slice(0, 6)
    .map((message) => {
      const text = message.text ?? "";

      if (message.contentUrl) {
        return {
          id: message.id,
          title: "ภาพประกอบสุขภาพ",
          subtitle: "ภาพจาก LINE chat",
          type: "image",
          imageUrl: message.contentUrl,
        };
      }

      if (text.includes("ยา")) {
        return {
          id: message.id,
          title: "Medication",
          subtitle: text,
          type: "medication",
        };
      }

      if (text.includes("ข้าว") || text.includes("อาหาร") || text.includes("กิน")) {
        return {
          id: message.id,
          title: "Meals",
          subtitle: text,
          type: "meal",
        };
      }

      return {
        id: message.id,
        title: "Message note",
        subtitle: text || "บันทึกข้อความจากครอบครัว",
        type: "message",
      };
    });

  return {
    patientName: latestMessage?.displayName ?? "Patient",
    dateLabel: formatDate(latestMessage?.timestamp ?? Date.now()),
    statusLabel,
    statusTone,
    aiSummary: createAiSummary(statusLabel, latestVitals),
    vitals: {
      bloodPressure: {
        value: `${latestVitals.systolic}/${latestVitals.diastolic}`,
        unit: "mmHg",
        tone: getMetricTone(latestVitals.systolic, "pressure"),
      },
      heartRate: {
        value: `${latestVitals.heartRate}`,
        unit: "bpm",
        tone: getMetricTone(latestVitals.heartRate, "heartRate"),
      },
      temperature: {
        value: `${latestVitals.temperature.toFixed(1)}`,
        unit: "°C",
        tone: getMetricTone(latestVitals.temperature, "temperature"),
      },
    },
    keywordTags,
    messageTypeTags: Array.from(typeSet).slice(0, 6),
    timeline,
    evidence,
    series,
  };
}

