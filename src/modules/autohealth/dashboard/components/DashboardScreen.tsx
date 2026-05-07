"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ConsoleShell, buildGroupSummaries, formatClock, formatDate, useAutoTrackMessages } from "@/modules/autohealth/chat-groups/components/GroupConsole";

const defaultGroupId = "Cc7dba355a1ec758b48ed0acd10bae9c5";

function StatBlock({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </section>
  );
}

export function Dashboard() {
  const { messages, error, setupMessage } = useAutoTrackMessages();
  const groups = useMemo(() => buildGroupSummaries(messages), [messages]);
  const latestMessageTime = groups[0]?.lastMessageTime ?? new Date("2026-05-06T17:43:00+07:00").getTime();
  const activeGroups = groups.filter((group) => group.status === "Active").length;
  const totalMembers = groups.reduce((sum, group) => sum + group.memberCount, 0);
  const recentGroups = groups.slice(0, 5);
  const fallbackGroups = [
    {
      groupId: defaultGroupId,
      groupName: "คุณไพโรจน์ พันธุศิลป์ LLS รังสิต",
      memberCount: 2,
      totalMessages: 1,
      lastSync: "6 พ.ค. 69 17:43",
    },
  ];

  return (
    <ConsoleShell title="หน้าแรก" subtitle="">
      <section className="space-y-6">
        {error ? <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {setupMessage ? (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{setupMessage}</div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-4">
          <StatBlock label="กลุ่มแชททั้งหมด" value={String(groups.length)} helper={`ใช้งานอยู่ ${activeGroups} กลุ่ม`} />
          <StatBlock label="สมาชิกทั้งหมด" value={String(totalMembers)} helper="รวมสมาชิกจากทุกกลุ่ม LINE" />
          <StatBlock label="ข้อความทั้งหมด" value={String(messages.length)} helper="ข้อมูลที่บันทึกเข้า AutoTrack" />
          <StatBlock label="ซิงก์ล่าสุด" value={formatClock(latestMessageTime)} helper={formatDate(latestMessageTime)} />
        </div>

        <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">กลุ่มแชทล่าสุด</h2>
                <p className="mt-1 text-sm text-slate-500">เลือกกลุ่มเพื่อเข้าสู่หน้าสนทนาและข้อมูลสุขภาพ</p>
              </div>
              <Link href="/admin/groups" className="bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white">
                เปิดกลุ่มแชท
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(recentGroups.length > 0 ? recentGroups : fallbackGroups).map((group) => (
                <Link
                  key={group.groupId}
                  href={`/admin/groups/${group.groupId}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{group.groupName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.memberCount} members - {group.totalMessages} messages
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{group.lastSync}</span>
                </Link>
              ))}
            </div>
          </section>

          <aside className="border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-[#1D4ED8]">System Summary</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">AutoTrack พร้อมใช้งาน</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              หน้าแรกใช้ธีมเดียวกับหน้ากลุ่มแชท พร้อมสรุปจำนวนกลุ่ม สมาชิก และข้อความล่าสุดจากข้อมูลในระบบ
            </p>
            <Link href={`/admin/groups/${defaultGroupId}`} className="mt-5 block bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">
              ไปยังกลุ่มตัวอย่าง
            </Link>
          </aside>
        </div>
      </section>
    </ConsoleShell>
  );
}
