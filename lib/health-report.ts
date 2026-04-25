type HealthMessageInput = {
  id: string;
  text?: string | null;
  contentUrl?: string | null;
  type?: string | null;
  timestamp?: number;
  displayName?: string | null;
  userId?: string | null;
  pictureUrl?: string | null;
  groupId?: string | null;
  groupName?: string | null;
};

type Severity = "normal" | "watch" | "critical";

type VitalMetric = {
  value: string;
  unit: string;
  tone: "green" | "orange" | "red";
  statusLabel: "ปกติ" | "เฝ้าระวัง" | "เสี่ยง";
  explanation: string;
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

type CriteriaReference = {
  label: string;
  detail: string;
};

type TimeBucketLabel = "Morning" | "Afternoon" | "Evening" | "Night";

type HealthSeriesPoint = {
  label: TimeBucketLabel;
  heartRate: number;
  systolic: number;
  temperature: number;
};

type ParsedVitals = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  spo2: number;
};

export type TimedVitalsSample = {
  id: string;
  sourceMessageId: string;
  sourceTimestamp: number;
  hour: number;
  minute: number;
  label: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  spo2: number | null;
};

export type HealthReport = {
  patientName: string;
  reporterName: string;
  reporterAvatarUrl: string | null;
  reporterTimeLabel: string;
  groupName: string;
  dateLabel: string;
  ageLabel: string;
  statusLabel: "ปกติ" | "เฝ้าระวัง" | "เสี่ยง";
  statusTone: "green" | "orange" | "red";
  aiSummary: string;
  vitals: {
    bloodPressure: VitalMetric;
    heartRate: VitalMetric;
    temperature: VitalMetric;
    spo2: VitalMetric;
  };
  keywordTags: string[];
  messageTypeTags: string[];
  timeline: TimelineEntry[];
  evidence: EvidenceEntry[];
  criteriaReference: CriteriaReference[];
  series: HealthSeriesPoint[];
};

const DEFAULT_VITALS: ParsedVitals = {
  systolic: 122,
  diastolic: 78,
  heartRate: 74,
  temperature: 36.8,
  spo2: 98,
};

const HEALTH_KEYWORDS = ["ยา", "ความดัน", "ปวด", "ไข้", "หมอ", "นัด", "เวียนหัว", "หัวใจ"];
const ELDERLY_AGE = 72;

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

function severityToStatusLabel(severity: Severity): "ปกติ" | "เฝ้าระวัง" | "เสี่ยง" {
  if (severity === "critical") {
    return "เสี่ยง";
  }

  if (severity === "watch") {
    return "เฝ้าระวัง";
  }

  return "ปกติ";
}

function severityToTone(severity: Severity): "green" | "orange" | "red" {
  if (severity === "critical") {
    return "red";
  }

  if (severity === "watch") {
    return "orange";
  }

  return "green";
}

function getBloodPressureInterpretation(vitals: ParsedVitals): VitalMetric {
  const isCritical = vitals.systolic > 160 || vitals.diastolic > 95;
  const severity: Severity = isCritical ? "critical" : "normal";

  return {
    value: `${vitals.systolic}/${vitals.diastolic}`,
    unit: "mmHg",
    tone: severityToTone(severity),
    statusLabel: severityToStatusLabel(severity),
    explanation: isCritical
      ? "ค่าความดันสูงกว่ามาตรฐานของผู้สูงอายุ"
      : "อยู่ในเกณฑ์ปกติสำหรับผู้สูงอายุ (70+)",
  };
}

function getHeartRateInterpretation(vitals: ParsedVitals): VitalMetric {
  let severity: Severity = "normal";

  if (vitals.heartRate < 50 || vitals.heartRate > 110) {
    severity = "critical";
  } else if (vitals.heartRate < 60 || vitals.heartRate > 100) {
    severity = "watch";
  }

  return {
    value: `${vitals.heartRate}`,
    unit: "bpm",
    tone: severityToTone(severity),
    statusLabel: severityToStatusLabel(severity),
    explanation:
      severity === "critical"
        ? "ชีพจรอยู่นอกช่วงที่ควรติดตามในผู้สูงอายุ"
        : severity === "watch"
          ? "ชีพจรเริ่มเบี่ยงจากช่วงปกติ ควรวัดซ้ำ"
          : "ชีพจรอยู่ในช่วงที่เหมาะสมสำหรับผู้สูงอายุ",
  };
}

function getTemperatureInterpretation(vitals: ParsedVitals): VitalMetric {
  let severity: Severity = "normal";

  if (vitals.temperature >= 38) {
    severity = "critical";
  } else if (vitals.temperature >= 37.5) {
    severity = "watch";
  }

  return {
    value: `${vitals.temperature.toFixed(1)}`,
    unit: "°C",
    tone: severityToTone(severity),
    statusLabel: severityToStatusLabel(severity),
    explanation:
      severity === "critical"
        ? "อุณหภูมิสูงเกินเกณฑ์และอาจมีไข้"
        : severity === "watch"
          ? "อุณหภูมิสูงกว่าปกติเล็กน้อย ควรสังเกตอาการ"
          : "อุณหภูมิอยู่ในช่วงปกติ",
  };
}

function getSpO2Interpretation(vitals: ParsedVitals): VitalMetric {
  let severity: Severity = "normal";

  if (vitals.spo2 < 92) {
    severity = "critical";
  } else if (vitals.spo2 < 95) {
    severity = "watch";
  }

  return {
    value: `${vitals.spo2}`,
    unit: "%",
    tone: severityToTone(severity),
    statusLabel: severityToStatusLabel(severity),
    explanation:
      severity === "critical"
        ? "ค่าออกซิเจนต่ำกว่าระดับที่ปลอดภัย"
        : severity === "watch"
          ? "ค่าออกซิเจนเริ่มต่ำ ควรติดตามซ้ำ"
          : "ค่าออกซิเจนอยู่ในช่วงที่ปลอดภัย",
  };
}

function getOverallSeverity(metrics: VitalMetric[]): Severity {
  if (metrics.some((metric) => metric.statusLabel === "เสี่ยง")) {
    return "critical";
  }

  if (metrics.some((metric) => metric.statusLabel === "เฝ้าระวัง")) {
    return "watch";
  }

  return "normal";
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
  const spo2Match =
    text.match(/(?:spo2|spo₂|o2|oxygen|ออกซิเจน)[^\d]{0,8}(\d{2,3})/i) ??
    text.match(/(\d{2,3})\s*%/i);

  return {
    systolic: pressureMatch ? Number(pressureMatch[1]) : undefined,
    diastolic: pressureMatch ? Number(pressureMatch[2]) : undefined,
    heartRate: heartRateMatch ? Number(heartRateMatch[1]) : undefined,
    temperature: temperatureMatch ? Number(temperatureMatch[1]) : undefined,
    spo2: spo2Match ? Number(spo2Match[1]) : undefined,
  };
}

function parseVitalsNullable(text: string | null | undefined) {
  const parsed = parseHealthVitals(text);

  return {
    systolic: parsed.systolic ?? null,
    diastolic: parsed.diastolic ?? null,
    heartRate: parsed.heartRate ?? null,
    temperature: parsed.temperature ?? null,
    spo2: parsed.spo2 ?? null,
  };
}

function extractPatientName(text: string | null | undefined) {
  if (!text) {
    return null;
  }

  const primaryMatch = text.match(/อาการคุณ(?:พ่อ|แม่)([^\nค่ะ]+)/);

  if (primaryMatch?.[1]) {
    return primaryMatch[1].trim();
  }

  const fallbackMatch = text.match(/คุณ(?:พ่อ|แม่)([^\s\n]+)/);

  return fallbackMatch?.[1]?.trim() ?? null;
}

function extractReporterName(text: string | null | undefined) {
  if (!text) {
    return null;
  }

  const reporterMatch = text.match(/ผู้ดูแล\s+([^\nค่ะ]+)/);

  return reporterMatch?.[1]?.trim() ?? null;
}

function splitTimeBlocks(text: string) {
  const matches = Array.from(text.matchAll(/(\d{1,2}):(\d{2})/g));

  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index < matches.length - 1 ? matches[index + 1]?.index ?? text.length : text.length;

    return {
      hour: Number(match[1]),
      minute: Number(match[2]),
      label: `${match[1].padStart(2, "0")}:${match[2]}`,
      content: text.slice(start, end),
    };
  });
}

export function extractTimedVitalsSamples(messages: HealthMessageInput[]): TimedVitalsSample[] {
  const samples: TimedVitalsSample[] = [];

  for (const message of messages) {
    const text = message.text ?? "";
    const blocks = splitTimeBlocks(text);

    if (blocks.length === 0) {
      const parsed = parseVitalsNullable(text);
      const hasAnyVitals =
        parsed.systolic !== null ||
        parsed.diastolic !== null ||
        parsed.heartRate !== null ||
        parsed.temperature !== null ||
        parsed.spo2 !== null;

      if (hasAnyVitals) {
        const fallbackDate = new Date(message.timestamp ?? Date.now());
        samples.push({
          id: `${message.id}-fallback`,
          sourceMessageId: message.id,
          sourceTimestamp: message.timestamp ?? Date.now(),
          hour: fallbackDate.getHours(),
          minute: fallbackDate.getMinutes(),
          label: `${String(fallbackDate.getHours()).padStart(2, "0")}:${String(
            fallbackDate.getMinutes(),
          ).padStart(2, "0")}`,
          ...parsed,
        });
      }

      continue;
    }

    for (const [index, block] of blocks.entries()) {
      const parsed = parseVitalsNullable(block.content);
      const hasAnyVitals =
        parsed.systolic !== null ||
        parsed.diastolic !== null ||
        parsed.heartRate !== null ||
        parsed.temperature !== null ||
        parsed.spo2 !== null;

      if (!hasAnyVitals) {
        continue;
      }

      samples.push({
        id: `${message.id}-${index}-${block.label}`,
        sourceMessageId: message.id,
        sourceTimestamp: message.timestamp ?? Date.now(),
        hour: block.hour,
        minute: block.minute,
        label: block.label,
        ...parsed,
      });
    }
  }

  return samples.sort((left, right) => {
    if (left.sourceTimestamp !== right.sourceTimestamp) {
      return right.sourceTimestamp - left.sourceTimestamp;
    }

    if (left.hour !== right.hour) {
      return right.hour - left.hour;
    }

    return right.minute - left.minute;
  });
}

function mergeVitals(baseVitals: ParsedVitals, nextVitals: Partial<ParsedVitals>): ParsedVitals {
  return {
    systolic: nextVitals.systolic ?? baseVitals.systolic,
    diastolic: nextVitals.diastolic ?? baseVitals.diastolic,
    heartRate: nextVitals.heartRate ?? baseVitals.heartRate,
    temperature: nextVitals.temperature ?? baseVitals.temperature,
    spo2: nextVitals.spo2 ?? baseVitals.spo2,
  };
}

function createAiSummary(
  severity: Severity,
  vitals: ParsedVitals,
  groupName: string,
  reporterName: string,
) {
  if (severity === "critical") {
    return `รายงานจาก ${groupName} โดย ${reporterName} มีค่าที่ต้องเฝ้าระวังทันที โดยเฉพาะความดัน ${vitals.systolic}/${vitals.diastolic} mmHg และค่า SpO2 ${vitals.spo2}%`;
  }

  if (severity === "watch") {
    return `ระบบประเมินว่าข้อมูลจาก ${groupName} ควรติดตามต่อเนื่อง เพราะเริ่มมีค่าบางรายการเบี่ยงจากเกณฑ์ผู้สูงอายุ`;
  }

  return `ข้อมูลจาก ${groupName} อยู่ในเกณฑ์ที่ยอมรับได้สำหรับผู้สูงอายุ และพร้อมใช้ต่อยอดเป็นรายงานสุขภาพ`;
}

export function buildHealthReport(messages: HealthMessageInput[]): HealthReport {
  const sortedMessages = [...messages].sort(
    (left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0),
  );
  const latestMessage = sortedMessages[0];
  const reporterMessage =
    sortedMessages.find((message) => message.displayName && message.type !== "outbound") ??
    latestMessage;

  const timedSamples = extractTimedVitalsSamples(sortedMessages);
  let latestVitals = DEFAULT_VITALS;

  if (timedSamples.length > 0) {
    latestVitals = mergeVitals(DEFAULT_VITALS, {
      systolic: timedSamples[0].systolic ?? undefined,
      diastolic: timedSamples[0].diastolic ?? undefined,
      heartRate: timedSamples[0].heartRate ?? undefined,
      temperature: timedSamples[0].temperature ?? undefined,
      spo2: timedSamples[0].spo2 ?? undefined,
    });
  } else {
    for (const message of sortedMessages) {
      const parsed = parseHealthVitals(message.text);
      if (
        parsed.systolic ||
        parsed.diastolic ||
        parsed.heartRate ||
        parsed.temperature ||
        parsed.spo2
      ) {
        latestVitals = mergeVitals(latestVitals, parsed);
        break;
      }
    }
  }

  const bloodPressure = getBloodPressureInterpretation(latestVitals);
  const heartRate = getHeartRateInterpretation(latestVitals);
  const temperature = getTemperatureInterpretation(latestVitals);
  const spo2 = getSpO2Interpretation(latestVitals);
  const overallSeverity = getOverallSeverity([bloodPressure, heartRate, temperature, spo2]);
  const statusLabel = severityToStatusLabel(overallSeverity);
  const statusTone = severityToTone(overallSeverity);

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
    detail:
      message.text ??
      (message.contentUrl ? "แนบรูปภาพประกอบการประเมิน" : "อัปเดตข้อมูลสุขภาพ"),
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

  const patientName =
    sortedMessages.map((message) => extractPatientName(message.text)).find(Boolean) ??
    latestMessage?.displayName?.trim() ??
    "Patient";
  const reporterName =
    sortedMessages.map((message) => extractReporterName(message.text)).find(Boolean) ??
    reporterMessage?.displayName?.trim() ??
    "ผู้รายงานไม่ทราบชื่อ";
  const groupName =
    reporterMessage?.groupName?.trim() ||
    (reporterMessage?.groupId ? `Group ${reporterMessage.groupId}` : "LINE Care Group");

  return {
    patientName,
    reporterName,
    reporterAvatarUrl: reporterMessage?.pictureUrl ?? null,
    reporterTimeLabel: formatClock(reporterMessage?.timestamp ?? Date.now()),
    groupName,
    dateLabel: formatDate(latestMessage?.timestamp ?? Date.now()),
    ageLabel: `ผู้สูงอายุ (${ELDERLY_AGE} ปี)`,
    statusLabel,
    statusTone,
    aiSummary: createAiSummary(overallSeverity, latestVitals, groupName, reporterName),
    vitals: {
      bloodPressure,
      heartRate,
      temperature,
      spo2,
    },
    keywordTags,
    messageTypeTags: Array.from(typeSet).slice(0, 6),
    timeline,
    evidence,
    criteriaReference: [
      {
        label: "ผู้สูงอายุ (65+)",
        detail: "ความดันไม่ควรเกิน 160/95 mmHg",
      },
      {
        label: "Heart Rate",
        detail: "ช่วงที่เหมาะสมโดยทั่วไป 60-100 bpm",
      },
      {
        label: "Temperature",
        detail: "อุณหภูมิ 37.5°C ขึ้นไปควรติดตาม",
      },
      {
        label: "SpO2",
        detail: "ไม่ควรต่ำกว่า 95%",
      },
    ],
    series,
  };
}
