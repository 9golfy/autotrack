"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  Avatar,
  ConsoleShell,
  EmptyPanel,
  HealthSignalBadge,
  TypeBadge,
  buildGroupConversation,
  formatClock,
  formatDate,
  formatDateTime,
  formatManagePreview,
  formatNumber,
  getDirectionLabel,
  getMessageTimestamp,
  getMessageType,
  resolveMessageIdentity,
  truncate,
  useAutoTrackMessages,
  type GroupConversation,
  type MessageRecord,
} from "@/modules/autohealth/chat-groups/components/GroupConsole";
import { buildHealthReport } from "@/services/health-report";

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 460;
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_TABLET_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_WIDTH_KEY = "chat.sidebar.width";
const SIDEBAR_COLLAPSED_KEY = "chat.sidebar.collapsed";
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
type LineGroup = {
  groupId: string;
  groupName: string | null;
  pictureUrl: string | null;
};

type LineGroupMember = {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  role: string | null;
};

type LineGroupWithMembers = LineGroup & {
  members: LineGroupMember[];
};

type MemberRole = "Admin" | "ญาติ" | "ผู้ดูแล";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "ญาติ", label: "ญาติ" },
  { value: "ผู้ดูแล", label: "ผู้ดูแล" },
];

function RoleModal({
  member,
  groupId,
  currentRole,
  onClose,
  onSaved,
}: {
  member: LineGroupMember;
  groupId: string;
  currentRole: MemberRole | null;
  onClose: () => void;
  onSaved: (role: MemberRole) => void;
}) {
  const [selected, setSelected] = useState<MemberRole>(currentRole ?? "ญาติ");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/line/group-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId: member.userId, role: selected }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      }
      onSaved(selected);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">กำหนดสถานะ</p>
            <p className="mt-0.5 text-xs text-slate-500">{member.displayName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">สถานะในกลุ่ม</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value as MemberRole)}
              className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
        {saveError ? (
          <p className="border-t border-rose-100 bg-rose-50 px-5 py-2 text-xs text-rose-600">{saveError}</p>
        ) : null}
      </div>
    </div>
  );
}

type MemberFilterTab = "all" | "selected";

function useLineGroups() {
  const [groups, setGroups] = useState<LineGroupWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const isBust = refreshKey > 0;

    async function load() {
      setIsLoading(true);
      try {
        const groupsUrl = isBust ? "/api/line/groups?bust=1" : "/api/line/groups";
        const response = await fetch(groupsUrl, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { groups: LineGroup[] };

        if (!isMounted) return;

        const groupsWithMembers = await Promise.all(
          data.groups.map(async (group) => {
            try {
              // ปกติไม่ bust — ดึงจาก cache
              const membersUrl = `/api/line/group-members?groupId=${encodeURIComponent(group.groupId)}`;
              const membersResponse = await fetch(membersUrl, { cache: "no-store" });
              const membersData = membersResponse.ok
                ? ((await membersResponse.json()) as { members: LineGroupMember[] })
                : { members: [] };
              return { ...group, members: membersData.members };
            } catch {
              return { ...group, members: [] };
            }
          }),
        );

        if (isMounted) {
          setGroups(groupsWithMembers);
        }
      } catch {
        // ถ้าโหลดไม่ได้ก็แสดง empty
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => { isMounted = false; };
  }, [refreshKey]);

  /** refresh ทุก group (ใช้ตอนโหลดครั้งแรก) */
  const refresh = () => setRefreshKey((k) => k + 1);

  /** refresh เฉพาะ group เดียว — bust cache แล้วดึงจาก LINE API + DB */
  const refreshSingleGroup = async (targetGroupId: string) => {
    try {
      // bust members cache
      const membersUrl = `/api/line/group-members?groupId=${encodeURIComponent(targetGroupId)}&bust=1`;
      const res = await fetch(membersUrl, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { members: LineGroupMember[] };

      // bust groups cache เพื่อดึงชื่อกลุ่มใหม่ด้วย
      const groupsRes = await fetch("/api/line/groups?bust=1", { cache: "no-store" });
      const groupsData = groupsRes.ok
        ? ((await groupsRes.json()) as { groups: LineGroup[] })
        : null;

      setGroups((prev) =>
        prev.map((g) => {
          if (g.groupId !== targetGroupId) return g;
          const updatedGroup = groupsData?.groups.find((gr) => gr.groupId === targetGroupId);
          return {
            ...g,
            groupName: updatedGroup?.groupName ?? g.groupName,
            pictureUrl: updatedGroup?.pictureUrl ?? g.pictureUrl,
            members: data.members,
          };
        }),
      );
    } catch {
      // silent fail
    }
  };

  return { groups, isLoading, refresh, refreshSingleGroup };
}

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

function readStoredSidebarWidth() {
  if (typeof window === "undefined") {
    return SIDEBAR_DEFAULT_WIDTH;
  }

  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));

  if (!Number.isFinite(storedWidth)) {
    return window.innerWidth < TABLET_BREAKPOINT ? SIDEBAR_TABLET_WIDTH : SIDEBAR_DEFAULT_WIDTH;
  }

  return clampSidebarWidth(storedWidth);
}

function readStoredSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function DetailPanel({
  message,
  onClose,
}: {
  message: MessageRecord;
  onClose: () => void;
}) {
  const identity = resolveMessageIdentity(message);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close panel" />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar avatarUrl={identity.avatarUrl} displayName={identity.displayName} size={52} />
            <div>
              <p className="text-lg font-semibold text-slate-950">{identity.displayName}</p>
              <p className="text-sm text-slate-500">{truncate(identity.userId, 12, 6)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={getMessageType(message)} />
              <span className="rounded-none bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {getDirectionLabel(message)}
              </span>
              <span className="text-sm text-slate-500">
                {formatDateTime(getMessageTimestamp(message))}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  {formatManagePreview(message)}
                </p>
              </div>

              {message.contentUrl ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Attachment
                  </p>
                  <a href={message.contentUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.contentUrl}
                      alt="LINE attachment"
                      className="max-h-[320px] w-full rounded-none border border-slate-200 object-cover"
                    />
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <details className="rounded-none border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Raw payload
            </summary>
            <pre className="mt-4 overflow-x-auto rounded-none bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(message.rawPayload ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      </aside>
    </div>
  );
}

function getMessageStatus(message: MessageRecord) {
  return message.type === "outbound" || message.source === "web" ? "เธชเนเธเนเธฅเนเธง" : "เธเธฑเธเธ—เธถเธเนเธฅเนเธง";
}

function getMessageHealthSignal(message: MessageRecord) {
  const report = buildHealthReport([
    {
      id: message.id,
      text: message.text,
      contentUrl: message.contentUrl,
      type: message.type,
      timestamp: Number(message.timestamp),
      displayName: message.displayName,
      userId: message.userId,
    },
  ]);

  if (report.statusTone === "red") {
    return "Critical" as const;
  }

  if (report.statusTone === "orange") {
    return "Watch" as const;
  }

  return "Normal" as const;
}

function getTimelineIcon(title: string, detail: string) {
  const normalized = `${title} ${detail}`.toLowerCase();

  if (normalized.includes("image") || normalized.includes("เธฃเธนเธ")) {
    return "IMG";
  }

  if (normalized.includes("เธขเธฒ") || normalized.includes("med")) {
    return "MED";
  }

  return "LINE";
}

function getToneClass(tone: "green" | "orange" | "red") {
  if (tone === "red") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (tone === "orange") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function buildPath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function InsightTrendChart({
  series,
}: {
  series: { label: string; bp: number; hr: number; temp: number }[];
}) {
  const width = 420;
  const height = 150;
  const bpPath = buildPath(
    series.map((point) => point.bp),
    width,
    height,
  );
  const hrPath = buildPath(
    series.map((point) => point.hr),
    width,
    height,
  );
  const tempPath = buildPath(
    series.map((point) => point.temp),
    width,
    height,
  );

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[0.2, 0.5, 0.8].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="#E2E8F0"
            strokeDasharray="4 8"
          />
        ))}
        <path d={bpPath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        <path d={hrPath} fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
        <path d={tempPath} fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        {[
          { key: "bp", values: series.map((point) => point.bp), color: "#2563EB" },
          { key: "hr", values: series.map((point) => point.hr), color: "#7C3AED" },
          { key: "temp", values: series.map((point) => point.temp), color: "#EF4444" },
        ].map((entry) =>
          entry.values.map((value, index) => {
            const min = Math.min(...entry.values);
            const max = Math.max(...entry.values);
            const range = max - min || 1;
            const x = (index / Math.max(entry.values.length - 1, 1)) * width;
            const y = height - ((value - min) / range) * height;

            return <circle key={`${entry.key}-${index}`} cx={x} cy={y} r="4.5" fill={entry.color} />;
          }),
        )}
      </svg>

      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {series.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "BP", color: "bg-blue-50 text-blue-700" },
          { label: "HR", color: "bg-violet-50 text-violet-700" },
          { label: "Temp", color: "bg-rose-50 text-rose-700" },
        ].map((item) => (
          <span key={item.label} className={`rounded-none px-3 py-1 text-xs font-medium ${item.color}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResizeHandle({
  isDragging,
  disabled,
  onPointerDown,
}: {
  isDragging: boolean;
  disabled: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat sidebar"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className={`group hidden w-2 shrink-0 cursor-col-resize items-stretch justify-center bg-transparent transition lg:flex ${
        disabled ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <span
        className={`my-4 w-px rounded-none transition ${
          isDragging ? "bg-[#3B82F6]" : "bg-[#E5E7EB] group-hover:bg-[#3B82F6]"
        }`}
      />
    </button>
  );
}

function SidebarIconButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-none transition ${
        active ? "bg-[#3B82F6] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      <span className="material-symbols-outlined text-[24px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
        {children}
      </span>
    </button>
  );
}

function MemberFilterDropdown({
  members,
  selectedMembers,
  activeTab,
  search,
  isOpen,
  onClose,
  onConfirm,
  onReset,
  onSearchChange,
  onTabChange,
  onToggleMember,
}: {
  members: GroupConversation["summary"]["members"];
  selectedMembers: string[];
  activeTab: MemberFilterTab;
  search: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: MemberFilterTab) => void;
  onToggleMember: (userId: string) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const visibleMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        member.displayName.toLowerCase().includes(normalizedSearch) ||
        member.userId.toLowerCase().includes(normalizedSearch);
      const matchesTab = activeTab === "all" || selectedMembers.includes(member.userId);

      return matchesSearch && matchesTab;
    });
  }, [activeTab, members, search, selectedMembers]);
  const safeFocusedIndex = Math.min(focusedIndex, Math.max(visibleMembers.length - 1, 0));

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onConfirm();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIndex((current) => Math.min(visibleMembers.length - 1, current + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((current) => Math.max(0, current - 1));
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 max-h-[82vh] overflow-hidden rounded-none bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-slate-200 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:w-[340px] sm:max-w-[calc(100vw-48px)]">
      <div className="flex max-h-[82vh] flex-col" onKeyDown={handleKeyDown}>
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-none text-slate-500 transition hover:bg-slate-100"
              aria-label="Close member screening"
            >
              {"<"}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950">Member screening</p>
              <p className="text-xs text-slate-500">{members.length} members available</p>
            </div>
            <div className="rounded-none bg-slate-100 p-1">
              {(["all", "selected"] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`rounded-none px-2.5 py-1 text-xs font-medium transition ${
                    activeTab === tab ? "bg-white text-[#1E3A8A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "all" ? "Group" : "Selected"}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-none bg-slate-50 px-3 py-2 ring-1 ring-slate-100 focus-within:ring-[#3B82F6]/35">
            <span className="text-xs text-slate-400">Search</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name or LINE ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              autoFocus
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {visibleMembers.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No members match this filter.</div>
          ) : (
            visibleMembers.map((member, index) => {
              const isSelected = selectedMembers.includes(member.userId);
              const isFocused = safeFocusedIndex === index;

              return (
                <button
                  type="button"
                  key={member.userId}
                  title={`${member.displayName} (${member.userId})`}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onClick={() => onToggleMember(member.userId)}
                  className={`flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left transition ${
                    isFocused ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <Avatar avatarUrl={member.avatarUrl} displayName={member.displayName} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-950">{member.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{member.userId}</p>
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-none text-xs ${
                      isSelected ? "bg-[#3B82F6] text-white" : "bg-slate-100 text-transparent"
                    }`}
                  >
                    {"OK"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
          <span className="text-xs font-medium text-slate-500">{selectedMembers.length} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-none px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-none bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563EB]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResizableSidebar({
  conversation,
  filteredMessageCount,
  activeGroupId,
  onSelectGroup,
  onSidebarReady,
  width,
  isCollapsed,
  isMobileOpen,
  onCollapseToggle,
  onMobileClose,
}: {
  conversation: GroupConversation;
  filteredMessageCount: number;
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onSidebarReady: (mostActiveGroupId: string) => void;
  width: number;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
}) {
  const members = conversation.summary.members;
  const { groups: lineGroups, isLoading: isGroupsLoading, refresh: refreshGroups, refreshSingleGroup } = useLineGroups();
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [roleModalTarget, setRoleModalTarget] = useState<{ member: LineGroupMember; groupId: string } | null>(null);
  const [refreshingGroupId, setRefreshingGroupId] = useState<string | null>(null);
  // เก็บ role ที่ save แล้วใน session นี้ keyed by userId — merge กับ member.role จาก DB
  const [localRoles, setLocalRoles] = useState<Record<string, string>>({});

  function getEffectiveRole(member: LineGroupMember): string | null {
    return localRoles[member.userId] ?? member.role ?? null;
  }

  function getRoleBadgeClass(role: string): string {
    if (role === "ญาติ") return "bg-emerald-50 text-emerald-700";
    if (role === "Admin") return "bg-blue-50 text-blue-700";
    return "bg-slate-100 text-slate-600";
  }

  function sortMembersWithPin(members: LineGroupMember[]): LineGroupMember[] {
    return [...members].sort((a, b) => {
      const roleA = getEffectiveRole(a);
      const roleB = getEffectiveRole(b);
      const pinA = roleA === "ญาติ" ? 0 : 1;
      const pinB = roleB === "ญาติ" ? 0 : 1;
      return pinA - pinB;
    });
  }

  async function handleRefreshGroup(groupId: string) {
    setRefreshingGroupId(groupId);
    try {
      await refreshSingleGroup(groupId);
    } finally {
      setRefreshingGroupId(null);
    }
  }

  const autoExpandedRef = useRef(false);

  // auto-expand กลุ่มแรกครั้งเดียวเมื่อโหลดเสร็จ
  useEffect(() => {
    if (lineGroups.length > 0 && !autoExpandedRef.current) {
      autoExpandedRef.current = true;
      setExpandedGroupIds([lineGroups[0]!.groupId]);
    }
  }, [lineGroups]);

  // เมื่อ sidebar โหลดเสร็จ → แจ้ง parent ให้โหลด chat ของ group ที่ active อยู่
  const sidebarReadyCalledRef = useRef(false);
  useEffect(() => {
    if (lineGroups.length > 0 && !isGroupsLoading && !sidebarReadyCalledRef.current) {
      sidebarReadyCalledRef.current = true;
      // ใช้ activeGroupId ที่ส่งมา (default จาก page) เป็น group แรกที่โหลด chat
      onSidebarReady(activeGroupId);
    }
  }, [lineGroups, isGroupsLoading, activeGroupId, onSidebarReady]);

  const filteredGroups = lineGroups.filter((group) => {
    const searchText = groupSearch.trim().toLowerCase();
    if (!searchText) return true;
    const groupName = group.groupName ?? group.groupId;
    const memberNames = group.members.map((m) => m.displayName).join(" ");
    return `${groupName} ${memberNames}`.toLowerCase().includes(searchText);
  });

  return (
    <>
    <aside
      className={`z-40 flex h-full min-h-0 flex-col overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200 transition-[width,transform] duration-300 ease-out md:relative md:translate-x-0 md:rounded-none ${
        isMobileOpen ? "fixed inset-y-0 left-0 translate-x-0 rounded-none" : "fixed inset-y-0 left-0 -translate-x-full rounded-none md:translate-x-0"
      } ${isCollapsed ? "px-3 py-4" : "py-4"}`}
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width }}
      aria-label="Chat groups and members"
    >
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-3 px-4"}`}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="flex h-11 w-11 items-center justify-center rounded-none text-[#3B82F6] transition hover:bg-slate-50 hover:text-[#1E3A8A]"
            aria-label="Expand member sidebar"
            title="Expand member sidebar"
          >
            <span className="material-symbols-outlined text-[26px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
              left_panel_open
            </span>
          </button>
        ) : (
          <>
            <p className="text-xs font-semibold text-[#3B82F6]">ชื่อกลุ่ม</p>
            <button
              type="button"
              onClick={onCollapseToggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Collapse member sidebar"
            >
              <span className="material-symbols-outlined text-[24px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
                left_panel_close
              </span>
            </button>
          </>
        )}
      </div>

      {isCollapsed ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <SidebarIconButton label="Search groups">
            search
          </SidebarIconButton>
          <SidebarIconButton label="Chat groups" active>
            speaker_notes
          </SidebarIconButton>
        </div>
      ) : (
        <>
          <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
            <label className="mx-4 flex items-center gap-2 rounded-none bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100 focus-within:ring-[#3B82F6]/35">
              <span
                className="material-symbols-outlined text-[20px] leading-none text-slate-400 [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]"
                aria-hidden="true"
              >
                search
              </span>
              <input
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="Search Group Name"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <div
              className="min-h-0 flex-1 overflow-y-scroll border border-slate-100 bg-white"
              style={{ scrollbarGutter: "stable" }}
            >
              {isGroupsLoading ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">กำลังโหลดกลุ่ม LINE...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">ไม่พบชื่อกลุ่ม</div>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded = expandedGroupIds.includes(group.groupId);
                  const groupName = group.groupName ?? group.groupId;

                  return (
                    <div key={group.groupId} className="border-b border-slate-100 last:border-b-0">
                      {/* แถว group: คลิกทั้งแถวเพื่อ expand/collapse */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedGroupIds((current) =>
                            current.includes(group.groupId)
                              ? current.filter((id) => id !== group.groupId)
                              : [...current, group.groupId],
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedGroupIds((current) =>
                              current.includes(group.groupId)
                                ? current.filter((id) => id !== group.groupId)
                                : [...current, group.groupId],
                            );
                          }
                        }}
                        className="group/group relative flex cursor-pointer items-center hover:bg-slate-50"
                      >
                        {/* ไอคอนลูกศร */}
                        <span className="flex h-10 w-8 shrink-0 items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined pointer-events-none text-[22px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
                            {isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                          </span>
                        </span>

                        {/* รูป + ชื่อกลุ่ม */}
                        {group.pictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.pictureUrl}
                            alt={groupName}
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="material-symbols-outlined shrink-0 text-[21px] leading-none text-[#3B82F6] [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]"
                            aria-hidden="true"
                          >
                            speaker_notes
                          </span>
                        )}
                        <span className="ml-2 min-w-0 flex-1 truncate py-2 text-sm font-semibold text-slate-950" title={groupName}>
                          {groupName}
                        </span>

                        {/* ปุ่ม refresh — แสดงเมื่อ hover ที่แถว, stopPropagation ไม่ให้ toggle expand */}
                        <button
                          type="button"
                          disabled={refreshingGroupId === group.groupId || isGroupsLoading}
                          onClick={(e) => { e.stopPropagation(); void handleRefreshGroup(group.groupId); }}
                          className="invisible mr-2 shrink-0 border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 group-hover/group:visible"
                        >
                          {refreshingGroupId === group.groupId ? "กำลังดึง..." : "ดึงข้อมูลใหม่"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="bg-white pl-4 pr-3 pb-3">
                          {/* row แสดงห้องแชท — อยู่เหนือ member list */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSelectGroup(group.groupId); }}
                            className={`mb-3 flex w-full items-center justify-between gap-2 border px-3 py-2 text-sm font-semibold transition ${
                              activeGroupId === group.groupId
                                ? "border-blue-300 bg-blue-100 text-blue-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                          >
                            <span>แสดงห้องแชท</span>
                            <span className="material-symbols-outlined pointer-events-none text-[18px] leading-none [font-variation-settings:'FILL'_0,'wght'_500,'GRAD'_0,'opsz'_24]">
                              keyboard_arrow_right
                            </span>
                          </button>

                          {group.members.length === 0 ? (
                            <p className="py-2 text-xs text-slate-400">ไม่มีข้อมูลสมาชิก</p>
                          ) : (
                            <div
                              className="space-y-3 border-l border-slate-100 pl-3"
                              style={group.members.length > 5 ? { maxHeight: "272px", overflowY: "auto", scrollbarGutter: "stable" } : undefined}
                            >
                              {sortMembersWithPin(group.members).map((member) => (
                                <div
                                  key={member.userId}
                                  className="group/member relative flex items-center gap-3 py-1 overflow-hidden"
                                >                                  {member.pictureUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={member.pictureUrl}
                                      alt={member.displayName}
                                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-sm font-semibold text-white"
                                      title={member.displayName}
                                    >
                                      {member.displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-950" title={member.displayName}>
                                      {member.displayName}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate text-xs text-slate-400">{member.userId.slice(0, 16)}…</p>
                                      {getEffectiveRole(member) ? (
                                        <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${getRoleBadgeClass(getEffectiveRole(member)!)}`}>
                                          {getEffectiveRole(member)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {/* ปุ่ม hover */}
                                  <button
                                    type="button"
                                    onClick={() => setRoleModalTarget({ member, groupId: group.groupId })}
                                    className="invisible absolute right-0 top-1/2 -translate-y-1/2 shrink-0 border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 group-hover/member:visible"
                                  >
                                    กำหนดสถานะ
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <button type="button" className="sr-only" onClick={onMobileClose}>
        Close mobile sidebar
      </button>
    </aside>

    {roleModalTarget ? (
      <RoleModal
        member={roleModalTarget.member}
        groupId={roleModalTarget.groupId}
        currentRole={(getEffectiveRole(roleModalTarget.member)) as MemberRole | null}
        onClose={() => setRoleModalTarget(null)}
        onSaved={(role) => {
          setLocalRoles((prev) => ({ ...prev, [roleModalTarget.member.userId]: role }));
        }}
      />
    ) : null}
    </>
  );
}

function ChatWindow({
  conversation,
  messages,
  groupId,
  onOpenSidebar,
  onSelectMessage,
  onRefresh,
}: {
  conversation: GroupConversation;
  messages: MessageRecord[];
  groupId: string;
  onOpenSidebar: () => void;
  onSelectMessage: (message: MessageRecord) => void;
  onRefresh: () => void;
}) {
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !mediaFile) return;
    setIsSending(true);
    try {
      if (mediaFile) {
        await fetch("/api/line/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `[ไฟล์แนบ: ${mediaFile.name}]${trimmed ? `\n${trimmed}` : ""}`, targetId: groupId }),
        });
        setMediaFile(null);
      } else {
        await fetch("/api/line/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, targetId: groupId }),
        });
      }
      setText("");
      // รอ 1 วินาทีให้ LINE webhook บันทึกข้อมูลลง DB ก่อน refresh
      setTimeout(() => onRefresh(), 1000);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-none bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-none text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Open member sidebar"
          >
            Menu
          </button>
          <Avatar avatarUrl={conversation.summary.members[0]?.avatarUrl ?? null} displayName={conversation.summary.groupName} size={38} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-950" title={conversation.summary.groupName}>
              {conversation.summary.groupName}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {conversation.summary.memberCount} members - {conversation.summary.lastSync}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-none bg-blue-50 px-3 py-1 text-xs font-medium text-[#1E3A8A]">Robot hosting</span>
          <Link
            href={`/mini-app?groupId=${conversation.summary.groupId}`}
            className="rounded-none bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#172E6B]"
          >
            Open LIFF
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {[...messages].reverse().map((message) => {
            const identity = resolveMessageIdentity(message);
            const isOutbound = message.type === "outbound" || message.source === "web";

            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                {!isOutbound ? <Avatar avatarUrl={identity.avatarUrl} displayName={identity.displayName} size={34} /> : null}
                <button
                  type="button"
                  onClick={() => onSelectMessage(message)}
                  className={`min-w-0 max-w-[82%] rounded-none px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                    isOutbound ? "bg-[#3B82F6] text-white" : "bg-white text-slate-800 ring-1 ring-slate-100"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`truncate text-xs font-semibold ${isOutbound ? "text-white/85" : "text-slate-500"}`}>
                      {identity.displayName}
                    </span>
                    <span className={`text-[11px] ${isOutbound ? "text-white/70" : "text-slate-400"}`}>
                      {formatClock(getMessageTimestamp(message))}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{formatManagePreview(message)}</p>
                  {message.contentUrl ? (
                    <div className="mt-3 overflow-hidden rounded-none bg-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={message.contentUrl} alt="LINE attachment" className="max-h-64 w-full object-cover" />
                    </div>
                  ) : null}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-slate-100 bg-white px-4 py-3 space-y-2">
        {/* media preview */}
        {mediaFile ? (
          <div className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="truncate flex-1">📎 {mediaFile.name}</span>
            <button type="button" onClick={() => setMediaFile(null)} className="text-rose-500 hover:text-rose-700 shrink-0">✕</button>
          </div>
        ) : null}
        {/* input row */}
        <div className="flex items-end gap-2">
          {/* upload button */}
          <button
            type="button"
            title={LOCKED_GROUP_IDS.has(groupId) ? "กลุ่มนี้ถูกล็อก" : "แนบไฟล์"}
            disabled={LOCKED_GROUP_IDS.has(groupId)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center border transition ${
              LOCKED_GROUP_IDS.has(groupId)
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <span className="material-symbols-outlined pointer-events-none text-[20px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">attach_file</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => { setMediaFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
          {/* text input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={LOCKED_GROUP_IDS.has(groupId)}
            placeholder={LOCKED_GROUP_IDS.has(groupId) ? "ล็อก — ไม่อนุญาตให้ส่ง" : "พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"}
            rows={1}
            className={`min-h-[36px] max-h-24 flex-1 resize-none border px-3 py-2 text-sm outline-none transition ${
              LOCKED_GROUP_IDS.has(groupId)
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 placeholder:text-slate-400"
                : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-400 focus:bg-white placeholder:text-slate-400"
            }`}
          />
          {/* send button */}
          <button
            type="button"
            disabled={isSending || (!text.trim() && !mediaFile) || LOCKED_GROUP_IDS.has(groupId)}
            onClick={() => void handleSend()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center transition ${
              LOCKED_GROUP_IDS.has(groupId)
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            }`}
            title={LOCKED_GROUP_IDS.has(groupId) ? "กลุ่มนี้ถูกล็อก ไม่อนุญาตให้ส่งข้อมูล" : "ส่งข้อความ"}
          >
            <span className="material-symbols-outlined pointer-events-none text-[20px] leading-none [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              {LOCKED_GROUP_IDS.has(groupId) ? "lock" : "send"}
            </span>
          </button>
        </div>
      </footer>
    </section>
  );
}

// Group IDs ที่ล็อกไม่ให้ส่งข้อความจาก web เพื่อป้องกันส่งผิดกลุ่ม
const LOCKED_GROUP_IDS = new Set(["Cc7dba355a1ec758b48ed0acd10bae9c5"]);

type ReportShift = "morning" | "evening" | "night";

type VitalEntry = {
  time: string;
  temperature: string;
  heartRate: string;
  respiratoryRate: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
};

type HealthReportForm = {
  patientName: string;
  reportDate: string;
  shift: ReportShift;
  caregiver: string;
  vitals: VitalEntry[];
  consciousness: string;
  behavior: string;
  food: string;
  care: string;
  urineCount: string;
  stoolCount: string;
  centerName: string;
};

const SHIFT_OPTIONS: { value: ReportShift; label: string; emoji: string }[] = [
  { value: "morning", label: "เวรเช้า", emoji: "🌅" },
  { value: "evening", label: "เวรบ่าย", emoji: "🌇" },
  { value: "night", label: "เวรดึก", emoji: "🌒" },
];

const SHIFT_TIME: Record<ReportShift, string> = {
  morning: "08:00 น. - 16:00 น.",
  evening: "16:00 น. - 20:00 น.",
  night: "20:00 น. - 08:00 น.",
};

function emptyVital(time = ""): VitalEntry {
  return { time, temperature: "", heartRate: "", respiratoryRate: "", bpSys: "", bpDia: "", spo2: "" };
}

function buildReportMessage(form: HealthReportForm): string {
  const shift = SHIFT_OPTIONS.find((s) => s.value === form.shift)!;
  const vitalsText = form.vitals
    .filter((v) => v.time)
    .map(
      (v) =>
        `🫀วัดสัญญาณชีพ 🕙${v.time}\n` +
        `🌡อุณหภูมิร่างกาย ${v.temperature}องศา\n` +
        `🫀อัตราการเต้นของหัวใจ${v.heartRate}ครั้ง/นาที\n` +
        `🫁อัตราการหายใจ ${v.respiratoryRate} ครั้ง/นาที\n` +
        `👩‍⚕️ความดัน ${v.bpSys}/${v.bpDia}mmgh\n` +
        `🩸ออกซิเจนในเลือด ${v.spo2}%`,
    )
    .join("\n");

  return `🙏สวัสดีค่ะขออนุญาตรายงาน อาการ${form.patientName}
ประจำวันที่${form.reportDate}
${shift.emoji}${shift.label} (${SHIFT_TIME[form.shift]})
${vitalsText}
💁‍♀️ใน${shift.label}
ระดับความรู้สึกตัว : ${form.consciousness}
พฤติกรรมและอารมณ์ : ${form.behavior}
การทานอาหาร : ${form.food}
การดูแลช่วยเหลือ: ${form.care}
ปัสสาวะ ${form.urineCount} ครั้ง ขับถ่าย ${form.stoolCount} ครั้ง
👧 ผู้ดูแล : ${form.caregiver}
💖📞 หากมีข้อสงสัยสามารถสอบถามเพิ่มเติมได้ในไลน์กลุ่มนี้หรือที่เบอร์โทรศัพท์ศูนย์ ${form.centerName} ขอบคุณครับ 🙏🏻`;
}

const MOCK_FORM: HealthReportForm = {
  patientName: "คุณพ่อไพโรจน์",
  reportDate: "06/05/69",
  shift: "night",
  caregiver: "ฟองเบียร์",
  centerName: "บ้านลลิสา รังสิต",
  vitals: [
    { time: "22:00 น.", temperature: "36.7", heartRate: "20", respiratoryRate: "80", bpSys: "124", bpDia: "82", spo2: "98" },
    { time: "06:00 น.", temperature: "37.1", heartRate: "72", respiratoryRate: "18", bpSys: "120", bpDia: "88", spo2: "98" },
  ],
  consciousness: "คุณพ่อรู้สึกตัวตื่นตัวดี",
  behavior: "คุณพ่อนอนพักผ่อนรู้สึกตัวดีพูดคุยตอบโต้รู้เรื่องไม่มีอาการสับสน",
  food: "-",
  care: "ช่วยเหลือตามความต้องการของคุณพ่อและคอยระมัดระวังอุบัติเหตุ ตอนเช้าช่วยอาบตัวเปลี่ยนเสื้อผ้า",
  urineCount: "5",
  stoolCount: "1",
};

function VitalRow({
  index,
  vital,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  vital: VitalEntry;
  onChange: (index: number, field: keyof VitalEntry, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">🫀 ครั้งที่ {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="text-xs text-rose-500 hover:text-rose-700">ลบ</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block col-span-2">
          <span className="text-[11px] text-slate-500">🕙 เวลา</span>
          <input value={vital.time} onChange={(e) => onChange(index, "time", e.target.value)} placeholder="22:00 น." className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">🌡 อุณหภูมิ (°C)</span>
          <input value={vital.temperature} onChange={(e) => onChange(index, "temperature", e.target.value)} placeholder="36.7" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">🫀 ชีพจร (ครั้ง/นาที)</span>
          <input value={vital.heartRate} onChange={(e) => onChange(index, "heartRate", e.target.value)} placeholder="72" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">🫁 การหายใจ (ครั้ง/นาที)</span>
          <input value={vital.respiratoryRate} onChange={(e) => onChange(index, "respiratoryRate", e.target.value)} placeholder="18" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">🩸 SpO2 (%)</span>
          <input value={vital.spo2} onChange={(e) => onChange(index, "spo2", e.target.value)} placeholder="98" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] text-slate-500">👩‍⚕️ ความดัน (Sys/Dia mmHg)</span>
          <div className="mt-1 flex gap-1">
            <input value={vital.bpSys} onChange={(e) => onChange(index, "bpSys", e.target.value)} placeholder="120" className="h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
            <span className="flex items-center text-slate-400">/</span>
            <input value={vital.bpDia} onChange={(e) => onChange(index, "bpDia", e.target.value)} placeholder="80" className="h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
          </div>
        </label>
      </div>
    </div>
  );
}

function HealthReportPanel({ groupName, groupId, onRefresh }: { groupName: string; groupId: string; onRefresh: () => void }) {
  const [form, setForm] = useState<HealthReportForm>(MOCK_FORM);
  const [preview, setPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | "error" | null>(null);

  function updateField<K extends keyof HealthReportForm>(key: K, value: HealthReportForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSendResult(null);
  }

  function updateVital(index: number, field: keyof VitalEntry, value: string) {
    setForm((prev) => {
      const vitals = prev.vitals.map((v, i) => i === index ? { ...v, [field]: value } : v);
      return { ...prev, vitals };
    });
  }

  function addVital() {
    setForm((prev) => ({ ...prev, vitals: [...prev.vitals, emptyVital()] }));
  }

  function removeVital(index: number) {
    setForm((prev) => ({ ...prev, vitals: prev.vitals.filter((_, i) => i !== index) }));
  }

  async function handleSend() {
    setIsSending(true);
    setSendResult(null);
    try {
      const message = buildReportMessage(form);
      const response = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, targetId: groupId }),
      });
      setSendResult(response.ok ? "ok" : "error");
      if (response.ok) {
        // รอ 1 วินาทีให้ LINE webhook บันทึกลง DB ก่อน refresh
        setTimeout(() => onRefresh(), 1000);
      }
    } catch {
      setSendResult("error");
    } finally {
      setIsSending(false);
    }
  }

  const message = buildReportMessage(form);

  return (
    <aside className="hidden h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200 xl:flex">      {/* Header */}
      <div className="border-b border-slate-100">
        {/* Target group info */}
        <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">📤 ส่งรายงานไปยัง</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-950 truncate">{groupName || "—"}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400 truncate" title={groupId}>{groupId}</p>
        </div>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-xs font-semibold uppercase text-[#3B82F6]">รายงานประจำวัน</p>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className={`border px-3 py-1.5 text-xs font-semibold transition ${preview ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {preview ? "แก้ไข" : "ดูตัวอย่าง"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {preview ? (
          /* Preview */
          <div className="p-4">
            <pre className="whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 p-3 text-xs leading-6 text-slate-700">{message}</pre>
          </div>
        ) : (
          /* Form */
          <form className="space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); void handleSend(); }}>
            {/* ข้อมูลพื้นฐาน */}
            <section className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">ข้อมูลพื้นฐาน</p>
              <label className="block">
                <span className="text-[11px] text-slate-500">ชื่อผู้ป่วย</span>
                <input value={form.patientName} onChange={(e) => updateField("patientName", e.target.value)} className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">วันที่รายงาน</span>
                  <input value={form.reportDate} onChange={(e) => updateField("reportDate", e.target.value)} placeholder="06/05/69" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">เวร</span>
                  <select value={form.shift} onChange={(e) => updateField("shift", e.target.value as ReportShift)} className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400">
                    {SHIFT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">👧 ผู้ดูแล</span>
                  <input value={form.caregiver} onChange={(e) => updateField("caregiver", e.target.value)} className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">ชื่อศูนย์</span>
                  <input value={form.centerName} onChange={(e) => updateField("centerName", e.target.value)} className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
                </label>
              </div>
            </section>

            {/* สัญญาณชีพ */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase">สัญญาณชีพ</p>
                <button type="button" onClick={addVital} className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ เพิ่มรอบ</button>
              </div>
              {form.vitals.map((v, i) => (
                <VitalRow key={i} index={i} vital={v} onChange={updateVital} onRemove={removeVital} canRemove={form.vitals.length > 1} />
              ))}
            </section>

            {/* อาการและการดูแล */}
            <section className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">อาการและการดูแล</p>
              {(
                [
                  { key: "consciousness", label: "💁‍♀️ ระดับความรู้สึกตัว" },
                  { key: "behavior", label: "😊 พฤติกรรมและอารมณ์" },
                  { key: "food", label: "🍽 การทานอาหาร" },
                  { key: "care", label: "🤝 การดูแลช่วยเหลือ" },
                ] as { key: keyof HealthReportForm; label: string }[]
              ).map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="text-[11px] text-slate-500">{label}</span>
                  <textarea
                    value={form[key] as string}
                    onChange={(e) => updateField(key, e.target.value)}
                    rows={2}
                    className="mt-1 w-full border border-slate-200 bg-white px-2 py-1.5 text-xs leading-5 outline-none focus:border-blue-400 resize-y min-h-[56px]"
                  />
                </label>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">🚽 ปัสสาวะ (ครั้ง)</span>
                  <input value={form.urineCount} onChange={(e) => updateField("urineCount", e.target.value)} placeholder="5" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">💩 ขับถ่าย (ครั้ง)</span>
                  <input value={form.stoolCount} onChange={(e) => updateField("stoolCount", e.target.value)} placeholder="1" className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400" />
                </label>
              </div>
            </section>

            {/* Send result feedback inside form */}
            {sendResult === "ok" ? (
              <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">✓ ส่งรายงานเข้ากลุ่มสำเร็จ</div>
            ) : sendResult === "error" ? (
              <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">ส่งไม่สำเร็จ กรุณาลองใหม่</div>
            ) : null}
          </form>
        )}
      </div>

      {/* Sticky send button footer */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-3">
        {LOCKED_GROUP_IDS.has(groupId) ? (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 bg-slate-200 py-2.5 text-sm font-semibold text-slate-400"
            title="กลุ่มนี้ถูกล็อก ไม่อนุญาตให้ส่งข้อมูล"
          >
            <span className="material-symbols-outlined pointer-events-none text-[18px] leading-none [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">lock</span>
            ล็อก — ไม่อนุญาตให้ส่ง
          </button>
        ) : (
          <button
            type="button"
            disabled={isSending}
            onClick={() => void handleSend()}
            className="w-full bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSending ? "กำลังส่ง..." : "📤 ส่งรายงานเข้ากลุ่ม LINE"}
          </button>
        )}
      </div>
    </aside>
  );
}

function CustomerInfoPanel({
  conversation,
  report,
}: {
  conversation: GroupConversation;
  report: ReturnType<typeof buildHealthReport> | null;
}) {
  const reporterMessage = conversation.messages.find((message) => message.displayName === report?.reporterName);

  return (
    <aside className="hidden h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-none bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200 xl:flex">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-[#3B82F6]">Customer Information</p>
        <h2 className="mt-1 truncate text-sm font-semibold text-slate-950">{report?.reporterName ?? conversation.summary.groupName}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="rounded-none bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar avatarUrl={report?.reporterAvatarUrl ?? null} displayName={report?.reporterName ?? "Unknown"} size={52} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{report?.reporterName ?? "Unknown reporter"}</p>
              <p className="truncate text-xs text-slate-500">{truncate(reporterMessage?.userId ?? null, 12, 4)}</p>
            </div>
          </div>
        </section>
        <section className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3 rounded-none border border-slate-100 px-3 py-2">
            <span className="text-slate-500">Health</span>
            <span className="font-semibold text-slate-900">{report?.statusLabel ?? "Normal"}</span>
          </div>
          <div className="flex justify-between gap-3 rounded-none border border-slate-100 px-3 py-2">
            <span className="text-slate-500">Messages</span>
            <span className="font-semibold text-slate-900">{conversation.summary.totalMessages}</span>
          </div>
          <div className="flex justify-between gap-3 rounded-none border border-slate-100 px-3 py-2">
            <span className="text-slate-500">Last sync</span>
            <span className="truncate font-semibold text-slate-900">{conversation.summary.lastSync}</span>
          </div>
        </section>
        <section className="mt-4 rounded-none border border-slate-100 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">AI Insight</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {report?.aiSummary ?? "No AI summary is available for this group yet."}
          </p>
        </section>
      </div>
    </aside>
  );
}

function ChatWorkspace({
  initialGroupId,
  onSelectMessage,
}: {
  initialGroupId: string;
  onSelectMessage: (message: MessageRecord) => void;
}) {
  const [activeGroupId, setActiveGroupId] = useState(initialGroupId);
  // ── Phase 2: Chat โหลดหลัง sidebar พร้อม ──
  const [chatReady, setChatReady] = useState(false);
  // ── Phase 3: Report panel โหลดสุดท้าย ──
  const [reportReady, setReportReady] = useState(false);

  // คำนวณ start of วันปัจจุบัน (00:00:00 local time) เป็น ms
  const todayStartMs = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  }, []);

  const { messages, refresh: refreshMessages } = useAutoTrackMessages({
    groupId: chatReady ? activeGroupId : null,
    from: todayStartMs,
    limit: 500,
  });

  const conversation = useMemo(
    () => (chatReady ? buildGroupConversation(messages, activeGroupId) : null),
    [activeGroupId, messages, chatReady],
  );

  const report = useMemo(() => {
    if (!conversation) return null;
    return buildHealthReport(
      conversation.messages.map((message) => ({
        id: message.id,
        text: message.text,
        contentUrl: message.contentUrl,
        type: message.type,
        timestamp: Number(message.timestamp),
        displayName: message.displayName,
        userId: message.userId,
        pictureUrl: message.pictureUrl ?? message.avatarUrl ?? message.profileImageUrl ?? null,
        groupId: message.groupId,
        groupName: message.rawPayload?.lineIdentity?.groupName ?? conversation.summary.groupName,
      })),
    );
  }, [conversation]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const dragStartRef = useRef({ pointerX: 0, width: SIDEBAR_DEFAULT_WIDTH });

  // sync จาก localStorage หลัง hydration เสร็จ
  useEffect(() => {
    setIsSidebarCollapsed(window.innerWidth < MOBILE_BREAKPOINT || readStoredSidebarCollapsed());
    setSidebarWidth(readStoredSidebarWidth());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setIsSidebarCollapsed(true);
        setIsMobileSidebarOpen(false);
      } else if (window.innerWidth < TABLET_BREAKPOINT) {
        setSidebarWidth((current) => Math.min(current, SIDEBAR_TABLET_WIDTH));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      window.requestAnimationFrame(() => {
        const delta = event.clientX - dragStartRef.current.pointerX;
        setSidebarWidth(clampSidebarWidth(dragStartRef.current.width + delta));
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (isSidebarCollapsed) {
        return;
      }

      dragStartRef.current = { pointerX: event.clientX, width: sidebarWidth };
      setIsDragging(true);
    },
    [isSidebarCollapsed, sidebarWidth],
  );

  const handleToggleSidebar = () => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

  return (
    <section className="flex h-full w-full min-w-0 bg-white">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close member sidebar"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <div className="flex h-full w-full min-h-0 min-w-0 gap-0">
        {/* ── Phase 1: Sidebar โหลดก่อน ── */}
        <div className="flex h-full min-h-0 flex-col">
          <ResizableSidebar
            conversation={conversation ?? { summary: { groupId: activeGroupId, groupName: "", totalMessages: 0, memberCount: 0, lastMessageTime: null, lastSync: "", lastMessagePreview: "", lastMessageType: "", healthSignal: "Normal", status: "No Activity", members: [] }, messages: [] }}
            filteredMessageCount={conversation?.messages.length ?? 0}
            activeGroupId={activeGroupId}
            onSelectGroup={(groupId) => {
              setActiveGroupId(groupId);
              setChatReady(true);
              // report panel โหลดหลัง chat 300ms
              setTimeout(() => setReportReady(true), 300);
            }}
            onSidebarReady={() => {
              // Phase 2: sidebar พร้อมแล้ว → เริ่มโหลด chat
              setChatReady(true);
              // Phase 3: report panel โหลดหลัง chat 500ms
              setTimeout(() => setReportReady(true), 500);
            }}
            width={sidebarWidth}
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            onCollapseToggle={handleToggleSidebar}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>
        <ResizeHandle isDragging={isDragging} disabled={isSidebarCollapsed} onPointerDown={handleResizeStart} />
        {/* ── Phase 2: Chat area ── */}
        <div className="flex h-full min-h-0 min-w-0 flex-1">
          {!chatReady ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-400">กำลังโหลดกลุ่มแชท...</p>
            </div>
          ) : conversation ? (
            <>
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <ChatWindow
                  conversation={conversation}
                  messages={conversation.messages}
                  groupId={activeGroupId}
                  onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                  onSelectMessage={onSelectMessage}
                  onRefresh={refreshMessages}
                />
              </div>
              {/* ── Phase 3: Report panel โหลดสุดท้าย ── */}
              <div className="hidden h-full min-h-0 w-[320px] flex-shrink-0 flex-col xl:flex">
                {reportReady ? (
                  <HealthReportPanel groupName={conversation.summary.groupName} groupId={activeGroupId} onRefresh={refreshMessages} />
                ) : (
                  <div className="flex flex-1 items-center justify-center bg-white ring-1 ring-slate-200">
                    <p className="text-xs text-slate-400">กำลังโหลดฟอร์ม...</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-400">กำลังโหลดข้อมูลกลุ่ม...</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function GroupDetailDashboard({ groupId }: { groupId: string }) {
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);

  return (
    <ConsoleShell
      title="AutoHealth Intelligence Center"
      subtitle=""
      contentClassName="min-h-0 flex-1 overflow-hidden p-0"
    >
      <ChatWorkspace
        initialGroupId={groupId}
        onSelectMessage={setSelectedMessage}
      />

      {selectedMessage ? (
        <DetailPanel message={selectedMessage} onClose={() => setSelectedMessage(null)} />
      ) : null}
    </ConsoleShell>
  );
}
