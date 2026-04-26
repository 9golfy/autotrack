"use client";

import { useMemo, useState } from "react";

import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";

type MiniAppReportProps = {
  selectedGroupId: string | null;
};

type BpStatus = "normal" | "watch" | "high" | "consult";

type BloodPressurePoint = {
  day: number;
  dateLabel: string;
  systolic: number;
  diastolic: number;
  status: BpStatus;
};

const BLOOD_PRESSURE_POINTS: BloodPressurePoint[] = [
  { day: 1, dateLabel: "1 พ.ค.", systolic: 123, diastolic: 106, status: "normal" },
  { day: 2, dateLabel: "2 พ.ค.", systolic: 129, diastolic: 109, status: "normal" },
  { day: 3, dateLabel: "3 พ.ค.", systolic: 122, diastolic: 105, status: "watch" },
  { day: 4, dateLabel: "4 พ.ค.", systolic: 118, diastolic: 102, status: "watch" },
  { day: 5, dateLabel: "5 พ.ค.", systolic: 121, diastolic: 105, status: "watch" },
  { day: 6, dateLabel: "6 พ.ค.", systolic: 128, diastolic: 109, status: "watch" },
  { day: 7, dateLabel: "7 พ.ค.", systolic: 127, diastolic: 108, status: "high" },
  { day: 8, dateLabel: "8 พ.ค.", systolic: 134, diastolic: 113, status: "high" },
  { day: 9, dateLabel: "9 พ.ค.", systolic: 134, diastolic: 113, status: "high" },
  { day: 10, dateLabel: "10 พ.ค.", systolic: 134, diastolic: 112, status: "high" },
  { day: 11, dateLabel: "11 พ.ค.", systolic: 125, diastolic: 108, status: "watch" },
  { day: 12, dateLabel: "12 พ.ค.", systolic: 126, diastolic: 107, status: "watch" },
  { day: 13, dateLabel: "13 พ.ค.", systolic: 124, diastolic: 105, status: "watch" },
  { day: 14, dateLabel: "14 พ.ค.", systolic: 121, diastolic: 103, status: "consult" },
  { day: 15, dateLabel: "15 พ.ค.", systolic: 128, diastolic: 106, status: "consult" },
  { day: 16, dateLabel: "16 พ.ค.", systolic: 134, diastolic: 109, status: "watch" },
  { day: 17, dateLabel: "17 พ.ค.", systolic: 128, diastolic: 109, status: "watch" },
  { day: 18, dateLabel: "18 พ.ค.", systolic: 123, diastolic: 107, status: "high" },
  { day: 19, dateLabel: "19 พ.ค.", systolic: 127, diastolic: 103, status: "high" },
  { day: 20, dateLabel: "20 พ.ค.", systolic: 134, diastolic: 103, status: "watch" },
  { day: 21, dateLabel: "21 พ.ค.", systolic: 134, diastolic: 104, status: "normal" },
  { day: 22, dateLabel: "22 พ.ค.", systolic: 140, diastolic: 109, status: "watch" },
  { day: 23, dateLabel: "23 พ.ค.", systolic: 132, diastolic: 108, status: "watch" },
  { day: 24, dateLabel: "24 พ.ค.", systolic: 138, diastolic: 106, status: "watch" },
  { day: 25, dateLabel: "25 พ.ค.", systolic: 145, diastolic: 110, status: "watch" },
  { day: 26, dateLabel: "26 พ.ค.", systolic: 136, diastolic: 110, status: "normal" },
  { day: 27, dateLabel: "27 พ.ค.", systolic: 132, diastolic: 110, status: "normal" },
  { day: 28, dateLabel: "28 พ.ค.", systolic: 126, diastolic: 109, status: "normal" },
  { day: 29, dateLabel: "29 พ.ค.", systolic: 125, diastolic: 108, status: "normal" },
  { day: 30, dateLabel: "30 พ.ค.", systolic: 119, diastolic: 106, status: "normal" },
];

const STATUS_STYLE: Record<BpStatus, { label: string; color: string; bg: string; ring: string }> = {
  normal: {
    label: "ปกติ (Normal)",
    color: "text-emerald-700",
    bg: "bg-emerald-500",
    ring: "ring-emerald-100",
  },
  watch: {
    label: "เฝ้าระวัง (Watch)",
    color: "text-amber-700",
    bg: "bg-amber-400",
    ring: "ring-amber-100",
  },
  high: {
    label: "สูง (High)",
    color: "text-orange-700",
    bg: "bg-orange-500",
    ring: "ring-orange-100",
  },
  consult: {
    label: "ควรปรึกษาแพทย์ (Consult)",
    color: "text-red-700",
    bg: "bg-red-500",
    ring: "ring-red-100",
  },
};

function getGroupName(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupMessage = messages.find(
    (message) => message.groupId === selectedGroupId && message.rawPayload?.lineIdentity?.groupName?.trim(),
  );

  return groupMessage?.rawPayload?.lineIdentity?.groupName ?? "LINE Care Group";
}

function getPatientAvatar(messages: MessageRecord[], selectedGroupId: string | null) {
  return (
    messages.find((message) => message.groupId === selectedGroupId && message.pictureUrl)?.pictureUrl ??
    null
  );
}

function AppIcon({ name }: { name: "back" | "home" | "more" | "edit" | "bell" | "eye" | "doc" | "shield" }) {
  const common = "h-6 w-6 stroke-current";

  if (name === "back") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18 9 12l6-6" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={common}>
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "doc") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function AutoHealthMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E6BFF] text-white shadow-[0_10px_24px_-12px_rgba(30,107,255,0.9)]">
      <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 5v22M5 16h22" />
        <path d="M16 5c4 2 6 5 6 11s-2 9-6 11c-4-2-6-5-6-11s2-9 6-11Z" opacity="0.55" />
      </svg>
    </div>
  );
}

function LineBadge() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-[10px] font-black text-white ring-4 ring-emerald-50">
      LINE
    </div>
  );
}

function TopAppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-5 pb-3 pt-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-center justify-between">
        <div className="flex items-center gap-3 text-slate-950">
          <button type="button" aria-label="Back" className="-ml-2 rounded-full p-2">
            <AppIcon name="back" />
          </button>
          <LineBadge />
        </div>

        <div className="flex items-center gap-3">
          <AutoHealthMark />
          <span className="text-2xl font-semibold tracking-[-0.04em] text-[#06133A]">AutoHealth</span>
        </div>

        <div className="flex items-center gap-2 text-slate-950">
          <button type="button" aria-label="Home" className="rounded-full p-2">
            <AppIcon name="home" />
          </button>
          <button type="button" aria-label="More" className="-mr-2 rounded-full p-2">
            <AppIcon name="more" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PatientPhoto({ src }: { src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="คุณพ่อไพโรจน์" className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-white" />
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-blue-50 text-3xl font-semibold text-[#1E6BFF] ring-4 ring-white">
      พ
    </div>
  );
}

function PatientProfileCard({
  avatarUrl,
  onEditDob,
}: {
  avatarUrl: string | null;
  onEditDob: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-5">
        <PatientPhoto src={avatarUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#06133A]">คุณพ่อไพโรจน์</h1>
          <button
            type="button"
            onClick={onEditDob}
            className="mt-2 inline-flex items-center gap-2 text-left text-lg text-slate-500"
          >
            <span>12 มี.ค. 2493 (73 ปี)</span>
            <span className="inline-flex items-center gap-1 text-[#1E6BFF]">
              <AppIcon name="edit" />
              <span className="text-base">แก้ไข</span>
            </span>
          </button>
          <p className="mt-1 text-base text-slate-500">รายงานความดัน 30 วันล่าสุด</p>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center rounded-[22px] bg-amber-50 px-4 py-4 text-amber-700 ring-1 ring-amber-100">
          <AppIcon name="eye" />
          <span className="mt-1 text-lg font-medium">เฝ้าระวัง</span>
          <span className="text-sm">(Watch)</span>
        </div>
      </div>
    </section>
  );
}

function AlertCard() {
  return (
    <section className="flex items-center gap-5 rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-5 py-5 text-amber-900 shadow-[0_18px_50px_-40px_rgba(245,158,11,0.55)]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white/70 text-amber-500">
        <AppIcon name="bell" />
      </div>
      <div>
        <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
          พบค่าความดันบางช่วงสูงกว่าค่ามาตรฐาน
        </p>
        <p className="mt-2 text-base leading-7 text-slate-600">
          แนะนำติดตามค่าอย่างต่อเนื่อง และปรึกษาแพทย์หากมีค่าเพิ่มขึ้นต่อเนื่อง
        </p>
      </div>
    </section>
  );
}

function makeChartPath(points: BloodPressurePoint[], metric: "systolic" | "diastolic") {
  const width = 680;
  const height = 330;
  const xStart = 48;
  const xEnd = width - 56;
  const yTop = 42;
  const yBottom = height - 56;
  const min = 100;
  const max = 180;
  const step = (xEnd - xStart) / (points.length - 1);

  const coords = points.map((point, index) => {
    const value = point[metric];
    const normalized = (Math.max(min, Math.min(max, value)) - min) / (max - min);
    return {
      x: xStart + index * step,
      y: yBottom - normalized * (yBottom - yTop),
      value,
      point,
    };
  });

  return {
    width,
    height,
    coords,
    path: coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`).join(" "),
  };
}

function BloodPressureChart() {
  const systolic = makeChartPath(BLOOD_PRESSURE_POINTS, "systolic");
  const diastolic = makeChartPath(BLOOD_PRESSURE_POINTS, "diastolic");
  const tooltipPoint = BLOOD_PRESSURE_POINTS[15];
  const tooltipCoord = systolic.coords[15];

  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#06133A]">
            แนวโน้มความดันโลหิต <span className="text-base font-normal text-slate-500">(Blood Pressure Trend)</span>
          </h2>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-10 rounded-full bg-[#1E6BFF]" />
              ความดันตัวบน (Systolic)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-10 rounded-full bg-[#77BDFE]" />
              ความดันตัวล่าง (Diastolic)
            </span>
          </div>
        </div>
        <p className="shrink-0 text-base text-slate-500">หน่วย: mmHg</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[20px]">
        <svg viewBox={`0 0 ${systolic.width} ${systolic.height}`} className="h-[310px] w-full" role="img" aria-label="Blood pressure trend for 30 days">
          <defs>
            <linearGradient id="riskNormal" x1="0" x2="1">
              <stop offset="0%" stopColor="#E8F8EA" />
              <stop offset="100%" stopColor="#F7FDF8" />
            </linearGradient>
            <linearGradient id="riskWatch" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFF8D8" />
              <stop offset="100%" stopColor="#FFFDF0" />
            </linearGradient>
            <linearGradient id="riskHigh" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFF0DD" />
              <stop offset="100%" stopColor="#FFF8EF" />
            </linearGradient>
            <linearGradient id="riskConsult" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFE6EA" />
              <stop offset="100%" stopColor="#FFF4F5" />
            </linearGradient>
          </defs>

          <rect x="48" y="42" width="576" height="70" fill="url(#riskConsult)" rx="8" />
          <rect x="48" y="112" width="576" height="58" fill="url(#riskHigh)" />
          <rect x="48" y="170" width="576" height="58" fill="url(#riskWatch)" />
          <rect x="48" y="228" width="576" height="46" fill="url(#riskNormal)" />

          {[180, 160, 140, 120].map((value, index) => (
            <g key={value}>
              <text x="8" y={50 + index * 58} className="fill-slate-500 text-[13px]">
                {value}
              </text>
              <line x1="48" x2="624" y1={48 + index * 58} y2={48 + index * 58} stroke="#CBD5E1" strokeOpacity="0.45" />
            </g>
          ))}

          <text x="616" y="72" textAnchor="end" className="fill-red-500 text-[14px] font-medium">
            ควรปรึกษาแพทย์
          </text>
          <text x="616" y="92" textAnchor="end" className="fill-red-500 text-[14px]">
            (Consult)
          </text>
          <text x="616" y="146" textAnchor="end" className="fill-orange-500 text-[14px] font-medium">
            สูง
          </text>
          <text x="616" y="166" textAnchor="end" className="fill-orange-500 text-[14px]">
            (High)
          </text>
          <text x="616" y="206" textAnchor="end" className="fill-amber-500 text-[14px] font-medium">
            เฝ้าระวัง
          </text>
          <text x="616" y="226" textAnchor="end" className="fill-amber-500 text-[14px]">
            (Watch)
          </text>
          <text x="616" y="260" textAnchor="end" className="fill-emerald-600 text-[14px] font-medium">
            ปกติ
          </text>
          <text x="616" y="280" textAnchor="end" className="fill-emerald-600 text-[14px]">
            (Normal)
          </text>

          <path d={systolic.path} fill="none" stroke="#1E6BFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={diastolic.path} fill="none" stroke="#77BDFE" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {systolic.coords.map((coord) => (
            <circle key={`sys-${coord.point.day}`} cx={coord.x} cy={coord.y} r="4.2" fill="#1E6BFF" stroke="white" strokeWidth="2" />
          ))}
          {diastolic.coords.map((coord) => (
            <circle key={`dia-${coord.point.day}`} cx={coord.x} cy={coord.y} r="4.2" fill="#77BDFE" stroke="white" strokeWidth="2" />
          ))}

          <line x1={tooltipCoord.x} x2={tooltipCoord.x} y1="42" y2="274" stroke="#94A3B8" strokeDasharray="4 5" opacity="0.6" />
          <g transform={`translate(${tooltipCoord.x - 52} 72)`}>
            <rect width="112" height="92" rx="10" fill="white" filter="drop-shadow(0 8px 14px rgba(15,23,42,0.18))" />
            <text x="16" y="26" className="fill-slate-900 text-[14px] font-semibold">Day {tooltipPoint.day}</text>
            <circle cx="18" cy="52" r="5" fill="#1E6BFF" />
            <text x="32" y="56" className="fill-slate-700 text-[13px]">ตัวบน {tooltipPoint.systolic}</text>
            <circle cx="18" cy="74" r="5" fill="#77BDFE" />
            <text x="32" y="78" className="fill-slate-700 text-[13px]">ตัวล่าง {tooltipPoint.diastolic}</text>
          </g>

          {[
            { label: "1 พ.ค.", x: 58 },
            { label: "8 พ.ค.", x: 194 },
            { label: "15 พ.ค.", x: 346 },
            { label: "22 พ.ค.", x: 494 },
            { label: "29 พ.ค.", x: 612 },
          ].map((item) => (
            <text key={item.label} x={item.x} y="318" textAnchor="middle" className="fill-slate-500 text-[13px]">
              {item.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function AverageCards() {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.28)]">
      <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#06133A]">ค่าเฉลี่ย 30 วัน</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-[20px] bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1E6BFF] text-white">
            <AutoHealthMark />
          </div>
          <div>
            <p className="text-sm text-slate-600">ความดันตัวบน <span className="text-[#1E6BFF]">(Systolic)</span></p>
            <p className="mt-1 text-4xl font-semibold tracking-[-0.06em] text-[#06133A]">
              132 <span className="text-lg font-normal text-slate-500">mmHg</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[20px] bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#77BDFE] text-2xl font-bold text-white">
            +
          </div>
          <div>
            <p className="text-sm text-slate-600">ความดันตัวล่าง <span className="text-sky-500">(Diastolic)</span></p>
            <p className="mt-1 text-4xl font-semibold tracking-[-0.06em] text-[#06133A]">
              86 <span className="text-lg font-normal text-slate-500">mmHg</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendSummaryCard() {
  return (
    <section className="flex items-center gap-5 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.25)]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-blue-500 text-white">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 16 5-5 4 4 7-8" />
          <path d="M15 7h5v5" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#06133A]">แนวโน้ม</h2>
        <p className="mt-2 text-xl font-semibold text-[#06133A]">ความดันมีแนวโน้มสูงในบางช่วงของวัน</p>
        <p className="mt-1 text-base text-slate-500">ควรวัดค่าในเวลาเดิมอย่างสม่ำเสมอ</p>
      </div>
    </section>
  );
}

function Overview30Days() {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.25)]">
      <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#06133A]">ภาพรวม 30 วัน</h2>
      <div className="mt-4 grid gap-x-3 gap-y-4" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
        {BLOOD_PRESSURE_POINTS.map((point) => (
          <div key={point.day} className="flex flex-col items-center gap-1.5">
            <span className={`h-6 w-6 rounded-md ${STATUS_STYLE[point.status].bg} shadow-sm`} />
            <span className="text-xs text-slate-500">{point.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-[18px] border border-slate-100 bg-white px-4 py-4 sm:grid-cols-4">
        {(Object.keys(STATUS_STYLE) as BpStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`h-5 w-5 rounded-md ${STATUS_STYLE[status].bg}`} />
            <span className={`text-sm ${STATUS_STYLE[status].color}`}>{STATUS_STYLE[status].label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferenceCriteriaCard() {
  const rows = [
    {
      icon: "doc" as const,
      text: "อ้างอิงเกณฑ์แนวทางเวชปฏิบัติสำหรับกระทรวงสาธารณสุข",
    },
    {
      icon: "shield" as const,
      text: "ข้อมูลที่ใช้เพื่อการติดตามสุขภาพเท่านั้น ไม่ใช่การวินิจฉัยจากการแพทย์",
    },
  ];

  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.22)]">
      <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#06133A]">อ้างอิงเกณฑ์</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map((row) => (
          <button key={row.text} type="button" className="flex w-full items-center gap-4 py-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <AppIcon name={row.icon} />
            </span>
            <span className="flex-1 text-base leading-6 text-slate-600">{row.text}</span>
            <span className="text-2xl text-slate-400">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BottomNavigation() {
  const tabs = [
    { label: "หน้าหลัก", icon: "⌂", active: true },
    { label: "รายงาน", icon: "▤", active: false },
    { label: "บันทึก", icon: "+", active: false },
    { label: "แจ้งเตือน", icon: "♢", active: false },
    { label: "ฉัน", icon: "○", active: false },
  ];

  return (
    <nav className="sticky bottom-0 z-30 border-t border-slate-100 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[430px] grid-cols-5 items-end gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`flex flex-col items-center gap-1 text-xs ${tab.active ? "text-[#1E6BFF]" : "text-slate-500"}`}
          >
            <span
              className={`flex items-center justify-center ${
                tab.label === "บันทึก"
                  ? "h-14 w-14 -translate-y-3 rounded-full bg-[#1E6BFF] text-3xl text-white shadow-[0_16px_30px_-16px_rgba(30,107,255,0.9)]"
                  : "h-8 w-8 text-2xl"
              }`}
            >
              {tab.icon}
            </span>
            <span className={tab.label === "บันทึก" ? "-mt-3" : ""}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-3 h-1 w-32 rounded-full bg-slate-950" />
    </nav>
  );
}

function EditDOBBottomSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20">
      <section className="w-full max-w-[430px] rounded-t-[34px] bg-white px-6 pb-8 pt-4 shadow-[0_-24px_60px_-30px_rgba(15,23,42,0.55)]">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-300" />
        <h2 className="mt-8 text-center text-3xl font-semibold tracking-[-0.05em] text-[#06133A]">
          แก้ไขวันเดือนปีเกิด
        </h2>
        <label className="mt-8 block text-base font-medium text-slate-900">
          วันเดือนปีเกิด
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-between rounded-[18px] border border-slate-300 bg-white px-4 py-4 text-left text-2xl text-slate-800"
          >
            <span className="inline-flex items-center gap-3">
              <span className="text-slate-500">▣</span>
              12 มี.ค. 2493
            </span>
            <span className="text-slate-500">⌄</span>
          </button>
        </label>
        <p className="mt-3 text-sm text-slate-500">รูปแบบ: วว/ดด/ปปปป (พ.ศ.)</p>
        <div className="mt-5 rounded-[18px] bg-blue-50 px-4 py-4 text-base leading-7 text-slate-600">
          เมื่อบันทึกแล้ว อายุจะถูกคำนวณใหม่อัตโนมัติ และข้อมูลที่เกี่ยวข้องจะถูกอัปเดต
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-slate-300 bg-white px-5 py-4 text-xl font-semibold text-slate-950"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-[18px] bg-[#1E6BFF] px-5 py-4 text-xl font-semibold text-white shadow-[0_16px_28px_-18px_rgba(30,107,255,0.95)]"
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
    <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-[18px] bg-slate-900/92 px-6 py-4 text-lg font-medium text-white shadow-2xl">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">✓</span>
      บันทึกเรียบร้อย
    </div>
  );
}

export function MiniAppReport({ selectedGroupId }: MiniAppReportProps) {
  const { messages } = useAutoTrackMessages();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const groupName = useMemo(() => getGroupName(messages, selectedGroupId), [messages, selectedGroupId]);
  const avatarUrl = useMemo(() => getPatientAvatar(messages, selectedGroupId), [messages, selectedGroupId]);

  function handleSaveDob() {
    setIsEditOpen(false);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 1800);
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#06133A]">
      <TopAppHeader />

      <div className="mx-auto max-w-[430px] space-y-4 px-4 pb-6 pt-4">
        <p className="rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
          กลุ่ม LINE: {groupName}
        </p>

        <PatientProfileCard avatarUrl={avatarUrl} onEditDob={() => setIsEditOpen(true)} />
        <AlertCard />
        <BloodPressureChart />
        <AverageCards />
        <TrendSummaryCard />
        <Overview30Days />
        <ReferenceCriteriaCard />
      </div>

      <BottomNavigation />
      <EditDOBBottomSheet open={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={handleSaveDob} />
      <SaveToast show={showToast} />
    </main>
  );
}
