"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type MessageRecord = {
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
  source: string;
  text: string | null;
  type: string;
  timestamp: string;
  createdAt: string;
  rawPayload?: {
    lineIdentity?: {
      groupName?: string | null;
      error?: string | null;
      pictureUrl?: string | null;
    } | null;
  } | null;
};

type ResolvedProfile = {
  displayName: string | null;
  userId: string | null;
  avatarUrl: string | null;
};

type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "blue" | "purple" | "green";
};

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDateLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function truncate(value: string | null | undefined, head = 12, tail = 6) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function getDirection(message: MessageRecord) {
  if (message.source === "web" || message.type === "outbound") {
    return "outbound";
  }

  return "inbound";
}

function getMessageLabel(message: MessageRecord) {
  if (message.text) {
    return message.text;
  }

  if (message.type === "image") {
    return "Image received";
  }

  return `${message.type} event captured`;
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

function getInitial(value: string | null | undefined) {
  if (!value) {
    return "U";
  }

  return value.trim().charAt(0).toUpperCase() || "U";
}

function UserAvatar({
  avatarUrl,
  displayName,
  size = 40,
  tone = "blue",
}: {
  avatarUrl: string | null;
  displayName: string | null;
  size?: number;
  tone?: "blue" | "purple" | "green";
}) {
  const toneClass =
    tone === "purple"
      ? "from-[#EDE7FF] via-white to-[#F5F0FF] text-[#7C4DFF]"
      : tone === "green"
        ? "from-[#E8F9EE] via-white to-[#F3FFF7] text-[#00C853]"
        : "from-[#E8F1FF] via-white to-[#F1F7FF] text-[#1976D2]";

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br ${toneClass} shadow-[0_10px_24px_rgba(13,71,161,0.10)]`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName ?? "LINE user"}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-sm font-semibold">{getInitial(displayName)}</span>
      )}
    </div>
  );
}

function EventIcon({ tone }: { tone: TimelineItem["tone"] }) {
  const map = {
    blue: "bg-[#E8F1FF] text-[#1976D2]",
    purple: "bg-[#F1EDFF] text-[#7C4DFF]",
    green: "bg-[#E8F9EE] text-[#00C853]",
  };

  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${map[tone]}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StatBar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const percentage = total > 0 ? Math.max(10, Math.round((value / total) * 100)) : 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/60">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function TagPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "purple" | "sky" | "green" | "orange" | "red";
}) {
  const map = {
    blue: "bg-[#E8F1FF] text-[#1976D2]",
    purple: "bg-[#F1EDFF] text-[#7C4DFF]",
    sky: "bg-[#E8F8FF] text-[#00B2FF]",
    green: "bg-[#E8F9EE] text-[#00C853]",
    orange: "bg-[#FFF5DF] text-[#FFB300]",
    red: "bg-[#FDECEC] text-[#E53935]",
  };

  return (
    <span className={`rounded-full px-3 py-2 text-sm font-medium ${map[tone]}`}>{children}</span>
  );
}

export function Dashboard() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting for LINE activity");
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });

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
        setError(null);
        setSetupMessage(data.configured === false ? data.setupMessage ?? null : null);
        setStatus(
          data.messages.length > 0
            ? `Last sync ${formatClock(Number(data.messages[0].timestamp))}`
            : data.configured === false
              ? "Database not configured"
              : "No messages yet",
        );
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        console.error(fetchError);
        setError("Unable to fetch messages from Supabase.");
        setSetupMessage(null);
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 3000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const profileByUserId = useMemo(() => {
    const nextProfiles = new Map<string, ResolvedProfile>();

    for (const message of messages) {
      if (!message.userId) {
        continue;
      }

      const current = nextProfiles.get(message.userId);
      nextProfiles.set(message.userId, {
        userId: message.userId,
        displayName: message.displayName ?? current?.displayName ?? null,
        avatarUrl: getAvatarUrl(message) ?? current?.avatarUrl ?? null,
      });
    }

    return nextProfiles;
  }, [messages]);

  const liffProfile = useMemo(() => {
    return messages.find(
      (message) =>
        message.source === "liff" &&
        (message.type === "liff-profile" ||
          Boolean(message.pictureUrl || message.displayName || message.email || message.userId)),
    );
  }, [messages]);

  const activeGroupName = useMemo(() => {
    return messages.find((message) => message.rawPayload?.lineIdentity?.groupName)?.rawPayload
      ?.lineIdentity?.groupName;
  }, [messages]);

  const chatMessages = useMemo(() => {
    return [...messages]
      .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      .slice(-12);
  }, [messages]);

  const todayMessages = useMemo(() => {
    const todayKey = new Date().toISOString().split("T")[0];
    return messages.filter(
      (message) => new Date(Number(message.timestamp)).toISOString().split("T")[0] === todayKey,
    );
  }, [messages]);

  const summary = useMemo(() => {
    const total = todayMessages.length;
    const inbound = todayMessages.filter((message) => getDirection(message) === "inbound").length;
    const outbound = total - inbound;

    return {
      total,
      inbound,
      outbound,
      lastSync:
        messages.length > 0 ? formatClock(Number(messages[0].timestamp)) : "No sync yet",
    };
  }, [messages, todayMessages]);

  const activityTimeline = useMemo<TimelineItem[]>(() => {
    return [...messages].slice(0, 6).map((message) => {
      if (message.source === "liff") {
        return {
          id: message.id,
          title: "LIFF login captured",
          detail: message.displayName ?? truncate(message.userId),
          time: formatClock(Number(message.timestamp)),
          tone: "green",
        };
      }

      if (message.source === "webhook") {
        return {
          id: message.id,
          title: "Webhook received",
          detail: getMessageLabel(message),
          time: formatClock(Number(message.timestamp)),
          tone: "blue",
        };
      }

      return {
        id: message.id,
        title: "Message stored",
        detail: getMessageLabel(message),
        time: formatClock(Number(message.timestamp)),
        tone: "purple",
      };
    });
  }, [messages]);

  const smartTags = useMemo(() => {
    const keywords = ["ยา", "ความดัน", "ปวด", "ไข้", "หมอ", "นัด", "เจ็บ", "เวียนหัว"];
    const detected = new Set<string>();
    const types = new Set<string>();

    for (const message of messages) {
      const normalizedText = message.text ?? "";

      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          detected.add(keyword);
        }
      }

      if (message.contentUrl && message.type === "image") {
        types.add("image");
      } else if (normalizedText.includes("http://") || normalizedText.includes("https://")) {
        types.add("link");
      } else {
        types.add(message.type === "outbound" ? "text" : message.type);
      }
    }

    return {
      keywords: Array.from(detected).slice(0, 6),
      types: Array.from(types).slice(0, 6),
    };
  }, [messages]);

  const rawRows = useMemo(() => messages.slice(0, 8), [messages]);

  function resolveProfile(message: MessageRecord): ResolvedProfile {
    const matchedProfile = message.userId ? profileByUserId.get(message.userId) : null;

    return {
      displayName: message.displayName ?? matchedProfile?.displayName ?? "Unknown user",
      userId: message.userId ?? matchedProfile?.userId ?? null,
      avatarUrl: getAvatarUrl(message) ?? matchedProfile?.avatarUrl ?? null,
    };
  }

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [chatMessages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    setStatus("Sending message to LINE OA...");

    try {
      const response = await fetch("/api/line/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedInput }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }

      setInput("");
      setStatus("Message delivered to LINE OA");
    } catch (sendError) {
      console.error(sendError);
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
      setStatus("Send failed");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#F7FAFF_0%,_#F4F7FB_55%,_#FFFFFF_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 font-['Inter','Prompt',sans-serif]">
        <section className="overflow-hidden rounded-[32px] bg-white/95 px-6 py-7 shadow-[0_28px_90px_rgba(13,71,161,0.10)] ring-1 ring-[#E0E0E0]">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-[#E8F1FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-[#0D47A1]">
                  AutoHealth Platform
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F1EDFF] px-3 py-1 text-xs font-medium text-[#7C4DFF]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#00B2FF]" />
                  AI-powered
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                  AutoTrack
                </h1>
                <p className="max-w-3xl text-xl font-semibold leading-8 text-[#0D47A1]">
                  Turn LINE conversations into structured health data instantly
                </p>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  AI-powered system that captures, analyzes, and transforms LINE messages into
                  real-time health insights.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(0,178,255,0.32),_rgba(124,77,255,0.06)_70%)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 stroke-[#1976D2]"
                    strokeWidth="1.8"
                  >
                    <path d="M12 4v16M4 12h16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 overflow-hidden rounded-full bg-[#EDF3FB]">
                  <div className="h-2 w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,_#1976D2,_#7C4DFF,_#00B2FF)]" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,246,255,0.98))] p-5 shadow-[0_18px_50px_rgba(13,71,161,0.10)] ring-1 ring-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <UserAvatar
                  avatarUrl={liffProfile?.pictureUrl ?? null}
                  displayName={liffProfile?.displayName ?? "Profile"}
                  size={72}
                  tone="blue"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display Name</p>
                    <p className="mt-1 truncate text-lg font-semibold text-slate-950">
                      {liffProfile?.displayName ?? "Open /liff inside LINE"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">User ID</p>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {truncate(liffProfile?.userId, 14, 6)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00C853]" />
                    <span>Online / synced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[30px] bg-white/95 p-5 shadow-[0_24px_80px_rgba(13,71,161,0.10)] ring-1 ring-[#E0E0E0] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Live Conversation
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {activeGroupName ?? "Patient Conversation Feed"}
                </h2>
              </div>
              <a
                href="/liff"
                className="rounded-full bg-[linear-gradient(135deg,_#1976D2,_#7C4DFF)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(25,118,210,0.22)] transition hover:-translate-y-0.5"
              >
                Open LIFF
              </a>
            </div>

            <div className="mt-5 max-h-[64vh] space-y-3 overflow-y-auto rounded-[28px] bg-[linear-gradient(180deg,_#F8FBFF,_#F2F7FD)] p-4">
              {chatMessages.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#E0E0E0] bg-white/90 px-5 py-14 text-center text-sm text-slate-500">
                  No LINE messages yet. Connect LIFF, send a message, and let AutoHealth start
                  structuring the conversation.
                </div>
              ) : (
                chatMessages.map((message, index) => {
                  const direction = getDirection(message);
                  const profile = resolveProfile(message);
                  const isLastMessage = index === chatMessages.length - 1;
                  const showDateLabel =
                    index === 0 ||
                    formatDateLabel(Number(chatMessages[index - 1].timestamp)) !==
                      formatDateLabel(Number(message.timestamp));

                  return (
                    <div key={message.id} className="space-y-3">
                      {showDateLabel ? (
                        <div className="flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 shadow-sm">
                            {formatDateLabel(Number(message.timestamp))}
                          </span>
                        </div>
                      ) : null}

                      <div
                        ref={isLastMessage ? lastMessageRef : null}
                        className={`flex animate-[fadeIn_220ms_ease-out] ${
                          direction === "outbound" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-[92%] items-end gap-3 ${
                            direction === "outbound" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <UserAvatar
                            avatarUrl={profile.avatarUrl}
                            displayName={profile.displayName}
                            size={40}
                            tone={direction === "outbound" ? "green" : "blue"}
                          />
                          <div
                            className={`max-w-[85%] rounded-[24px] px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 ${
                              direction === "outbound"
                                ? "rounded-br-md bg-[linear-gradient(180deg,_#E8F8FF,_#E9F4FF)] text-slate-900"
                                : "rounded-bl-md bg-white text-slate-900"
                            }`}
                          >
                            <p className="text-sm leading-6">{getMessageLabel(message)}</p>
                            {message.contentUrl ? (
                              <a
                                href={message.contentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={message.contentUrl}
                                  alt="LINE attachment"
                                  className="max-h-64 rounded-[20px] border border-[#E0E0E0] object-cover"
                                />
                              </a>
                            ) : null}
                            <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                              <p className="font-semibold text-slate-700">{profile.displayName}</p>
                              <p>{formatClock(Number(message.timestamp))}</p>
                              <p>{truncate(profile.userId, 10, 4)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form className="mt-5 flex items-end gap-3" onSubmit={handleSubmit}>
              <div className="flex-1 rounded-[28px] bg-[#F5F8FC] px-4 py-3 ring-1 ring-[#E0E0E0] transition focus-within:ring-2 focus-within:ring-[#00B2FF]/25">
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Message Input
                </label>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="พิมพ์ข้อความ"
                  className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  maxLength={500}
                />
              </div>
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0D47A1,_#1976D2)] text-xl font-semibold text-white shadow-[0_16px_40px_rgba(13,71,161,0.26)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                &gt;
              </button>
            </form>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-500">
                Connect LINE, stream the conversation in real time, and prepare the data for the
                next AI healthcare layer.
              </p>
              {error ? (
                <div className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#E53935] ring-1 ring-[#F7D5D5]">
                  {error}
                </div>
              ) : null}
              {setupMessage ? (
                <div className="rounded-2xl bg-[#FFF5DF] px-4 py-3 text-sm text-[#FFB300] ring-1 ring-[#FFE2A6]">
                  {setupMessage}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] bg-white/95 p-5 shadow-[0_24px_80px_rgba(13,71,161,0.10)] ring-1 ring-[#E0E0E0] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Smart Insight
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    Structured Activity View
                  </h2>
                </div>
                <span className="rounded-full bg-[#F1EDFF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7C4DFF]">
                  AI Layer
                </span>
              </div>

              <div className="mt-5 space-y-5">
                <div className="rounded-[26px] bg-[linear-gradient(135deg,_#0D47A1,_#1976D2_55%,_#7C4DFF)] p-5 text-white shadow-[0_20px_45px_rgba(25,118,210,0.20)]">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                        Total Messages
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">
                        {summary.total}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                        Inbound / Outbound
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                        {summary.inbound} / {summary.outbound}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                        Last Sync
                      </p>
                      <p className="mt-2 text-lg font-semibold">{summary.lastSync}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <StatBar
                      label="Inbound"
                      value={summary.inbound}
                      total={Math.max(summary.total, 1)}
                      colorClass="bg-[linear-gradient(90deg,_#00B2FF,_#FFFFFF)]"
                    />
                    <StatBar
                      label="Outbound"
                      value={summary.outbound}
                      total={Math.max(summary.total, 1)}
                      colorClass="bg-[linear-gradient(90deg,_#FFB300,_#FFFFFF)]"
                    />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/70">
                    {status}
                  </p>
                </div>

                <div className="rounded-[26px] bg-[#F7FAFF] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Activity Timeline
                  </h3>
                  <div className="mt-4 space-y-4">
                    {activityTimeline.map((item, index) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <EventIcon tone={item.tone} />
                          {index < activityTimeline.length - 1 ? (
                            <span className="mt-2 h-full w-px bg-[#E0E0E0]" />
                          ) : null}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] bg-[#F7FAFF] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Smart Tags
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {smartTags.keywords.length === 0 ? (
                      <span className="rounded-full bg-white px-3 py-2 text-sm text-slate-500">
                        No healthcare keywords detected yet
                      </span>
                    ) : (
                      smartTags.keywords.map((tag, index) => (
                        <TagPill
                          key={tag}
                          tone={index % 3 === 0 ? "red" : index % 3 === 1 ? "orange" : "green"}
                        >
                          {tag}
                        </TagPill>
                      ))
                    )}
                    {smartTags.types.map((type) => (
                      <TagPill
                        key={type}
                        tone={
                          type === "image" ? "purple" : type === "link" ? "sky" : "blue"
                        }
                      >
                        {type}
                      </TagPill>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] bg-[#F7FAFF] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Raw Data
                  </h3>
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-[#E0E0E0]">
                    {rawRows.map((message) => {
                      const profile = resolveProfile(message);
                      return (
                        <div
                          key={message.id}
                          className="grid grid-cols-[minmax(0,1.3fr)_90px_110px] gap-3 border-t border-[#F1F3F5] px-4 py-3 first:border-t-0"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatarUrl={profile.avatarUrl}
                              displayName={profile.displayName}
                              size={36}
                              tone="blue"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {profile.displayName}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {truncate(profile.userId, 10, 4)}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {message.type}
                          </div>
                          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {formatClock(Number(message.timestamp))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
