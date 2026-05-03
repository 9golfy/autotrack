"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomBar } from "@/app/_components/mini-app-bottom-bar";
import { type MessageRecord, useAutoTrackMessages } from "@/app/_components/group-console";
import { HeaderBar } from "@/app/_components/mini-app-header-bar";
import { FATHER_PROFILE_GROUP_ID, miniAppTheme } from "@/app/_components/mini-app-theme";

type MiniAppSettingsProps = {
  selectedGroupId: string | null;
};

type ReportCategoryKey = "vitals" | "mood" | "nutrition" | "medication" | "activity" | "excretion";

type SettingsState = {
  patientName: string;
  patientDob: string;
  categories: Record<ReportCategoryKey, boolean>;
};

type LegacyCategoryState = Partial<Record<ReportCategoryKey | "medicine" | "activityPhoto" | "other", boolean>>;

const defaultSettings: SettingsState = {
  patientName: "คุณพ่อไพโรจน์",
  patientDob: "1950-03-12",
  categories: {
    vitals: true,
    mood: true,
    nutrition: true,
    medication: true,
    activity: true,
    excretion: true,
  },
};

const categoryOptions: { key: ReportCategoryKey; label: string; description: string }[] = [
  { key: "vitals", label: "สัญญาณชีพ", description: "ความดัน ชีพจร อุณหภูมิ และออกซิเจน" },
  { key: "mood", label: "อารมณ์", description: "สภาวะอารมณ์ พฤติกรรม และความรู้สึกตัว" },
  { key: "nutrition", label: "อาหาร", description: "มื้อเช้า กลางวัน เย็น และบริบทจากรูปภาพ" },
  { key: "medication", label: "การกินยา", description: "ยาเช้า กลางวัน เย็น และก่อนนอน" },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function calculateAge(dob: string) {
  const { year, month, day } = parseDobParts(dob);
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasNotHadBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);

  if (hasNotHadBirthday) {
    age -= 1;
  }

  return Math.max(age, 0);
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

function getLatestSyncLabel(messages: MessageRecord[]) {
  const latest = messages[0]?.timestamp;

  if (!latest) {
    return "ยังไม่มีข้อมูลล่าสุด";
  }

  return new Date(Number(latest)).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeSettings(value: unknown, storedReportDob: string | null): SettingsState {
  const stored = isRecord(value) ? value : {};
  const storedCategories = isRecord(stored.categories) ? (stored.categories as LegacyCategoryState) : {};

  return {
    ...defaultSettings,
    ...(stored as Partial<SettingsState>),
    patientDob: storedReportDob ?? (typeof stored.patientDob === "string" ? stored.patientDob : defaultSettings.patientDob),
    categories: {
      vitals: typeof storedCategories.vitals === "boolean" ? storedCategories.vitals : defaultSettings.categories.vitals,
      mood: typeof storedCategories.mood === "boolean" ? storedCategories.mood : defaultSettings.categories.mood,
      nutrition: typeof storedCategories.nutrition === "boolean" ? storedCategories.nutrition : defaultSettings.categories.nutrition,
      medication:
        typeof storedCategories.medication === "boolean"
          ? storedCategories.medication
          : typeof storedCategories.medicine === "boolean"
            ? storedCategories.medicine
            : defaultSettings.categories.medication,
      activity:
        typeof storedCategories.activity === "boolean"
          ? storedCategories.activity
          : typeof storedCategories.activityPhoto === "boolean"
            ? storedCategories.activityPhoto
            : defaultSettings.categories.activity,
      excretion: typeof storedCategories.excretion === "boolean" ? storedCategories.excretion : defaultSettings.categories.excretion,
    },
  };
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

function SettingIcon({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" | "violet" }) {
  const toneClass = {
    blue: "bg-[#EAF4FF] text-[#1976D2]",
    amber: "bg-[#FFF5DF] text-[#F59E0B]",
    violet: "bg-[#F1EAFE] text-[#8B5CF6]",
  }[tone];

  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${toneClass}`}>{children}</span>;
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function MiniAppSettings({ selectedGroupId }: MiniAppSettingsProps) {
  const resolvedGroupId = selectedGroupId ?? FATHER_PROFILE_GROUP_ID;
  const { messages } = useAutoTrackMessages({ groupId: resolvedGroupId, limit: 80 });
  const groupName = useMemo(() => getGroupName(messages, resolvedGroupId), [messages, resolvedGroupId]);
  const latestSync = useMemo(() => getLatestSyncLabel(messages), [messages]);
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
  const age = useMemo(() => calculateAge(settings.patientDob), [settings.patientDob]);
  const enabledCategoryCount = categoryOptions.filter((category) => settings.categories[category.key]).length;

  useEffect(() => {
    const stored = window.localStorage.getItem(`mini-app-settings:${resolvedGroupId}`);
    const storedReportDob = window.localStorage.getItem(`mini-app-report-dob:${resolvedGroupId}`);

    if (!stored) {
      const nextSettings = storedReportDob ? { ...defaultSettings, patientDob: storedReportDob } : defaultSettings;
      queueMicrotask(() => setSettings(nextSettings));
      return;
    }

    try {
      const nextSettings = normalizeSettings(JSON.parse(stored), storedReportDob);
      window.localStorage.setItem(`mini-app-settings:${resolvedGroupId}`, JSON.stringify(nextSettings));
      queueMicrotask(() => setSettings(nextSettings));
    } catch {
      queueMicrotask(() => setSettings(defaultSettings));
    }
  }, [resolvedGroupId]);

  function updateSettings(nextSettings: SettingsState) {
    setSettings(nextSettings);
    window.localStorage.setItem(`mini-app-settings:${resolvedGroupId}`, JSON.stringify(nextSettings));
    window.localStorage.setItem(`mini-app-report-dob:${resolvedGroupId}`, nextSettings.patientDob);
    window.dispatchEvent(new CustomEvent("mini-app-settings-changed", { detail: { groupId: resolvedGroupId } }));
    setSavedLabel("บันทึกการตั้งค่าแล้ว");
    window.setTimeout(() => setSavedLabel(null), 1600);
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
        <HeaderBar title="AutoHealth" subtitle="ตั้งค่า" groupName={groupName} patientName={settings.patientName} />

        <div className={miniAppTheme.layout.content}>
          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <div className="flex items-start gap-3">
              <SettingIcon>
                <GearIcon />
              </SettingIcon>
              <div className="min-w-0 flex-1">
                <p className={`${miniAppTheme.typography.caption} font-bold uppercase text-[#1976D2]`}>Settings</p>
                <h1 className={`${miniAppTheme.typography.sectionTitle} mt-1 text-[#082B5F]`}>ตั้งค่า Mini App</h1>
                <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>กลุ่ม LINE: {groupName}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-[#F8FAFC] px-3 py-2">
                <p className={`${miniAppTheme.typography.caption} text-[#5F718C]`}>ซิงก์ล่าสุด</p>
                <p className="mt-0.5 text-xs font-bold leading-tight text-[#082B5F]">{latestSync}</p>
              </div>
              <div className="rounded-[14px] bg-[#F8FAFC] px-3 py-2">
                <p className={`${miniAppTheme.typography.caption} text-[#5F718C]`}>หมวดรายงาน</p>
                <p className="mt-0.5 text-xs font-bold leading-tight text-[#082B5F]">{enabledCategoryCount}/{categoryOptions.length} เปิดใช้งาน</p>
              </div>
            </div>
          </section>

          <section className={`${miniAppTheme.card.base} mb-3 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className={`${miniAppTheme.typography.sectionTitle} text-[#082B5F]`}>ข้อมูลผู้สูงอายุ</h2>
                <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>{settings.patientName} อายุ {age} ปี</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDob((current) => !current)}
                className={`${miniAppTheme.typography.body} h-10 shrink-0 rounded-[14px] bg-[#EAF4FF] px-4 font-bold text-[#1976D2]`}
              >
                {isEditingDob ? "เสร็จ" : "แก้ไข"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>วันที่</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-3 font-semibold text-[#082B5F] outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]`}
                  value={dobParts.day}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ day: Number(event.target.value) })}
                >
                  {dobDayOptions.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>เดือน</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]`}
                  value={dobParts.month}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ month: Number(event.target.value) })}
                >
                  {THAI_MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className={`${miniAppTheme.typography.caption} mb-1 block text-[#5F718C]`}>ปี</span>
                <select
                  className={`${miniAppTheme.typography.body} h-11 w-full rounded-[14px] border border-[#D7E6F8] bg-white px-2 font-semibold text-[#082B5F] outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]`}
                  value={dobParts.year}
                  disabled={!isEditingDob}
                  onChange={(event) => updateDob({ year: Number(event.target.value) })}
                >
                  {dobYearOptions.map((year) => (
                    <option key={year} value={year}>{year + 543}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={`${miniAppTheme.card.base} p-4`}>
            <h2 className={`${miniAppTheme.typography.sectionTitle} text-[#082B5F]`}>หมวดในรายงาน</h2>
            <p className={`${miniAppTheme.typography.body} mt-1 text-[#5F718C]`}>เลือกข้อมูลที่ต้องการให้แสดงในหน้ารายงานและหน้าแรก</p>

            <div className="mt-4 space-y-3">
              {categoryOptions.map((category) => (
                <div key={category.key} className="flex items-center justify-between gap-4 border-b border-[#EEF5FC] pb-3 last:border-b-0 last:pb-0">
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
