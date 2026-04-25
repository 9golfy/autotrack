"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  return message.type === "outbound" || message.source === "web" ? "ส่งแล้ว" : "บันทึกแล้ว";
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

  if (normalized.includes("image") || normalized.includes("รูป")) {
    return "IMG";
  }

  if (normalized.includes("ยา") || normalized.includes("med")) {
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
          <span key={item.label} className={`rounded-full px-3 py-1 text-xs font-medium ${item.color}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GroupDetailDashboard({ groupId }: { groupId: string }) {
  const { messages, status, error, setupMessage } = useAutoTrackMessages();
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);

  const conversation = useMemo(() => buildGroupConversation(messages, groupId), [groupId, messages]);

  const report = useMemo(() => {
    if (!conversation) {
      return null;
    }

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

  const tableMessages = useMemo(() => {
    if (!conversation) {
      return [];
    }

    return conversation.messages.filter((message) => !hiddenMessageIds.includes(message.id));
  }, [conversation, hiddenMessageIds]);

  const timelineItems = useMemo(() => report?.timeline.slice(0, 4) ?? [], [report]);
  const evidenceItems = useMemo(() => report?.evidence.slice(0, 2) ?? [], [report]);
  const chartSeries = useMemo(
    () =>
      report?.series.map((point) => ({
        label: point.label.slice(0, 3),
        bp: point.systolic,
        hr: point.heartRate,
        temp: point.temperature,
      })) ?? [],
    [report],
  );

  return (
    <ConsoleShell
      title="AutoHealth Intelligence Center"
      subtitle="Monitor LINE conversations and health signals"
      topBar={
        <>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            {status}
          </div>
          <Link
            href={`/mini-app?groupId=${groupId}`}
            className="rounded-full bg-[#0D47A1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B3B82]"
          >
            Open LIFF
          </Link>
        </>
      }
    >
      {conversation ? (
        <section className="space-y-5">
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,_#0D47A1,_#1976D2_58%,_#38BDF8)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(13,71,161,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-4">
                    <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                      AutoHealth Mini App
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white/80">รายงานสุขภาพประจำวัน </p>
                      <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">
                         กลุ่ม: {conversation.summary.groupName}
                      </h2>
                      <p className="mt-3 text-sm text-white/80">{report?.ageLabel ?? "ผู้สูงอายุ"} • วันนี้</p>
                    </div>
                  </div>

                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/20 bg-white/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 stroke-white" strokeWidth="1.7">
                      <path d="M4 12h3l2-4 3 8 2-4h6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
                  <div />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Health Status
                    </p>
                    <h3 className="text-3xl font-bold tracking-[-0.03em] text-white">
                      สุขภาพโดยรวม: {report?.statusLabel ?? "ปกติ"}
                    </h3>
                    <p className="max-w-3xl text-base leading-8 text-white/90">
                      {report?.aiSummary ?? "ระบบกำลังสรุปข้อมูลสุขภาพจาก LINE กลุ่มนี้"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                      Health Summary
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                      สรุปสัญญาณชีพสำคัญ
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      แสดงข้อมูลล่าสุดของกลุ่มนี้ในมุมมองที่อ่านง่ายสำหรับทีมดูแล
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${getToneClass(report?.statusTone ?? "green")}`}>
                    {report?.statusLabel ?? "ปกติ"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { key: "bp", icon: "🩺", label: "ความดันโลหิต", metric: report?.vitals.bloodPressure },
                    { key: "hr", icon: "💗", label: "ชีพจร", metric: report?.vitals.heartRate },
                    { key: "temp", icon: "🌡️", label: "อุณหภูมิร่างกาย", metric: report?.vitals.temperature },
                    { key: "spo2", icon: "🫁", label: "ค่าออกซิเจนในเลือด", metric: report?.vitals.spo2 },
                  ].map((item) => (
                    <article key={item.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                            {item.icon}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-500">{item.label}</p>
                            <p className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-950">
                              {item.metric?.value}
                              <span className="ml-1 text-xl font-semibold text-slate-400">{item.metric?.unit}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getToneClass(item.metric?.tone ?? "green")}`}>
                          {item.metric?.statusLabel ?? "ปกติ"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                      Health Graph
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                      เปรียบเทียบแนวโน้มสุขภาพรายสัปดาห์
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      แนวโน้มค่าความดัน ชีพจร และอุณหภูมิจากข้อมูล LINE กลุ่มนี้
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">สรุปล่าสุด</p>
                    <p className="mt-2">BP: {report?.vitals.bloodPressure.value} {report?.vitals.bloodPressure.unit}</p>
                    <p>HR: {report?.vitals.heartRate.value} {report?.vitals.heartRate.unit}</p>
                    <p>Temp: {report?.vitals.temperature.value} {report?.vitals.temperature.unit}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <InsightTrendChart
                    series={
                      chartSeries.length > 0
                        ? chartSeries
                        : [
                            { label: "Mon", bp: 122, hr: 74, temp: 36.8 },
                            { label: "Tue", bp: 121, hr: 73, temp: 36.7 },
                            { label: "Thu", bp: 119, hr: 72, temp: 36.6 },
                            { label: "Sun", bp: 118, hr: 70, temp: 36.7 },
                          ]
                    }
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                      Evidence
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                      หลักฐานจาก LINE
                    </h2>
                  </div>
                  <Link
                    href={`/mini-app?groupId=${groupId}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    ดูรายงานเต็ม
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                    {evidenceItems[0]?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evidenceItems[0].imageUrl}
                        alt={evidenceItems[0].title}
                        className="h-60 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-60 items-center justify-center text-sm text-slate-400">
                        No image evidence yet
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(evidenceItems.length > 0 ? evidenceItems : report?.evidence ?? []).slice(0, 2).map((item) => (
                      <article key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-base font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{item.subtitle}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  ผู้รายงาน (Patient Reporter)
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <Avatar
                    avatarUrl={report?.reporterAvatarUrl ?? null}
                    displayName={report?.reporterName ?? "Unknown"}
                    size={88}
                  />
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      {report?.reporterName ?? "Unknown reporter"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {truncate(
                        conversation.messages.find((message) => message.displayName === report?.reporterName)?.userId ??
                          null,
                        12,
                        4,
                      )}
                    </p>
                    <p className="text-sm text-slate-500">{report?.reporterTimeLabel ?? conversation.summary.lastSync}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_#F8FBFF,_#F2F5FF)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                      AI Insight
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                      สรุปภาพรวมโดย AI
                    </h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
                    🧠
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[report?.aiSummary, "ไม่มีความเสี่ยงที่พบในข้อมูลล่าสุด", "แนะนำให้ติดตามค่าความดันและออกซิเจนอย่างต่อเนื่อง"].filter(Boolean).map((item, index) => (
                    <div key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                        ✓
                      </span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                  Medication Reminder
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
                  การแจ้งเตือนการรับประทานยา
                </h2>
                <div className="mt-4 space-y-3">
                  {[
                    { time: "08:00", title: "ยาหลังอาหาร", status: "ยังไม่ได้บันทึก" },
                    { time: "20:00", title: "ยาก่อนนอน", status: "ยังไม่ได้บันทึก" },
                  ].map((item) => (
                    <div key={`${item.time}-${item.title}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">
                        {item.time} · {item.title}
                      </div>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                  Timeline
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
                  เรื่องราวการดูแลในแต่ละวัน
                </h2>
                <div className="mt-4 space-y-4">
                  {timelineItems.length === 0 ? (
                    <EmptyPanel
                      title="No timeline yet"
                      description="Activity from this group will appear here once messages are captured."
                    />
                  ) : (
                    timelineItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm">
                          {getTimelineIcon(item.title, item.detail)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {item.timeLabel}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Data Table</h2>
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
                          <td className="px-4 py-4 text-sm text-slate-600">{formatDate(getMessageTimestamp(message))}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{formatClock(getMessageTimestamp(message))}</td>
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
                                onClick={() => setHiddenMessageIds((current) => [...current, message.id])}
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
