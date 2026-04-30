"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomBar } from "@/app/_components/mini-app-bottom-bar";
import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";
import { HeaderBar } from "@/app/_components/mini-app-header-bar";
import { FATHER_PROFILE_GROUP_ID, miniAppTheme } from "@/app/_components/mini-app-theme";

type MiniAppSettingsProps = {
  selectedGroupId: string | null;
};

type ReportCategoryKey = "mood" | "nutrition" | "excretion" | "medicine" | "activityPhoto" | "other";

type SettingsState = {
  patientDob: string;
  pushEnabled: boolean;
  categories: Record<ReportCategoryKey, boolean>;
};

const defaultSettings: SettingsState = {
  patientDob: "1950-03-12",
  pushEnabled: true,
  categories: {
    mood: true,
    nutrition: true,
    excretion: true,
    medicine: true,
    activityPhoto: true,
    other: true,
  },
};

const categoryOptions: { key: ReportCategoryKey; label: string; description: string }[] = [
  { key: "mood", label: "สภาวะอารมณ์", description: "แสดงข้อมูลอารมณ์และพฤติกรรมในรายงาน" },
  { key: "nutrition", label: "การกินอาหาร", description: "ติดตามมื้ออาหารและปริมาณการทาน" },
  { key: "excretion", label: "การขับถ่าย", description: "บันทึกความสม่ำเสมอของการขับถ่าย" },
  { key: "medicine", label: "การกินยา", description: "ติดตามรายการยาและช่วงเวลาการทานยา" },
  { key: "activityPhoto", label: "รูปภาพกิจกรรม", description: "แสดงรูปภาพจากกิจกรรมประจำวัน" },
  { key: "other", label: "ข้อมูลด้านอื่นๆ", description: "เปิดพื้นที่สำหรับข้อมูลเสริมจากผู้ดูแล" },
];

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDobParts(value: string) {
  const [rawYear, rawMonth, rawDay] = value.split("-").map(Number);
  const [fallbackYear, fallbackMonth, fallbackDay] = defaultSettings.patientDob.split("-").map(Number);
  const year = Number.isFinite(rawYear) ? rawYear : fallbackYear;
  const month = Number.isFinite(rawMonth) ? rawMonth : fallbackMonth;
  const maxDay = getDaysInMonth(year, month);
  const day = Number.isFinite(rawDay) ? Math.min(Math.max(rawDay, 1), maxDay) : fallbackDay;

  return { year, month, day };
}

function formatDobValue(year: number, month: number, day: number) {
  const safeDay = Math.min(day, getDaysInMonth(year, month));
  const monthText = String(month).padStart(2, "0");
  const dayText = String(safeDay).padStart(2, "0");

  return `${year}-${monthText}-${dayText}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getGroupName(messages: MessageRecord[], selectedGroupId: string | null) {
  const groupMessage = messages.find((message) => {
    const rawPayload = isRecord(message.rawPayload) ? message.rawPayload : null;
    const identity = isRecord(rawPayload?.lineIdentity) ? rawPayload.lineIdentity : null;
    return message.groupId === selectedGroupId && typeof identity?.groupName === "string" && identity.groupName.trim();
  });

  const rawPayload = isRecord(groupMessage?.rawPayload) ? groupMessage?.rawPayload : null;
  const identity = isRecord(rawPayload?.lineIdentity) ? rawPayload.lineIdentity : null;

  return typeof identity?.groupName === "string" ? identity.groupName : "LINE Care Group";
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[54px] shrink-0 rounded-full transition ${checked ? "bg-[#1976D2]" : "bg-[#CBD5E1]"}`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

export function MiniAppSettings({ selectedGroupId }: MiniAppSettingsProps) {
  const resolvedGroupId = selectedGroupId ?? FATHER_PROFILE_GROUP_ID;
  const { messages } = useAutoTrackMessages();
  const groupName = useMemo(() => getGroupName(messages, resolvedGroupId), [messages, resolvedGroupId]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const dobParts = useMemo(() => parseDobParts(settings.patientDob), [settings.patientDob]);
  const daysInDobMonth = useMemo(() => getDaysInMonth(dobParts.year, dobParts.month), [dobParts.month, dobParts.year]);
  const dobDayOptions = useMemo(() => Array.from({ length: daysInDobMonth }, (_, index) => index + 1), [daysInDobMonth]);
  const dobYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, index) => currentYear - index);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(`mini-app-settings:${resolvedGroupId}`);

    if (!stored) {
      queueMicrotask(() => setSettings(defaultSettings));
      return;
    }

    try {
      const storedSettings = { ...defaultSettings, ...(JSON.parse(stored) as Partial<SettingsState>) };
      queueMicrotask(() => setSettings(storedSettings));
    } catch {
      queueMicrotask(() => setSettings(defaultSettings));
    }
  }, [resolvedGroupId]);

  function updateSettings(nextSettings: SettingsState) {
    setSettings(nextSettings);
    window.localStorage.setItem(`mini-app-settings:${resolvedGroupId}`, JSON.stringify(nextSettings));
    setSavedLabel("บันทึกการตั้งค่าแล้ว");
    window.setTimeout(() => setSavedLabel(null), 1600);
    // TODO: Persist settings to Supabase when the mini app settings table is available.
  }

  function updateDob(partialDob: Partial<typeof dobParts>) {
    const nextDob = { ...dobParts, ...partialDob };
    updateSettings({
      ...settings,
      patientDob: formatDobValue(nextDob.year, nextDob.month, nextDob.day),
    });
  }

  return (
    <main className={miniAppTheme.layout.page}>
      <div className={miniAppTheme.layout.shell}>
        <HeaderBar title="AutoHealth" subtitle="ตั้งค่า" groupName={groupName} patientName="คุณพ่อไพโรจน์" />

        <div className={miniAppTheme.layout.content}>
          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <p className={`${miniAppTheme.typography.caption} font-bold uppercase text-[#1976D2]`}>Settings</p>
            <h1 className={`${miniAppTheme.typography.sectionTitle} mt-1 text-[#082B5F]`}>ตั้งค่า Mini App</h1>
            <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>กลุ่ม LINE: {groupName}</p>
          </section>

          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`${miniAppTheme.typography.sectionTitle} text-[#082B5F]`}>ข้อมูลผู้สูงอายุ</h2>
                <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>วันเดือนปีเกิด</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDob((current) => !current)}
                className={`${miniAppTheme.typography.body} rounded-[14px] bg-[#EAF4FF] px-4 py-2 font-bold text-[#1976D2]`}
              >
                แก้ไข
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>วันที่</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-3 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none disabled:bg-[#F8FAFC] disabled:text-[#5F718C]`}
                  value={dobParts.day}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ day: Number(event.target.value) })}
                >
                  {dobDayOptions.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>เดือน</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none disabled:bg-[#F8FAFC] disabled:text-[#5F718C]`}
                  value={dobParts.month}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ month: Number(event.target.value) })}
                >
                  {THAI_MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>ปี</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] shadow-[0_6px_14px_rgba(13,71,161,0.05)] outline-none disabled:bg-[#F8FAFC] disabled:text-[#5F718C]`}
                  value={dobParts.year}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ year: Number(event.target.value) })}
                >
                  {dobYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year + 543}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className={`${miniAppTheme.typography.sectionTitle} text-[#082B5F]`}>การแจ้งเตือน</h2>
                <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>เปิด/ปิด push message จาก LINE</p>
              </div>
              <Toggle
                label="เปิดปิด push message"
                checked={settings.pushEnabled}
                onChange={(checked) => updateSettings({ ...settings, pushEnabled: checked })}
              />
            </div>
          </section>

          <section className={`${miniAppTheme.card.base} p-4`}>
            <h2 className={`${miniAppTheme.typography.sectionTitle} text-[#082B5F]`}>หมวดหมู่ในหน้ารายงาน</h2>
            <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>เลือกข้อมูลที่จะใช้ประกอบรายงานสุขภาพ</p>

            <div className="mt-4 space-y-3">
              {categoryOptions.map((category) => (
                <div key={category.key} className="flex items-center justify-between gap-4 rounded-[16px] bg-[#F8FAFC] px-3 py-3">
                  <div className="min-w-0">
                    <h3 className={`${miniAppTheme.typography.body} font-bold text-[#082B5F]`}>{category.label}</h3>
                    <p className={`${miniAppTheme.typography.caption} mt-0.5 text-[#5F718C]`}>{category.description}</p>
                  </div>
                  <Toggle
                    label={category.label}
                    checked={settings.categories[category.key]}
                    onChange={(checked) =>
                      updateSettings({
                        ...settings,
                        categories: { ...settings.categories, [category.key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {savedLabel ? (
          <div className={`${miniAppTheme.typography.body} fixed bottom-24 left-1/2 z-[60] grid h-12 w-[240px] -translate-x-1/2 place-items-center rounded-[14px] bg-[#1F2937] font-semibold text-white shadow-2xl`}>
            {savedLabel}
          </div>
        ) : null}

        <BottomBar active="settings" groupId={resolvedGroupId} />
      </div>
    </main>
  );
}
