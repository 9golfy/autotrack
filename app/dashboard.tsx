"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  ConsoleShell,
  EmptyPanel,
  buildGroupSummaries,
  formatClock,
  formatDate,
  useAutoTrackMessages,
} from "@/app/_components/group-console";

type ResidentStatus = "ปกติ" | "เฝ้าระวัง" | "ต้องดูแลพิเศษ";
type Gender = "หญิง" | "ชาย";

type ResidentRecord = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  room: string;
  admittedAt: string;
  status: ResidentStatus;
  caregiver: string;
  avatar: string;
};

const totalBeds = 50;
const occupiedBeds = 38;
const totalResidents = 128;
const appointmentsToday = 12;
const staffCount = 28;

const residents: ResidentRecord[] = [
  {
    id: "P00125",
    name: "นางสมศรี จันทร์ทอง",
    age: 82,
    gender: "หญิง",
    room: "A-01 / 01",
    admittedAt: "15 มี.ค. 2566",
    status: "ปกติ",
    caregiver: "น.ส.กมวรรณ ใจดี",
    avatar: "ส",
  },
  {
    id: "P00124",
    name: "นายบุญศรี แสนทอง",
    age: 74,
    gender: "ชาย",
    room: "A-01 / 02",
    admittedAt: "10 มี.ค. 2566",
    status: "เฝ้าระวัง",
    caregiver: "นายวีระชัย มั่นคง",
    avatar: "บ",
  },
  {
    id: "P00123",
    name: "นางจำเนียร ใจงาม",
    age: 89,
    gender: "หญิง",
    room: "A-01 / 03",
    admittedAt: "5 มี.ค. 2566",
    status: "ปกติ",
    caregiver: "น.ส.พรทิพย์ รักดี",
    avatar: "จ",
  },
  {
    id: "P00122",
    name: "นายทองสุข ศรีนวน",
    age: 68,
    gender: "ชาย",
    room: "A-01 / 04",
    admittedAt: "1 มี.ค. 2566",
    status: "เฝ้าระวัง",
    caregiver: "นายวีระชัย มั่นคง",
    avatar: "ท",
  },
  {
    id: "P00121",
    name: "นางแสงจันทร์ พลอยเพชร",
    age: 91,
    gender: "หญิง",
    room: "A-01 / 05",
    admittedAt: "28 ก.พ. 2566",
    status: "ต้องดูแลพิเศษ",
    caregiver: "น.ส.กมวรรณ ใจดี",
    avatar: "แ",
  },
];

const ageDistribution = [
  { label: "60-69", value: 18 },
  { label: "70-79", value: 45 },
  { label: "80-89", value: 48 },
  { label: "90+", value: 17 },
];

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <span className="h-2 w-2 rounded-full bg-current" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function Donut({
  value,
  total,
  label,
  color = "#3B82F6",
}: {
  value: number;
  total: number;
  label: string;
  color?: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-5">
      <div
        className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} 0 ${percent}%, #E5E7EB ${percent}% 100%)` }}
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-bold text-slate-950">{value}</span>
          <span className="text-sm text-slate-500">{label}</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          ใช้งาน {percent}%
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          คงเหลือ {100 - percent}%
        </div>
      </div>
    </div>
  );
}

function AgeChart() {
  const max = Math.max(...ageDistribution.map((item) => item.value));

  return (
    <div className="flex h-48 items-end gap-4 px-2">
      {ageDistribution.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{item.value}</span>
          <div className="flex h-32 w-full items-end rounded-xl bg-slate-50 px-2">
            <div
              className="w-full rounded-t-xl bg-gradient-to-b from-blue-400 to-blue-600"
              style={{ height: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function CalendarCard() {
  const days = Array.from({ length: 35 }, (_, index) => index - 1);

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">ปฏิทินนัดหมายแพทย์</h2>
        <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          วันนี้
        </button>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <div className="flex gap-2 text-slate-500">
          <button type="button" className="h-8 w-8 rounded-full border border-slate-200">‹</button>
          <button type="button" className="h-8 w-8 rounded-full border border-slate-200">›</button>
        </div>
        <p className="font-semibold text-slate-900">เมษายน 2566</p>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
        {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
        {days.map((date, index) => {
          const isCurrentMonth = date > 0 && date <= 30;
          const isActive = date === 25;

          return (
            <div
              key={`${date}-${index}`}
              className={`flex h-9 items-center justify-center rounded-xl ${
                isActive
                  ? "bg-blue-600 font-semibold text-white shadow-[0_8px_18px_rgba(59,130,246,0.24)]"
                  : isCurrentMonth
                    ? "text-slate-700"
                    : "text-slate-300"
              }`}
            >
              {isCurrentMonth ? date : ""}
            </div>
          );
        })}
      </div>
      <button type="button" className="mt-5 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-600">
        ดูนัดหมายทั้งหมด →
      </button>
    </Card>
  );
}

function StatusBadge({ status }: { status: ResidentStatus }) {
  const tone =
    status === "ปกติ"
      ? "bg-emerald-50 text-emerald-700"
      : status === "เฝ้าระวัง"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}

function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${gender === "หญิง" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
      {gender}
    </span>
  );
}

export function Dashboard() {
  const { messages, error, setupMessage } = useAutoTrackMessages();
  const [search, setSearch] = useState("");

  const groups = useMemo(() => buildGroupSummaries(messages), [messages]);
  const latestMessageTime = groups[0]?.lastMessageTime ?? new Date("2026-04-25T17:17:00+07:00").getTime();
  const activeGroups = groups.filter((group) => group.status === "Active").length;
  const filteredResidents = residents.filter((resident) =>
    [resident.name, resident.room, resident.caregiver].join(" ").includes(search.trim()),
  );

  return (
    <ConsoleShell
      title="ลลิษา เนอร์สซิ่งโฮม"
      subtitle="ศูนย์ดูแลผู้สูงอายุ ลลิษา เนอร์สซิ่งโฮม"
      topBar={
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
            แจ้ง
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">สวัสดี, Admin User</p>
              <p className="text-xs text-slate-400">ผู้ดูแลระบบ</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              A
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
            {formatDate(latestMessageTime)} {formatClock(latestMessageTime)}
          </div>
        </div>
      }
    >
      <section className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {setupMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{setupMessage}</div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-5">
          <StatCard label="ผู้สูงอายุทั้งหมด" value={String(totalResidents)} helper="เข้าพักอยู่ปัจจุบัน" tone="bg-blue-50 text-blue-600" />
          <StatCard label="เตียงทั้งหมด" value={String(totalBeds)} helper={`ใช้งาน ${occupiedBeds} เตียง`} tone="bg-emerald-50 text-emerald-600" />
          <StatCard label="นัดหมายวันนี้" value={String(appointmentsToday)} helper="แพทย์ / กิจกรรม" tone="bg-violet-50 text-violet-600" />
          <StatCard label="เจ้าหน้าที่ทั้งหมด" value={String(staffCount)} helper="ปฏิบัติงานอยู่" tone="bg-amber-50 text-amber-600" />
          <StatCard label="กลุ่มแชตทั้งหมด" value={String(groups.length)} helper={`Active ${activeGroups} กลุ่ม`} tone="bg-rose-50 text-rose-600" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <Card>
            <h2 className="text-base font-semibold text-slate-950">ภาพรวมข้อมูล</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_1.25fr]">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">การใช้งานเตียง</p>
                <Donut value={occupiedBeds} total={totalBeds} label="เตียง" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">เพศ</p>
                <Donut value={92} total={totalResidents} label="คน" color="#EC4899" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">ช่วงอายุ</p>
                <AgeChart />
              </div>
            </div>
          </Card>

          <CalendarCard />
        </div>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">ข้อมูลผู้สูงอายุล่าสุด</h2>
              <p className="mt-1 text-sm text-slate-500">รายการผู้สูงอายุที่อยู่ในความดูแลของศูนย์</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:w-[340px]">
                <span className="text-slate-400">ค้นหา</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ชื่อ, ห้อง, ผู้ดูแล..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button type="button" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-blue-600">
                ดูทั้งหมด
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-4">#</th>
                  <th className="px-4 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-4">อายุ</th>
                  <th className="px-4 py-4">เพศ</th>
                  <th className="px-4 py-4">ห้อง / เตียง</th>
                  <th className="px-4 py-4">วันที่เข้าพัก</th>
                  <th className="px-4 py-4">สถานะสุขภาพ</th>
                  <th className="px-4 py-4">ผู้ดูแลหลัก</th>
                  <th className="px-4 py-4">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10">
                      <EmptyPanel title="ไม่พบข้อมูลผู้สูงอายุ" description="ลองค้นหาด้วยชื่อ ห้อง หรือชื่อผู้ดูแลอีกครั้ง" />
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident, index) => (
                    <tr key={resident.id} className="transition hover:bg-blue-50/40">
                      <td className="px-4 py-4 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {resident.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{resident.name}</p>
                            <p className="text-xs text-slate-400">{resident.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{resident.age} ปี</td>
                      <td className="px-4 py-4"><GenderBadge gender={resident.gender} /></td>
                      <td className="px-4 py-4 text-sm text-slate-700">{resident.room}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{resident.admittedAt}</td>
                      <td className="px-4 py-4"><StatusBadge status={resident.status} /></td>
                      <td className="px-4 py-4 text-sm text-slate-700">{resident.caregiver}</td>
                      <td className="px-4 py-4">
                        <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-slate-50">
                          ดูข้อมูล
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>แสดง 1 ถึง {filteredResidents.length} จาก 128 รายการ</p>
            <div className="flex items-center gap-2">
              {["‹", "1", "2", "3", "...", "26", "›"].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 ${
                    item === "1" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </ConsoleShell>
  );
}
