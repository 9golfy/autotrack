import {
  evaluateBloodPressure,
  evaluateHeartRate,
  evaluateSpo2,
  evaluateTemperature,
  getOverallHealthSeverity,
  healthSeverityToStatusLabel,
  healthSeverityToTone,
  type HealthSeverity,
} from "@/lib/health-thresholds";

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

type Severity = HealthSeverity;

type VitalMetric = {
  value: string;
  unit: string;
  tone: "green" | "orange" | "red";
  statusLabel: "เหมาะสม" | "ปกติ" | "สูงกว่าปกติ" | "เฝ้าระวัง" | "อันตราย" | "ไม่มีข้อมูล";
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

type TimeBucketLabel = string;

type HealthSeriesPoint = {
  label: TimeBucketLabel;
  heartRate: number;
  systolic: number;
  diastolic: number;
  temperature: number;
};

type ParsedVitals = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  legacyRespiratoryRate?: number;
  respiratoryRate: number;
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
  respiratoryRate: number | null;
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
  statusLabel: "ปกติ" | "เฝ้าระวัง" | "อันตราย";
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
  availableDates: string[];
};

const DEFAULT_VITALS: ParsedVitals = {
  systolic: 122,
  diastolic: 78,
  heartRate: 74,
  respiratoryRate: 20,
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

function getBloodPressureInterpretation(vitals: ParsedVitals): VitalMetric {
  const result = evaluateBloodPressure(vitals.systolic, vitals.diastolic);

  return {
    value: `${vitals.systolic}/${vitals.diastolic}`,
    unit: "mmHg",
    tone: healthSeverityToTone(result.severity),
    statusLabel: result.label,
    explanation: result.explanation,
  };
}

function getHeartRateInterpretation(vitals: ParsedVitals): VitalMetric {
  const result = evaluateHeartRate(vitals.heartRate);

  return {
    value: `${vitals.heartRate}`,
    unit: "bpm",
    tone: healthSeverityToTone(result.severity),
    statusLabel: result.label,
    explanation: result.explanation,
  };
}

function getTemperatureInterpretation(vitals: ParsedVitals): VitalMetric {
  const result = evaluateTemperature(vitals.temperature);

  return {
    value: `${vitals.temperature.toFixed(1)}`,
    unit: "°C",
    tone: healthSeverityToTone(result.severity),
    statusLabel: result.label,
    explanation: result.explanation,
  };
}

function getSpO2Interpretation(vitals: ParsedVitals): VitalMetric {
  const result = evaluateSpo2(vitals.spo2);

  return {
    value: `${vitals.spo2}`,
    unit: "%",
    tone: healthSeverityToTone(result.severity),
    statusLabel: result.label,
    explanation: result.explanation,
  };
}

function getOverallSeverity(metrics: VitalMetric[]): Severity {
  return getOverallHealthSeverity(
    metrics.map((metric) => ({
      label: metric.statusLabel,
      severity: metric.tone === "red" ? "danger" : metric.tone === "orange" ? "watch" : "normal",
      explanation: metric.explanation,
    })),
  );
}

function parseRespiratoryRate(text: string | null | undefined) {
  if (!text) {
    return undefined;
  }

  const match =
    text.match(/(?:respiratory rate|rr|อัตราการหายใจ|หายใจ)[^\d]{0,12}(\d{1,2})/i) ??
    text.match(/(\d{1,2})\s*(?:ครั้ง\/นาที|\/min)/i);

  return match ? Number(match[1]) : undefined;
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
    legacyRespiratoryRate:
      text.match(/(?:respiratory rate|rr|อัตราการหายใจ|หายใจ)[^\d]{0,12}(\d{1,2})/i) ||
      text.match(/(\d{1,2})\s*(?:ครั้ง\/นาที|\/min)/i)
        ? Number(
            (
              text.match(/(?:respiratory rate|rr|อัตราการหายใจ|หายใจ)[^\d]{0,12}(\d{1,2})/i) ??
              text.match(/(\d{1,2})\s*(?:ครั้ง\/นาที|\/min)/i)
            )?.[1],
          )
        : undefined,
    respiratoryRate:
      text.match(/(?:อัตราการหายใจ|หายใจ)[^\d]{0,12}(\d{1,2})/i) ||
      text.match(/(\d{1,2})\s*(?:ครั้ง\/นาที|\/min)/i)
        ? Number(
            (
              text.match(/(?:อัตราการหายใจ|หายใจ)[^\d]{0,12}(\d{1,2})/i) ??
              text.match(/(\d{1,2})\s*(?:ครั้ง\/นาที|\/min)/i)
            )?.[1],
          )
        : undefined,
    temperature: temperatureMatch ? Number(temperatureMatch[1]) : undefined,
    spo2: spo2Match ? Number(spo2Match[1]) : undefined,
  };
}

function parseThaiCareReportVitals(text: string | null | undefined): Partial<ParsedVitals> {
  if (!text) {
    return {};
  }

  const pressureMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  const heartRateMatch =
    text.match(/(?:อัตราการเต้นของหัวใจ|ชีพจร|หัวใจ)[^\d]{0,12}(\d{2,3})/i) ??
    text.match(/(\d{2,3})\s*(?:bpm|ครั้ง\/นาที)/i);
  const temperatureMatch =
    text.match(/(?:อุณหภูมิร่างกาย|อุณหภูมิ|ไข้)[^\d]{0,12}(\d{2}(?:\.\d)?)/i) ??
    text.match(/(\d{2}(?:\.\d)?)\s*(?:°c|องศา|เซลเซียส)/i);
  const spo2Match =
    text.match(/(?:ออกซิเจนในเลือด|ค่าออกซิเจน|ออกซิเจน|spo2|spo₂)[^\d]{0,12}(\d{2,3})\s*%?/i) ??
    text.match(/(\d{2,3})\s*%/i);

  return {
    systolic: pressureMatch ? Number(pressureMatch[1]) : undefined,
    diastolic: pressureMatch ? Number(pressureMatch[2]) : undefined,
    heartRate: heartRateMatch ? Number(heartRateMatch[1]) : undefined,
    respiratoryRate: parseRespiratoryRate(text),
    temperature: temperatureMatch ? Number(temperatureMatch[1]) : undefined,
    spo2: spo2Match ? Number(spo2Match[1]) : undefined,
  };
}

function parseVitalsNullable(text: string | null | undefined) {
  const parsed = {
    ...parseHealthVitals(text),
    ...parseThaiCareReportVitals(text),
  };

  return {
    systolic: parsed.systolic ?? null,
    diastolic: parsed.diastolic ?? null,
    heartRate: parsed.heartRate ?? null,
    respiratoryRate: parsed.respiratoryRate ?? null,
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
  const matches = Array.from(text.matchAll(/(?:^|[^\d])(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*น\.?)?/g));

  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const matchStart = match.index ?? 0;
    const digitOffset = match[0].search(/\d/);
    const start = matchStart + (digitOffset >= 0 ? digitOffset : 0);
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
        parsed.respiratoryRate !== null ||
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
        parsed.respiratoryRate !== null ||
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
    respiratoryRate: nextVitals.respiratoryRate ?? baseVitals.respiratoryRate,
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
  if (severity === "danger") {
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
      respiratoryRate: timedSamples[0].respiratoryRate ?? undefined,
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
        parsed.respiratoryRate ||
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
  const statusLabel = healthSeverityToStatusLabel(overallSeverity);
  const statusTone = healthSeverityToTone(overallSeverity);

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

  const bucketMap = new Map<string, ParsedVitals>();
  
  // ตรวจสอบว่าข้อมูลครอบคลุมหลายวันหรือไม่ (สำหรับรองรับ Monthly view ในหน้ากราฟ)
  const timestamps = sortedMessages.map(m => m.timestamp ?? 0).filter(t => t > 0);
  const isMultiDay = timestamps.length > 0 && 
    (Math.max(...timestamps) - Math.min(...timestamps)) > 24 * 60 * 60 * 1000;

  // ดึงรายการวันที่ทั้งหมดที่มีข้อมูลเพื่อใช้ใน Dropdown บนหน้า UI
  const availableDates = Array.from(new Set(
    sortedMessages.map(m => {
      const d = new Date(m.timestamp ?? Date.now());
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    })
  )).sort();

  let initialSeriesOrder: string[] = [];

  if (isMultiDay) {
    // สร้างชุดวันที่ไม่ซ้ำกันจากข้อความที่มี (รูปแบบ DD/MM)
    // เรียงลำดับตามวันเวลาจริง (Chronological Order)
    const dateWithTime = sortedMessages.map(m => {
      const d = new Date(m.timestamp ?? Date.now());
      return {
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        ts: d.getTime()
      };
    });
    
    initialSeriesOrder = Array.from(new Set(dateWithTime.map(d => d.label)))
      .sort((a, b) => {
        const timeA = dateWithTime.find(d => d.label === a)?.ts ?? 0;
        const timeB = dateWithTime.find(d => d.label === b)?.ts ?? 0;
        return timeA - timeB;
      });
  } else {
    initialSeriesOrder = ["Morning", "Afternoon", "Evening", "Night"];
  }

  initialSeriesOrder.forEach((bucket) => bucketMap.set(bucket, latestVitals));

  for (const message of [...sortedMessages].reverse()) {
    const d = new Date(message.timestamp ?? Date.now());
    const bucket = isMultiDay 
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
      : getBucketLabel(d.getHours());

    const parsed = parseHealthVitals(message.text);
    bucketMap.set(bucket, mergeVitals(bucketMap.get(bucket) ?? latestVitals, parsed));
  }

  const series = initialSeriesOrder.map((label) => {
    const bucketVitals = bucketMap.get(label) ?? latestVitals;

    return {
      label,
      heartRate: bucketVitals.heartRate,
      systolic: bucketVitals.systolic,
      diastolic: bucketVitals.diastolic,
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
    availableDates,
  };
}
