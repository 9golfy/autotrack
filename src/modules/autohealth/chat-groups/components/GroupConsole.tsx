"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { buildHealthReport } from "@/services/health-report";
import autoHealthLineLogo from "@/shared/assets/logo/Auto_Health_Line_Logo.png";
import autoHealthLogo from "@/shared/assets/logo/Auto_Health_Logo_Horizontal_300.png";
import { useAutoTrackMessages } from "@/shared/hooks/useAutoTrackMessages";
import type { MessageRecord } from "@/shared/types/messages";

export type { MessageRecord };
export { useAutoTrackMessages };

export type GroupStatus = "Active" | "Needs Review" | "No Activity";
export type HealthSignal = "Normal" | "Watch" | "Critical";

export type GroupSummary = {
  groupId: string;
  groupName: string;
  totalMessages: number;
  memberCount: number;
  lastMessageTime: number | null;
  lastSync: string;
  lastMessagePreview: string;
  lastMessageType: string;
  healthSignal: HealthSignal;
  status: GroupStatus;
  members: { userId: string; displayName: string; avatarUrl: string | null }[];
};

export type GroupFilters = {
  search: string;
  dateRange: "all" | "24h" | "7d" | "30d";
  status: "all" | GroupStatus;
  messageType: "all" | "text" | "image" | "link" | "other";
};

export type GroupConversation = {
  summary: GroupSummary;
  messages: MessageRecord[];
};

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "2-digit",
});

const thaiDateShortFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  day: "numeric",
  month: "short",
});

const thaiClockFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const statusToneMap: Record<GroupStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Needs Review": "bg-amber-50 text-amber-700 ring-amber-100",
  "No Activity": "bg-slate-100 text-slate-600 ring-slate-200",
};

const healthSignalToneMap: Record<HealthSignal, string> = {
  Normal: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Watch: "bg-amber-50 text-amber-700 ring-amber-100",
  Critical: "bg-rose-50 text-rose-700 ring-rose-100",
};

const typeToneMap: Record<string, string> = {
  text: "bg-sky-50 text-sky-700",
  image: "bg-violet-50 text-violet-700",
  link: "bg-cyan-50 text-cyan-700",
  outbound: "bg-emerald-50 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

const navItems = [
  { href: "/admin/dashboard", label: "หน้าแรก", icon: "home", activeMatch: (pathname: string) => pathname === "/admin/dashboard" },
  { href: "/admin/groups", label: "กลุ่มแชท", icon: "chat", activeMatch: (pathname: string) => pathname.startsWith("/admin/groups") },
  { href: "/admin/members", label: "รายชื่อสมาชิก", icon: "format_list_bulleted", activeMatch: (pathname: string) => pathname.startsWith("/admin/members") },
  { href: "/admin/staff", label: "รายชื่อเจ้าหน้าที่", icon: "group", activeMatch: (pathname: string) => pathname.startsWith("/admin/staff") },
  { href: "/admin/beds", label: "ข้อมูลเตียง", icon: "single_bed", activeMatch: (pathname: string) => pathname.startsWith("/admin/beds") },
  { href: "/admin/settings", label: "การตั้งค่า", icon: "settings", activeMatch: (pathname: string) => pathname.startsWith("/admin/settings") },
];

function getStatusLabel(status: GroupStatus) {
  if (status === "Active") {
    return "ใช้งานอยู่";
  }

  if (status === "Needs Review") {
    return "ต้องตรวจสอบ";
  }

  return "ไม่มีความเคลื่อนไหว";
}

function getHealthSignalLabel(signal: HealthSignal) {
  if (signal === "Normal") {
    return "ปกติ";
  }

  if (signal === "Watch") {
    return "เฝ้าระวัง";
  }

  return "วิกฤต";
}

function getMessageTypeLabel(type: string) {
  if (type === "text") {
    return "ข้อความ";
  }

  if (type === "image") {
    return "รูปภาพ";
  }

  if (type === "link") {
    return "ลิงก์";
  }

  if (type === "outbound") {
    return "ส่งออก";
  }

  return "อื่น ๆ";
}

export function formatClock(timestamp: number) {
  return thaiClockFormatter.format(timestamp);
}

export function formatDate(timestamp: number) {
  return thaiDateFormatter.format(timestamp);
}

export function formatDateShort(timestamp: number) {
  return thaiDateShortFormatter.format(timestamp);
}

export function formatDateTime(timestamp: number) {
  return `${formatDate(timestamp)} ${formatClock(timestamp)}`;
}

export function truncate(value: string | null | undefined, head = 8, tail = 5) {
  if (!value) {
    return "ไม่ระบุ";
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function decodeThaiMojibake(value: string) {
  if (!value.includes("เธ") && !value.includes("เน") && !value.includes("โ")) {
    return value;
  }

  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint >= 0x80 && codePoint <= 0x9f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint >= 0x0e01 && codePoint <= 0x0e5b) {
      bytes.push(codePoint - 0x0e01 + 0xa1);
      continue;
    }

    return value;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

export function formatNumber(index: number) {
  return String(index).padStart(2, "0");
}

export function getMessageDirection(message: MessageRecord) {
  if (message.source === "web" || message.type === "outbound") {
    return "outbound";
  }

  return "inbound";
}

function getAvatarUrl(message: MessageRecord) {
  return (
    message.pictureUrl ??
    message.avatarUrl ??
    message.profileImageUrl ??
    message.rawPayload?.lineIdentity?.pictureUrl ??
    null
  );
}

function getDisplayName(message: MessageRecord) {
  return message.displayName?.trim() ? decodeThaiMojibake(message.displayName.trim()) : "ไม่ทราบชื่อ";
}

function getInitial(value: string | null | undefined) {
  const initial = value?.trim().charAt(0);
  return initial ? initial.toUpperCase() : "U";
}

function classifyMessageType(message: MessageRecord): "text" | "image" | "link" | "other" {
  if (message.type === "image" || Boolean(message.contentUrl)) {
    return "image";
  }

  if ((message.text ?? "").includes("http://") || (message.text ?? "").includes("https://")) {
    return "link";
  }

  if (message.type === "text" || message.type === "outbound") {
    return "text";
  }

  return "other";
}

export function getMessagePreview(message: MessageRecord) {
  if (message.text?.trim()) {
    return decodeThaiMojibake(message.text);
  }

  if (message.type === "image" || message.contentUrl) {
    return "มีรูปภาพแนบ";
  }

  return `${message.type} event`;
}

function getGroupName(message: MessageRecord) {
  const groupName = message.rawPayload?.lineIdentity?.groupName?.trim();

  return groupName ? decodeThaiMojibake(groupName) : `กลุ่ม ${truncate(message.groupId, 6, 4)}`;
}

function getGroupStatus(messages: MessageRecord[]): GroupStatus {
  const latest = messages[0];

  if (!latest) {
    return "No Activity";
  }

  const ageMs = Date.now() - Number(latest.timestamp);
  const oneHour = 1000 * 60 * 60;

  if (ageMs <= oneHour) {
    return "Active";
  }

  if (
    messages.some(
      (message) =>
        Boolean(message.rawPayload?.lineIdentity?.error) ||
        Boolean(message.rawPayload?.mediaUpload?.error),
    )
  ) {
    return "Needs Review";
  }

  if (ageMs <= oneHour * 24) {
    return "Needs Review";
  }

  return "No Activity";
}

function getHealthSignal(messages: MessageRecord[]): HealthSignal {
  const report = buildHealthReport(
    messages.map((message) => ({
      id: message.id,
      text: message.text,
      contentUrl: message.contentUrl,
      type: message.type,
      timestamp: Number(message.timestamp),
      displayName: message.displayName,
      userId: message.userId,
    })),
  );

  if (report.statusTone === "red") {
    return "Critical";
  }

  if (report.statusTone === "orange") {
    return "Watch";
  }

  return "Normal";
}

function withinDateRange(timestamp: number, range: GroupFilters["dateRange"]) {
  if (range === "all") {
    return true;
  }

  const now = Date.now();
  const diff = now - timestamp;

  if (range === "24h") {
    return diff <= 1000 * 60 * 60 * 24;
  }

  if (range === "7d") {
    return diff <= 1000 * 60 * 60 * 24 * 7;
  }

  return diff <= 1000 * 60 * 60 * 24 * 30;
}

export function buildGroupSummaries(messages: MessageRecord[]): GroupSummary[] {
  const groups = new Map<string, MessageRecord[]>();

  for (const message of messages) {
    if (!message.groupId) {
      continue;
    }

    const current = groups.get(message.groupId) ?? [];
    current.push(message);
    groups.set(message.groupId, current);
  }

  return Array.from(groups.entries())
    .map(([groupId, groupMessages]) => {
      const sorted = [...groupMessages].sort((left, right) => Number(right.timestamp) - Number(left.timestamp));
      const latest = sorted[0];
      const members = new Map<string, { userId: string; displayName: string; avatarUrl: string | null }>();

      for (const message of sorted) {
        if (!message.userId) {
          continue;
        }

        if (!members.has(message.userId)) {
          members.set(message.userId, {
            userId: message.userId,
            displayName: getDisplayName(message),
            avatarUrl: getAvatarUrl(message),
          });
        }
      }

      return {
        groupId,
        groupName: latest ? getGroupName(latest) : `กลุ่ม ${truncate(groupId, 6, 4)}`,
        totalMessages: sorted.length,
        memberCount: members.size,
        lastMessageTime: latest ? Number(latest.timestamp) : null,
        lastSync: latest ? formatDateTime(Number(latest.timestamp)) : "ยังไม่มีการซิงก์",
        lastMessagePreview: latest ? getMessagePreview(latest) : "ยังไม่มีข้อความ",
        lastMessageType: latest ? classifyMessageType(latest) : "other",
        healthSignal: getHealthSignal(sorted),
        status: getGroupStatus(sorted),
        members: Array.from(members.values()),
      };
    })
    .sort((left, right) => (right.lastMessageTime ?? 0) - (left.lastMessageTime ?? 0));
}

export function filterGroupSummaries(groups: GroupSummary[], filters: GroupFilters) {
  return groups.filter((group) => {
    const matchesSearch =
      filters.search.length === 0 ||
      group.groupName.toLowerCase().includes(filters.search.toLowerCase()) ||
      group.groupId.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === "all" || group.status === filters.status;
    const matchesDate = group.lastMessageTime
      ? withinDateRange(group.lastMessageTime, filters.dateRange)
      : filters.dateRange === "all";
    const matchesType = filters.messageType === "all" || group.lastMessageType === filters.messageType;

    return matchesSearch && matchesStatus && matchesDate && matchesType;
  });
}

export function buildGroupConversation(messages: MessageRecord[], groupId: string): GroupConversation | null {
  const conversationMessages = messages
    .filter((message) => message.groupId === groupId)
    .sort((left, right) => Number(right.timestamp) - Number(left.timestamp));

  if (conversationMessages.length === 0) {
    return null;
  }

  const [summary] = buildGroupSummaries(conversationMessages);

  return {
    summary,
    messages: conversationMessages,
  };
}

export function LogoLockup({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center">
          <Image src={autoHealthLineLogo} alt="AutoHealth" className="h-10 w-10 object-contain" priority />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Image src={autoHealthLogo} alt="AutoHealth" className="h-auto w-full object-contain" priority />
    </div>
  );
}

function ShellHeaderIconButton({ icon, label }: { icon: "notifications" | "assignment" | "help_center"; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
    >
      <span className="material-symbols-outlined text-[22px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
        {icon}
      </span>
    </button>
  );
}

function ShellHeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <ShellHeaderIconButton icon="notifications" label="Notifications" />
      <ShellHeaderIconButton icon="assignment" label="Appointments" />
      <ShellHeaderIconButton icon="help_center" label="Help center" />
      <button
        type="button"
        className="ml-2 flex h-10 items-center gap-2 bg-slate-50 px-2 pr-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        aria-label="User profile"
      >
        <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-indigo-100">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80"
            alt="User profile"
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span>ออนไลน์</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>
    </div>
  );
}

export function ConsoleShell({
  title,
  children,
  topBar,
  contentClassName,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  topBar?: ReactNode;
  contentClassName?: string;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const activeNavItem = navItems.find((item) => item.activeMatch(pathname));
  const headerTitle = activeNavItem?.label ?? title;
  const headerIcon = activeNavItem?.icon ?? null;

  return (
    <main className="h-screen overflow-hidden bg-[#F5F7FB] text-slate-900">
      <div
        className="grid h-screen min-h-0"
        style={{ gridTemplateColumns: isSidebarCollapsed ? "72px minmax(0,1fr)" : "220px minmax(0,1fr)" }}

      >
        <aside className="relative min-h-0 border-r border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className="absolute -right-3 top-1/2 z-20 hidden h-9 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-700 lg:flex"
            aria-label={isSidebarCollapsed ? "ขยายเมนูด้านซ้าย" : "ย่อเมนูด้านซ้าย"}
          >
            {isSidebarCollapsed ? ">" : "<"}
          </button>

          <div className={`flex h-full flex-col ${isSidebarCollapsed ? "px-3 py-6" : "px-5 py-6"}`}>
            <LogoLockup collapsed={isSidebarCollapsed} />

            <nav className="mt-7 space-y-2">
              {navItems.map((item, index) => {
                const isActive = item.activeMatch(pathname);

                return (
                  <Link
                    key={`${item.label}-${item.href}-${index}`}
                    href={item.href}
                    className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#1D4ED8] text-white shadow-[0_8px_18px_rgba(29,78,216,0.18)]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    title={item.label}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                          isActive ? "bg-white/15" : "bg-slate-100"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
                          {item.icon}
                        </span>
                      </span>
                      {!isSidebarCollapsed ? item.label : null}
                    </span>
                  </Link>
                );
              })}
            </nav>

    

            <div
              className={`mt-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${isSidebarCollapsed ? "justify-center" : ""}`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0D47A1] text-sm font-semibold text-white">
                N
              </div>
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">Nattapong S.</p>
                  <p className="text-xs text-sky-600">Admin</p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="flex h-screen min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-950">
                  {headerIcon ? (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <span className="material-symbols-outlined text-[26px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
                        {headerIcon}
                      </span>
                    </span>
                  ) : null}
                  <span>{headerTitle}</span>
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">{topBar ?? <ShellHeaderActions />}</div>
            </div>
          </header>

          <div className={contentClassName ?? "min-h-0 flex-1 px-6 py-6"}>{children}</div>
        </section>
      </div>
    </main>
  );
}

export function Avatar({
  avatarUrl,
  displayName,
  size = 40,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  size?: number;
}) {
  const [isImageBroken, setIsImageBroken] = useState(false);

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600"
      style={{ width: size, height: size }}
    >
      {avatarUrl && !isImageBroken ? (
        <img
          src={avatarUrl}
          alt={displayName ?? "LINE user"}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          width={size}
          height={size}
          onError={() => setIsImageBroken(true)}
        />
      ) : (
        <span>{getInitial(displayName)}</span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: GroupStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusToneMap[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export function HealthSignalBadge({ signal }: { signal: HealthSignal }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${healthSignalToneMap[signal]}`}>
      {getHealthSignalLabel(signal)}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const tone = typeToneMap[type] ?? typeToneMap.other;

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{getMessageTypeLabel(type)}</span>;
}

export function formatManagePreview(message: MessageRecord) {
  return getMessagePreview(message);
}

export function resolveMessageIdentity(message: MessageRecord) {
  return {
    displayName: getDisplayName(message),
    userId: message.userId,
    avatarUrl: getAvatarUrl(message),
  };
}

export function getMessageType(message: MessageRecord) {
  return classifyMessageType(message);
}

export function getMessageTimestamp(message: MessageRecord) {
  return Number(message.timestamp);
}

export function getDirectionLabel(message: MessageRecord) {
  return getMessageDirection(message) === "outbound" ? "ขาออก" : "ขาเข้า";
}

export function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
