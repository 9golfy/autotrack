"use client";

import { useMemo, useState } from "react";

import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";
import { extractTimedVitalsSamples } from "@/lib/health-report";

type MiniAppReportProps = {
  selectedGroupId: string | null;
};

type BpStatus = "normal" | "watch" | "high" | "consult";
type ChartMode = "daily" | "monthly";

type BloodPressurePoint = {
  day: number;
  label?: string;
  xPosition?: number;
  systolic: number;
  diastolic: number;
  status: BpStatus;
  source: "db" | "mock";
};

const DAILY_TIME_SLOTS = [
  { label: "22:00", matchTimes: ["22:00"], note: "คืนก่อนหน้า" },
  { label: "08:00", matchTimes: ["06:00", "08:00"], note: "เช้าของวันที่รายงาน" },
  { label: "10:00", matchTimes: ["10:00"], note: "วันที่รายงาน" },
  { label: "18:00", matchTimes: ["18:00"], note: "วันที่รายงาน" },
] as const;

const DAILY_BP_POINTS: BloodPressurePoint[] = [
  { day: 1, label: "22:00", xPosition: 0, systolic: 143, diastolic: 88, status: "high", source: "mock" },
  { day: 2, label: "08:00", xPosition: 1 / 3, systolic: 112, diastolic: 74, status: "normal", source: "mock" },
  { day: 3, label: "10:00", xPosition: 2 / 3, systolic: 128, diastolic: 86, status: "watch", source: "mock" },
  { day: 4, label: "18:00", xPosition: 1, systolic: 106, diastolic: 72, status: "normal", source: "mock" },
];

const BP_CHART = {
  width: 360,
  height: 250,
  left: 30,
  right: 16,
  top: 24,
  bottom: 30,
  min: 70,
  max: 180,
};

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THAI_MONTHS_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const BP_POINTS: BloodPressurePoint[] = [
  { day: 1, systolic: 123, diastolic: 106, status: "normal", source: "mock" },
  { day: 2, systolic: 129, diastolic: 109, status: "normal", source: "mock" },
  { day: 3, systolic: 122, diastolic: 105, status: "watch", source: "mock" },
  { day: 4, systolic: 118, diastolic: 102, status: "watch", source: "mock" },
  { day: 5, systolic: 121, diastolic: 105, status: "watch", source: "mock" },
  { day: 6, systolic: 128, diastolic: 109, status: "watch", source: "mock" },
  { day: 7, systolic: 127, diastolic: 108, status: "high", source: "mock" },
  { day: 8, systolic: 134, diastolic: 113, status: "high", source: "mock" },
  { day: 9, systolic: 134, diastolic: 113, status: "high", source: "mock" },
  { day: 10, systolic: 134, diastolic: 112, status: "high", source: "mock" },
  { day: 11, systolic: 125, diastolic: 108, status: "watch", source: "mock" },
  { day: 12, systolic: 126, diastolic: 107, status: "watch", source: "mock" },
  { day: 13, systolic: 124, diastolic: 105, status: "watch", source: "mock" },
  { day: 14, systolic: 121, diastolic: 103, status: "consult", source: "mock" },
  { day: 15, systolic: 128, diastolic: 106, status: "consult", source: "mock" },
  { day: 16, systolic: 134, diastolic: 109, status: "watch", source: "mock" },
  { day: 17, systolic: 128, diastolic: 109, status: "watch", source: "mock" },
  { day: 18, systolic: 123, diastolic: 107, status: "high", source: "mock" },
  { day: 19, systolic: 127, diastolic: 103, status: "high", source: "mock" },
  { day: 20, systolic: 134, diastolic: 103, status: "watch", source: "mock" },
  { day: 21, systolic: 134, diastolic: 104, status: "normal", source: "mock" },
  { day: 22, systolic: 140, diastolic: 109, status: "watch", source: "mock" },
  { day: 23, systolic: 132, diastolic: 108, status: "watch", source: "mock" },
  { day: 24, systolic: 138, diastolic: 106, status: "watch", source: "mock" },
  { day: 25, systolic: 145, diastolic: 110, status: "watch", source: "mock" },
  { day: 26, systolic: 136, diastolic: 110, status: "normal", source: "mock" },
  { day: 27, systolic: 132, diastolic: 110, status: "normal", source: "mock" },
  { day: 28, systolic: 126, diastolic: 109, status: "normal", source: "mock" },
  { day: 29, systolic: 125, diastolic: 108, status: "normal", source: "mock" },
  { day: 30, systolic: 119, diastolic: 106, status: "normal", source: "mock" },
];

const STATUS_META: Record<BpStatus, { label: string; className: string }> = {
  normal: { label: "ปกติ (Normal)", className: "bg-[#22C55E]" },
  watch: { label: "เฝ้าระวัง (Watch)", className: "bg-[#F59E0B]" },
  high: { label: "สูง (High)", className: "bg-[#F97316]" },
  consult: { label: "ควรปรึกษาแพทย์ (Consult)", className: "bg-[#EF4444]" },
};

function getGroupName(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupMessage = messages.find(
    (message) => message.groupId === selectedGroupId && message.rawPayload?.lineIdentity?.groupName?.trim(),
  );

  return groupMessage?.rawPayload?.lineIdentity?.groupName ?? "LINE Care Group";
}

function getGroupAvatar(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupMessage = messages.find(
    (message) => message.groupId === selectedGroupId && message.rawPayload?.lineIdentity?.pictureUrl?.trim(),
  );

  return (
    groupMessage?.rawPayload?.lineIdentity?.pictureUrl ??
    messages.find((message) => message.groupId === selectedGroupId && message.pictureUrl)?.pictureUrl ??
    null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getParsedPayload(message: MessageRecord) {
  if (isRecord(message.parsed)) {
    return message.parsed;
  }

  if (isRecord(message.rawPayload?.parsed)) {
    return message.rawPayload.parsed;
  }

  return null;
}

function getBpStatus(systolic: number, diastolic: number): BpStatus {
  if (systolic >= 160 || diastolic >= 100) {
    return "consult";
  }

  if (systolic >= 140 || diastolic >= 90) {
    return "high";
  }

  if (systolic >= 120 || diastolic >= 80) {
    return "watch";
  }

  return "normal";
}

function getStructuredSourceMessages(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupScoped = messages.filter((message) => message.groupId === selectedGroupId);
  const demoFallback = messages.filter(
    (message) => message.source === "historical_import" && !message.groupId && Boolean(getParsedPayload(message)),
  );

  return groupScoped.some((message) => Boolean(getParsedPayload(message))) ? groupScoped : demoFallback;
}

function normalizeMeasuredTime(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);

  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function findDailySlotKey(time: string | null) {
  if (!time) {
    return null;
  }

  return DAILY_TIME_SLOTS.find((slot) => (slot.matchTimes as readonly string[]).includes(time))?.label ?? null;
}

function getMessageTimestamp(message: MessageRecord) {
  const numericTimestamp = Number(message.timestamp);

  return Number.isFinite(numericTimestamp) ? numericTimestamp : Date.parse(message.createdAt);
}

function getMeasuredDates(messages: MessageRecord[], selectedGroupId: string | null) {
  const sourceMessages = getStructuredSourceMessages(messages, selectedGroupId);
  const dates = new Set<string>();

  for (const message of sourceMessages) {
    const parsed = getParsedPayload(message);
    const vitals = Array.isArray(parsed?.vital_signs) ? parsed.vital_signs : [];

    for (const vital of vitals) {
      if (!isRecord(vital) || typeof vital.measured_date !== "string") {
        continue;
      }

      dates.add(vital.measured_date);
    }

    if (parsed) {
      continue;
    }

    const samples = extractTimedVitalsSamples([
      {
        id: message.id,
        text: message.text,
        type: message.type,
        timestamp: getMessageTimestamp(message),
        displayName: message.displayName,
        userId: message.userId,
        pictureUrl: message.pictureUrl,
        groupId: message.groupId,
        groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
      },
    ]);

    for (const sample of samples) {
      if (sample.systolic === null || sample.diastolic === null) {
        continue;
      }

      dates.add(toLocalIsoDate(new Date(sample.sourceTimestamp)));
    }
  }

  return Array.from(dates).sort();
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLatestSourceTimestamp(messages: MessageRecord[], selectedGroupId: string | null) {
  const sourceMessages = getStructuredSourceMessages(messages, selectedGroupId);
  const latestTimestamp = sourceMessages.reduce((latest, message) => {
    const timestamp = getMessageTimestamp(message);

    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);

  return latestTimestamp || Date.now();
}

function formatThaiDateLabel(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return "25 เม.ย. 2569";
  }

  const year = Number(match[1]) + 543;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  return `${day} ${THAI_MONTHS_SHORT[month] ?? "เม.ย."} ${year}`;
}

function formatThaiMonthLabel(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-/);

  if (!match) {
    return "เมษายน 2569";
  }

  const year = Number(match[1]) + 543;
  const month = Number(match[2]) - 1;

  return `${THAI_MONTHS_LONG[month] ?? "เมษายน"} ${year}`;
}

function formatThaiDateFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear() + 543;
  const month = date.getMonth();

  return `${date.getDate()} ${THAI_MONTHS_SHORT[month] ?? "เม.ย."} ${year}`;
}

function formatThaiMonthFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear() + 543;
  const month = date.getMonth();

  return `${THAI_MONTHS_LONG[month] ?? "เมษายน"} ${year}`;
}

function getMonthlyBloodPressurePoints(messages: MessageRecord[], selectedGroupId: string | null) {
  const sourceMessages = getStructuredSourceMessages(messages, selectedGroupId);
  const dailyValues = new Map<number, { systolic: number[]; diastolic: number[] }>();

  for (const message of sourceMessages) {
    const parsed = getParsedPayload(message);
    const vitals = Array.isArray(parsed?.vital_signs) ? parsed.vital_signs : [];

    for (const vital of vitals) {
      if (!isRecord(vital)) {
        continue;
      }

      const measuredDate = typeof vital.measured_date === "string" ? vital.measured_date : null;
      const day = measuredDate ? Number(measuredDate.slice(-2)) : null;
      const systolic = toNumber(vital.blood_pressure_systolic);
      const diastolic = toNumber(vital.blood_pressure_diastolic);

      if (!day || day < 1 || day > 30 || systolic === null || diastolic === null) {
        continue;
      }

      const bucket = dailyValues.get(day) ?? { systolic: [], diastolic: [] };
      bucket.systolic.push(systolic);
      bucket.diastolic.push(diastolic);
      dailyValues.set(day, bucket);
    }

    if (parsed) {
      continue;
    }

    const samples = extractTimedVitalsSamples([
      {
        id: message.id,
        text: message.text,
        type: message.type,
        timestamp: getMessageTimestamp(message),
        displayName: message.displayName,
        userId: message.userId,
        pictureUrl: message.pictureUrl,
        groupId: message.groupId,
        groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
      },
    ]);

    for (const sample of samples) {
      if (sample.systolic === null || sample.diastolic === null) {
        continue;
      }

      const day = new Date(sample.sourceTimestamp).getDate();
      const bucket = dailyValues.get(day) ?? { systolic: [], diastolic: [] };
      bucket.systolic.push(sample.systolic);
      bucket.diastolic.push(sample.diastolic);
      dailyValues.set(day, bucket);
    }
  }

  const dbPoints = Array.from(dailyValues.entries())
    .map(([day, values]) => {
      const systolic = Math.round(values.systolic.reduce((sum, value) => sum + value, 0) / values.systolic.length);
      const diastolic = Math.round(values.diastolic.reduce((sum, value) => sum + value, 0) / values.diastolic.length);

      return {
        day,
        systolic,
        diastolic,
        status: getBpStatus(systolic, diastolic),
        source: "db" as const,
      };
    })
    .sort((a, b) => a.day - b.day);

  return dbPoints.length > 0 ? dbPoints : BP_POINTS;
}

function getDailyBloodPressurePoints(
  messages: MessageRecord[],
  selectedGroupId: string | null,
  selectedDate: string | null,
) {
  const sourceMessages = getStructuredSourceMessages(messages, selectedGroupId);
  const slotValues = new Map<string, { systolic: number[]; diastolic: number[] }>();

  for (const slot of DAILY_TIME_SLOTS) {
    slotValues.set(slot.label, { systolic: [], diastolic: [] });
  }

  for (const message of sourceMessages) {
    const parsed = getParsedPayload(message);
    const vitals = Array.isArray(parsed?.vital_signs) ? parsed.vital_signs : [];

    for (const vital of vitals) {
      if (!isRecord(vital)) {
        continue;
      }

      const measuredTime = normalizeMeasuredTime(vital.measured_time);
      const measuredDate = typeof vital.measured_date === "string" ? vital.measured_date : null;
      const slotKey = findDailySlotKey(measuredTime);
      const bucket = slotKey ? slotValues.get(slotKey) : null;
      const systolic = toNumber(vital.blood_pressure_systolic);
      const diastolic = toNumber(vital.blood_pressure_diastolic);

      if (selectedDate && measuredDate !== selectedDate) {
        continue;
      }

      if (!bucket || systolic === null || diastolic === null) {
        continue;
      }

      bucket.systolic.push(systolic);
      bucket.diastolic.push(diastolic);
    }

    if (parsed) {
      continue;
    }

    const samples = extractTimedVitalsSamples([
      {
        id: message.id,
        text: message.text,
        type: message.type,
        timestamp: getMessageTimestamp(message),
        displayName: message.displayName,
        userId: message.userId,
        pictureUrl: message.pictureUrl,
        groupId: message.groupId,
        groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
      },
    ]);

    for (const sample of samples) {
      const measuredDate = toLocalIsoDate(new Date(sample.sourceTimestamp));
      const slotKey = findDailySlotKey(sample.label);
      const bucket = slotKey ? slotValues.get(slotKey) : null;

      if (selectedDate && measuredDate !== selectedDate) {
        continue;
      }

      if (!bucket || sample.systolic === null || sample.diastolic === null) {
        continue;
      }

      bucket.systolic.push(sample.systolic);
      bucket.diastolic.push(sample.diastolic);
    }
  }

  const dbPoints = DAILY_TIME_SLOTS.flatMap((slot, index) => {
    const values = slotValues.get(slot.label);

    if (!values || values.systolic.length === 0 || values.diastolic.length === 0) {
      return [];
    }

    const systolic = Math.round(values.systolic.reduce((sum, value) => sum + value, 0) / values.systolic.length);
    const diastolic = Math.round(values.diastolic.reduce((sum, value) => sum + value, 0) / values.diastolic.length);

    return [
      {
        day: index + 1,
        label: slot.label,
        xPosition: index / (DAILY_TIME_SLOTS.length - 1),
        systolic,
        diastolic,
        status: getBpStatus(systolic, diastolic),
        source: "db" as const,
      },
    ];
  });

  return dbPoints.length > 0 ? dbPoints : DAILY_BP_POINTS;
}

function Icon({
  name,
  className = "h-6 w-6",
}: {
  name:
    | "back"
    | "home"
    | "more"
    | "edit"
    | "bell"
    | "eye"
    | "doc"
    | "shield"
    | "calendar"
    | "chevron"
    | "heart"
    | "plus"
    | "trend"
    | "report"
    | "user"
    | "stats"
    | "grid"
    | "clock"
    | "settings";
  className?: string;
}) {
  const base = `${className} shrink-0`;

  if (name === "more") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden="true">
        <circle cx="5" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="19" cy="12" r="1.9" />
      </svg>
    );
  }

  const paths: Record<string, React.ReactNode> = {
    back: <path d="M15 18 9 12l6-6" />,
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    doc: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
        <path d="M9 12h6M12 9v6" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    heart: (
      <>
        <path d="M12 21s-7-4.5-9-9.5A5 5 0 0 1 12 7a5 5 0 0 1 9 4.5C19 16.5 12 21 12 21Z" />
        <path d="M8 12h2l1-2 2 5 1-3h2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trend: (
      <>
        <path d="m4 16 5-5 4 4 7-8" />
        <path d="M15 7h5v5" />
      </>
    ),
    report: (
      <>
        <path d="M8 4h8l3 3v13H5V4z" />
        <path d="M16 4v4h4M8 12h8M8 16h5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    stats: (
      <>
        <path d="M4 20h16" />
        <path d="M7 20V10" />
        <path d="M12 20V5" />
        <path d="M17 20v-7" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="2" />
        <rect x="14" y="4" width="6" height="6" rx="2" />
        <rect x="4" y="14" width="6" height="6" rx="2" />
        <rect x="14" y="14" width="6" height="6" rx="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H1.9a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 0 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 8.2 3.4a1.8 1.8 0 0 0 1.1-1.66V1.7a2.1 2.1 0 0 1 4.2 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8a1.8 1.8 0 0 0 1.66 1.1h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={base}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function TopHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[#EEF2F7] bg-white">
      <div className="mx-auto flex h-full max-w-[390px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Back" className="-ml-2 grid h-9 w-9 place-items-center text-[#0B1B3F]">
            <Icon name="back" className="h-7 w-7" />
          </button>
          <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#06C755] text-[9px] font-black text-white shadow-sm ring-2 ring-emerald-50">
            LINE
          </div>
        </div>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2563EB] text-white shadow-sm">
            <Icon name="shield" className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-[-0.04em] text-[#0B1B3F]">AutoHealth</span>
        </div>

        <div className="flex items-center gap-1 text-[#0B1B3F]">
          <button type="button" aria-label="Home" className="grid h-9 w-9 place-items-center">
            <Icon name="home" className="h-7 w-7" />
          </button>
          <button type="button" aria-label="More" className="-mr-2 grid h-9 w-9 place-items-center">
            <Icon name="more" className="h-7 w-7" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PatientAvatar({ src }: { src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="คุณพ่อไพโรจน์" className="h-[72px] w-[72px] shrink-0 rounded-full object-cover" />
    );
  }

  return (
    <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-blue-50 text-2xl font-bold text-[#2563EB]">
      พ
    </div>
  );
}

function PatientProfileCard({ avatarUrl, onEditDob }: { avatarUrl: string | null; onEditDob: () => void }) {
  return (
    <section className="mb-4 rounded-[20px] border border-[#E5E7EB] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <PatientAvatar src={avatarUrl} />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] font-bold leading-tight tracking-[-0.04em] text-[#0B1B3F]">คุณพ่อไพโรจน์</h1>
          <button
            type="button"
            onClick={onEditDob}
            className="mt-2 flex max-w-full items-center gap-2 whitespace-nowrap text-left text-base text-[#64748B]"
          >
            <span className="truncate">12 มี.ค. 2493 (73 ปี)</span>
            <Icon name="edit" className="h-[18px] w-[18px] text-[#2563EB]" />
            <span className="text-sm font-medium text-[#2563EB]">แก้ไข</span>
          </button>
          <p className="mt-1 text-sm leading-5 text-[#64748B]">รายงานความดัน 30 วันล่าสุด</p>
        </div>
      </div>
    </section>
  );
}

function AlertCard() {
  return (
    <section className="mb-4 flex min-h-[78px] items-center gap-4 rounded-[18px] border border-[#FDE68A] bg-gradient-to-r from-[#FFF7E6] to-white px-4 py-3">
      <div className="flex w-[88px] shrink-0 flex-col items-center justify-center text-center text-[#F59E0B]">
        <Icon name="eye" className="h-8 w-8" />
        <span className="mt-1 text-sm font-semibold leading-tight">เฝ้าระวัง (Watch)</span>
      </div>
      <div className="h-12 w-px shrink-0 bg-[#CBD5E1]" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-[1.25] text-[#0B1B3F]">พบค่าความดันบางช่วงสูงกว่าค่ามาตรฐาน</h2>
        <p className="mt-1 text-sm leading-[1.35] text-[#64748B]">แนะนำติดตามค่าอย่างต่อเนื่อง และปรึกษาแพทย์</p>
      </div>
      <Icon name="chevron" className="h-5 w-5 shrink-0 text-[#94A3B8]" />
    </section>
  );
}

function LatestHealthCards() {
  const metrics = [
    {
      label: "ความดัน",
      english: "Blood Pressure",
      value: "132 / 86",
      unit: "mmHg",
      icon: <Icon name="heart" className="h-6 w-6" />,
      iconClass: "bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-white",
      haloClass: "bg-[#EFF6FF]",
    },
    {
      label: "ชีพจร",
      english: "Heart Rate",
      value: "74",
      unit: "bpm",
      icon: <Icon name="heart" className="h-6 w-6 fill-current" />,
      iconClass: "bg-gradient-to-br from-[#EF4444] to-[#FB7185] text-white",
      haloClass: "bg-[#FFF1F2]",
    },
    {
      label: "อุณหภูมิ",
      english: "Temperature",
      value: "36.5",
      unit: "°C",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
          <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" />
          <path d="M10 5v11" />
        </svg>
      ),
      iconClass: "bg-gradient-to-br from-[#22C55E] to-[#86EFAC] text-white",
      haloClass: "bg-[#F0FDF4]",
    },
    {
      label: "ออกซิเจน",
      english: "SpO2",
      value: "98",
      unit: "%",
      icon: <span className="text-[15px] font-black">O₂</span>,
      iconClass: "bg-gradient-to-br from-[#7C4DFF] to-[#A78BFA] text-white",
      haloClass: "bg-[#F5F3FF]",
    },
  ];

  return (
    <section className="mb-4">
      <h2 className="mb-2 px-1 text-sm font-bold text-[#0B1B3F]">ข้อมูลสุขภาพล่าสุดวันนี้</h2>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-h-[124px] rounded-[16px] border border-[#E5E7EB] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${metric.haloClass}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-full ${metric.iconClass}`}>{metric.icon}</div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-[#0B1B3F]">{metric.label}</p>
                <p className="text-xs leading-tight text-[#64748B]">({metric.english})</p>
                <p className="mt-2 whitespace-nowrap text-[20px] font-extrabold leading-none tracking-[-0.05em] text-[#0B1B3F]">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm font-medium text-[#64748B]">{metric.unit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function makePath(points: BloodPressurePoint[], metric: "systolic" | "diastolic") {
  const { width, height, left, right, top, bottom, min, max } = BP_CHART;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const coords = points.map((point, index) => {
    const value = point[metric];
    const dayPosition = point.xPosition ?? (points.length === 1 ? 0.5 : (point.day - 1) / 29);
    const x = left + plotWidth * dayPosition;
    const rawY = top + ((max - value) / (max - min)) * plotHeight;
    const y = Math.min(top + plotHeight, Math.max(top, rawY));
    return { x, y, value, day: point.day, fallbackIndex: index };
  });

  return {
    width,
    height,
    coords,
    path: coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" "),
  };
}

function BloodPressureChart({
  mode,
  onModeChange,
  points,
  periodLabel,
  measuredDates,
  selectedDate,
  onSelectedDateChange,
}: {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  points: BloodPressurePoint[];
  periodLabel: string;
  measuredDates: string[];
  selectedDate: string | null;
  onSelectedDateChange: (date: string) => void;
}) {
  const chartPoints = points.length > 0 ? points : mode === "daily" ? DAILY_BP_POINTS : BP_POINTS;
  const systolic = makePath(chartPoints, "systolic");
  const diastolic = makePath(chartPoints, "diastolic");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const tooltipPoint = selectedPointIndex !== null ? chartPoints[selectedPointIndex] : null;
  const tooltipCoord = selectedPointIndex !== null ? systolic.coords[selectedPointIndex] : null;
  const isDbBacked = chartPoints.some((point) => point.source === "db");
  const plotWidth = BP_CHART.width - BP_CHART.left - BP_CHART.right;
  const plotHeight = BP_CHART.height - BP_CHART.top - BP_CHART.bottom;
  const chartBottom = BP_CHART.top + plotHeight;
  const chartRight = BP_CHART.left + plotWidth;
  const yForValue = (value: number) =>
    BP_CHART.top + ((BP_CHART.max - value) / (BP_CHART.max - BP_CHART.min)) * plotHeight;
  const xTicks =
    mode === "daily"
      ? chartPoints.map((point, index) => ({
          label: point.label ?? DAILY_TIME_SLOTS[index]?.label ?? String(point.day),
          x:
            BP_CHART.left +
            plotWidth * (point.xPosition ?? (chartPoints.length === 1 ? 0.5 : index / (chartPoints.length - 1))),
        }))
      : [
          { label: "1", x: BP_CHART.left },
          { label: "5", x: BP_CHART.left + (4 / 29) * plotWidth },
          { label: "10", x: BP_CHART.left + (9 / 29) * plotWidth },
          { label: "15", x: BP_CHART.left + (14 / 29) * plotWidth },
          { label: "20", x: BP_CHART.left + (19 / 29) * plotWidth },
          { label: "25", x: BP_CHART.left + (24 / 29) * plotWidth },
          { label: "30", x: chartRight },
        ];

  return (
    <section className="mb-4 rounded-[20px] border border-[#E5E7EB] bg-white px-[14px] pb-4 pt-[14px] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="space-y-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-[#0B1B3F]">แนวโน้มความดันโลหิต</h2>
          <p className="max-w-full text-sm leading-snug text-[#64748B]">
            (Blood Pressure Trend) {isDbBacked ? "ข้อมูลจาก Supabase" : "ข้อมูลตัวอย่าง"}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#2563EB]">{periodLabel}</p>
          {mode === "monthly" ? (
            <p className="mt-1 text-xs leading-snug text-[#64748B]">Monthly แสดงค่าเฉลี่ยความดันของแต่ละวัน</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#64748B]">หน่วย: mmHg</p>
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <label className="sr-only" htmlFor="bp-chart-mode">
              Chart mode
            </label>
            <select
              id="bp-chart-mode"
              value={mode}
              onChange={(event) => onModeChange(event.target.value as ChartMode)}
              className="h-9 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#0B1B3F] shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
            {mode === "daily" && measuredDates.length > 0 ? (
              <>
                <label className="sr-only" htmlFor="bp-chart-date">
                  เลือกวันที่
                </label>
                <select
                  id="bp-chart-date"
                  value={selectedDate ?? measuredDates.at(-1) ?? ""}
                  onChange={(event) => onSelectedDateChange(event.target.value)}
                  className="h-9 max-w-[150px] rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#0B1B3F] shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                >
                  {measuredDates.map((date) => (
                    <option key={date} value={date}>
                      {formatThaiDateLabel(date)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${systolic.width} ${systolic.height}`}
        className="mt-2 h-[250px] w-full overflow-visible"
        role="img"
        aria-label="Blood pressure trend chart"
        onClick={() => setSelectedPointIndex(null)}
      >
        <defs>
          <linearGradient id="zoneConsult" x1="0" x2="1">
            <stop offset="0%" stopColor="#FEE2E2" />
            <stop offset="100%" stopColor="#FFF1F2" />
          </linearGradient>
          <linearGradient id="zoneHigh" x1="0" x2="1">
            <stop offset="0%" stopColor="#FFEDD5" />
            <stop offset="100%" stopColor="#FFF7ED" />
          </linearGradient>
          <linearGradient id="zoneWatch" x1="0" x2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FFFBEB" />
          </linearGradient>
          <linearGradient id="zoneNormal" x1="0" x2="1">
            <stop offset="0%" stopColor="#DCFCE7" />
            <stop offset="100%" stopColor="#F0FDF4" />
          </linearGradient>
        </defs>

        <rect x={BP_CHART.left} y={yForValue(180)} width={plotWidth} height={yForValue(160) - yForValue(180)} fill="url(#zoneConsult)" rx="0" />
        <rect x={BP_CHART.left} y={yForValue(160)} width={plotWidth} height={yForValue(140) - yForValue(160)} fill="url(#zoneHigh)" />
        <rect x={BP_CHART.left} y={yForValue(140)} width={plotWidth} height={yForValue(120) - yForValue(140)} fill="url(#zoneWatch)" />
        <rect x={BP_CHART.left} y={yForValue(120)} width={plotWidth} height={chartBottom - yForValue(120)} fill="url(#zoneNormal)" />

        {[180, 160, 140, 120, 100].map((value) => {
          const y = yForValue(value);
          return (
            <g key={value}>
              <text x="0" y={y + 4} className="fill-[#64748B] text-[12px]">
                {value}
              </text>
              <line x1={BP_CHART.left} x2={chartRight} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="5 7" />
            </g>
          );
        })}

        <text x={chartRight - 6} y={yForValue(170)} textAnchor="end" className="fill-[#EF4444] text-[10px] font-semibold">
          ควรปรึกษาแพทย์
        </text>
        <text x={chartRight - 6} y={yForValue(170) + 13} textAnchor="end" className="fill-[#EF4444] text-[10px]">
          (Consult)
        </text>
        <text x={chartRight - 6} y={yForValue(150) + 4} textAnchor="end" className="fill-[#F97316] text-[11px] font-semibold">
          สูง (High)
        </text>
        <text x={chartRight - 6} y={yForValue(130) + 4} textAnchor="end" className="fill-[#F59E0B] text-[11px] font-semibold">
          เฝ้าระวัง (Watch)
        </text>
        <text x={chartRight - 6} y={yForValue(100) + 4} textAnchor="end" className="fill-[#22C55E] text-[11px] font-semibold">
          ปกติ (Normal)
        </text>

        <path d={systolic.path} fill="none" stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <path d={diastolic.path} fill="none" stroke="#60A5FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

        {systolic.coords.map((coord) => (
          <g key={`sys-${coord.day}-${coord.fallbackIndex}`}>
            {mode === "daily" || coord.day === 1 || coord.day % 5 === 0 || coord.day === 30 || coord.fallbackIndex === selectedPointIndex ? (
              <text
                x={coord.x}
                y={Math.max(14, coord.y - 10)}
                textAnchor="middle"
                className="fill-[#2563EB] text-[10px] font-bold"
              >
                {coord.value}
              </text>
            ) : null}
            <circle
              cx={coord.x}
              cy={coord.y}
              r="5"
              fill="#2563EB"
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedPointIndex(coord.fallbackIndex);
              }}
            />
          </g>
        ))}
        {diastolic.coords.map((coord) => (
          <g key={`dia-${coord.day}-${coord.fallbackIndex}`}>
            {mode === "daily" || coord.day === 1 || coord.day % 5 === 0 || coord.day === 30 || coord.fallbackIndex === selectedPointIndex ? (
              <text
                x={coord.x}
                y={Math.max(14, coord.y - 10)}
                textAnchor="middle"
                className="fill-[#60A5FA] text-[10px] font-bold"
              >
                {coord.value}
              </text>
            ) : null}
            <circle
              cx={coord.x}
              cy={coord.y}
              r="5"
              fill="#60A5FA"
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedPointIndex(coord.fallbackIndex);
              }}
            />
          </g>
        ))}

        {tooltipPoint && tooltipCoord ? (
          <>
            <line x1={tooltipCoord.x} x2={tooltipCoord.x} y1={BP_CHART.top} y2={chartBottom} stroke="#94A3B8" strokeDasharray="4 5" opacity="0.6" />
            <g transform={`translate(${Math.min(chartRight - 84, Math.max(BP_CHART.left + 6, tooltipCoord.x - 37))} 42)`}>
          <rect width="84" height="68" rx="10" fill="white" filter="drop-shadow(0 8px 12px rgba(15,23,42,0.16))" />
          <text x="12" y="20" className="fill-[#0B1B3F] text-[12px] font-bold">
            {mode === "daily" ? tooltipPoint.label : `Day ${tooltipPoint.day}`}
          </text>
          <circle cx="14" cy="38" r="4" fill="#2563EB" />
          <text x="25" y="42" className="fill-[#0B1B3F] text-[11px]">
            ตัวบน {tooltipPoint.systolic}
          </text>
          <circle cx="14" cy="56" r="4" fill="#60A5FA" />
          <text x="25" y="60" className="fill-[#0B1B3F] text-[11px]">
            ตัวล่าง {tooltipPoint.diastolic}
          </text>
            </g>
          </>
        ) : null}

        {xTicks.map((tick) => (
          <text
            key={tick.label}
            x={tick.x}
            y={chartBottom + 24}
            textAnchor="middle"
            className="fill-[#64748B] text-[11px]"
          >
            {tick.label}
          </text>
        ))}
      </svg>

      <div className="mt-3 space-y-2 text-[13px] text-[#64748B]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-10 rounded-full bg-[#2563EB]" />
          แรงดันตอนหัวใจบีบตัว (Systolic)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-10 rounded-full bg-[#60A5FA]" />
          แรงดันตอนหัวใจคลายตัว (Diastolic)
        </span>
      </div>

      <div className="mt-5 border-t border-[#E5E7EB] pt-4">
        <Overview30Days />
      </div>
    </section>
  );
}

function Overview30Days() {
  return (
    <div>
      <h2 className="mb-3.5 text-xl font-bold text-[#0B1B3F]">ภาพรวม 30 วัน</h2>
      <div className="grid grid-cols-[repeat(15,18px)] justify-between gap-y-3">
        {BP_POINTS.map((point) => (
          <div key={point.day} className="flex w-[18px] flex-col items-center gap-1.5">
            <span className={`h-[18px] w-[18px] rounded-[5px] ${STATUS_META[point.status].className}`} />
            <span className="text-xs leading-none text-[#64748B]">{point.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#E5E7EB] p-3">
        {(Object.keys(STATUS_META) as BpStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`h-[18px] w-[18px] rounded-[5px] ${STATUS_META[status].className}`} />
            <span className="text-sm leading-tight text-[#64748B]">{STATUS_META[status].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceCriteriaCard() {
  const [isOpen, setIsOpen] = useState(false);
  const referenceUrl =
    "https://www.bangpakok3.com/care_blog/view/241#:~:text=%E0%B8%A3%E0%B8%B0%E0%B8%94%E0%B8%B1%E0%B8%9A%E0%B8%97%E0%B8%B5%E0%B9%88%201%20%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%94%E0%B8%B1%E0%B8%99,%E0%B8%9B%E0%B8%A3%E0%B8%AD%E0%B8%97";

  return (
    <section className="mb-4 overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F5F9] text-[#64748B]">
          <Icon name="doc" className="h-5 w-5" />
        </span>
        <span className="flex-1 text-sm leading-[1.35] text-[#64748B]">อ้างอิงเกณฑ์ระดับความดันโลหิต</span>
        <Icon name="chevron" className={`h-5 w-5 text-[#94A3B8] transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen ? (
        <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#475569]">
          <p className="mb-2 font-bold text-[#0B1B3F]">ระดับความดัน</p>
          <p>1. ระดับเหมาะสม ค่าความดันโลหิต ระหว่างน้อยกว่า 120 / น้อยกว่า 80 มม.ปรอท</p>
          <p>2. ระดับปกติ ค่าความดันโลหิต ระหว่าง 120-129 / 80-84 มม.ปรอท</p>
          <p>3. ระดับสูงกว่าปกติ ค่าความดันโลหิต ระหว่าง 130-139 / 85-89 มม.ปรอท</p>

          <p className="mb-2 mt-4 font-bold text-[#0B1B3F]">ระดับความรุนแรงของกลุ่มโรคความดันโลหิตสูง</p>
          <p>ระดับที่ 1 ความดันโลหิตสูงระยะเริ่มแรก ค่าความดันโลหิต ระหว่าง 140-159 / 90-99 มม.ปรอท</p>
          <p>ระดับที่ 2 ความดันโลหิตสูงระยะปานกลาง ค่าความดันโลหิต ระหว่าง 160-179 / 100-109 มม.ปรอท</p>
          <p>ระดับที่ 3 ความดันโลหิตสูงระยะรุนแรง ค่าความดันโลหิต มากกว่า 180 / 110 มม.ปรอท</p>

          <a href={referenceUrl} target="_blank" rel="noreferrer" className="mt-4 block font-semibold text-[#2563EB] underline-offset-4 hover:underline">
            ข้อมูลอ้างอิง: โรงพยาบาลบางปะกอก 3
          </a>
        </div>
      ) : null}

      <button type="button" className="flex min-h-16 w-full items-center gap-3 border-t border-[#E5E7EB] px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F5F9] text-[#64748B]">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <span className="flex-1 text-sm leading-[1.35] text-[#64748B]">ข้อมูลนี้ใช้เพื่อการติดตามสุขภาพเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์</span>
        <Icon name="chevron" className="h-5 w-5 text-[#94A3B8]" />
      </button>
    </section>
  );
}

function BottomNavigation() {
  const tabs = [
    { label: "หน้าหลัก", icon: "home" as const, active: true },
    { label: "สถิติ", icon: "stats" as const, active: false },
    { label: "หมวดหมู่", icon: "grid" as const, active: false },
    { label: "ไทม์ไลน์", icon: "clock" as const, active: false },
    { label: "ตั้งค่า", icon: "settings" as const, active: false },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[390px] rounded-t-[32px] border-t border-[#E5E7EB] bg-white px-3 pt-3 shadow-[0_-12px_32px_rgba(15,23,42,0.08)]">
      <div className="grid h-[84px] grid-cols-5 items-end pb-[calc(14px+env(safe-area-inset-bottom))]">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`relative flex flex-col items-center justify-end gap-1.5 text-[13px] font-semibold ${
              tab.active ? "text-[#2563EB]" : "text-[#94A3B8]"
            }`}
          >
            <span className="relative grid h-9 w-9 place-items-center">
              <Icon name={tab.icon} className={tab.active ? "h-8 w-8 fill-current" : "h-8 w-8"} />
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mb-2 h-1.5 w-[134px] rounded-full bg-black" />
    </nav>
  );
}

function EditDOBBottomSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/25">
      <section className="fixed bottom-0 w-full max-w-[390px] rounded-t-[28px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_rgba(15,23,42,0.22)]">
        <div className="mx-auto h-[5px] w-11 rounded-full bg-[#CBD5E1]" />
        <h2 className="mb-5 mt-5 text-center text-[22px] font-bold text-[#0B1B3F]">แก้ไขวันเดือนปีเกิด</h2>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#0B1B3F]">วันเดือนปีเกิด</span>
          <button
            type="button"
            className="flex h-[52px] w-full items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-left text-base text-[#0B1B3F]"
          >
            <span className="flex items-center gap-3">
              <Icon name="calendar" className="h-5 w-5 text-[#64748B]" />
              12 มี.ค. 2493
            </span>
            <span className="text-xl leading-none text-[#64748B]">⌄</span>
          </button>
        </label>

        <p className="mt-2 text-[13px] text-[#64748B]">รูปแบบ: วว/ดด/ปปปป (พ.ศ.)</p>

        <div className="mt-4 flex gap-3 rounded-[14px] bg-[#F1F5F9] p-3.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#64748B] text-xs font-bold text-white">i</span>
          <p className="text-sm leading-[1.45] text-[#64748B]">
            เมื่อบันทึกแล้ว อายุจะถูกคำนวณใหม่อัตโนมัติ และข้อมูลที่เกี่ยวข้องจะถูกอัปเดต
          </p>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[52px] flex-1 rounded-[14px] border border-[#CBD5E1] bg-white text-base font-semibold text-[#0B1B3F]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-[52px] flex-1 rounded-[14px] bg-[#2563EB] text-base font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
          >
            บันทึก
          </button>
        </div>
      </section>
    </div>
  );
}

function SaveToast({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-[60] flex h-[52px] w-[260px] -translate-x-1/2 items-center justify-center gap-3 rounded-[14px] bg-[#1F2937] text-white shadow-2xl">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#22C55E] font-bold">✓</span>
      <span className="font-medium">บันทึกเรียบร้อย</span>
    </div>
  );
}

export function MiniAppReport({ selectedGroupId }: MiniAppReportProps) {
  const { messages } = useAutoTrackMessages();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);

  const groupName = useMemo(() => getGroupName(messages, selectedGroupId), [messages, selectedGroupId]);
  const avatarUrl = useMemo(() => getGroupAvatar(messages, selectedGroupId), [messages, selectedGroupId]);
  const monthlyBloodPressurePoints = useMemo(
    () => getMonthlyBloodPressurePoints(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const measuredDates = useMemo(() => getMeasuredDates(messages, selectedGroupId), [messages, selectedGroupId]);
  const activeChartDate =
    selectedChartDate && measuredDates.includes(selectedChartDate)
      ? selectedChartDate
      : measuredDates.at(-1) ?? null;
  const dailyBloodPressurePoints = useMemo(
    () => getDailyBloodPressurePoints(messages, selectedGroupId, activeChartDate),
    [messages, selectedGroupId, activeChartDate],
  );
  const latestSourceTimestamp = useMemo(
    () => getLatestSourceTimestamp(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const bloodPressurePoints = chartMode === "daily" ? dailyBloodPressurePoints : monthlyBloodPressurePoints;
  const chartPeriodLabel =
    chartMode === "daily"
      ? `รายวัน: ${activeChartDate ? formatThaiDateLabel(activeChartDate) : formatThaiDateFromTimestamp(latestSourceTimestamp)}`
      : `รายเดือน: ${measuredDates.at(-1) ? formatThaiMonthLabel(measuredDates.at(-1) ?? "") : formatThaiMonthFromTimestamp(latestSourceTimestamp)} (ค่าเฉลี่ยรายวัน)`;

  function handleSaveDob() {
    setIsEditOpen(false);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 1800);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FAFC] font-sans text-[#0B1B3F]">
      <div className="mx-auto min-h-screen max-w-[390px] overflow-x-hidden bg-[#F8FAFC]">
        <TopHeader />

        <div className="px-3 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
          <p className="mb-3 truncate rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-[#64748B] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            กลุ่ม LINE: {groupName}
          </p>

          <PatientProfileCard avatarUrl={avatarUrl} onEditDob={() => setIsEditOpen(true)} />
          <AlertCard />
          <LatestHealthCards />
          <BloodPressureChart
            mode={chartMode}
            onModeChange={setChartMode}
            periodLabel={chartPeriodLabel}
            points={bloodPressurePoints}
            measuredDates={measuredDates}
            selectedDate={activeChartDate}
            onSelectedDateChange={setSelectedChartDate}
          />
          <ReferenceCriteriaCard />
        </div>

        <BottomNavigation />
        <EditDOBBottomSheet open={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={handleSaveDob} />
        <SaveToast show={showToast} />
      </div>
    </main>
  );
}
