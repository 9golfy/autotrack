"use client";

import { FormEvent, useEffect, useState } from "react";

type MessageRecord = {
  id: string;
  messageId: string;
  userId: string | null;
  groupId: string | null;
  displayName: string | null;
  email: string | null;
  statusMessage: string | null;
  pictureUrl: string | null;
  source: string;
  text: string | null;
  type: string;
  timestamp: string;
  createdAt: string;
};

type LocalPreview = {
  id: string;
  text: string;
  timestamp: number;
  status: "sending" | "sent" | "error";
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

export function Dashboard() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting for LINE activity");
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [localPreview, setLocalPreview] = useState<LocalPreview[]>([]);

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
        setError("Unable to fetch messages from the database.");
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

  const groupedMessages = messages.reduce<Record<string, MessageRecord[]>>(
    (accumulator, message) => {
      const dateKey = new Date(Number(message.timestamp)).toISOString().split("T")[0];
      accumulator[dateKey] ??= [];
      accumulator[dateKey].push(message);
      return accumulator;
    },
    {},
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isSending) {
      return;
    }

    const previewId = crypto.randomUUID();
    const previewTimestamp = Date.now();

    setInput("");
    setError(null);
    setIsSending(true);
    setStatus("Sending message to LINE...");
    setLocalPreview((current) => [
      {
        id: previewId,
        text: trimmedInput,
        timestamp: previewTimestamp,
        status: "sending",
      },
      ...current,
    ]);

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

      setLocalPreview((current) =>
        current.map((preview) =>
          preview.id === previewId ? { ...preview, status: "sent" } : preview,
        ),
      );
      setStatus("Message delivered to LINE");
    } catch (sendError) {
      console.error(sendError);
      setLocalPreview((current) =>
        current.map((preview) =>
          preview.id === previewId ? { ...preview, status: "error" } : preview,
        ),
      );
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
      setStatus("Send failed");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f7fafc,_#eef2ff_40%,_#f8fafc_75%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                AutoTrack MVP0
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  LINE inbox demo for investor walkthroughs
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Send a text from the browser, receive replies from LINE through the webhook,
                  and keep the conversation mirrored in Supabase.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Messages</p>
                <p className="mt-2 text-2xl font-semibold">{messages.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sync</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{status}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stack</p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  Next.js + LINE OA + LIFF
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Web to LINE</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Push a text message to your configured LINE target.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                Text only
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-medium text-slate-700" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type the message you want LINE users to receive..."
                  className="mt-3 min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-400"
                  maxLength={500}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Investor demo input</span>
                  <span>{input.length}/500</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  The message is sent with the LINE Push API using `LINE_TARGET_ID`.
                </p>
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending ? "Sending..." : "Send to LINE"}
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {setupMessage ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {setupMessage}
              </div>
            ) : null}

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Local preview
                </h3>
                <a
                  href="/liff"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:text-emerald-600"
                >
                  Open LIFF view
                </a>
              </div>

              <div className="mt-4 space-y-3">
                {localPreview.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Send a message to preview outbound activity here.
                  </div>
                ) : (
                  localPreview.map((preview) => (
                    <article
                      key={preview.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm leading-6 text-slate-800">{preview.text}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            preview.status === "sent"
                              ? "bg-emerald-100 text-emerald-700"
                              : preview.status === "error"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {preview.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatClock(preview.timestamp)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">LINE activity log</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Polling the database every 3 seconds for webhook, web, and LIFF events.
                </p>
              </div>
            </div>

            <div className="mt-6 max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No messages stored yet. Send from the web or reply in LINE to populate the feed.
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
                  <section key={dateKey} className="space-y-3">
                    <div className="sticky top-0 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {formatDateLabel(dateKey)}
                    </div>
                    <div className="space-y-3">
                      {dayMessages.map((message) => (
                        <article
                          key={message.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {message.text || `${message.type} event captured`}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                  {message.source}
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-1">
                                  {message.type}
                                </span>
                                {message.displayName ? (
                                  <span className="rounded-full bg-white px-2.5 py-1">
                                    {message.displayName}
                                  </span>
                                ) : null}
                                <span className="rounded-full bg-white px-2.5 py-1">
                                  {message.userId ?? "Unknown user"}
                                </span>
                                {message.email ? (
                                  <span className="rounded-full bg-white px-2.5 py-1">
                                    {message.email}
                                  </span>
                                ) : null}
                                {message.groupId ? (
                                  <span className="rounded-full bg-white px-2.5 py-1">
                                    Group {message.groupId}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatClock(Number(message.timestamp))}
                            </p>
                          </div>
                        </article>
                      ))}
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
