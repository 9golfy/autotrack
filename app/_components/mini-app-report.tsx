"use client";

import { useMemo, useState } from "react";

import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";

type MiniAppReportProps = {
  selectedGroupId: string | null;
};

type BpStatus = "normal" | "watch" | "high" | "consult";

type BloodPressurePoint = {
  day: number;
  systolic: number;
  diastolic: number;
  status: BpStatus;
};

const BP_POINTS: BloodPressurePoint[] = [
  { day: 1, systolic: 123, diastolic: 106, status: "normal" },
  { day: 2, systolic: 129, diastolic: 109, status: "normal" },
  { day: 3, systolic: 122, diastolic: 105, status: "watch" },
  { day: 4, systolic: 118, diastolic: 102, status: "watch" },
  { day: 5, systolic: 121, diastolic: 105, status: "watch" },
  { day: 6, systolic: 128, diastolic: 109, status: "watch" },
  { day: 7, systolic: 127, diastolic: 108, status: "high" },
  { day: 8, systolic: 134, diastolic: 113, status: "high" },
  { day: 9, systolic: 134, diastolic: 113, status: "high" },
  { day: 10, systolic: 134, diastolic: 112, status: "high" },
  { day: 11, systolic: 125, diastolic: 108, status: "watch" },
  { day: 12, systolic: 126, diastolic: 107, status: "watch" },
  { day: 13, systolic: 124, diastolic: 105, status: "watch" },
  { day: 14, systolic: 121, diastolic: 103, status: "consult" },
  { day: 15, systolic: 128, diastolic: 106, status: "consult" },
  { day: 16, systolic: 134, diastolic: 109, status: "watch" },
  { day: 17, systolic: 128, diastolic: 109, status: "watch" },
  { day: 18, systolic: 123, diastolic: 107, status: "high" },
  { day: 19, systolic: 127, diastolic: 103, status: "high" },
  { day: 20, systolic: 134, diastolic: 103, status: "watch" },
  { day: 21, systolic: 134, diastolic: 104, status: "normal" },
  { day: 22, systolic: 140, diastolic: 109, status: "watch" },
  { day: 23, systolic: 132, diastolic: 108, status: "watch" },
  { day: 24, systolic: 138, diastolic: 106, status: "watch" },
  { day: 25, systolic: 145, diastolic: 110, status: "watch" },
  { day: 26, systolic: 136, diastolic: 110, status: "normal" },
  { day: 27, systolic: 132, diastolic: 110, status: "normal" },
  { day: 28, systolic: 126, diastolic: 109, status: "normal" },
  { day: 29, systolic: 125, diastolic: 108, status: "normal" },
  { day: 30, systolic: 119, diastolic: 106, status: "normal" },
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

function getPatientAvatar(messages: MessageRecord[], selectedGroupId: string | null) {
  return messages.find((message) => message.groupId === selectedGroupId && message.pictureUrl)?.pictureUrl ?? null;
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
    | "user";
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
    <section className="mb-4 rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-[14px]">
        <PatientAvatar src={avatarUrl} />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold leading-tight text-[#0B1B3F]">คุณพ่อไพโรจน์</h1>
          <button
            type="button"
            onClick={onEditDob}
            className="mt-2 flex max-w-full items-center gap-1.5 whitespace-nowrap text-left text-base text-[#64748B]"
          >
            <span className="truncate">12 มี.ค. 2493 (73 ปี)</span>
            <Icon name="edit" className="h-[18px] w-[18px] text-[#2563EB]" />
            <span className="hidden text-sm font-medium text-[#2563EB] min-[380px]:inline">แก้ไข</span>
          </button>
          <p className="mt-1 text-sm text-[#64748B]">รายงานความดัน 30 วันล่าสุด</p>
        </div>

        <div className="grid h-[72px] w-[108px] shrink-0 place-items-center rounded-[18px] border border-[#FDE68A] bg-gradient-to-br from-[#FFF7E6] to-[#FFFDF4] text-center text-[#B45309]">
          <div>
            <Icon name="eye" className="mx-auto h-6 w-6 text-[#F59E0B]" />
            <p className="mt-1 text-base font-semibold leading-5">เฝ้าระวัง</p>
            <p className="text-sm leading-4">(Watch)</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertCard() {
  return (
    <section className="mb-4 flex gap-[14px] rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
      <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-[#FDE68A] text-[#F59E0B]">
        <Icon name="bell" className="h-[26px] w-[26px]" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-[1.35] text-[#0B1B3F]">พบค่าความดันบางช่วงสูงกว่าค่ามาตรฐาน</h2>
        <p className="mt-1.5 text-sm leading-[1.45] text-[#64748B]">
          แนะนำติดตามค่าอย่างต่อเนื่อง และปรึกษาแพทย์หากมีค่าเพิ่มขึ้นต่อเนื่อง
        </p>
      </div>
    </section>
  );
}

function makePath(points: BloodPressurePoint[], metric: "systolic" | "diastolic") {
  const width = 340;
  const height = 240;
  const left = 34;
  const right = 48;
  const top = 24;
  const bottom = 30;
  const min = 90;
  const max = 180;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const coords = points.map((point, index) => {
    const value = point[metric];
    const x = left + (plotWidth / (points.length - 1)) * index;
    const y = top + ((max - value) / (max - min)) * plotHeight;
    return { x, y, value, day: point.day };
  });

  return {
    width,
    height,
    coords,
    path: coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" "),
  };
}

function BloodPressureChart() {
  const systolic = makePath(BP_POINTS, "systolic");
  const diastolic = makePath(BP_POINTS, "diastolic");
  const tooltipPoint = BP_POINTS[15];
  const tooltipCoord = systolic.coords[15];

  return (
    <section className="mb-4 rounded-[20px] border border-[#E5E7EB] bg-white px-[14px] pb-4 pt-[14px] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-[#0B1B3F]">แนวโน้มความดันโลหิต</h2>
          <p className="text-sm text-[#64748B]">(Blood Pressure Trend)</p>
        </div>
        <p className="shrink-0 text-sm text-[#64748B]">หน่วย: mmHg</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-[#64748B]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-9 rounded-full bg-[#2563EB]" />
          ความดันตัวบน (Systolic)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-9 rounded-full bg-[#60A5FA]" />
          ความดันตัวล่าง (Diastolic)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${systolic.width} ${systolic.height}`}
        className="mt-2 h-[240px] w-full overflow-visible"
        role="img"
        aria-label="Blood pressure trend chart"
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

        <rect x="34" y="24" width="258" height="47" fill="url(#zoneConsult)" rx="8" />
        <rect x="34" y="71" width="258" height="47" fill="url(#zoneHigh)" />
        <rect x="34" y="118" width="258" height="47" fill="url(#zoneWatch)" />
        <rect x="34" y="165" width="258" height="45" fill="url(#zoneNormal)" />

        {[180, 160, 140, 120].map((value, index) => {
          const y = 28 + index * 47;
          return (
            <g key={value}>
              <text x="0" y={y + 4} className="fill-[#64748B] text-[12px]">
                {value}
              </text>
              <line x1="34" x2="292" y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="5 7" />
            </g>
          );
        })}

        <text x="286" y="49" textAnchor="end" className="fill-[#EF4444] text-[10px] font-semibold">
          ควรปรึกษาแพทย์
        </text>
        <text x="286" y="62" textAnchor="end" className="fill-[#EF4444] text-[10px]">
          (Consult)
        </text>
        <text x="286" y="102" textAnchor="end" className="fill-[#F97316] text-[11px] font-semibold">
          สูง (High)
        </text>
        <text x="286" y="149" textAnchor="end" className="fill-[#F59E0B] text-[11px] font-semibold">
          เฝ้าระวัง (Watch)
        </text>
        <text x="286" y="197" textAnchor="end" className="fill-[#22C55E] text-[11px] font-semibold">
          ปกติ (Normal)
        </text>

        <path d={systolic.path} fill="none" stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <path d={diastolic.path} fill="none" stroke="#60A5FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

        {systolic.coords.map((coord) => (
          <circle key={`sys-${coord.day}`} cx={coord.x} cy={coord.y} r="4" fill="#2563EB" stroke="white" strokeWidth="1.5" />
        ))}
        {diastolic.coords.map((coord) => (
          <circle key={`dia-${coord.day}`} cx={coord.x} cy={coord.y} r="4" fill="#60A5FA" stroke="white" strokeWidth="1.5" />
        ))}

        <line x1={tooltipCoord.x} x2={tooltipCoord.x} y1="24" y2="210" stroke="#94A3B8" strokeDasharray="4 5" opacity="0.6" />
        <g transform={`translate(${Math.max(44, tooltipCoord.x - 37)} 42)`}>
          <rect width="84" height="68" rx="10" fill="white" filter="drop-shadow(0 8px 12px rgba(15,23,42,0.16))" />
          <text x="12" y="20" className="fill-[#0B1B3F] text-[12px] font-bold">
            Day {tooltipPoint.day}
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

        {[
          { x: 38, label: "1 พ.ค." },
          { x: 98, label: "8 พ.ค." },
          { x: 162, label: "15 พ.ค." },
          { x: 226, label: "22 พ.ค." },
          { x: 288, label: "29 พ.ค." },
        ].map((tick) => (
          <text key={tick.label} x={tick.x} y="235" textAnchor="middle" className="fill-[#64748B] text-[11px]">
            {tick.label}
          </text>
        ))}
      </svg>
    </section>
  );
}

function AverageCards() {
  const cards = [
    { label: "ความดันตัวบน", english: "Systolic", value: "132", tone: "bg-[#2563EB]", bg: "from-[#EFF6FF] to-white" },
    { label: "ความดันตัวล่าง", english: "Diastolic", value: "86", tone: "bg-[#60A5FA]", bg: "from-[#EFF6FF] to-white" },
  ];

  return (
    <section className="mb-3 rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <h2 className="mb-3 text-xl font-bold text-[#0B1B3F]">ค่าเฉลี่ย 30 วัน</h2>
      <div className="flex gap-3">
        {cards.map((card) => (
          <div key={card.english} className={`flex h-[94px] min-w-0 flex-1 items-center gap-2 rounded-2xl bg-gradient-to-br ${card.bg} p-3`}>
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${card.tone} text-white`}>
              <Icon name="heart" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] leading-tight text-[#64748B]">
                {card.label} <span className="text-[#2563EB]">({card.english})</span>
              </p>
              <p className="mt-1 whitespace-nowrap text-[32px] font-extrabold leading-none tracking-[-0.05em] text-[#0B1B3F]">
                {card.value} <span className="text-[13px] font-normal tracking-normal text-[#64748B]">mmHg</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendSummaryCard() {
  return (
    <section className="mb-3 flex items-center gap-[14px] rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#2563EB] text-white">
        <Icon name="trend" className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-[#0B1B3F]">แนวโน้ม</h2>
        <p className="mt-1 text-lg font-bold leading-[1.35] text-[#0B1B3F]">ความดันมีแนวโน้มสูงในบางช่วงของวัน</p>
        <p className="mt-1 text-sm text-[#64748B]">ควรวัดค่าในเวลาเดิมอย่างสม่ำเสมอ</p>
      </div>
    </section>
  );
}

function Overview30Days() {
  return (
    <section className="mb-4 rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
    </section>
  );
}

function ReferenceCriteriaCard() {
  const rows = [
    {
      icon: "doc" as const,
      text: "อ้างอิงเกณฑ์แนวทางเวชปฏิบัติทั่วไป / กระทรวงสาธารณสุข",
    },
    {
      icon: "shield" as const,
      text: "ข้อมูลนี้ใช้เพื่อการติดตามสุขภาพเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์",
    },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      {rows.map((row, index) => (
        <button
          key={row.text}
          type="button"
          className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left ${index > 0 ? "border-t border-[#E5E7EB]" : ""}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F5F9] text-[#64748B]">
            <Icon name={row.icon} className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm leading-[1.35] text-[#64748B]">{row.text}</span>
          <Icon name="chevron" className="h-5 w-5 text-[#94A3B8]" />
        </button>
      ))}
    </section>
  );
}

function BottomNavigation() {
  const tabs = [
    { label: "หน้าหลัก", icon: "home" as const, active: true },
    { label: "รายงาน", icon: "report" as const, active: false },
    { label: "บันทึก", icon: "plus" as const, active: false, center: true },
    { label: "แจ้งเตือน", icon: "bell" as const, active: false, badge: 2 },
    { label: "ฉัน", icon: "user" as const, active: false },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[390px] border-t border-[#E5E7EB] bg-white px-3 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      <div className="grid h-[72px] grid-cols-5 items-end pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`relative flex flex-col items-center justify-end gap-1 pb-2 text-xs ${
              tab.active ? "text-[#2563EB]" : "text-[#94A3B8]"
            }`}
          >
            <span
              className={
                tab.center
                  ? "mb-0 grid h-14 w-14 -translate-y-3 place-items-center rounded-full bg-[#2563EB] text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)]"
                  : "relative grid h-7 w-7 place-items-center"
              }
            >
              <Icon name={tab.icon} className={tab.center ? "h-8 w-8" : "h-6 w-6"} />
              {tab.badge ? (
                <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#EF4444] px-1 text-[11px] font-bold leading-none text-white">
                  {tab.badge}
                </span>
              ) : null}
            </span>
            <span className={tab.center ? "-mt-3" : ""}>{tab.label}</span>
          </button>
        ))}
      </div>
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

  const groupName = useMemo(() => getGroupName(messages, selectedGroupId), [messages, selectedGroupId]);
  const avatarUrl = useMemo(() => getPatientAvatar(messages, selectedGroupId), [messages, selectedGroupId]);

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
          <BloodPressureChart />
          <AverageCards />
          <TrendSummaryCard />
          <Overview30Days />
          <ReferenceCriteriaCard />
        </div>

        <BottomNavigation />
        <EditDOBBottomSheet open={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={handleSaveDob} />
        <SaveToast show={showToast} />
      </div>
    </main>
  );
}
