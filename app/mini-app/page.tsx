/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";

import { buildHealthReport } from "@/lib/health-report";

type MessageRecord = {
  id: string;
  userId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  contentUrl: string | null;
  type: string;
  text: string | null;
  timestamp: string;
};

function getToneClass(tone: "green" | "orange" | "red") {
  if (tone === "red") {
    return "bg-[#FDECEC] text-[#E53935]";
  }

  if (tone === "orange") {
    return "bg-[#FFF5DF] text-[#FFB300]";
  }

  return "bg-[#E8F9EE] text-[#00C853]";
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

function MiniChart({
  data,
}: {
  data: { label: string; heartRate: number; systolic: number; temperature: number }[];
}) {
  const width = 280;
  const height = 120;

  const heartPath = buildPath(
    data.map((item) => item.heartRate),
    width,
    height,
  );
  const pressurePath = buildPath(
    data.map((item) => item.systolic),
    width,
    height,
  );
  const tempPath = buildPath(
    data.map((item) => item.temperature),
    width,
    height,
  );

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <path d={pressurePath} fill="none" stroke="#1976D2" strokeWidth="3" strokeLinecap="round" />
        <path d={heartPath} fill="none" stroke="#7C4DFF" strokeWidth="3" strokeLinecap="round" />
        <path d={tempPath} fill="none" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#E8F1FF] px-3 py-1 text-[#1976D2]">Blood Pressure</span>
        <span className="rounded-full bg-[#F1EDFF] px-3 py-1 text-[#7C4DFF]">Heart Rate</span>
        <span className="rounded-full bg-[#FDECEC] px-3 py-1 text-[#E53935]">Temperature</span>
      </div>
    </div>
  );
}

export default function MiniAppPage() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [status, setStatus] = useState("Loading latest health report...");

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load health messages");
        }

        const data = (await response.json()) as { messages: MessageRecord[] };

        if (!isMounted) {
          return;
        }

        setMessages(data.messages);
        setStatus("Health report synced from LINE successfully.");
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStatus("Unable to load health report right now.");
        }
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 3000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const report = useMemo(() => {
    return buildHealthReport(
      messages.map((message) => ({
        id: message.id,
        text: message.text,
        contentUrl: message.contentUrl,
        type: message.type,
        timestamp: Number(message.timestamp),
        displayName: message.displayName,
        userId: message.userId,
      })),
    );
  }, [messages]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#F7FAFF_0%,_#F4F7FB_55%,_#FFFFFF_100%)] px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,_#0D47A1,_#1976D2_60%,_#7C4DFF)] p-5 text-white shadow-[0_24px_70px_rgba(13,71,161,0.22)]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              AutoHealth Mini App
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getToneClass(report.statusTone)}`}>
              {report.statusLabel}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <h1 className="text-2xl font-bold tracking-[-0.03em]">{report.patientName}</h1>
            <p className="text-sm text-white/80">{report.dateLabel}</p>
            <p className="text-sm leading-6 text-white/90">{report.aiSummary}</p>
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_16px_40px_rgba(13,71,161,0.08)] ring-1 ring-[#E0E0E0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Patient Summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{report.patientName}</h2>
            </div>
            <span className="rounded-full bg-[#E8F1FF] px-3 py-1 text-xs font-semibold text-[#1976D2]">
              Synced
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{status}</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Blood Pressure",
              icon: "🩺",
              metric: report.vitals.bloodPressure,
            },
            {
              label: "Heart Rate",
              icon: "💓",
              metric: report.vitals.heartRate,
            },
            {
              label: "Temperature",
              icon: "🌡️",
              metric: report.vitals.temperature,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] bg-white p-4 shadow-[0_14px_34px_rgba(13,71,161,0.08)] ring-1 ring-[#E0E0E0]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{item.icon}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getToneClass(item.metric.tone)}`}>
                  {item.metric.tone === "green"
                    ? "ปกติ"
                    : item.metric.tone === "orange"
                      ? "เฝ้าระวัง"
                      : "เสี่ยง"}
                </span>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                {item.metric.value}
              </p>
              <p className="text-sm text-slate-500">{item.metric.unit}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_16px_40px_rgba(13,71,161,0.08)] ring-1 ring-[#E0E0E0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Health Graph
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Daily Trend</h2>
            </div>
            <span className="rounded-full bg-[#F1EDFF] px-3 py-1 text-xs font-semibold text-[#7C4DFF]">
              AI Trend
            </span>
          </div>
          <div className="mt-4">
            <MiniChart data={report.series} />
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_16px_40px_rgba(13,71,161,0.08)] ring-1 ring-[#E0E0E0]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Timeline
          </p>
          <div className="mt-4 space-y-4">
            {report.timeline.map((entry, index) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-3 w-3 rounded-full bg-[#1976D2]" />
                  {index < report.timeline.length - 1 ? (
                    <span className="mt-2 h-full w-px bg-[#E0E0E0]" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{entry.detail}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {entry.timeLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_16px_40px_rgba(13,71,161,0.08)] ring-1 ring-[#E0E0E0]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Evidence
          </p>
          <div className="mt-4 grid gap-3">
            {report.evidence.length === 0 ? (
              <div className="rounded-[22px] bg-[#F7FAFF] px-4 py-6 text-center text-sm text-slate-500">
                Waiting for medication, meals, or image evidence from LINE.
              </div>
            ) : (
              report.evidence.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[22px] bg-[#F7FAFF] ring-1 ring-[#EEF2F7]"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover" />
                  ) : null}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
