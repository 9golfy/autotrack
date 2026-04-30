"use client";

import { useMemo, useState } from "react";

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
        avatarUrl: asString(lineIdentity?.pictureUrl) ?? message.pictureUrl,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

function ActivityMedia({ media, messageType }: { media: MediaUpload | null; messageType: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const mediaUrl = getMediaUrl(media);
  const mediaType = getMediaType(media, messageType);
  const thumbnailUrl = media?.thumbnailUrl ?? null;

  if (!mediaUrl || !mediaType) {
    return null;
  }

  if (mediaType === "video") {
    if (isOpen) {
      return (
        <video
          className={`${miniAppTheme.image.media} mt-3 bg-black`}
          src={mediaUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
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

  const imageUrl = thumbnailUrl ?? mediaUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt="สื่อกิจกรรม"
      className={`${miniAppTheme.image.media} mt-3 aspect-video w-full object-cover`}
      loading="lazy"
      width={320}
      height={180}
      decoding="async"
    />
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <article className={`${miniAppTheme.card.base} p-4`}>
      <div className="flex gap-3">
        {item.avatarUrl ? (
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

export function MiniAppActivities({ selectedGroupId }: MiniAppActivitiesProps) {
  const resolvedGroupId = selectedGroupId ?? FATHER_PROFILE_GROUP_ID;
  const { messages, status, error } = useAutoTrackMessages();
  const activities = useMemo(() => buildActivityItems(messages, resolvedGroupId), [messages, resolvedGroupId]);
  const groupName = useMemo(() => getGroupName(messages, resolvedGroupId), [messages, resolvedGroupId]);
  const isLoading = messages.length === 0 && !error && status.includes("กำลัง");

  return (
    <main className={miniAppTheme.layout.page}>
      <div className={miniAppTheme.layout.shell}>
        <HeaderBar title="AutoHealth" subtitle="กิจกรรม" groupName={groupName} patientName="คุณพ่อไพโรจน์" />

        <div className={miniAppTheme.layout.content}>
          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <p className={`${miniAppTheme.typography.caption} font-bold uppercase text-[#1976D2]`}>Activity Timeline</p>
            <h1 className={`${miniAppTheme.typography.sectionTitle} mt-1 text-[#082B5F]`}>กิจกรรมล่าสุด</h1>
            <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>กลุ่ม LINE: {groupName}</p>
          </section>

          {isLoading ? (
            <div className={`${miniAppTheme.card.base} ${miniAppTheme.typography.body} p-5 text-center text-[#5F718C]`}>กำลังโหลดกิจกรรม...</div>
          ) : null}

          {error ? (
            <div className={`${miniAppTheme.card.base} ${miniAppTheme.typography.body} border-[#FECACA] p-5 text-center font-semibold text-[#DC2626]`}>
              ไม่สามารถโหลดข้อมูลกิจกรรมได้ในขณะนี้
            </div>
          ) : null}

          {!isLoading && !error && activities.length === 0 ? (
            <div className={`${miniAppTheme.card.base} p-6 text-center`}>
              <h2 className={`${miniAppTheme.typography.cardTitle} text-[#082B5F]`}>ยังไม่มีข้อมูลกิจกรรม</h2>
              <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>เมื่อมีข้อความ รูปภาพ หรือวิดีโอจาก LINE จะแสดงที่นี่</p>
            </div>
          ) : null}

          <div className="space-y-3">
            {activities.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <BottomBar active="activities" groupId={resolvedGroupId} />
      </div>
    </main>
  );
}
