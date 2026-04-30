"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BottomBar } from "@/app/_components/mini-app-bottom-bar";
import { HeaderBar } from "@/app/_components/mini-app-header-bar";
import { FATHER_PROFILE_GROUP_ID, miniAppTheme } from "@/app/_components/mini-app-theme";
import {
  type MessageRecord,
  useAutoTrackMessages,
} from "@/app/_components/group-console";

const THEME = {
  page: miniAppTheme.layout.page,
  card: miniAppTheme.card.elevated,
  softCard: miniAppTheme.card.soft,
  primaryButton: miniAppTheme.button.primary,
};

type IconName =
  | "back"
  | "edit"
  | "menu"
  | "bell"
  | "user"
  | "chevron"
  | "eye"
  | "heart"
  | "smile"
  | "food"
  | "thermometer"
  | "oxygen"
  | "calendar"
  | "clock"
  | "pin"
  | "pill"
  | "toilet"
  | "home"
  | "report"
  | "stats"
  | "settings"
  | "clipboard"
  | "shield";

function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: IconName;
  className?: string;
}) {
  const base = `${className} shrink-0`;

  const paths: Record<IconName, React.ReactNode> = {
    back: <path d="M15 18 9 12l6-6" />,
    edit: (
      <>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    heart: (
      <>
        <path d="M12 21s-7-4.5-9-9.5A5 5 0 0 1 12 7a5 5 0 0 1 9 4.5C19 16.5 12 21 12 21Z" />
        <path d="M7 13h3l1.5-3 3 6 1.5-3h3" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <path d="M9 9h.01M15 9h.01" />
      </>
    ),
    food: (
      <>
        <path d="M4 10h16l-2 9H6L4 10Z" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M9 14h6" />
      </>
    ),
    thermometer: (
      <>
        <path d="M14 14.76V5a4 4 0 0 0-8 0v9.76a6 6 0 1 0 8 0Z" />
        <path d="M10 5v12" />
      </>
    ),
    oxygen: (
      <>
        <circle cx="10" cy="11" r="5" />
        <path d="M15 16 20 8" />
        <path d="M17 8h3v3" />
        <path d="M7.5 11a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    pill: (
      <>
        <path d="M10.5 20.5 20.5 10.5a5 5 0 0 0-7-7L3.5 13.5a5 5 0 0 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </>
    ),
    toilet: (
      <>
        <path d="M7 4h10v8a5 5 0 0 1-5 5H7V4Z" />
        <path d="M7 12H4v4a4 4 0 0 0 4 4h8" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    ),
    report: (
      <>
        <path d="M8 4h8l3 3v13H5V4z" />
        <path d="M16 4v4h4M8 12h8M8 16h5" />
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
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19 12h2M3 12h2M12 3v2M12 19v2" />
      </>
    ),
    clipboard: (
      <>
        <path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" />
        <path d="M9 12h6M9 16h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
        <path d="M9 12h6M12 9v6" />
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

function getGroupName(
  messages: MessageRecord[],
  selectedGroupId: string | null,
) {
  const groupMessage = messages.find(
    (message) =>
      message.groupId === selectedGroupId &&
      message.rawPayload?.lineIdentity?.groupName?.trim(),
  );

  return groupMessage?.rawPayload?.lineIdentity?.groupName ?? "LINE Care Group";
}

function getGroupAvatar(
  messages: MessageRecord[],
  selectedGroupId: string | null,
) {
  const groupMessage = messages.find(
    (message) =>
      message.groupId === selectedGroupId &&
      (message.pictureUrl?.trim() ||
        message.rawPayload?.lineIdentity?.pictureUrl?.trim()),
  );

  return (
    groupMessage?.pictureUrl ??
    groupMessage?.rawPayload?.lineIdentity?.pictureUrl ??
    null
  );
}

function PatientAvatar({
  src,
  isLoading = false,
}: {
  src: string | null;
  isLoading?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="รูปกลุ่ม LINE"
        className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
        loading="lazy"
        decoding="async"
        width={72}
        height={72}
      />
    );
  }

  return (
    <div className="mini-font-title grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#EAF4FF] text-[#1976D2]">
      {isLoading ? "..." : "พ"}
    </div>
  );
}

function PatientProfileCard({
  avatarUrl,
  isAvatarLoading,
}: {
  avatarUrl: string | null;
  isAvatarLoading: boolean;
}) {
  return (
    <section className={`${THEME.card} mb-3 p-4`}>
      <div className="flex items-center gap-4">
        <PatientAvatar src={avatarUrl} isLoading={isAvatarLoading} />

        <div className="min-w-0 flex-1">
          <h2 className={`${miniAppTheme.typography.title} truncate text-[#082B5F]`}>
            คุณพ่อไพโรจน์
          </h2>
          <p className="mt-1 text-[15px] font-medium text-[#5F718C]">
            อัปเดตล่าสุด วันนี้ 08:30
          </p>
        </div>

        <Icon name="chevron" className="h-5 w-5 text-[#8FA0B8]" />
      </div>
    </section>
  );
}

function AlertCard() {
  return (
    <section className="mb-4 flex min-h-[78px] items-center gap-4 rounded-[18px] border border-[#FDE68A] bg-gradient-to-r from-[#FFF7E6] to-white px-4 py-3">
      <div className="flex w-[88px] shrink-0 flex-col items-center justify-center text-center text-[#FFB300]">
        <Icon name="eye" className="h-8 w-8" />
        <span className="mt-1 text-sm font-semibold leading-tight">เฝ้าระวัง (Watch)</span>
      </div>
      <div className="h-12 w-px shrink-0 bg-[#CBD5E1]" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-[1.25] text-[#082B5F]">พบค่าความดันบางช่วงสูงกว่าค่ามาตรฐาน</h2>
        <p className="mt-1 text-sm leading-[1.35] text-[#5F718C]">แนะนำติดตามค่าอย่างต่อเนื่อง และปรึกษาแพทย์</p>
      </div>
      <Icon name="chevron" className="h-5 w-5 shrink-0 text-[#94A3B8]" />
    </section>
  );
}

type MetricCardProps = {
  label: string;
  english: string;
  value: string;
  unit: string;
  iconName: IconName;
  iconClass: string;
  haloClass: string;
  href: string;
};

function MetricCard({
  label,
  english,
  value,
  unit,
  iconName,
  iconClass,
  haloClass,
  href,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      className={`${THEME.softCard} flex min-h-[112px] items-center gap-3 p-3 transition active:scale-[0.99]`}
    >
      <div className={`grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full ${haloClass}`}>
        <div className={`grid h-10 w-10 place-items-center rounded-full ${iconClass}`}>
          <Icon name={iconName} className="h-6 w-6" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-extrabold leading-tight text-[#082B5F]">
          {label}
        </p>
        <p className="text-[13px] text-[#7A8AA5]">{english}</p>
        <p className="mt-1 text-[25px] font-extrabold leading-none tracking-normal text-[#082B5F]">
          {value}
        </p>
        <p className="mt-1 text-[13px] text-[#7A8AA5]">{unit}</p>
      </div>

      <Icon name="chevron" className="h-6 w-6 text-[#94A3B8]" />
    </Link>
  );
}

function MetricGrid({ selectedGroupId }: { selectedGroupId: string }) {
  const group = encodeURIComponent(selectedGroupId);

  const metrics: MetricCardProps[] = [
    {
      label: "ความดัน",
      english: "Blood Pressure",
      value: "149/102",
      unit: "mmHg",
      iconName: "heart",
      iconClass: "bg-gradient-to-br from-[#E53935] to-[#FB7185] text-white",
      haloClass: "bg-[#FFE4E6]",
      href: `/mini-app?view=report&metric=bloodPressure&groupId=${group}`,
    },
    {
      label: "ชีพจร",
      english: "Heart Rate",
      value: "78",
      unit: "bpm",
      iconName: "heart",
      iconClass: "bg-gradient-to-br from-[#00C853] to-[#86EFAC] text-white",
      haloClass: "bg-[#DCFCE7]",
      href: `/mini-app?view=report&metric=heartRate&groupId=${group}`,
    },
    {
      label: "อารมณ์",
      english: "Mood",
      value: "ปกติ",
      unit: "ดีมาก",
      iconName: "smile",
      iconClass: "bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white",
      haloClass: "bg-[#DCEEFF]",
      href: `/mini-app?view=mood&groupId=${group}`,
    },
    {
      label: "อาหาร",
      english: "Nutrition",
      value: "ดี",
      unit: "ทานครบทุกมื้อ",
      iconName: "food",
      iconClass: "bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] text-white",
      haloClass: "bg-[#F3E8FF]",
      href: `/mini-app?view=nutrition&groupId=${group}`,
    },
  ];

  return (
    <section className="mb-3 grid grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}

function UpcomingAppointment() {
  return (
    <section className="mb-3 rounded-[22px] border border-[#BFDBFE] bg-gradient-to-r from-[#EAF4FF] to-white p-3 shadow-[0_12px_32px_rgba(37,99,235,0.10)]">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#082B5F]">
        <Icon name="calendar" className="h-5 w-5 text-[#1976D2]" />
        นัดหมายถัดไป
      </div>

      <div className="flex items-center gap-3">
        <div className="grid h-[82px] w-[82px] shrink-0 place-items-center rounded-[16px] border border-[#DCEEFF] bg-white text-center shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
          <div>
            <p className="text-[30px] font-extrabold leading-none text-[#3B82F6]">
              28
            </p>
            <p className="mt-1 text-sm font-bold text-[#082B5F]">เม.ย. 2569</p>
            <p className="text-xs text-[#5F718C]">จันทร์</p>
          </div>
        </div>

        <div className="flex min-h-[82px] flex-1 items-center justify-between rounded-[16px] bg-white px-4 py-3">
          <div>
            <h3 className="text-base font-extrabold text-[#082B5F]">
              ตรวจติดตามความดัน
            </h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#5F718C]">
              <Icon name="clock" className="h-4 w-4 text-[#1976D2]" />
              09:00 น.
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#5F718C]">
              <Icon name="pin" className="h-4 w-4 text-[#1976D2]" />
              โรงพยาบาลรังสิต
            </div>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EAF4FF] text-[#1976D2]">
            <Icon name="chevron" className="h-6 w-6" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HealthOverview() {
  const rows = [
    { label: "ความดัน", percent: 70, status: "สูงบางช่วง", color: "bg-[#FB8C00]", icon: "heart" as IconName },
    { label: "อาหาร", percent: 90, status: "ทานครบ", color: "bg-[#00C853]", icon: "food" as IconName },
    { label: "อารมณ์", percent: 95, status: "ปกติ", color: "bg-[#3B82F6]", icon: "smile" as IconName },
    { label: "ขับถ่าย", percent: 40, status: "ยังไม่ขับถ่าย", color: "bg-[#A855F7]", icon: "toilet" as IconName },
  ];

  return (
    <section className={`${THEME.softCard} mb-3 p-4`}>
      <h2 className="mb-3 text-base font-extrabold text-[#082B5F]">
        ภาพรวมสุขภาพวันนี้
      </h2>

      <div className="flex gap-4">
        <div className="flex w-[118px] shrink-0 flex-col items-center">
          <div className="relative grid h-[112px] w-[112px] place-items-center rounded-full bg-[conic-gradient(#3B82F6_0deg_281deg,#E3EDF8_281deg_360deg)]">
            <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-[30px] font-extrabold leading-none text-[#082B5F]">
                  78%
                </p>
                <p className="mt-1 text-xs font-bold text-[#FB8C00]">
                  เฝ้าระวัง
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-sm leading-5 text-[#5F718C]">
            ยังปลอดภัย
            <br />
            แต่ควรติดตามบางจุด
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-3 border-l border-[#E3EDF8] pl-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F8FAFC]">
                <Icon name={row.icon} className="h-5 w-5 text-[#5F718C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-2.5 overflow-hidden rounded-full bg-[#E3EDF8]">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
              <div className="w-[76px] shrink-0 text-right">
                <p className="text-sm font-bold text-[#082B5F]">{row.percent}%</p>
                <p className="truncate text-xs text-[#5F718C]">{row.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineToday() {
  const items = [
    { time: "10:00", label: "วัดความดัน", icon: "clipboard" as IconName, color: "text-[#1976D2]", bg: "bg-[#DCEEFF]" },
    { time: "12:00", label: "ทานอาหาร", icon: "food" as IconName, color: "text-[#00C853]", bg: "bg-[#DCFCE7]" },
    { time: "18:00", label: "ทานยา", icon: "pill" as IconName, color: "text-[#A855F7]", bg: "bg-[#F3E8FF]" },
  ];

  return (
    <section className={`${THEME.softCard} mb-3 p-4`}>
      <h2 className="mb-3 text-base font-extrabold text-[#082B5F]">
        กิจกรรมวันนี้
      </h2>

      <div className="relative">
        <div className="absolute left-7 right-7 top-4 h-px bg-[#CBD5E1]" />
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.time} className="relative flex flex-col items-center text-center">
              <span className={`z-10 h-3 w-3 rounded-full ${item.color.replace("text-", "bg-")}`} />
              <div className={`mt-2 grid h-12 w-12 place-items-center rounded-full ${item.bg} ${item.color}`}>
                <Icon name={item.icon} className="h-6 w-6" />
              </div>
              <p className={`mt-1 text-sm font-extrabold ${item.color}`}>{item.time}</p>
              <p className="text-xs text-[#5F718C]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniAppHomeProfileCard({
  avatarUrl,
  isAvatarLoading,
  dobLabel,
  onEditDob,
}: {
  avatarUrl: string | null;
  isAvatarLoading: boolean;
  dobLabel: string;
  onEditDob: () => void;
}) {
  return (
    <section className="mb-4 rounded-[20px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <PatientAvatar src={avatarUrl} isLoading={isAvatarLoading} />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[28px] font-bold leading-tight tracking-normal text-[#082B5F]">
            คุณพ่อไพโรจน์
          </h2>
          <button
            type="button"
            onClick={onEditDob}
            className="mt-2 flex max-w-full items-center gap-2 whitespace-nowrap text-left text-base text-[#5F718C]"
          >
            <span className="truncate">{dobLabel}</span>
            <Icon name="edit" className="h-[18px] w-[18px] text-[#1976D2]" />
            <span className="text-sm font-medium text-[#1976D2]">แก้ไข</span>
          </button>
          <p className="mt-1 text-sm leading-5 text-[#5F718C]">รายงานความดัน 30 วันล่าสุด</p>
        </div>
      </div>
    </section>
  );
}

function MiniAppHomeAlertCard() {
  return (
    <section className="mb-4 flex min-h-[78px] items-center gap-4 rounded-[18px] border border-[#FDE68A] bg-gradient-to-r from-[#FFF7E6] to-white px-4 py-3">
      <div className="flex w-[88px] shrink-0 flex-col items-center justify-center text-center text-[#FFB300]">
        <Icon name="eye" className="h-8 w-8" />
        <span className="mt-1 text-sm font-semibold leading-tight">เฝ้าระวัง (Watch)</span>
      </div>

      <div className="h-12 w-px shrink-0 bg-[#CBD5E1]" />

      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold leading-[1.25] text-[#082B5F]">พบค่าความดันบางช่วงสูงกว่าค่ามาตรฐาน</h3>
        <p className="mt-1 text-sm leading-[1.35] text-[#5F718C]">แนะนำติดตามค่าอย่างต่อเนื่อง และปรึกษาแพทย์</p>
      </div>

      <Icon name="chevron" className="h-5 w-5 shrink-0 text-[#94A3B8]" />
    </section>
  );
}

type LatestMetricCardProps = {
  label: string;
  english: string;
  value: string;
  unit: string;
  iconName: IconName;
  iconClass: string;
  haloClass: string;
  href: string;
};

function LatestMetricCard({
  label,
  english,
  value,
  unit,
  iconName,
  iconClass,
  haloClass,
  href,
}: LatestMetricCardProps) {
  return (
    <Link href={href} className="min-h-[124px] rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${haloClass}`}>
          <div className={`grid h-9 w-9 place-items-center rounded-full ${iconClass}`}>
            <Icon name={iconName} className="h-6 w-6" />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-[#082B5F]">{label}</p>
          <p className="text-xs leading-tight text-[#5F718C]">({english})</p>
          <p className="mt-2 whitespace-nowrap text-[20px] font-extrabold leading-none tracking-normal text-[#082B5F]">{value}</p>
          <p className="mt-1 text-sm font-medium text-[#5F718C]">{unit}</p>
        </div>
      </div>
    </Link>
  );
}

function LatestMetricGrid({ selectedGroupId }: { selectedGroupId: string }) {
  const group = encodeURIComponent(selectedGroupId);
  const metrics: LatestMetricCardProps[] = [
    {
      label: "ความดัน",
      english: "Blood Pressure",
      value: "149 / 102",
      unit: "mmHg",
      iconName: "heart",
      iconClass: "bg-[#1976D2] text-white",
      haloClass: "bg-[#DCEEFF]",
      href: `/mini-app?view=report&metric=bloodPressure&groupId=${group}`,
    },
    {
      label: "ชีพจร",
      english: "Heart Rate",
      value: "78",
      unit: "bpm",
      iconName: "heart",
      iconClass: "bg-[#F05262] text-white",
      haloClass: "bg-[#FFE8EC]",
      href: `/mini-app?view=report&metric=heartRate&groupId=${group}`,
    },
    {
      label: "อุณหภูมิ",
      english: "Temperature",
      value: "36.5",
      unit: "°C",
      iconName: "thermometer",
      iconClass: "bg-[#2CCF6F] text-white",
      haloClass: "bg-[#DDFBEA]",
      href: `/mini-app?view=report&metric=temperature&groupId=${group}`,
    },
    {
      label: "ออกซิเจน",
      english: "SpO2",
      value: "98",
      unit: "%",
      iconName: "oxygen",
      iconClass: "bg-[#8B5CF6] text-white",
      haloClass: "bg-[#F0E8FF]",
      href: `/mini-app?view=report&metric=spo2&groupId=${group}`,
    },
    {
      label: "อารมณ์",
      english: "Mood",
      value: "ปกติ",
      unit: "สดใส",
      iconName: "smile",
      iconClass: "bg-[#1976D2] text-white",
      haloClass: "bg-[#DCEEFF]",
      href: `/mini-app?view=activities&metric=mood&groupId=${group}`,
    },
    {
      label: "อาหาร",
      english: "Nutrition",
      value: "ดี",
      unit: "ทานครบ",
      iconName: "food",
      iconClass: "bg-[#00C853] text-white",
      haloClass: "bg-[#DDFBEA]",
      href: `/mini-app?view=activities&metric=nutrition&groupId=${group}`,
    },
  ];

  return (
    <section className="mb-4 grid grid-cols-2 gap-2">
      {metrics.map((metric) => (
        <LatestMetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}

type MiniAppIndexProps = {
  selectedGroupId?: string | null;
};

function formatThaiDobWithAge(isoDate: string): string {
  // แปลง yyyy-mm-dd เป็น dd mmm yyyy (yy ปี)
  if (!isoDate) return "-";
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const [y, m, d] = isoDate.split("-");
  const birth = new Date(Number(y), Number(m) - 1, Number(d));
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return `${Number(d)} ${months[Number(m) - 1]} ${Number(y) + 543} (${age} ปี)`;
}

export default function MiniAppIndex({ selectedGroupId: selectedGroupIdProp = null }: MiniAppIndexProps) {
  const searchParams = useSearchParams();
  const selectedGroupId =
    selectedGroupIdProp ?? searchParams.get("groupId") ?? FATHER_PROFILE_GROUP_ID;

  const { messages } = useAutoTrackMessages();
  const [lineGroupPictureUrl, setLineGroupPictureUrl] = useState<string | null>(
    null,
  );
  const [isLineGroupPictureLoading, setIsLineGroupPictureLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch(
      `/api/line/group-summary?groupId=${encodeURIComponent(
        selectedGroupId ?? FATHER_PROFILE_GROUP_ID,
      )}`,
      { cache: "default" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { pictureUrl?: string | null } | null) => {
        if (isMounted) setLineGroupPictureUrl(data?.pictureUrl ?? null);
      })
      .catch(() => {
        if (isMounted) setLineGroupPictureUrl(null);
      })
      .finally(() => {
        if (isMounted) setIsLineGroupPictureLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGroupId]);

  const groupName = useMemo(
    () => getGroupName(messages, selectedGroupId),
    [messages, selectedGroupId],
  );

  // ใช้เฉพาะ lineGroupPictureUrl เพื่อให้เหมือนหน้ารายงาน
  const avatarUrl = lineGroupPictureUrl;

  // วันเกิด/อายุ (เหมือนรายงาน)
  const [patientDob, setPatientDob] = useState("1950-03-12");
  const [isEditOpen, setIsEditOpen] = useState(false);
  useEffect(() => {
    const storedDob = window.localStorage.getItem(`mini-app-report-dob:${selectedGroupId ?? "default"}`);
    if (storedDob) setPatientDob(storedDob);
  }, [selectedGroupId]);
  function handleSaveDob(newDob: string) {
    setPatientDob(newDob);
    window.localStorage.setItem(`mini-app-report-dob:${selectedGroupId ?? "default"}`, newDob);
    setIsEditOpen(false);
  }

  return (
    <main className={miniAppTheme.layout.page}>
      <div className={miniAppTheme.layout.shell}>
        <HeaderBar
          title="AutoHealth"
          groupName={groupName}
          patientName="คุณพ่อไพโรจน์"
          avatarUrl={avatarUrl}
          currentDateLabel="วันนี้"
        />

        <div className="px-3 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
          <p className="mb-3 truncate rounded-full border border-[#E3EDF8] bg-white px-4 py-2 text-center text-sm text-[#5F718C] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            กลุ่ม LINE: {groupName}
          </p>

          <MiniAppHomeProfileCard
            avatarUrl={avatarUrl}
            isAvatarLoading={isLineGroupPictureLoading}
            dobLabel={formatThaiDobWithAge(patientDob)}
            onEditDob={() => setIsEditOpen(true)}
          />

          {/* TODO: เพิ่ม EditDOBBottomSheet เหมือนรายงาน ถ้าต้องการให้แก้ไขวันเกิดได้ */}

          <MiniAppHomeAlertCard />
          <h2 className="mb-2 mt-0 px-1 text-sm font-bold text-[#082B5F]">ข้อมูลสุขภาพล่าสุดวันนี้</h2>
          <LatestMetricGrid selectedGroupId={selectedGroupId} />
        </div>

        <BottomBar active="home" groupId={selectedGroupId} />
      </div>
    </main>
  );
}
