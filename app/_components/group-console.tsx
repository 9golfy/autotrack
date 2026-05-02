"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { buildHealthReport } from "@/lib/health-report";
import autoHealthLineLogo from "@/logo/Auto_Health_Line_Logo.png";
import autoHealthLogo from "@/logo/Auto_Health_Logo_Horizontal_300.png";

export type MessageRecord = {
  id: string;
  messageId: string;
  userId: string | null;
  groupId: string | null;
  displayName: string | null;
  email: string | null;
  statusMessage: string | null;
  pictureUrl: string | null;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  contentUrl: string | null;
  contentMimeType: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "file" | "text" | string | null;
  contentType?: string | null;
  source: string;
  text: string | null;
  type: string;
  timestamp: string;
  createdAt: string;
  context?: string | null;
  contexts?: string[] | null;
  parsed?: unknown;
  flexTemplate?: string | null;
  confidence?: number | string | null;
  importBatchId?: string | null;
  rawPayload?: {
    parsed?: unknown;
    context?: string | null;
    contexts?: string[] | null;
    flexTemplate?: string | null;
    lineIdentity?: {
      groupName?: string | null;
      error?: string | null;
      pictureUrl?: string | null;
      userPictureUrl?: string | null;
      memberPictureUrl?: string | null;
      groupPictureUrl?: string | null;
    } | null;
    mediaUpload?: {
      publicUrl?: string | null;
      url?: string | null;
      mediaUrl?: string | null;
      thumbnailUrl?: string | null;
      mediaType?: "image" | "video" | "audio" | "file" | "text" | string | null;
      contentType?: string | null;
      contentMimeType?: string | null;
      error?: string | null;
    } | null;
    aiAnalysis?: unknown;
  } | null;
};

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
  { href: "/", label: "Dashboard", icon: "DB", activeMatch: (pathname: string) => pathname === "/" },
  { href: "/", label: "Group Chat", icon: "GC", activeMatch: (pathname: string) => pathname.startsWith("/groups/") },
  { href: "/", label: "Patients", icon: "PT", activeMatch: () => false },
  { href: "/", label: "Staff", icon: "ST", activeMatch: () => false },
  { href: "/", label: "Floor Plan", icon: "FP", activeMatch: () => false },
  { href: "/", label: "Settings", icon: "SE", activeMatch: () => false },
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
  return message.displayName?.trim() || "ไม่ทราบชื่อ";
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
    return message.text;
  }

  if (message.type === "image" || message.contentUrl) {
    return "มีรูปภาพแนบ";
  }

  return `${message.type} event`;
}

function getGroupName(message: MessageRecord) {
  return message.rawPayload?.lineIdentity?.groupName?.trim() || `กลุ่ม ${truncate(message.groupId, 6, 4)}`;
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

type AutoTrackMessagesOptions = {
  groupId?: string | null;
  limit?: number;
  from?: number | null;
  to?: number | null;
};

export function useAutoTrackMessages(options: AutoTrackMessagesOptions = {}) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [status, setStatus] = useState("กำลังรอข้อมูลจากกลุ่ม LINE");
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();

    if (options.groupId) {
      params.set("groupId", options.groupId);
    }

    if (options.limit) {
      params.set("limit", String(options.limit));
    }

    if (typeof options.from === "number" && Number.isFinite(options.from)) {
      params.set("from", String(options.from));
    }

    if (typeof options.to === "number" && Number.isFinite(options.to)) {
      params.set("to", String(options.to));
    }

    const messagesUrl = params.size > 0 ? `/api/messages?${params.toString()}` : "/api/messages";

    async function loadMessages() {
      try {
        const refreshUrl = `${messagesUrl}${messagesUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
        const response = await fetch(refreshUrl, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load messages");
        }

        const data = (await response.json()) as {
          messages: MessageRecord[];
          configured?: boolean;
          setupMessage?: string;
        };

        if (!isMounted) {
          return;
        }

        setMessages(data.messages);
        setHasLoaded(true);
        setError(null);
        setSetupMessage(data.configured === false ? data.setupMessage ?? null : null);
        setStatus(
          data.messages.length > 0
            ? `ซิงก์ล่าสุด ${formatDateTime(Number(data.messages[0].timestamp))}`
            : data.configured === false
              ? "ยังไม่ได้ตั้งค่าฐานข้อมูล"
              : "ยังไม่มีข้อมูลจากกลุ่ม",
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        console.warn("Unable to refresh LINE messages", loadError);
        setHasLoaded(true);
        setError((currentError) => currentError ?? "ไม่สามารถโหลดข้อมูลกลุ่ม LINE ได้ในขณะนี้");
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 60000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [options.groupId, options.limit, options.from, options.to]);

  return { messages, status, error, setupMessage, hasLoaded };
}

export function LogoLockup({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <Image src={autoHealthLineLogo} alt="AutoHealth" className="h-9 w-9 object-contain" priority />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <Image src={autoHealthLogo} alt="AutoHealth" className="h-auto w-full object-contain" priority />
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">Intelligence Center</p>
        <p className="mt-1 text-xs text-slate-500">คอนโซลติดตามกลุ่ม AutoTrack</p>
      </div>
    </div>
  );
}

export function ConsoleShell({
  title,
  subtitle,
  children,
  topBar,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  topBar?: ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: isSidebarCollapsed ? "88px minmax(0,1fr)" : "minmax(240px,20%) minmax(0,80%)" }}
      >
        <aside className="relative border-r border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className="absolute -right-3 top-1/2 z-20 hidden h-9 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-700 lg:flex"
            aria-label={isSidebarCollapsed ? "ขยายเมนูด้านซ้าย" : "ย่อเมนูด้านซ้าย"}
          >
            {isSidebarCollapsed ? "›" : "‹"}
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
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-semibold ${
                          isActive ? "bg-white/15" : "bg-slate-100"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!isSidebarCollapsed ? item.label : null}
                    </span>
                    {!isSidebarCollapsed && index === 1 ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Live</span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {!isSidebarCollapsed ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Console Story
                </p>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>1. AutoTrack เข้าร่วมกลุ่ม LINE</li>
                  <li>2. เก็บข้อความลง Supabase อัตโนมัติ</li>
                  <li>3. ทีมดูแลตรวจแต่ละกลุ่มได้</li>
                  <li>4. พร้อมต่อยอดสู่ AutoReport และ AutoBrain</li>
                </ol>
              </div>
            ) : null}

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

        <section className="min-w-0">
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-slate-500 md:text-base">{subtitle}</p>
              </div>
              {topBar ? <div className="flex flex-wrap items-center gap-3">{topBar}</div> : null}
            </div>
          </header>

          <div className="px-6 py-6">{children}</div>
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
