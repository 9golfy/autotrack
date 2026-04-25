"use client";

import { useEffect, useMemo, useState } from "react";

import { Avatar, EmptyPanel, type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";
import { buildHealthReport, extractTimedVitalsSamples } from "@/lib/health-report";

type MiniAppReportProps = {
  selectedGroupId: string | null;
};

type ShiftKey = "day" | "night";
type TimePointKey = "06:00" | "10:00" | "18:00" | "22:00";
type MetricTone = "green" | "orange" | "red";

type ShiftSummary = {
  key: ShiftKey;
  label: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  spo2: number | null;
  isFallback: boolean;
};

type TimePointSummary = {
  key: TimePointKey;
  label: string;
  shiftLabel: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  spo2: number | null;
  isFallback: boolean;
};

const TIME_POINT_ORDER: TimePointKey[] = ["22:00", "06:00", "10:00", "18:00"];

type TimelineGroup = {
  key: ShiftKey;
  label: string;
  entries: {
    id: string;
    icon: string;
    title: string;
    detail: string;
    timeLabel: string;
  }[];
};

type ReminderStatus = "กินแล้ว" | "ยังไม่ได้บันทึก" | "เกินเวลา";

const SHIFT_META: Record<ShiftKey, { label: string; fallback: Omit<ShiftSummary, "key" | "label" | "isFallback"> }> = {
  day: {
    label: "เวรกลางวัน (08:00–20:00)",
    fallback: {
      systolic: 122,
      diastolic: 78,
      heartRate: 74,
      temperature: 36.8,
      spo2: 98,
    },
  },
  night: {
    label: "เวรกลางคืน (20:00–08:00)",
    fallback: {
      systolic: 118,
      diastolic: 76,
      heartRate: 70,
      temperature: 36.7,
      spo2: 97,
    },
  },
};

const TIME_POINT_META: Record<TimePointKey, { label: string; shiftLabel: string; hour: number; minute: number }> = {
  "22:00": { label: "22:00 น.", shiftLabel: "เวรกลางคืน (คืนก่อนหน้า)", hour: 22, minute: 0 },
  "06:00": { label: "06:00 น.", shiftLabel: "เวรกลางคืน (เช้าวันรายงาน)", hour: 6, minute: 0 },
  "10:00": { label: "10:00 น.", shiftLabel: "เวรกลางวัน", hour: 10, minute: 0 },
  "18:00": { label: "18:00 น.", shiftLabel: "เวรกลางวัน", hour: 18, minute: 0 },
};

const TIME_POINT_FALLBACK: Record<TimePointKey, Omit<TimePointSummary, "key" | "label" | "shiftLabel" | "isFallback">> = {
  "22:00": { systolic: 143, diastolic: 88, heartRate: 74, temperature: 36.3, spo2: 96 },
  "06:00": { systolic: 119, diastolic: 85, heartRate: 88, temperature: 36.9, spo2: 99 },
  "10:00": { systolic: 128, diastolic: 86, heartRate: 74, temperature: 36.3, spo2: 98 },
  "18:00": { systolic: 106, diastolic: 72, heartRate: 74, temperature: 36.8, spo2: 97 },
};

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function offsetDayKey(dateKey: string, dayOffset: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return getDayKey(date.getTime());
}

function shortenUserId(userId: string | null | undefined) {
  if (!userId) {
    return "Unknown";
  }

  if (userId.length <= 16) {
    return userId;
  }

  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

function getGroupName(messages: MessageRecord[]) {
  const named = messages.find((message) => message.rawPayload?.lineIdentity?.groupName?.trim());
  if (named?.rawPayload?.lineIdentity?.groupName) {
    return named.rawPayload.lineIdentity.groupName;
  }

  const fallback = messages.find((message) => message.groupId);
  return fallback?.groupId ? `Group ${fallback.groupId}` : "LINE Group";
}

function resolveReporterTimestamp(message: MessageRecord | undefined, dateKey: string) {
  if (message?.timestamp) {
    return Number(message.timestamp);
  }

  return new Date(`${dateKey}T00:00:00`).getTime();
}

function isTestMessage(message: MessageRecord) {
  const text = `${message.text ?? ""} ${message.displayName ?? ""}`.toLowerCase();
  return text.includes("test");
}

function isEligibleGroupMessage(message: MessageRecord, groupId: string) {
  if (message.groupId !== groupId) {
    return false;
  }

  if (message.source === "liff" || message.source === "web") {
    return false;
  }

  if (message.type === "liff-profile" || message.type === "qr-scan" || message.type === "outbound") {
    return false;
  }

  if (isTestMessage(message)) {
    return false;
  }

  return true;
}

function getShiftFromHour(hour: number): ShiftKey {
  return hour >= 8 && hour < 20 ? "day" : "night";
}

function createShiftSummaries(messages: MessageRecord[], dateKey: string) {
  const dayMessages = messages.filter((message) => getDayKey(Number(message.timestamp)) === dateKey);
  const timedSamples = extractTimedVitalsSamples(
    dayMessages.map((message) => ({
      id: message.id,
      text: message.text,
      contentUrl: message.contentUrl,
      type: message.type,
      timestamp: Number(message.timestamp),
      displayName: message.displayName,
      userId: message.userId,
      pictureUrl: message.pictureUrl,
      groupId: message.groupId,
      groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
    })),
  );

  const summaries = (Object.keys(SHIFT_META) as ShiftKey[]).map((key) => {
    const sample = timedSamples
      .filter((item) => getShiftFromHour(item.hour) === key)
      .sort((left, right) => {
        if (left.sourceTimestamp !== right.sourceTimestamp) {
          return right.sourceTimestamp - left.sourceTimestamp;
        }

        if (left.hour !== right.hour) {
          return right.hour - left.hour;
        }

        return right.minute - left.minute;
      })[0];

    if (sample) {
      return {
        key,
        label: SHIFT_META[key].label,
        systolic: sample.systolic,
        diastolic: sample.diastolic,
        heartRate: sample.heartRate,
        temperature: sample.temperature,
        spo2: sample.spo2,
        isFallback: false,
      } satisfies ShiftSummary;
    }

    return {
      key,
      label: SHIFT_META[key].label,
      ...SHIFT_META[key].fallback,
      isFallback: true,
    } satisfies ShiftSummary;
  });

  return {
    hasRealData: summaries.some((summary) => !summary.isFallback),
    summaries,
  };
}

function getTimePointKey(hour: number, minute: number): TimePointKey | null {
  const minutes = hour * 60 + minute;
  const nearest = TIME_POINT_ORDER
    .map((key) => {
      const meta = TIME_POINT_META[key];
      return {
        key,
        distance: Math.abs(minutes - (meta.hour * 60 + meta.minute)),
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];

  return nearest && nearest.distance <= 45 ? nearest.key : null;
}

function createTimePointSummaries(messages: MessageRecord[], dateKey: string) {
  const previousDateKey = offsetDayKey(dateKey, -1);
  const eligibleDateKeys = new Set([dateKey, previousDateKey]);
  const dayMessages = messages.filter((message) => eligibleDateKeys.has(getDayKey(Number(message.timestamp))));
  const timedSamples = extractTimedVitalsSamples(
    dayMessages.map((message) => ({
      id: message.id,
      text: message.text,
      contentUrl: message.contentUrl,
      type: message.type,
      timestamp: Number(message.timestamp),
      displayName: message.displayName,
      userId: message.userId,
      pictureUrl: message.pictureUrl,
      groupId: message.groupId,
      groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
    })),
  );

  const sampleMap = new Map<TimePointKey, (typeof timedSamples)[number]>();

  for (const sample of timedSamples) {
    const key = getTimePointKey(sample.hour, sample.minute);
    if (!key) {
      continue;
    }

    const sourceDateKey = getDayKey(sample.sourceTimestamp);
    const belongsToSelectedReportDate =
      sourceDateKey === dateKey || (key === "22:00" && sourceDateKey === previousDateKey);

    if (!belongsToSelectedReportDate) {
      continue;
    }

    const current = sampleMap.get(key);
    if (
      !current ||
      sample.sourceTimestamp > current.sourceTimestamp ||
      (sample.sourceTimestamp === current.sourceTimestamp && sample.hour * 60 + sample.minute > current.hour * 60 + current.minute)
    ) {
      sampleMap.set(key, sample);
    }
  }

  const hasAnyRealSample = sampleMap.size > 0;
  const summaries = TIME_POINT_ORDER.map((key) => {
    const meta = TIME_POINT_META[key];
    const sample = sampleMap.get(key);

    if (sample) {
      return {
        key,
        label: meta.label,
        shiftLabel: meta.shiftLabel,
        systolic: sample.systolic,
        diastolic: sample.diastolic,
        heartRate: sample.heartRate,
        temperature: sample.temperature,
        spo2: sample.spo2,
        isFallback: false,
      } satisfies TimePointSummary;
    }

    if (hasAnyRealSample) {
      return {
        key,
        label: meta.label,
        shiftLabel: meta.shiftLabel,
        systolic: null,
        diastolic: null,
        heartRate: null,
        temperature: null,
        spo2: null,
        isFallback: false,
      } satisfies TimePointSummary;
    }

    return {
      key,
      label: meta.label,
      shiftLabel: meta.shiftLabel,
      ...TIME_POINT_FALLBACK[key],
      isFallback: true,
    } satisfies TimePointSummary;
  });

  return {
    hasRealData: summaries.some((summary) => !summary.isFallback),
    summaries,
  };
}

function toneClasses(tone: MetricTone) {
  if (tone === "red") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (tone === "orange") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function heroGradient(tone: MetricTone) {
  if (tone === "red") {
    return "from-[#0D47A1] via-[#1976D2] to-[#E53935]";
  }

  if (tone === "orange") {
    return "from-[#0D47A1] via-[#1976D2] to-[#FFB300]";
  }

  return "from-[#0D47A1] via-[#1976D2] to-[#38BDF8]";
}

function normalizeValue(value: number | null, min: number, max: number) {
  if (value === null) {
    return null;
  }

  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

function buildGraphSeries(
  summaries: TimePointSummary[],
  metric: "systolic" | "heartRate" | "temperature" | "spo2",
) {
  const width = 680;
  const height = 260;
  const xStart = 110;
  const xEnd = width - 110;
  const step = summaries.length > 1 ? (xEnd - xStart) / (summaries.length - 1) : 0;

  const [min, max] =
    metric === "systolic"
      ? [90, 180]
      : metric === "heartRate"
        ? [50, 120]
        : metric === "temperature"
          ? [35, 39]
          : [90, 100];

  const chartHeight = height - 80;

  const points = summaries.map((item, index) => {
    const value = item[metric];
    const normalized = normalizeValue(value, min, max);
    return {
      key: item.key,
      label: item.label,
      x: xStart + index * step,
      y: normalized === null ? null : height - 40 - normalized * chartHeight,
      value,
    };
  });

  let path = "";

  let isDrawing = false;
  points.forEach((point) => {
    if (point.y === null) {
      isDrawing = false;
      return;
    }

    path += `${isDrawing ? " L" : "M"} ${point.x} ${point.y}`;
    isDrawing = true;
  });

  return { width, height, points, path };
}

function formatAxisLabel(metric: "systolic" | "heartRate" | "temperature" | "spo2", value: number) {
  if (metric === "temperature") {
    return `${value.toFixed(1)}°C`;
  }

  if (metric === "heartRate") {
    return `${value} bpm`;
  }

  if (metric === "spo2") {
    return `${value}%`;
  }

  return `${value}`;
}

function getMessageIconAndTitle(message: MessageRecord) {
  const text = message.text ?? "";

  if (message.contentUrl || message.type === "image") {
    return { icon: "📷", title: "หลักฐานรูปภาพจาก LINE" };
  }

  if (text.includes("ยา")) {
    return { icon: "💊", title: "การแจ้งเตือนการรับประทานยา" };
  }

  if (text.includes("อาหาร") || text.includes("มื้อ") || text.includes("ข้าว")) {
    return { icon: "🍽️", title: "บันทึกมื้ออาหาร" };
  }

  if (/\d{2,3}\s*\/\s*\d{2,3}|SpO2|อุณหภูมิ|ชีพจร|หัวใจ/i.test(text)) {
    return { icon: "🩺", title: "บันทึกข้อมูลสุขภาพ" };
  }

  return { icon: "📩", title: "หมายเหตุจากผู้ดูแล" };
}

function buildTimelineGroups(messages: MessageRecord[]) {
  const groups: TimelineGroup[] = [
    { key: "day", label: SHIFT_META.day.label, entries: [] },
    { key: "night", label: SHIFT_META.night.label, entries: [] },
  ];

  const groupedMap = new Map<ShiftKey, TimelineGroup>(groups.map((group) => [group.key, group]));

  [...messages]
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
    .forEach((message) => {
      const shift = getShiftFromHour(new Date(Number(message.timestamp)).getHours());
      const group = groupedMap.get(shift);
      if (!group) {
        return;
      }

      const meta = getMessageIconAndTitle(message);
      group.entries.push({
        id: message.id,
        icon: meta.icon,
        title: meta.title,
        detail: message.text?.trim() || (message.contentUrl ? "แนบภาพประกอบสุขภาพจาก LINE" : "บันทึกจาก LINE"),
        timeLabel: formatClock(Number(message.timestamp)),
      });
    });

  return groups.filter((group) => group.entries.length > 0);
}

function buildMedicationReminders(messages: MessageRecord[], selectedDateKey: string) {
  const now = new Date();
  const todayKey = getDayKey(now.getTime());
  const sameDay = selectedDateKey === todayKey;

  const hasMedicationMention = {
    day: messages.some((message) => {
      const hour = new Date(Number(message.timestamp)).getHours();
      return getShiftFromHour(hour) === "day" && (message.text ?? "").includes("ยา");
    }),
    night: messages.some((message) => {
      const hour = new Date(Number(message.timestamp)).getHours();
      return getShiftFromHour(hour) === "night" && (message.text ?? "").includes("ยา");
    }),
  };

  const currentHour = now.getHours();

  const getStatus = (shift: ShiftKey): ReminderStatus => {
    if (hasMedicationMention[shift]) {
      return "กินแล้ว";
    }

    if (!sameDay) {
      return "เกินเวลา";
    }

    if (shift === "day" && currentHour >= 20) {
      return "เกินเวลา";
    }

    if (shift === "night" && currentHour >= 8 && currentHour < 20) {
      return "ยังไม่ได้บันทึก";
    }

    return "ยังไม่ได้บันทึก";
  };

  return [
    { time: "08:00", title: "ยาหลังอาหาร", status: getStatus("day") },
    { time: "20:00", title: "ยาก่อนนอน", status: getStatus("night") },
  ];
}

function SummaryMetric({
  icon,
  label,
  value,
  unit,
  tone,
  statusLabel,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  tone: MetricTone;
  statusLabel: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none">{icon}</span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${toneClasses(tone)}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function ShiftVitalsCard({
  title,
  summary,
  reportTone,
}: {
  title: string;
  summary: ShiftSummary;
  reportTone: MetricTone;
}) {
  const bloodPressureValue =
    summary.systolic !== null && summary.diastolic !== null
      ? `${summary.systolic}/${summary.diastolic}`
      : "ไม่มีข้อมูล";

  return (
    <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{summary.label}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${toneClasses(reportTone)}`}>
          {summary.isFallback ? "ค่าเดโม" : "ข้อมูลจริง"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryMetric
          icon="🩺"
          label="ความดันโลหิต"
          value={bloodPressureValue}
          unit="mmHg"
          tone={reportTone}
          statusLabel={bloodPressureValue === "ไม่มีข้อมูล" ? "ไม่มีข้อมูล" : "บันทึกแล้ว"}
        />
        <SummaryMetric
          icon="❤️"
          label="ชีพจร"
          value={summary.heartRate !== null ? `${summary.heartRate}` : "ไม่มีข้อมูล"}
          unit={summary.heartRate !== null ? "bpm" : ""}
          tone={reportTone}
          statusLabel={summary.heartRate !== null ? "บันทึกแล้ว" : "ไม่มีข้อมูล"}
        />
        <SummaryMetric
          icon="🌡️"
          label="อุณหภูมิร่างกาย"
          value={summary.temperature !== null ? `${summary.temperature.toFixed(1)}` : "ไม่มีข้อมูล"}
          unit={summary.temperature !== null ? "°C" : ""}
          tone={reportTone}
          statusLabel={summary.temperature !== null ? "บันทึกแล้ว" : "ไม่มีข้อมูล"}
        />
        <SummaryMetric
          icon="🫁"
          label="ค่าออกซิเจนในเลือด"
          value={summary.spo2 !== null ? `${summary.spo2}` : "ไม่มีข้อมูล"}
          unit={summary.spo2 !== null ? "%" : ""}
          tone={reportTone}
          statusLabel={summary.spo2 !== null ? "บันทึกแล้ว" : "ไม่มีข้อมูล"}
        />
      </div>
    </div>
  );
}

function HealthGraph({
  timePointSummaries,
  useFallbackDemo,
}: {
  timePointSummaries: TimePointSummary[];
  useFallbackDemo: boolean;
}) {
  const [selectedTimeKey, setSelectedTimeKey] = useState<TimePointKey>("22:00");

  const bloodPressureGraph = useMemo(() => buildGraphSeries(timePointSummaries, "systolic"), [timePointSummaries]);
  const heartRateGraph = useMemo(() => buildGraphSeries(timePointSummaries, "heartRate"), [timePointSummaries]);
  const temperatureGraph = useMemo(() => buildGraphSeries(timePointSummaries, "temperature"), [timePointSummaries]);
  const spo2Graph = useMemo(() => buildGraphSeries(timePointSummaries, "spo2"), [timePointSummaries]);

  const selectedTimePoint = timePointSummaries.find((item) => item.key === selectedTimeKey) ?? timePointSummaries[0];
  const selectedShift = selectedTimePoint;

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_-56px_rgba(13,71,161,0.22)]">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Health Graph</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">เปรียบเทียบแนวโน้มสุขภาพรายเวร</h3>
        <p className="mt-2 text-sm text-slate-500">เวรกลางวัน (08:00–20:00) และ เวรกลางคืน (20:00–08:00)</p>
        {useFallbackDemo ? (
          <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
            แสดงค่าตัวอย่างสำหรับเดโม
          </span>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#eef6ff_0%,#ffffff_60%)] px-2 py-4">
        <svg viewBox={`0 0 ${bloodPressureGraph.width} ${bloodPressureGraph.height}`} className="h-[320px] w-full" role="img" aria-label="Daily shift comparison graph">
          {[180, 150, 120, 90].map((value, index) => (
            <text
              key={`bp-axis-${value}`}
              x="20"
              y={56 + index * 56}
              className="fill-blue-500 text-[11px]"
            >
              {formatAxisLabel("systolic", value)}
            </text>
          ))}
          {[120, 100, 80, 60].map((value, index) => (
            <text
              key={`hr-axis-${value}`}
              x="76"
              y={56 + index * 56}
              className="fill-violet-500 text-[11px]"
            >
              {formatAxisLabel("heartRate", value)}
            </text>
          ))}
          {[39, 38, 37, 36].map((value, index) => (
            <text
              key={`temp-axis-${value}`}
              x={bloodPressureGraph.width - 90}
              y={56 + index * 56}
              className="fill-rose-500 text-[11px]"
            >
              {formatAxisLabel("temperature", value)}
            </text>
          ))}
          {[100, 98, 96, 94].map((value, index) => (
            <text
              key={`spo2-axis-${value}`}
              x={bloodPressureGraph.width - 24}
              y={56 + index * 56}
              textAnchor="end"
              className="fill-emerald-500 text-[11px]"
            >
              {formatAxisLabel("spo2", value)}
            </text>
          ))}

          {[56, 112, 168].map((y) => (
            <line
              key={y}
              x1="72"
              x2={bloodPressureGraph.width - 72}
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray="6 8"
            />
          ))}

          {bloodPressureGraph.points.map((point) => (
            <g key={point.key}>
              <line x1={point.x} x2={point.x} y1="28" y2={bloodPressureGraph.height - 48} stroke="#F1F5F9" />
              <text x={point.x} y={bloodPressureGraph.height - 18} textAnchor="middle" className="fill-slate-500 text-[12px]">
                {point.label}
              </text>
            </g>
          ))}

          <path d={bloodPressureGraph.path} fill="none" stroke="#1976D2" strokeWidth="4" strokeLinecap="round" />
          <path d={heartRateGraph.path} fill="none" stroke="#7C4DFF" strokeWidth="4" strokeLinecap="round" />
          <path d={temperatureGraph.path} fill="none" stroke="#E53935" strokeWidth="4" strokeLinecap="round" />
          <path d={spo2Graph.path} fill="none" stroke="#00C853" strokeWidth="4" strokeLinecap="round" />

          {bloodPressureGraph.points.map((point) =>
            point.y === null ? null : (
              <circle
                key={`bp-${point.key}`}
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#1976D2"
                onClick={() => setSelectedTimeKey(point.key)}
              />
            ),
          )}
          {heartRateGraph.points.map((point) =>
            point.y === null ? null : (
              <circle
                key={`hr-${point.key}`}
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#7C4DFF"
                onClick={() => setSelectedTimeKey(point.key)}
              />
            ),
          )}
          {temperatureGraph.points.map((point) =>
            point.y === null ? null : (
              <circle
                key={`temp-${point.key}`}
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#E53935"
                onClick={() => setSelectedTimeKey(point.key)}
              />
            ),
          )}
          {spo2Graph.points.map((point) =>
            point.y === null ? null : (
              <circle
                key={`spo2-${point.key}`}
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#00C853"
                onClick={() => setSelectedTimeKey(point.key)}
              />
            ),
          )}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">BP</span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">HR</span>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Temp</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">SpO2</span>
      </div>

      {selectedShift ? (
        <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-950">
            {selectedShift.label} · {selectedShift.shiftLabel}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
            <p>BP: {selectedShift.systolic && selectedShift.diastolic ? `${selectedShift.systolic}/${selectedShift.diastolic}` : "ไม่มีข้อมูล"}</p>
            <p>HR: {selectedShift.heartRate !== null ? `${selectedShift.heartRate} bpm` : "ไม่มีข้อมูล"}</p>
            <p>Temp: {selectedShift.temperature !== null ? `${selectedShift.temperature.toFixed(1)}°C` : "ไม่มีข้อมูล"}</p>
            <p>SpO2: {selectedShift.spo2 !== null ? `${selectedShift.spo2}%` : "ไม่มีข้อมูล"}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MedicationReminder({
  reminders,
}: {
  reminders: { time: string; title: string; status: ReminderStatus }[];
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.2)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Medication Reminder</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">การแจ้งเตือนการรับประทานยา</h3>
      </div>

      <div className="mt-5 space-y-3">
        {reminders.map((item) => {
          const tone =
            item.status === "กินแล้ว"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : item.status === "เกินเวลา"
                ? "bg-rose-50 text-rose-700 ring-rose-100"
                : "bg-amber-50 text-amber-700 ring-amber-100";

          return (
            <div key={`${item.time}-${item.title}`} className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {item.time} · {item.title}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${tone}`}>{item.status}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HealthCriteria({
  items,
}: {
  items: { label: string; detail: string }[];
}) {
  return (
    <details className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.18)]">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Health Criteria</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">เกณฑ์อ้างอิง</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">i</span>
      </summary>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function TimelineStory({ groups }: { groups: TimelineGroup[] }) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.2)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Timeline</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">เรื่องราวการดูแลในแต่ละเวร</h3>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-sm font-semibold text-slate-900">{group.label}</p>
            <div className="mt-4 space-y-4">
              {group.entries.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex w-10 shrink-0 flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-lg">
                      {entry.icon}
                    </div>
                    {index < group.entries.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs text-slate-400">{entry.timeLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{entry.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceGallery({
  images,
}: {
  images: { id: string; title: string; subtitle: string; imageUrl: string }[];
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.2)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Evidence</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">หลักฐานจาก LINE</h3>
      </div>

      <div className="mt-5 grid gap-4">
        {images.length === 0 ? (
          <EmptyPanel title="ยังไม่มีหลักฐานรูปภาพ" description="เมื่อมีการแนบรูปในกลุ่ม ระบบจะแสดงเป็นการ์ดขนาดใหญ่ในส่วนนี้" />
        ) : (
          images.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.title} className="h-64 w-full object-cover" />
              <div className="p-4">
                <p className="text-base font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function MiniAppReport({ selectedGroupId }: MiniAppReportProps) {
  const { messages, status, error, setupMessage } = useAutoTrackMessages();
  const [selectedDateIndex] = useState(0);

  const filteredMessages = useMemo(() => {
    if (!selectedGroupId) {
      return [];
    }

    return messages.filter((message) => isEligibleGroupMessage(message, selectedGroupId));
  }, [messages, selectedGroupId]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.log("[MiniApp] selectedGroupId", selectedGroupId);
    messages.forEach((message) => {
      console.log("[MiniApp] incoming message groupId", message.groupId);
      if (selectedGroupId && message.groupId !== selectedGroupId) {
        console.log("[MiniApp] skip render because groupId mismatch", {
          selectedGroupId,
          incomingGroupId: message.groupId,
          messageId: message.id,
        });
      }
    });
  }, [messages, selectedGroupId]);

  const availableDates = useMemo(() => {
    const unique = new Set(filteredMessages.map((message) => getDayKey(Number(message.timestamp))));
    return Array.from(unique).sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  }, [filteredMessages]);

  const selectedDateKey = availableDates[selectedDateIndex] ?? null;

  const dayMessages = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }

    return filteredMessages.filter((message) => getDayKey(Number(message.timestamp)) === selectedDateKey);
  }, [filteredMessages, selectedDateKey]);

  const report = useMemo(() => {
    if (dayMessages.length === 0) {
      return null;
    }

    return buildHealthReport(
      dayMessages.map((message) => ({
        id: message.id,
        text: message.text,
        contentUrl: message.contentUrl,
        type: message.type,
        timestamp: Number(message.timestamp),
        displayName: message.displayName,
        userId: message.userId,
        pictureUrl: message.pictureUrl,
        groupId: message.groupId,
        groupName: message.rawPayload?.lineIdentity?.groupName ?? null,
      })),
    );
  }, [dayMessages]);

  const shiftData = useMemo(() => {
    if (!selectedDateKey) {
      return { hasRealData: false, summaries: [] as ShiftSummary[] };
    }

    return createShiftSummaries(filteredMessages, selectedDateKey);
  }, [filteredMessages, selectedDateKey]);

  const timePointData = useMemo(() => {
    if (!selectedDateKey) {
      return { hasRealData: false, summaries: [] as TimePointSummary[] };
    }

    return createTimePointSummaries(filteredMessages, selectedDateKey);
  }, [filteredMessages, selectedDateKey]);

  const medicationReminders = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }

    return buildMedicationReminders(dayMessages, selectedDateKey);
  }, [dayMessages, selectedDateKey]);

  const timelineGroups = useMemo(() => buildTimelineGroups(dayMessages), [dayMessages]);

  const evidenceImages = useMemo(
    () =>
      dayMessages
        .filter((message) => Boolean(message.contentUrl))
        .map((message) => ({
          id: message.id,
          title: "ภาพประกอบสุขภาพ",
          subtitle: "ภาพจาก LINE chat",
          imageUrl: message.contentUrl as string,
        })),
    [dayMessages],
  );

  if (!selectedGroupId) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <EmptyPanel title="ยังไม่มีข้อมูลจากกลุ่มนี้" description="เปิดรายงานจาก dashboard หรือส่ง groupId มาที่ /mini-app?groupId=..." />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (setupMessage) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {setupMessage}
        </div>
      </main>
    );
  }

  if (!report || !selectedDateKey) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#f8fafc_100%)] px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0D47A1_0%,#1976D2_52%,#38BDF8_100%)] px-6 py-7 text-white shadow-[0_40px_120px_-56px_rgba(13,71,161,0.5)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">AutoHealth Mini App</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Patient Health Story from LINE Group</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">รายงานสุขภาพนี้จะแสดงเฉพาะข้อมูลของกลุ่ม LINE ที่เลือกเท่านั้น เพื่อให้ครอบครัวเห็นเรื่องราวสุขภาพที่ชัดเจนและน่าเชื่อถือ</p>
          </section>
          <EmptyPanel title="ยังไม่มีข้อมูลจากกลุ่มนี้" description="เมื่อมีข้อความสุขภาพจากกลุ่มที่เลือก ระบบจะแสดงรายงานสุขภาพของกลุ่มนี้เท่านั้น" />
        </div>
      </main>
    );
  }

  const latestMessage = dayMessages[0];
  const groupName = getGroupName(dayMessages);
  const reporterTimestamp = resolveReporterTimestamp(latestMessage, selectedDateKey);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#f8fafc_100%)] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          📍 กลุ่ม: {groupName}
        </div>

        <section className={`overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,var(--tw-gradient-stops))] px-6 py-7 text-white shadow-[0_40px_120px_-56px_rgba(13,71,161,0.5)] ${heroGradient(report.statusTone)}`}>
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">AutoHealth Mini App</p>
              <p className="mt-4 text-sm font-medium text-white/80">รายงานสุขภาพประจำวัน</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">กลุ่ม: {groupName}</h1>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">สุขภาพโดยรวม: {report.statusLabel}</p>
              
            </div>

            
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.2)]">
          <div className="flex items-center gap-4">
            <Avatar avatarUrl={report.reporterAvatarUrl} displayName={report.reporterName} size={56} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">ผู้รายงาน (Patient Reporter)</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{report.reporterName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {shortenUserId(latestMessage?.userId)} • {formatClock(reporterTimestamp)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Health Summary</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">สรุปสัญญาณชีพสำคัญ</h2>
              <p className="mt-1 text-sm text-slate-500">แสดงข้อมูล 2 รอบของวันเดียวกัน แยกเป็นเวรกลางวันและเวรกลางคืน</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${toneClasses(report.statusTone)}`}>
              {report.statusLabel}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {shiftData.summaries.map((summary) => (
              <ShiftVitalsCard
                key={summary.key}
                title={summary.key === "day" ? "เวรกลางวัน" : "เวรกลางคืน"}
                summary={summary}
                reportTone={report.statusTone}
              />
            ))}
          </div>
        </section>

        <HealthGraph timePointSummaries={timePointData.summaries} useFallbackDemo={!timePointData.hasRealData} />

        <MedicationReminder reminders={medicationReminders} />

        <HealthCriteria items={report.criteriaReference} />

        <TimelineStory groups={timelineGroups} />

        <EvidenceGallery images={evidenceImages} />

        <div className="px-2 text-center text-xs text-slate-400">{status}</div>
      </div>
    </main>
  );
}
