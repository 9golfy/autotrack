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
  | "shield"
  | "check";

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
    check: <path d="m5 12 4 4L19 6" />,
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
      // SECURITY: Avatar URLs should be returned by app APIs after authorization and URL rewriting.
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
  iconName?: IconName;
  imageSrc?: string;
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
  imageSrc,
  iconClass,
  haloClass,
  href,
}: LatestMetricCardProps) {
  return (
    <Link href={href} className="min-h-[124px] rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${haloClass}`}>
          <div className={`grid h-9 w-9 place-items-center rounded-full ${iconClass}`}>
            {imageSrc ? (
              // SECURITY: Mood icons are fixed public Supabase asset URLs controlled by this app.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="" className="h-8 w-8 object-contain" loading="lazy" decoding="async" />
            ) : iconName ? (
              <Icon name={iconName} className="h-6 w-6" />
            ) : null}
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

function HomeMetricSkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`min-h-[124px] rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[#E3EDF8]" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 animate-pulse rounded-full bg-[#E3EDF8]" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-[#EEF5FC]" />
          <div className="mt-3 h-6 w-16 animate-pulse rounded-full bg-[#D7E6F8]" />
          <div className="mt-2 h-3 w-14 animate-pulse rounded-full bg-[#EEF5FC]" />
        </div>
      </div>
    </div>
  );
}

function HomeMetricGridLoading() {
  return (
    <section className="mb-4 grid grid-cols-2 gap-2">
      <HomeMetricSkeletonCard />
      <HomeMetricSkeletonCard />
      <HomeMetricSkeletonCard />
      <HomeMetricSkeletonCard />
      <HomeMetricSkeletonCard className="col-span-2 min-h-[120px]" />
      <HomeMetricSkeletonCard className="col-span-2 min-h-[120px]" />
      <HomeMetricSkeletonCard className="col-span-2 min-h-[120px]" />
    </section>
  );
}

type MealSlot = "breakfast" | "lunch" | "dinner";

type NutritionSummary = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type HomeCategoryKey = "vitals" | "mood" | "nutrition" | "medication" | "activity" | "excretion";

type HomeEnabledCategories = Record<HomeCategoryKey, boolean>;

const DEFAULT_HOME_ENABLED_CATEGORIES: HomeEnabledCategories = {
  vitals: true,
  mood: true,
  nutrition: true,
  medication: true,
  activity: true,
  excretion: true,
};

type MedicationSlot = "morning" | "midday" | "evening" | "night";

type MedicationSummary = Record<MedicationSlot, boolean>;

function NutritionMetricCard({
  summary,
  href,
}: {
  summary: NutritionSummary;
  href: string;
}) {
  const meals: Array<{ slot: MealSlot; label: string; doneLabel: string }> = [
    { slot: "breakfast", label: "เช้า", doneLabel: "ทานเช้าแล้ว" },
    { slot: "lunch", label: "กลางวัน", doneLabel: "ทานกลางวันแล้ว" },
    { slot: "dinner", label: "เย็น", doneLabel: "ทานเย็นแล้ว" },
  ];
  const doneCount = meals.filter((meal) => summary[meal.slot]).length;
  const value = doneCount === meals.length ? "ครบ 3 มื้อ" : doneCount > 0 ? `${doneCount}/3 มื้อ` : "รอข้อมูล";

  return (
    <Link
      href={href}
      className="col-span-2 rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#DDFBEA]">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[#00C853] text-white">
            <Icon name="food" className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-[#082B5F]">อาหาร</p>
              <p className="text-xs leading-tight text-[#5F718C]">(Nutrition)</p>
            </div>
            <p className="shrink-0 text-[20px] font-extrabold leading-none tracking-normal text-[#082B5F]">
              {value}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-3 gap-2">
        {meals.map((meal) => {
          const isDone = summary[meal.slot];

          return (
            <div
              key={meal.slot}
              className={`min-h-[62px] rounded-[12px] border px-2 py-2 text-center ${
                isDone
                  ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#00A344]"
                  : "border-[#E3EDF8] bg-[#F8FAFC] text-[#94A3B8]"
              }`}
            >
              <div className="mx-auto grid h-5 w-5 place-items-center rounded-full bg-white">
                <Icon
                  name="check"
                  className={`h-3.5 w-3.5 ${isDone ? "text-[#00C853]" : "text-[#CBD5E1]"}`}
                />
              </div>
              <p className="mt-1 text-[12px] font-bold leading-tight">
                {isDone ? meal.doneLabel : `รอมื้อ${meal.label}`}
              </p>
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function MedicationMetricCard({
  summary,
  href,
}: {
  summary: MedicationSummary;
  href: string;
}) {
  const slots: Array<{ slot: MedicationSlot; label: string; doneLabel: string }> = [
    { slot: "morning", label: "เช้า", doneLabel: "ทานยาเช้าแล้ว" },
    { slot: "midday", label: "กลางวัน", doneLabel: "ทานยากลางวันแล้ว" },
    { slot: "evening", label: "เย็น", doneLabel: "ทานยาเย็นแล้ว" },
    { slot: "night", label: "ก่อนนอน", doneLabel: "ทานยาก่อนนอนแล้ว" },
  ];
  const doneCount = slots.filter((slot) => summary[slot.slot]).length;
  const value = doneCount === slots.length ? "ครบ" : doneCount > 0 ? `${doneCount}/4 เวลา` : "รอข้อมูล";

  return (
    <Link
      href={href}
      className="col-span-2 rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3E8FF]">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[#8B5CF6] text-white">
            <Icon name="pill" className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-[#082B5F]">การกินยา</p>
              <p className="text-xs leading-tight text-[#5F718C]">(Medication)</p>
            </div>
            <p className="shrink-0 text-[20px] font-extrabold leading-none tracking-normal text-[#082B5F]">
              {value}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isDone = summary[slot.slot];

          return (
            <div
              key={slot.slot}
              className={`min-h-[62px] rounded-[12px] border px-1.5 py-2 text-center ${
                isDone
                  ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]"
                  : "border-[#E3EDF8] bg-[#F8FAFC] text-[#94A3B8]"
              }`}
            >
              <div className="mx-auto grid h-5 w-5 place-items-center rounded-full bg-white">
                <Icon
                  name="check"
                  className={`h-3.5 w-3.5 ${isDone ? "text-[#8B5CF6]" : "text-[#CBD5E1]"}`}
                />
              </div>
              <p className="mt-1 text-[11px] font-bold leading-tight">
                {isDone ? slot.doneLabel : `รอยา${slot.label}`}
              </p>
            </div>
          );
        })}
      </div>
    </Link>
  );
}

type LatestVitals = {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  spo2: string;
};

type MoodSummary = {
  level: 1 | 2 | 3 | 4 | 5;
  value: string;
  unit: string;
  imageSrc: string;
};

const MOOD_ICON_BASE = "https://pircjjgttpqdcfjxbhxw.supabase.co/storage/v1/object/public/line-media/line-webhook";

const MOOD_BY_LEVEL: Record<MoodSummary["level"], MoodSummary> = {
  5: {
    level: 5,
    value: "ดีมาก",
    unit: "มีความสุข",
    imageSrc: `${MOOD_ICON_BASE}/emo_excellent.png`,
  },
  4: {
    level: 4,
    value: "ดี",
    unit: "ยิ้มแย้ม",
    imageSrc: `${MOOD_ICON_BASE}/emo_good.png`,
  },
  3: {
    level: 3,
    value: "ปกติ",
    unit: "เฉยๆ",
    imageSrc: `${MOOD_ICON_BASE}/emo_okay.png`,
  },
  2: {
    level: 2,
    value: "เฝ้าระวัง",
    unit: "หงุดหงิด/ซึม",
    imageSrc: `${MOOD_ICON_BASE}/emo_bad.png`,
  },
  1: {
    level: 1,
    value: "ผิดปกติ",
    unit: "ควรติดตาม",
    imageSrc: `${MOOD_ICON_BASE}/emo_terible.png`,
  },
};

const NEGATION_PREFIX = "(?:ไม่มี|ไม่พบ|ไม่|ยังไม่มี|ไม่ได้)";

function MoodMetricCard({
  summary,
  href,
}: {
  summary: MoodSummary;
  href: string;
}) {
  const levels: MoodSummary["level"][] = [1, 2, 3, 4, 5];

  return (
    <Link
      href={href}
      className="col-span-2 rounded-[16px] border border-[#E3EDF8] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EAF4FF]">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[#DFF4FF] text-[#1976D2]">
            <Icon name="smile" className="h-5 w-5" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-[#082B5F]">อารมณ์</p>
              <p className="text-xs leading-tight text-[#5F718C]">(Mood)</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[20px] font-extrabold leading-none tracking-normal text-[#082B5F]">
                {summary.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[#5F718C]">{summary.unit}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-5 gap-1.5">
        {levels.map((level) => {
          const mood = MOOD_BY_LEVEL[level];
          const isActive = level === summary.level;

          return (
            <div
              key={level}
              className={`relative min-h-[74px] rounded-[12px] border px-1.5 py-2 text-center ${
                isActive
                  ? "border-[#BFDBFE] bg-[#F8FBFF] text-[#082B5F]"
                  : "border-[#E3EDF8] bg-[#F8FAFC] text-[#94A3B8] opacity-50 grayscale"
              }`}
            >
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-white">
                {/* SECURITY: Mood icons are fixed public Supabase asset URLs controlled by this app. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mood.imageSrc} alt="" className="h-6 w-6 object-contain" loading="lazy" decoding="async" />
              </div>
              <p className="mt-1 text-[11px] font-extrabold leading-tight">Level {level}</p>
              <p className="mt-0.5 text-[11px] font-bold leading-tight">{mood.value}</p>
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasUnnegatedKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const negatedPattern = new RegExp(`${NEGATION_PREFIX}.{0,40}${escapedKeyword}`);

    return text.includes(keyword) && !negatedPattern.test(text);
  });
}

function getMoodSummaryForDate(messages: MessageRecord[], selectedGroupId: string, dateIso = toLocalIsoDate(new Date())): MoodSummary {
  const relevantText = messages
    .filter((message) => {
      if (message.groupId !== selectedGroupId || !message.text?.trim()) {
        return false;
      }

      const parsedDate = isRecord(message.parsed) && typeof message.parsed.report_date === "string" ? message.parsed.report_date : null;
      const messageDate = toLocalIsoDate(new Date(getMessageTimestamp(message)));

      return parsedDate === dateIso || messageDate === dateIso;
    })
    .map((message) => message.text)
    .join("\n")
    .replace(/\s+/g, "");

  if (!relevantText) {
    return MOOD_BY_LEVEL[3];
  }

  if (hasUnnegatedKeyword(relevantText, ["โวยวาย", "ก้าวร้าว", "เอะอะมาก", "กระสับกระส่ายมาก", "ไม่รู้สึกตัว"])) {
    return MOOD_BY_LEVEL[1];
  }

  if (hasUnnegatedKeyword(relevantText, ["หงุดหงิด", "ซึม"])) {
    return MOOD_BY_LEVEL[2];
  }

  if (hasKeyword(relevantText, ["อารมณ์ดีมาก", "สนุกสนาน", "ขำขัน", "มีความสุข"])) {
    return MOOD_BY_LEVEL[5];
  }

  if (hasKeyword(relevantText, ["ยิ้มแย้ม", "แจ่มใส", "รู้สึกตัวดี", "อารมณ์ดี"])) {
    return MOOD_BY_LEVEL[4];
  }

  return MOOD_BY_LEVEL[3];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMessageTimestamp(message: MessageRecord) {
  const timestamp = Number(message.timestamp);
  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  const createdAtTimestamp = Date.parse(message.createdAt);
  return Number.isFinite(createdAtTimestamp) ? createdAtTimestamp : 0;
}

function getMealSlotFromHour(hour: number): MealSlot | null {
  if (hour < 10) {
    return "breakfast";
  }

  if (hour >= 10 && hour <= 13) {
    return "lunch";
  }

  if (hour >= 15) {
    return "dinner";
  }

  return null;
}

function getMealSlotFromText(text: string): MealSlot | null {
  if (/อาหารเช้า|มื้อเช้า|ทานเช้า|กินเช้า|breakfast/i.test(text)) {
    return "breakfast";
  }

  if (/อาหารกลางวัน|มื้อกลางวัน|ทานกลางวัน|กินกลางวัน|lunch/i.test(text)) {
    return "lunch";
  }

  if (/อาหารเย็น|มื้อเย็น|ทานเย็น|กินเย็น|dinner/i.test(text)) {
    return "dinner";
  }

  return null;
}

function getMealSlotFromAiAnalysis(rawPayload: MessageRecord["rawPayload"]): MealSlot | null {
  const aiAnalysis = rawPayload?.aiAnalysis;
  if (!isRecord(aiAnalysis) || aiAnalysis.category !== "meal" || !isRecord(aiAnalysis.context)) {
    return null;
  }

  const mealSlot = aiAnalysis.context.mealSlot;
  return mealSlot === "breakfast" || mealSlot === "lunch" || mealSlot === "dinner" ? mealSlot : null;
}

function getMedicationSlotFromHour(hour: number): MedicationSlot | null {
  if (hour < 10) {
    return "morning";
  }

  if (hour >= 10 && hour <= 13) {
    return "midday";
  }

  if (hour >= 20) {
    return "night";
  }

  if (hour >= 15) {
    return "evening";
  }

  return null;
}

function getMedicationSlotFromText(text: string): MedicationSlot | null {
  if (/ยาตอนเช้า|ยาเช้า|ก่อนอาหารเช้า|หลังอาหารเช้า|morning/i.test(text)) {
    return "morning";
  }

  if (/ยาตอนกลางวัน|ยากลางวัน|ก่อนอาหารกลางวัน|หลังอาหารกลางวัน|midday|noon/i.test(text)) {
    return "midday";
  }

  if (/ยาก่อนนอน|ก่อนนอน|bedtime|night/i.test(text)) {
    return "night";
  }

  if (/ยาตอนเย็น|ยาเย็น|ก่อนอาหารเย็น|หลังอาหารเย็น|evening/i.test(text)) {
    return "evening";
  }

  return null;
}

function getMedicationSlotFromAiAnalysis(rawPayload: MessageRecord["rawPayload"]): MedicationSlot | null {
  const aiAnalysis = rawPayload?.aiAnalysis;
  if (!isRecord(aiAnalysis) || aiAnalysis.category !== "medication" || !isRecord(aiAnalysis.context)) {
    return null;
  }

  const medicationSlot = aiAnalysis.context.medicationSlot;
  return medicationSlot === "morning" ||
    medicationSlot === "midday" ||
    medicationSlot === "evening" ||
    medicationSlot === "night"
    ? medicationSlot
    : null;
}

function isMealMessage(message: MessageRecord) {
  if (message.context === "meal" || message.contexts?.includes("meal")) {
    return true;
  }

  const aiAnalysis = message.rawPayload?.aiAnalysis;
  if (isRecord(aiAnalysis) && aiAnalysis.category === "meal") {
    return true;
  }

  return Boolean(message.text && /อาหาร|มื้อเช้า|มื้อกลางวัน|มื้อเย็น|ทานข้าว|รับประทาน|กินข้าว|breakfast|lunch|dinner/i.test(message.text));
}

function isMedicationMessage(message: MessageRecord) {
  if (message.context === "medication" || message.contexts?.includes("medication")) {
    return true;
  }

  const aiAnalysis = message.rawPayload?.aiAnalysis;
  if (isRecord(aiAnalysis) && aiAnalysis.category === "medication") {
    return true;
  }

  return Boolean(message.text && /ยา|เม็ดยา|รับประทานยา|กินยา|ก่อนนอน|medication|medicine|pill/i.test(message.text));
}

function getNutritionSummaryForDate(messages: MessageRecord[], selectedGroupId: string, dateIso = toLocalIsoDate(new Date())): NutritionSummary {
  const summary: NutritionSummary = {
    breakfast: false,
    lunch: false,
    dinner: false,
  };

  for (const message of messages) {
    if (message.groupId !== selectedGroupId || !isMealMessage(message)) {
      continue;
    }

    const messageDate = toLocalIsoDate(new Date(getMessageTimestamp(message)));
    if (messageDate !== dateIso) {
      continue;
    }

    const timestamp = getMessageTimestamp(message);
    const hour = new Date(timestamp).getHours();
    const aiSlot = getMealSlotFromAiAnalysis(message.rawPayload);
    const textSlot = getMealSlotFromText(message.text ?? "");
    const timeSlot = getMealSlotFromHour(hour);
    const slot = aiSlot ?? (textSlot ? (textSlot === timeSlot ? textSlot : null) : timeSlot);

    if (slot) {
      summary[slot] = true;
    }
  }

  return summary;
}

function getMedicationSummaryForDate(messages: MessageRecord[], selectedGroupId: string, dateIso = toLocalIsoDate(new Date())): MedicationSummary {
  const summary: MedicationSummary = {
    morning: false,
    midday: false,
    evening: false,
    night: false,
  };

  for (const message of messages) {
    if (message.groupId !== selectedGroupId || !isMedicationMessage(message)) {
      continue;
    }

    const messageDate = toLocalIsoDate(new Date(getMessageTimestamp(message)));
    if (messageDate !== dateIso) {
      continue;
    }

    const timestamp = getMessageTimestamp(message);
    const hour = new Date(timestamp).getHours();
    const aiSlot = getMedicationSlotFromAiAnalysis(message.rawPayload);
    const textSlot = getMedicationSlotFromText(message.text ?? "");
    const timeSlot = getMedicationSlotFromHour(hour);
    const slot = aiSlot ?? (textSlot ? (textSlot === timeSlot ? textSlot : null) : timeSlot);

    if (slot) {
      summary[slot] = true;
    }
  }

  return summary;
}

function getLatestVitalsForDate(messages: MessageRecord[], selectedGroupId: string, dateIso = toLocalIsoDate(new Date())): LatestVitals {
  const candidates: Array<{
    sortKey: number;
    systolic: number | null;
    diastolic: number | null;
    heartRate: number | null;
    temperature: number | null;
    spo2: number | null;
  }> = [];

  for (const message of messages) {
    if (message.groupId !== selectedGroupId || !isRecord(message.parsed)) {
      continue;
    }

    const vitals = Array.isArray(message.parsed.vital_signs) ? message.parsed.vital_signs : [];

    for (const vital of vitals) {
      if (!isRecord(vital)) {
        continue;
      }

      const measuredDate = typeof vital.measured_date === "string" ? vital.measured_date : toLocalIsoDate(new Date(getMessageTimestamp(message)));

      if (measuredDate !== dateIso) {
        continue;
      }

      const measuredTime = typeof vital.measured_time === "string" ? vital.measured_time : "00:00";
      const [hour = "0", minute = "0"] = measuredTime.split(":");
      const sortKey = Number(hour) * 60 + Number(minute);

      candidates.push({
        sortKey,
        systolic: toNumber(vital.blood_pressure_systolic),
        diastolic: toNumber(vital.blood_pressure_diastolic),
        heartRate: toNumber(vital.heart_rate_bpm),
        temperature: toNumber(vital.temperature_c),
        spo2: toNumber(vital.spo2_percent),
      });
    }
  }

  const latest = candidates.sort((left, right) => right.sortKey - left.sortKey)[0];

  return {
    bloodPressure: latest?.systolic != null && latest.diastolic != null ? `${latest.systolic} / ${latest.diastolic}` : "-",
    heartRate: latest?.heartRate !== null && latest?.heartRate !== undefined ? String(latest.heartRate) : "-",
    temperature: latest?.temperature !== null && latest?.temperature !== undefined ? latest.temperature.toFixed(1) : "-",
    spo2: latest?.spo2 !== null && latest?.spo2 !== undefined ? String(latest.spo2) : "-",
  };
}

function LatestMetricGrid({
  selectedGroupId,
  latestVitals,
  moodSummary,
  nutritionSummary,
  medicationSummary,
  enabledCategories,
}: {
  selectedGroupId: string;
  latestVitals: LatestVitals;
  moodSummary: MoodSummary;
  nutritionSummary: NutritionSummary;
  medicationSummary: MedicationSummary;
  enabledCategories: HomeEnabledCategories;
}) {
  const group = encodeURIComponent(selectedGroupId);
  const metrics: LatestMetricCardProps[] = [
    {
      label: "ความดัน",
      english: "Blood Pressure",
      value: latestVitals.bloodPressure,
      unit: "mmHg",
      iconName: "heart",
      iconClass: "bg-[#1976D2] text-white",
      haloClass: "bg-[#DCEEFF]",
      href: `/mini-app?view=report&metric=bloodPressure&groupId=${group}`,
    },
    {
      label: "ชีพจร",
      english: "Heart Rate",
      value: latestVitals.heartRate,
      unit: "bpm",
      iconName: "heart",
      iconClass: "bg-[#F05262] text-white",
      haloClass: "bg-[#FFE8EC]",
      href: `/mini-app?view=report&metric=heartRate&groupId=${group}`,
    },
    {
      label: "อุณหภูมิ",
      english: "Temperature",
      value: latestVitals.temperature,
      unit: "°C",
      iconName: "thermometer",
      iconClass: "bg-[#2CCF6F] text-white",
      haloClass: "bg-[#DDFBEA]",
      href: `/mini-app?view=report&metric=temperature&groupId=${group}`,
    },
    {
      label: "ออกซิเจน",
      english: "SpO2",
      value: latestVitals.spo2,
      unit: "%",
      iconName: "oxygen",
      iconClass: "bg-[#8B5CF6] text-white",
      haloClass: "bg-[#F0E8FF]",
      href: `/mini-app?view=report&metric=spo2&groupId=${group}`,
    },
    {
      label: "อารมณ์",
      english: "Mood",
      value: moodSummary.value,
      unit: moodSummary.unit,
      imageSrc: moodSummary.imageSrc,
      iconClass: "bg-white",
      haloClass: "bg-[#EAF4FF]",
      href: `/mini-app?view=activities&metric=mood&groupId=${group}`,
    },
    {
      label: "อาหาร",
      english: "Nutrition",
      value: "ครบ 3 มื้อ",
      unit: "ทานครบ",
      iconName: "food",
      iconClass: "bg-[#00C853] text-white",
      haloClass: "bg-[#DDFBEA]",
      href: `/mini-app?view=activities&metric=nutrition&groupId=${group}`,
    },
  ];

  return (
    <section className="mb-4 grid grid-cols-2 gap-2">
      {enabledCategories.vitals ? metrics
        .filter((metric) => metric.english !== "Mood" && metric.english !== "Nutrition")
        .map((metric) => (
        <LatestMetricCard key={metric.label} {...metric} />
      )) : null}
      {enabledCategories.mood ? (
        <MoodMetricCard
          summary={moodSummary}
          href={`/mini-app?view=activities&metric=mood&groupId=${group}`}
        />
      ) : null}
      {enabledCategories.nutrition ? (
        <NutritionMetricCard
          summary={nutritionSummary}
          href={`/mini-app?view=activities&metric=nutrition&groupId=${group}`}
        />
      ) : null}
      {enabledCategories.medication ? (
        <MedicationMetricCard
          summary={medicationSummary}
          href={`/mini-app?view=activities&metric=medication&groupId=${group}`}
        />
      ) : null}
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
] as const;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseIsoDobParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const fallback = { year: 1950, month: 3, day: 12 };

  if (!match) {
    return fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const maxDay = getDaysInMonth(year, month);
  const day = Math.min(Math.max(Number(match[3]), 1), maxDay);

  return { year, month, day };
}

function formatIsoDobValue(year: number, month: number, day: number) {
  const safeDay = Math.min(day, getDaysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function readHomeEnabledCategories(groupId: string): HomeEnabledCategories {
  try {
    const stored = window.localStorage.getItem(`mini-app-settings:${groupId}`);
    const parsed = stored ? JSON.parse(stored) : null;
    const storedCategories = isRecord(parsed) && isRecord(parsed.categories) ? parsed.categories : null;

    if (!storedCategories) {
      return DEFAULT_HOME_ENABLED_CATEGORIES;
    }

    return {
      ...DEFAULT_HOME_ENABLED_CATEGORIES,
      vitals: typeof storedCategories.vitals === "boolean" ? storedCategories.vitals : DEFAULT_HOME_ENABLED_CATEGORIES.vitals,
      mood: typeof storedCategories.mood === "boolean" ? storedCategories.mood : DEFAULT_HOME_ENABLED_CATEGORIES.mood,
      nutrition: typeof storedCategories.nutrition === "boolean" ? storedCategories.nutrition : DEFAULT_HOME_ENABLED_CATEGORIES.nutrition,
      medication:
        typeof storedCategories.medication === "boolean"
          ? storedCategories.medication
          : typeof storedCategories.medicine === "boolean"
            ? storedCategories.medicine
            : DEFAULT_HOME_ENABLED_CATEGORIES.medication,
      activity:
        typeof storedCategories.activity === "boolean"
          ? storedCategories.activity
          : typeof storedCategories.activityPhoto === "boolean"
            ? storedCategories.activityPhoto
            : DEFAULT_HOME_ENABLED_CATEGORIES.activity,
      excretion: typeof storedCategories.excretion === "boolean" ? storedCategories.excretion : DEFAULT_HOME_ENABLED_CATEGORIES.excretion,
    };
  } catch {
    return DEFAULT_HOME_ENABLED_CATEGORIES;
  }
}

function EditDOBBottomSheet({
  open,
  value,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const dobParts = useMemo(() => parseIsoDobParts(value), [value]);
  const daysInDobMonth = useMemo(() => getDaysInMonth(dobParts.year, dobParts.month), [dobParts.month, dobParts.year]);
  const dobDayOptions = useMemo(() => Array.from({ length: daysInDobMonth }, (_, index) => index + 1), [daysInDobMonth]);
  const dobYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, index) => currentYear - index);
  }, []);

  if (!open) return null;

  const handleDobChange = (nextParts: Partial<typeof dobParts>) => {
    const nextDob = { ...dobParts, ...nextParts };
    onChange(formatIsoDobValue(nextDob.year, nextDob.month, nextDob.day));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-3 pb-3" onClick={onClose}>
      <section className="w-full rounded-[22px] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />
        <h2 className="text-xl font-bold text-[#082B5F]">แก้ไขวันเกิด</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <label className="min-w-0">
            <span className="mb-1 block text-sm font-semibold text-[#475569]">วันที่</span>
            <select className="h-[52px] w-full rounded-[14px] border border-[#D7E6F8] bg-white px-3 text-base font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none" value={dobParts.day} onChange={(event) => handleDobChange({ day: Number(event.target.value) })}>
              {dobDayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-sm font-semibold text-[#475569]">เดือน</span>
            <select className="h-[52px] w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 text-base font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none" value={dobParts.month} onChange={(event) => handleDobChange({ month: Number(event.target.value) })}>
              {THAI_MONTHS_LONG.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-sm font-semibold text-[#475569]">ปี</span>
            <select className="h-[52px] w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 text-base font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none" value={dobParts.year} onChange={(event) => handleDobChange({ year: Number(event.target.value) })}>
              {dobYearOptions.map((year) => <option key={year} value={year}>{year + 543}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="h-[52px] flex-1 rounded-[14px] border border-[#CBD5E1] bg-white text-base font-semibold text-[#082B5F]">ยกเลิก</button>
          <button type="button" onClick={onSave} className="h-[52px] flex-1 rounded-[14px] bg-[#1976D2] text-base font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]">บันทึก</button>
        </div>
      </section>
    </div>
  );
}

export default function MiniAppIndex({ selectedGroupId: selectedGroupIdProp = null }: MiniAppIndexProps) {
  const searchParams = useSearchParams();
  const selectedGroupId =
    selectedGroupIdProp ?? searchParams.get("groupId") ?? FATHER_PROFILE_GROUP_ID;

  const { messages, hasLoaded } = useAutoTrackMessages({ groupId: selectedGroupId, limit: 500 });
  const [enabledCategories, setEnabledCategories] = useState<HomeEnabledCategories>(
    DEFAULT_HOME_ENABLED_CATEGORIES,
  );
  const [lineGroupPictureUrl, setLineGroupPictureUrl] = useState<string | null>(
    null,
  );
  const [isLineGroupPictureLoading, setIsLineGroupPictureLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    // SECURITY: Fetch only group avatar metadata through the app API; do not call storage providers directly from the client.
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

  useEffect(() => {
    const syncEnabledCategories = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.groupId && event.detail.groupId !== selectedGroupId) {
        return;
      }

      setEnabledCategories(readHomeEnabledCategories(selectedGroupId));
    };

    syncEnabledCategories();
    window.addEventListener("focus", syncEnabledCategories);
    window.addEventListener("pageshow", syncEnabledCategories);
    window.addEventListener("storage", syncEnabledCategories);
    window.addEventListener("mini-app-settings-changed", syncEnabledCategories);

    return () => {
      window.removeEventListener("focus", syncEnabledCategories);
      window.removeEventListener("pageshow", syncEnabledCategories);
      window.removeEventListener("storage", syncEnabledCategories);
      window.removeEventListener("mini-app-settings-changed", syncEnabledCategories);
    };
  }, [selectedGroupId]);

  const groupName = useMemo(
    () => getGroupName(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const latestVitals = useMemo(
    () => getLatestVitalsForDate(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const moodSummary = useMemo(
    () => getMoodSummaryForDate(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const nutritionSummary = useMemo(
    () => getNutritionSummaryForDate(messages, selectedGroupId),
    [messages, selectedGroupId],
  );
  const medicationSummary = useMemo(
    () => getMedicationSummaryForDate(messages, selectedGroupId),
    [messages, selectedGroupId],
  );

  // ใช้เฉพาะ lineGroupPictureUrl เพื่อให้เหมือนหน้ารายงาน
  const avatarUrl = lineGroupPictureUrl;

  // วันเกิด/อายุ (เหมือนรายงาน)
  const [patientDob, setPatientDob] = useState("1950-03-12");
  const [draftDob, setDraftDob] = useState("1950-03-12");
  const [isEditOpen, setIsEditOpen] = useState(false);
  useEffect(() => {
    const storedDob = window.localStorage.getItem(`mini-app-report-dob:${selectedGroupId ?? "default"}`);
    if (storedDob) {
      queueMicrotask(() => {
        setPatientDob(storedDob);
        setDraftDob(storedDob);
      });
    }
  }, [selectedGroupId]);
  function handleSaveDob() {
    setPatientDob(draftDob);
    window.localStorage.setItem(`mini-app-report-dob:${selectedGroupId ?? "default"}`, draftDob);
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
            onEditDob={() => {
              setDraftDob(patientDob);
              setIsEditOpen(true);
            }}
          />

          {enabledCategories.vitals ? <MiniAppHomeAlertCard /> : null}
          <h2 className="mb-2 mt-0 px-1 text-sm font-bold text-[#082B5F]">ข้อมูลสุขภาพล่าสุดวันนี้</h2>
          {hasLoaded ? (
            <LatestMetricGrid
              selectedGroupId={selectedGroupId}
              latestVitals={latestVitals}
              moodSummary={moodSummary}
              nutritionSummary={nutritionSummary}
              medicationSummary={medicationSummary}
              enabledCategories={enabledCategories}
            />
          ) : (
            <HomeMetricGridLoading />
          )}
        </div>

        <BottomBar active="home" groupId={selectedGroupId} />
        <EditDOBBottomSheet open={isEditOpen} value={draftDob} onChange={setDraftDob} onClose={() => setIsEditOpen(false)} onSave={handleSaveDob} />
      </div>
    </main>
  );
}

