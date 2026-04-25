"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Avatar,
  ConsoleShell,
  EmptyPanel,
  HealthSignalBadge,
  StatusBadge,
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
  type MessageRecord,
} from "@/app/_components/group-console";
import { buildHealthReport } from "@/lib/health-report";

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
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
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
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={getMessageType(message)} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
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
                      className="max-h-[320px] w-full rounded-2xl border border-slate-200 object-cover"
                    />
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Raw payload
            </summary>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(message.rawPayload ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      </aside>
    </div>
  );
}

function getMessageStatus(message: MessageRecord) {
  return getDirectionLabel(message) === "Outbound" ? "Sent" : "Captured";
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

export function GroupDetailDashboard({ groupId }: { groupId: string }) {
  const { messages, status, error, setupMessage } = useAutoTrackMessages();
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);

  const conversation = useMemo(() => buildGroupConversation(messages, groupId), [groupId, messages]);

  const tableMessages = useMemo(() => {
    if (!conversation) {
      return [];
    }

    return conversation.messages.filter((message) => !hiddenMessageIds.includes(message.id));
  }, [conversation, hiddenMessageIds]);

  const chatMessages = useMemo(() => {
    return [...tableMessages]
      .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      .slice(-18);
  }, [tableMessages]);

  return (
    <ConsoleShell
      title={conversation?.summary.groupName ?? "Group Chat Detail"}
      subtitle="Captured LINE group conversation data for care center review"
      topBar={
        <>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            {status}
          </div>
          <Link
            href={`/mini-app?groupId=${groupId}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            View Report
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </>
      }
    >
      {conversation ? (
        <section className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Group ID</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{truncate(conversation.summary.groupId, 14, 8)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total messages</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {conversation.summary.totalMessages}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Members</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {conversation.summary.memberCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Last sync</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{conversation.summary.lastSync}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
              <div className="mt-2">
                <StatusBadge status={conversation.summary.status} />
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {setupMessage ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {setupMessage}
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4">
                <h2 className="text-base font-semibold text-slate-950">Chat Preview</h2>
                <p className="mt-1 text-sm text-slate-500">Latest captured LINE messages inside this group</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-slate-50 px-4 py-4">
                {chatMessages.length === 0 ? (
                  <EmptyPanel
                    title="No messages in this group yet"
                    description="Once AutoTrack captures a message from this group, it will appear here."
                  />
                ) : (
                  chatMessages.map((message) => {
                    const direction = getDirectionLabel(message).toLowerCase();
                    const identity = resolveMessageIdentity(message);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[94%] items-end gap-3 ${
                            direction === "outbound" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <Avatar avatarUrl={identity.avatarUrl} displayName={identity.displayName} size={38} />
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-sm ${
                              direction === "outbound"
                                ? "rounded-br-md bg-sky-100 text-slate-900"
                                : "rounded-bl-md bg-white text-slate-900"
                            }`}
                          >
                            <p className="text-sm leading-6">{formatManagePreview(message)}</p>
                            {message.contentUrl ? (
                              <a href={message.contentUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={message.contentUrl}
                                  alt="LINE attachment"
                                  className="max-h-56 rounded-2xl border border-slate-200 object-cover"
                                />
                              </a>
                            ) : null}
                            <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                              <p className="font-semibold text-slate-700">{identity.displayName}</p>
                              <p>{formatClock(getMessageTimestamp(message))}</p>
                              <p>{truncate(identity.userId, 10, 4)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4">
                <h2 className="text-base font-semibold text-slate-950">Data Table</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Structured message records captured from this LINE group
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Message Type</th>
                      <th className="px-4 py-3">Preview</th>
                      <th className="px-4 py-3">Health Signal</th>
                      <th className="px-4 py-3">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableMessages.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8" colSpan={8}>
                          <EmptyPanel
                            title="No visible messages"
                            description="Everything in this group is hidden or waiting to be captured."
                          />
                        </td>
                      </tr>
                    ) : (
                      tableMessages.map((message, index) => {
                        const identity = resolveMessageIdentity(message);
                        return (
                          <tr key={message.id} className="transition hover:bg-slate-50/80">
                            <td className="px-4 py-4 text-sm text-slate-500">{formatNumber(index + 1)}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatDate(getMessageTimestamp(message))}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatClock(getMessageTimestamp(message))}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[180px] items-center gap-3">
                                <Avatar avatarUrl={identity.avatarUrl} displayName={identity.displayName} size={36} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">{identity.displayName}</p>
                                  <p className="truncate text-xs text-slate-500">{truncate(identity.userId, 10, 4)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <TypeBadge type={getMessageType(message)} />
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[260px] text-sm text-slate-700">
                                <p className="truncate">{formatManagePreview(message)}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-start gap-2">
                                <HealthSignalBadge signal={getMessageHealthSignal(message)} />
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {getMessageStatus(message)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMessage(message)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  View
                                </button>
                                <Link
                                  href={`/mini-app?groupId=${groupId}`}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  View Report
                                </Link>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHiddenMessageIds((current) => [...current, message.id])
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      ) : (
        <EmptyPanel
          title="This group was not found"
          description="Return to the dashboard and choose a LINE group that already has captured messages."
        />
      )}

      {selectedMessage ? (
        <DetailPanel message={selectedMessage} onClose={() => setSelectedMessage(null)} />
      ) : null}
    </ConsoleShell>
  );
}
