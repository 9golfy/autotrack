"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomBar } from "@/app/_components/mini-app-bottom-bar";
import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";
import { HeaderBar } from "@/app/_components/mini-app-header-bar";
import { FATHER_PROFILE_GROUP_ID, formatMiniAppDateTime, miniAppTheme } from "@/app/_components/mini-app-theme";

type MiniAppActivitiesProps = {
  selectedGroupId: string | null;
};

type LineMessage = {
  type?: string | null;
  text?: string | null;
};

type LineEvent = {
  timestamp?: number | string | null;
  message?: LineMessage | null;
};

type LineIdentity = {
  displayName?: string | null;
  groupName?: string | null;
  pictureUrl?: string | null;
  userPictureUrl?: string | null;
  memberPictureUrl?: string | null;
  groupPictureUrl?: string | null;
};

type MediaUpload = {
  publicUrl?: string | null;
  url?: string | null;
  mediaUrl?: string | null;
  contentUrl?: string | null;
  mimeType?: string | null;
  contentType?: string | null;
  contentMimeType?: string | null;
  type?: string | null;
  mediaType?: string | null;
  thumbnailUrl?: string | null;
  error?: string | null;
};

type ActivityRawPayload = {
  event?: LineEvent | null;
  lineIdentity?: LineIdentity | null;
  mediaUpload?: MediaUpload | null;
};

type ActivityItem = {
  id: string;
  timestamp: number;
  displayName: string;
  groupName: string;
  preview: string;
  messageType: string;
  media: MediaUpload | null;
  avatarUrl: string | null;
};

const THAI_MONTHS = [
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

function getTodayParts() {
  const today = new Date();

  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

function getMonthOptions(year: number, today: ReturnType<typeof getTodayParts>) {
  const lastMonth = year === today.year ? today.month : 12;
  return THAI_MONTHS.slice(0, lastMonth);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getMaxSelectableDay(year: number, month: number, today: ReturnType<typeof getTodayParts>) {
  if (year === today.year && month === today.month) {
    return today.day;
  }

  return getDaysInMonth(year, month);
}

function getLocalDayRange(year: number, month: number, day: number) {
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  return {
    from: start.getTime(),
    to: end.getTime(),
  };
}

function formatSelectedDateLabel(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("th-TH-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asRawPayload(value: unknown): ActivityRawPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as ActivityRawPayload;
}

function getMediaUrl(media: MediaUpload | null) {
  return media?.mediaUrl ?? media?.publicUrl ?? media?.url ?? media?.contentUrl ?? null;
}

function getMediaType(media: MediaUpload | null, fallbackType: string) {
  const source = `${media?.mediaType ?? media?.mimeType ?? media?.contentType ?? media?.contentMimeType ?? media?.type ?? fallbackType}`.toLowerCase();

  if (source.includes("video")) {
    return "video";
  }

  if (source.includes("image")) {
    return "image";
  }

  return null;
}

function getMessagePreview(message: MessageRecord, rawPayload: ActivityRawPayload | null) {
  const eventText = rawPayload?.event?.message?.type === "text" ? rawPayload.event.message.text : null;
  return asString(eventText) ?? asString(message.text) ?? "ไม่มีข้อความ";
}

function getActivityTimestamp(message: MessageRecord, rawPayload: ActivityRawPayload | null) {
  const eventTimestamp = Number(rawPayload?.event?.timestamp);

  if (Number.isFinite(eventTimestamp)) {
    return eventTimestamp;
  }

  const messageTimestamp = Number(message.timestamp);

  if (Number.isFinite(messageTimestamp)) {
    return messageTimestamp;
  }

  const createdAtTimestamp = Date.parse(message.createdAt);
  return Number.isFinite(createdAtTimestamp) ? createdAtTimestamp : Date.now();
}

function getDatePartsFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getLatestActivityDateParts(messages: MessageRecord[], selectedGroupId: string | null) {
  const latestTimestamp = messages
    .filter((message) => !selectedGroupId || message.groupId === selectedGroupId)
    .map((message) => getActivityTimestamp(message, asRawPayload(message.rawPayload)))
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => b - a)[0];

  return latestTimestamp ? getDatePartsFromTimestamp(latestTimestamp) : null;
}

function getGroupName(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupMessage = messages.find((message) => {
    const rawPayload = asRawPayload(message.rawPayload);
    return message.groupId === selectedGroupId && rawPayload?.lineIdentity?.groupName?.trim();
  });

  return asRawPayload(groupMessage?.rawPayload)?.lineIdentity?.groupName ?? "LINE Care Group";
}

function buildActivityItems(messages: MessageRecord[], selectedGroupId: string | null): ActivityItem[] {
  const scopedMessages = selectedGroupId ? messages.filter((message) => message.groupId === selectedGroupId) : messages;

  return scopedMessages
    .map((message) => {
      const rawPayload = asRawPayload(message.rawPayload);
      const lineIdentity = rawPayload?.lineIdentity ?? null;
      const eventMessage = rawPayload?.event?.message ?? null;
      const media = rawPayload?.mediaUpload ?? (message.mediaUrl || message.contentUrl
        ? {
            mediaUrl: message.mediaUrl ?? message.contentUrl,
            contentType: message.contentType ?? message.contentMimeType,
            mediaType: message.mediaType ?? message.type,
            thumbnailUrl: message.thumbnailUrl ?? null,
          }
        : null);

      return {
        id: message.id,
        timestamp: getActivityTimestamp(message, rawPayload),
        displayName: asString(lineIdentity?.displayName) ?? asString(message.displayName) ?? "ผู้ดูแล",
        groupName: asString(lineIdentity?.groupName) ?? "LINE Care Group",
        preview: getMessagePreview(message, rawPayload),
        messageType: asString(eventMessage?.type) ?? message.type,
        media,
        avatarUrl:
          asString(lineIdentity?.userPictureUrl) ??
          asString(lineIdentity?.memberPictureUrl) ??
          asString(message.pictureUrl) ??
          asString(lineIdentity?.pictureUrl),
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

// SECURITY: Media URLs are display-only here; authorization and URL rewriting must happen in /api/messages.
// Simple in-memory cache for media URLs (per session)
const mediaUrlCache = new Map<string, string>();

function getCachedMediaUrl(mediaUrl: string | null) {
  if (!mediaUrl) {
    return null;
  }

  const cachedUrl = mediaUrlCache.get(mediaUrl);
  if (cachedUrl) {
    return cachedUrl;
  }

  mediaUrlCache.set(mediaUrl, mediaUrl);
  return mediaUrl;
}

function ActivityMedia({ media, messageType }: { media: MediaUpload | null; messageType: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const mediaUrl = getMediaUrl(media);
  const mediaType = getMediaType(media, messageType);
  const thumbnailUrl = media?.thumbnailUrl ?? null;

  // Cache media URLs to avoid repeated downloads
  const cachedUrl = getCachedMediaUrl(mediaUrl);

  if (!cachedUrl || !mediaType) {
    return null;
  }

  if (mediaType === "video") {
    if (isOpen) {
      return (
        // SECURITY: Use metadata preload only; full media loads after explicit user intent.
        <video
          className={`${miniAppTheme.image.media} mt-3 bg-black`}
          src={cachedUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          playsInline
          preload="none"
        />
      );
    }

    return (
      <button
        type="button"
        className={`${miniAppTheme.image.media} relative mt-3 grid aspect-video w-full place-items-center overflow-hidden bg-[#0B1220] text-white`}
        onClick={() => setIsOpen(true)}
        aria-label="เล่นวิดีโอ"
      >
        {thumbnailUrl ? (
          // SECURITY: Thumbnail URL comes from the app API response; avoid logging or exposing raw storage paths here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            width={320}
            height={180}
          />
        ) : (
          <span className={`${miniAppTheme.typography.caption} text-white/70`}>Video</span>
        )}
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#1976D2] shadow-lg">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-6 w-6" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    );
  }

  const imageUrl = thumbnailUrl ?? cachedUrl;

  return (
    // SECURITY: Media URL comes from the app API response; keep storage access validation server-side.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt="สื่อกิจกรรม"
      className="mt-3 h-auto w-full rounded-[16px] object-contain"
      loading="lazy"
      decoding="async"
    />
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <article className={`${miniAppTheme.card.base} p-4`}>
      <div className="flex gap-3">
        {item.avatarUrl ? (
          // SECURITY: Avatar URL is rendered only after API sanitization/rewriting; do not trust client-only checks.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatarUrl}
            alt={item.displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            loading="lazy"
            decoding="async"
            width={40}
            height={40}
          />
        ) : (
          <div className={`${miniAppTheme.typography.caption} grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF4FF] font-bold text-[#1976D2]`}>
            {item.displayName.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={`${miniAppTheme.typography.cardTitle} truncate text-[#082B5F]`}>{item.displayName}</h2>
              <p className={`${miniAppTheme.typography.caption} truncate text-[#5F718C]`}>{item.groupName}</p>
            </div>
            <span className={`${miniAppTheme.typography.badge} shrink-0 rounded-full bg-[#EAF4FF] px-2.5 py-1 text-[#1976D2]`}>
              {item.messageType}
            </span>
          </div>

          <p className={`${miniAppTheme.typography.body} mt-2 whitespace-pre-wrap text-[#082B5F]`}>{item.preview}</p>
          <ActivityMedia media={item.media} messageType={item.messageType} />
          <p className={`${miniAppTheme.typography.caption} mt-3 text-[#5F718C]`}>{formatMiniAppDateTime(item.timestamp)}</p>
        </div>
      </div>
    </article>
  );
}

function ActivityCardSkeleton() {
  return (
    <article className={`${miniAppTheme.card.base} p-4`}>
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#E3EDF8]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-36 animate-pulse rounded-full bg-[#E3EDF8]" />
              <div className="h-3 w-48 animate-pulse rounded-full bg-[#EEF5FC]" />
            </div>
            <div className="h-7 w-14 shrink-0 animate-pulse rounded-full bg-[#EAF4FF]" />
          </div>
          <div className="mt-4 h-4 w-44 animate-pulse rounded-full bg-[#E3EDF8]" />
          <div className="mt-3 h-3 w-28 animate-pulse rounded-full bg-[#EEF5FC]" />
        </div>
      </div>
    </article>
  );
}

function ActivityPreloader({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="กำลังโหลดกิจกรรม">
      {Array.from({ length: count }, (_, index) => (
        <ActivityCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function MiniAppActivities({ selectedGroupId }: MiniAppActivitiesProps) {
  const resolvedGroupId = selectedGroupId ?? FATHER_PROFILE_GROUP_ID;
  const initialDate = useMemo(() => getTodayParts(), []);
  const [selectedDay, setSelectedDay] = useState(initialDate.day);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.month);
  const [selectedYear, setSelectedYear] = useState(initialDate.year);
  const [hasAppliedLatestDate, setHasAppliedLatestDate] = useState(false);
  const monthOptions = useMemo(() => getMonthOptions(selectedYear, initialDate), [initialDate, selectedYear]);
  const daysInSelectedMonth = useMemo(() => getMaxSelectableDay(selectedYear, selectedMonth, initialDate), [initialDate, selectedMonth, selectedYear]);
  const effectiveSelectedDay = Math.min(selectedDay, daysInSelectedMonth);
  const dayOptions = useMemo(
    () => Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1),
    [daysInSelectedMonth],
  );
  const yearOptions = useMemo(
    () => Array.from({ length: 3 }, (_, index) => initialDate.year - 2 + index),
    [initialDate.year],
  );
  const selectedRange = useMemo(
    () => getLocalDayRange(selectedYear, selectedMonth, effectiveSelectedDay),
    [effectiveSelectedDay, selectedMonth, selectedYear],
  );
  const selectedDateLabel = useMemo(
    () => formatSelectedDateLabel(selectedYear, selectedMonth, effectiveSelectedDay),
    [effectiveSelectedDay, selectedMonth, selectedYear],
  );
  const {
    messages: latestMessages,
    error: latestError,
    hasLoaded: hasLatestLoaded,
  } = useAutoTrackMessages({
    groupId: resolvedGroupId,
    limit: 100,
  });

  useEffect(() => {
    if (hasAppliedLatestDate) {
      return;
    }

    const latestDate = getLatestActivityDateParts(latestMessages, resolvedGroupId);

    if (!latestDate) {
      return;
    }

    queueMicrotask(() => {
      setSelectedYear(latestDate.year);
      setSelectedMonth(latestDate.month);
      setSelectedDay(latestDate.day);
      setHasAppliedLatestDate(true);
    });
  }, [hasAppliedLatestDate, latestMessages, resolvedGroupId]);

  const { messages, error, hasLoaded: hasMessagesLoaded } = useAutoTrackMessages({
    groupId: resolvedGroupId,
    limit: 100,
    from: selectedRange.from,
    to: selectedRange.to,
  });
  const activities = useMemo(() => buildActivityItems(messages, resolvedGroupId), [messages, resolvedGroupId]);
  const [visibleActivityCount, setVisibleActivityCount] = useState(0);
  const groupName = useMemo(() => getGroupName(messages.length > 0 ? messages : latestMessages, resolvedGroupId), [latestMessages, messages, resolvedGroupId]);
  const isResolvingLatestDate = !hasAppliedLatestDate && !hasLatestLoaded;
  const isLoadingActivities = !hasMessagesLoaded || isResolvingLatestDate;
  const visibleActivities = activities.slice(0, visibleActivityCount);
  const isPreloadingMoreCards = !isLoadingActivities && visibleActivityCount < activities.length;

  useEffect(() => {
    if (isLoadingActivities || activities.length === 0) {
      const resetTimeout = window.setTimeout(() => setVisibleActivityCount(0), 0);
      return () => window.clearTimeout(resetTimeout);
    }

    let nextCount = 0;
    const resetTimeout = window.setTimeout(() => setVisibleActivityCount(0), 0);
    const interval = window.setInterval(() => {
      nextCount += 1;
      setVisibleActivityCount(Math.min(nextCount, activities.length));

      if (nextCount >= activities.length) {
        window.clearInterval(interval);
      }
    }, 70);

    return () => {
      window.clearTimeout(resetTimeout);
      window.clearInterval(interval);
    };
  }, [activities, isLoadingActivities]);

  const resolvedError = error ?? latestError;

  return (
    <main className={miniAppTheme.layout.page}>
      <div className={miniAppTheme.layout.shell}>
        <HeaderBar title="AutoHealth" subtitle="กิจกรรม" groupName={groupName} patientName="คุณพ่อไพโรจน์" />

        <div className={miniAppTheme.layout.content}>
          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <p className={`${miniAppTheme.typography.caption} font-bold uppercase text-[#1976D2]`}>Activity Timeline</p>
            <h1 className={`${miniAppTheme.typography.sectionTitle} mt-1 text-[#082B5F]`}>กิจกรรมล่าสุด</h1>
            <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>กลุ่ม LINE: {groupName}</p>
            <p className={`${miniAppTheme.typography.caption} mt-1 font-semibold text-[#1976D2]`}>แสดงข้อมูลวันที่ {selectedDateLabel}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>วันที่</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-3 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none`}
                  value={effectiveSelectedDay}
                  onChange={(event) => setSelectedDay(Number(event.target.value))}
                >
                  {dayOptions.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>เดือน</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none`}
                  value={selectedMonth}
                  onChange={(event) => {
                    const nextMonth = Number(event.target.value);
                    setSelectedMonth(nextMonth);
                    setSelectedDay((currentDay) => Math.min(currentDay, getMaxSelectableDay(selectedYear, nextMonth, initialDate)));
                  }}
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>ปี</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none`}
                  value={selectedYear}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    const nextMonth = Math.min(selectedMonth, nextYear === initialDate.year ? initialDate.month : 12);
                    setSelectedYear(nextYear);
                    setSelectedMonth(nextMonth);
                    setSelectedDay((currentDay) => Math.min(currentDay, getMaxSelectableDay(nextYear, nextMonth, initialDate)));
                  }}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year + 543}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {isLoadingActivities ? (
            <ActivityPreloader count={4} />
          ) : null}

          {resolvedError ? (
            <div className={`${miniAppTheme.card.base} ${miniAppTheme.typography.body} border-[#FECACA] p-5 text-center font-semibold text-[#DC2626]`}>
              ไม่สามารถโหลดข้อมูลกิจกรรมได้ในขณะนี้
            </div>
          ) : null}


          <div className="space-y-3">
            {visibleActivities.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
            {isPreloadingMoreCards ? <ActivityCardSkeleton /> : null}
          </div>
        </div>

        <BottomBar active="activities" groupId={resolvedGroupId} />
      </div>
    </main>
  );
}
