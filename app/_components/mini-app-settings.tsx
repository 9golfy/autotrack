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

            <input
              type="date"
              value={settings.patientDob}
              disabled={!isEditingDob}
              onChange={(event) => updateSettings({ ...settings, patientDob: event.target.value })}
              className={`${miniAppTheme.typography.cardTitle} mt-4 h-12 w-full rounded-[14px] border border-[#CBD5E1] bg-white px-4 font-semibold text-[#082B5F] outline-none disabled:bg-[#F8FAFC] disabled:text-[#5F718C]`}
            />
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
