"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MessageRecord = {
  id: string;
  messageId: string;
  userId: string | null;
  groupId: string | null;
  displayName: string | null;
  email: string | null;
  statusMessage: string | null;
  pictureUrl: string | null;
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
    } | null;
  } | null;
};

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateKey));
}

function truncate(value: string | null | undefined, head = 16, tail = 8) {
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

function UserAvatar({
  pictureUrl,
  displayName,
  size = "md",
}: {
  pictureUrl: string | null;
  displayName: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl";

  return (
    <div className={`${sizeClass} overflow-hidden bg-slate-200`}>
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt={displayName ?? "LINE user"}
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export function Dashboard() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting for LINE activity");
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  const chatPreviewMessages = useMemo(() => {
    return [...messages]
      .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      .slice(-8);
  }, [messages]);

  const groupedMessages = useMemo(() => {
    return messages.reduce<Record<string, MessageRecord[]>>((accumulator, message) => {
      const dateKey = new Date(Number(message.timestamp)).toISOString().split("T")[0];
      accumulator[dateKey] ??= [];
      accumulator[dateKey].push(message);
      return accumulator;
    }, {});
  }, [messages]);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f6f8fc,_#edf3ff_45%,_#f8fbff_80%)] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                MVP0 Investor Demo
              </span>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  AutoTrack
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  After login fetch data from LINE API. Then send a message to LINE OA, receive
                  the reply through webhook, store it in Supabase, and show everything back in the
                  dashboard.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-3xl bg-slate-200">
                  {liffProfile?.pictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={liffProfile.pictureUrl}
                      alt={liffProfile.displayName ?? "LINE profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Display Name
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                      {liffProfile?.displayName ?? "Open /liff inside LINE"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
                    <p className="mt-1 truncate text-sm text-slate-700">
                      {liffProfile?.email ?? "Email not fetched yet"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">User ID</p>
                    <p className="mt-1 truncate text-sm text-slate-700">
                      {truncate(liffProfile?.userId)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  {activeGroupName ?? "Group Chat Name"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Simple chat preview for the investor walkthrough.
                </p>
              </div>
              <a
                href="/liff"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                Open LIFF
              </a>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fbff,_#f3f6fb)] p-4">
              <div className="space-y-3">
                {chatPreviewMessages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
                    Open `/liff`, login inside LINE, then send and reply to see the conversation.
                  </div>
                ) : (
                  chatPreviewMessages.map((message) => {
                    const direction = getDirection(message);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[90%] gap-3 ${
                            direction === "outbound" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <UserAvatar
                            pictureUrl={message.pictureUrl}
                            displayName={message.displayName}
                            size="md"
                          />
                          <div
                            className={`max-w-[85%] rounded-[24px] px-4 py-3 shadow-sm ${
                              direction === "outbound"
                                ? "rounded-br-md bg-emerald-500 text-white"
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
                                  className="max-h-60 rounded-2xl border border-black/5 object-cover"
                                />
                              </a>
                            ) : null}
                            <div
                              className={`mt-2 flex items-center gap-2 text-[11px] ${
                                direction === "outbound" ? "text-emerald-50/90" : "text-slate-500"
                              }`}
                            >
                              <span>{message.displayName ?? truncate(message.userId, 8, 4)}</span>
                              {message.rawPayload?.lineIdentity?.groupName ? (
                                <span>{message.rawPayload.lineIdentity.groupName}</span>
                              ) : null}
                              <span>{formatClock(Number(message.timestamp))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <form className="mt-5 flex items-end gap-3" onSubmit={handleSubmit}>
              <div className="flex-1 rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="block text-xs uppercase tracking-[0.18em] text-slate-500">
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
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-xl font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                &gt;
              </button>
            </form>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-500">
                This uses the existing `/api/line/send` route to send a message to LINE OA.
              </p>
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {setupMessage ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {setupMessage}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Messages (Data Table)</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Polling `/api/messages` every 3 seconds from Supabase.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sync Status</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{status}</p>
              </div>
            </div>

            <div className="mt-5 max-h-[72vh] space-y-6 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No messages stored yet.
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
                  <section key={dateKey} className="space-y-3">
                    <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {formatDateLabel(dateKey)}
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-slate-200">
                      <div className="grid grid-cols-[minmax(0,1.3fr)_110px_1fr_140px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <span>Message</span>
                        <span>Direction</span>
                        <span>User</span>
                        <span>Time</span>
                      </div>

                      {dayMessages.map((message) => {
                        const direction = getDirection(message);

                        return (
                          <div
                            key={message.id}
                            className="grid grid-cols-[minmax(0,1.3fr)_110px_1fr_140px] gap-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-700"
                          >
                            <div className="space-y-3">
                              <p className="leading-6 text-slate-900">{getMessageLabel(message)}</p>
                              {message.contentUrl ? (
                                <a href={message.contentUrl} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={message.contentUrl}
                                    alt="Message attachment"
                                    className="max-h-36 rounded-2xl border border-slate-200 object-cover"
                                  />
                                </a>
                              ) : null}
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  {message.source}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  {message.type}
                                </span>
                                {message.contentMimeType ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                    {message.contentMimeType}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                                  direction === "outbound"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                {direction}
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <UserAvatar
                                pictureUrl={message.pictureUrl}
                                displayName={message.displayName}
                                size="sm"
                              />
                              <div className="space-y-1">
                                <p className="font-medium text-slate-900">
                                  {message.displayName ?? "Unknown user"}
                                </p>
                                <p className="truncate text-slate-500">
                                  {message.email ?? truncate(message.userId)}
                                </p>
                                {message.rawPayload?.lineIdentity?.groupName ? (
                                  <p className="truncate text-slate-400">
                                    {message.rawPayload.lineIdentity.groupName}
                                  </p>
                                ) : message.groupId ? (
                                  <p className="truncate text-slate-400">Group {message.groupId}</p>
                                ) : null}
                              </div>
                            </div>

                            <div className="text-slate-500">
                              {formatClock(Number(message.timestamp))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
