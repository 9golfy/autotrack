"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ConsoleShell,
  EmptyPanel,
  HealthSignalBadge,
  StatusBadge,
  TypeBadge,
  buildGroupSummaries,
  filterGroupSummaries,
  formatDateTime,
  formatNumber,
  truncate,
  useAutoTrackMessages,
} from "@/app/_components/group-console";
import type { GroupFilters } from "@/app/_components/group-console";

const defaultFilters: GroupFilters = {
  search: "",
  dateRange: "all",
  status: "all",
  messageType: "all",
};

export function Dashboard() {
  const { messages, status, error, setupMessage } = useAutoTrackMessages();
  const [filters, setFilters] = useState<GroupFilters>(defaultFilters);
  const [archivedGroupIds, setArchivedGroupIds] = useState<string[]>([]);

  const groups = useMemo(() => buildGroupSummaries(messages), [messages]);

  const filteredGroups = useMemo(() => {
    const visibleGroups = groups.filter((group) => !archivedGroupIds.includes(group.groupId));
    return filterGroupSummaries(visibleGroups, filters);
  }, [archivedGroupIds, filters, groups]);

  return (
    <ConsoleShell
      title="AutoTrack Console"
      subtitle="Monitor LINE conversations and health signals"
      topBar={
        <>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            {status}
          </div>
          <Link
            href="/liff"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open LIFF
          </Link>
        </>
      }
    >
      <section className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:flex-1">
            <label className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="sr-only">Search group name</span>
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search group name"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={filters.dateRange}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateRange: event.target.value as GroupFilters["dateRange"],
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">All dates</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>

            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as GroupFilters["status"],
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">All status</option>
              <option value="Active">Active</option>
              <option value="Needs Review">Needs Review</option>
              <option value="No Activity">No Activity</option>
            </select>

            <select
              value={filters.messageType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  messageType: event.target.value as GroupFilters["messageType"],
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">All message types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="link">Link</option>
              <option value="other">Other</option>
            </select>
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Group Name</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Total Messages</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3">Health Signal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Sync</th>
                  <th className="px-4 py-3">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8" colSpan={9}>
                      <EmptyPanel
                        title="No group chats found"
                        description="Invite AutoTrack into a LINE group, or change your filters to see captured conversations."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group, index) => (
                    <tr
                      key={group.groupId}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4 text-sm text-slate-500">{formatNumber(index + 1)}</td>
                      <td className="px-4 py-4">
                        <div className="min-w-[260px]">
                          <Link
                            href={`/groups/${group.groupId}`}
                            className="text-sm font-semibold text-slate-950 transition hover:text-sky-700"
                          >
                            {group.groupName}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{truncate(group.groupId, 10, 6)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[140px] items-center gap-2">
                          <div className="flex -space-x-2">
                            {group.members.slice(0, 3).map((member) => (
                              <div
                                key={member.userId}
                                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 text-[11px] font-semibold text-slate-600"
                              >
                                {member.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  member.displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">{group.memberCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{group.totalMessages}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {group.lastMessageTime ? formatDateTime(group.lastMessageTime) : "No data"}
                      </td>
                      <td className="px-4 py-4">
                        <HealthSignalBadge signal={group.healthSignal} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={group.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{group.lastSync}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={group.lastMessageType} />
                          <Link
                            href={`/groups/${group.groupId}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View Group
                          </Link>
                          <Link
                            href={`/mini-app?groupId=${group.groupId}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View Report
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setArchivedGroupIds((current) => [...current, group.groupId])
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </ConsoleShell>
  );
}
