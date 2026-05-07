"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { ConsoleShell } from "@/modules/autohealth/chat-groups/components/GroupConsole";
import { careLevelOptions, emptyMemberForm, lineStatusOptions } from "../constants";
import { deleteMember, fetchMembers } from "../services/member-api";
import type { CareLevel, LineStatus, MemberFormValues, MemberRecord } from "../types";

const requiredFieldsByStep: Record<number, (keyof MemberFormValues)[]> = {
  0: ["firstName", "lastName", "dateOfBirth", "careLevel"],
  1: [],
  2: [],
  3: [],
  4: [],
};

const fallbackMembers: MemberRecord[] = [
  {
    id: "M-1001",
    firstName: "สมหมาย",
    lastName: "ใจดี",
    dateOfBirth: "1949-01-12",
    gender: "female",
    careLevel: "independent",
    contactPhone: "081-234-5678",
    contactEmail: "sommai@example.com",
    bloodPressureSys: "120",
    bloodPressureDia: "78",
    heartRate: "72",
    temperature: "36.5",
    weight: "58",
    note: "",
    profileImageUrl: "",
    contractUrl: "",
    consentUrl: "",
    consentVersion: new Date().toISOString(),
    lineStatus: "CONNECTED",
    lineGroupId: "",
    caregiverLineId: "",
    familyLineId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "M-1002",
    firstName: "สมชาย",
    lastName: "รักชาติ",
    dateOfBirth: "1952-06-22",
    gender: "male",
    careLevel: "close_care",
    contactPhone: "082-345-6789",
    contactEmail: "somchai@example.com",
    bloodPressureSys: "132",
    bloodPressureDia: "86",
    heartRate: "78",
    temperature: "36.7",
    weight: "64",
    note: "",
    profileImageUrl: "",
    contractUrl: "",
    consentUrl: "",
    consentVersion: new Date().toISOString(),
    lineStatus: "NOT_CONNECTED",
    lineGroupId: "",
    caregiverLineId: "",
    familyLineId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const steps = ["ข้อมูลสมาชิก", "ข้อมูลสุขภาพ", "เอกสาร", "LINE", "สรุป"];
const genderOptions = [
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "other", label: "อื่น ๆ" },
];

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "-";

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) ? String(age) : "-";
}

function getOptionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function careBadgeClass(careLevel: CareLevel) {
  if (careLevel === "bedridden") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (careLevel === "close_care") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (careLevel === "independent") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function lineBadgeClass(status: LineStatus) {
  return status === "CONNECTED"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : "bg-slate-100 text-slate-600 ring-slate-200";
}

function Field({
  label,
  name,
  value,
  error,
  type = "text",
  onChange,
}: {
  label: string;
  name: keyof MemberFormValues;
  value: string;
  error?: string;
  type?: string;
  onChange: (name: keyof MemberFormValues, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  error,
  options,
  onChange,
}: {
  label: string;
  name: keyof MemberFormValues;
  value: string;
  error?: string;
  options: { value: string; label: string }[];
  onChange: (name: keyof MemberFormValues, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">เลือกข้อมูล</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function FileField({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block border border-dashed border-slate-300 bg-slate-50 p-4">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
    </label>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="border-b border-slate-200 pb-4 text-base font-semibold text-slate-700">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MemberFormPage({
  mode,
  initialValue,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialValue?: MemberRecord | null;
  onClose: () => void;
  onSaved: (member?: MemberRecord) => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<MemberFormValues>(() =>
    initialValue
      ? {
          firstName: initialValue.firstName,
          lastName: initialValue.lastName,
          dateOfBirth: initialValue.dateOfBirth,
          gender: initialValue.gender,
          careLevel: initialValue.careLevel,
          contactPhone: initialValue.contactPhone,
          contactEmail: initialValue.contactEmail,
          bloodPressureSys: initialValue.bloodPressureSys,
          bloodPressureDia: initialValue.bloodPressureDia,
          heartRate: initialValue.heartRate,
          temperature: initialValue.temperature,
          weight: initialValue.weight,
          note: initialValue.note,
          profileImageUrl: initialValue.profileImageUrl,
          consentVersion: initialValue.consentVersion,
          lineStatus: initialValue.lineStatus,
          lineGroupId: initialValue.lineGroupId,
          caregiverLineId: initialValue.caregiverLineId,
          familyLineId: initialValue.familyLineId,
        }
      : { ...emptyMemberForm, consentVersion: new Date().toISOString() },
  );
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState(initialValue?.profileImageUrl ?? "");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateValue(name: keyof MemberFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validateStep(currentStep = step) {
    const nextErrors: Partial<Record<keyof MemberFormValues, string>> = {};

    for (const field of requiredFieldsByStep[currentStep]) {
      if (!values[field]) {
        nextErrors[field] = "กรุณากรอกข้อมูล";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handleProfileImage(file: File | null) {
    setProfileImageFile(file);
    if (!file) {
      setProfilePreview(values.profileImageUrl);
      return;
    }

    setProfilePreview(URL.createObjectURL(file));
  }

  function generateQRCode() {
    const generatedGroupId = `LINE-GROUP-${Date.now().toString(36).toUpperCase()}`;
    updateValue("lineGroupId", generatedGroupId);
    updateValue("lineStatus", "CONNECTED");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateStep(0)) {
      setStep(0);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.set(key, value));
      if (profileImageFile) formData.set("profileImageFile", profileImageFile);
      if (contractFile) formData.set("contractFile", contractFile);
      if (consentFile) formData.set("consentFile", consentFile);

      const response = await fetch(mode === "edit" && initialValue ? `/api/members/${initialValue.id}` : "/api/members", {
        method: mode === "edit" ? "PATCH" : "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { member?: MemberRecord; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกข้อมูลสมาชิกได้");
      }

      onSaved(data.member);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลสมาชิกได้");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            สมาชิก / รายชื่อสมาชิก / <span className="font-semibold text-blue-600">{mode === "edit" ? "แก้ไขข้อมูลสมาชิก" : "เพิ่มสมาชิก"}</span>
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {mode === "edit" ? "แก้ไขข้อมูลสมาชิก" : "เพิ่มสมาชิกใหม่"}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          กลับไปหน้ารายชื่อ
        </button>
      </div>

      <div className="grid gap-2 bg-[#EAF2F2] p-2 md:grid-cols-5">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`px-4 py-3 text-left text-sm font-semibold transition ${
              step === index ? "bg-white text-blue-700 shadow-sm" : "text-slate-700 hover:bg-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="grid gap-6 border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex items-center gap-5">
          <label className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-400">
            {profilePreview ? (
              <img src={profilePreview} alt="รูปผู้สูงอายุ" className="h-full w-full object-cover" />
            ) : (
              <span>เพิ่มรูป</span>
            )}
            <input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0] ?? null)} className="sr-only" />
          </label>
          <div>
            <h3 className="text-xl font-semibold text-slate-950">
              {values.firstName || values.lastName ? `${values.firstName} ${values.lastName}` : "ข้อมูลผู้สูงอายุ"}
            </h3>
            <p className="mt-1 text-sm font-medium text-blue-600">
              {getOptionLabel(careLevelOptions, values.careLevel)} <span className="text-slate-400">| อายุ {calculateAge(values.dateOfBirth)} ปี</span>
            </p>
            <p className="mt-3 text-xs text-slate-500">คลิกที่รูปเพื่ออัปโหลดภาพผู้สูงอายุ</p>
          </div>
        </div>

        <div className="grid gap-4 border-l border-slate-200 pl-0 text-sm sm:grid-cols-2 lg:pl-8">
          <div>
            <p className="text-slate-500">เบอร์โทร</p>
            <p className="mt-1 font-semibold text-slate-950">{values.contactPhone || "ไม่ระบุ"}</p>
          </div>
          <div>
            <p className="text-slate-500">อีเมล</p>
            <p className="mt-1 font-semibold text-slate-950">{values.contactEmail || "ไม่ระบุ"}</p>
          </div>
          <div>
            <p className="text-slate-500">สถานะ LINE</p>
            <p className="mt-1 font-semibold text-slate-950">{getOptionLabel(lineStatusOptions, values.lineStatus)}</p>
          </div>
          <div>
            <p className="text-slate-500">วันเกิด</p>
            <p className="mt-1 font-semibold text-slate-950">{values.dateOfBirth || "ไม่ระบุ"}</p>
          </div>
        </div>
      </section>

      {step === 0 ? (
        <InfoCard title="ข้อมูลส่วนตัว">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="ชื่อ" name="firstName" value={values.firstName} error={errors.firstName} onChange={updateValue} />
            <Field label="นามสกุล" name="lastName" value={values.lastName} error={errors.lastName} onChange={updateValue} />
            <Field label="วันเกิด" name="dateOfBirth" value={values.dateOfBirth} error={errors.dateOfBirth} type="date" onChange={updateValue} />
            <SelectField label="เพศ" name="gender" value={values.gender} onChange={updateValue} options={genderOptions} />
            <SelectField label="ระดับการดูแล" name="careLevel" value={values.careLevel} error={errors.careLevel} onChange={updateValue} options={careLevelOptions} />
            <Field label="เบอร์โทรติดต่อ" name="contactPhone" value={values.contactPhone} onChange={updateValue} />
            <Field label="อีเมลติดต่อ" name="contactEmail" value={values.contactEmail} type="email" onChange={updateValue} />
          </div>
        </InfoCard>
      ) : null}

      {step === 1 ? (
        <InfoCard title="ข้อมูลสุขภาพพื้นฐาน">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="ความดันตัวบน" name="bloodPressureSys" value={values.bloodPressureSys} type="number" onChange={updateValue} />
            <Field label="ความดันตัวล่าง" name="bloodPressureDia" value={values.bloodPressureDia} type="number" onChange={updateValue} />
            <Field label="ชีพจร" name="heartRate" value={values.heartRate} type="number" onChange={updateValue} />
            <Field label="อุณหภูมิ" name="temperature" value={values.temperature} type="number" onChange={updateValue} />
            <Field label="น้ำหนัก" name="weight" value={values.weight} type="number" onChange={updateValue} />
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-600">หมายเหตุ</span>
              <textarea
                value={values.note}
                onChange={(event) => updateValue("note", event.target.value)}
                className="mt-2 min-h-28 w-full border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </InfoCard>
      ) : null}

      {step === 2 ? (
        <InfoCard title="เอกสารแนบ">
          <div className="grid gap-5 md:grid-cols-2">
            <FileField label="ไฟล์สัญญา (PDF)" accept="application/pdf" onChange={setContractFile} />
            <FileField label="ไฟล์ยินยอม (PDF)" accept="application/pdf" onChange={setConsentFile} />
            <Field label="เวอร์ชันเอกสารยินยอม" name="consentVersion" value={values.consentVersion} onChange={updateValue} />
          </div>
        </InfoCard>
      ) : null}

      {step === 3 ? (
        <InfoCard title="การเชื่อมต่อ LINE">
          <div className="grid gap-5 md:grid-cols-2">
            <button type="button" onClick={generateQRCode} className="h-11 bg-slate-950 px-4 text-sm font-semibold text-white">
              สร้าง QR Code
            </button>
            <SelectField label="สถานะ LINE" name="lineStatus" value={values.lineStatus} onChange={updateValue} options={lineStatusOptions} />
            <Field label="LINE Group ID" name="lineGroupId" value={values.lineGroupId} onChange={updateValue} />
            <Field label="LINE ID ผู้ดูแล" name="caregiverLineId" value={values.caregiverLineId} onChange={updateValue} />
            <Field label="LINE ID ครอบครัว" name="familyLineId" value={values.familyLineId} onChange={updateValue} />
          </div>
        </InfoCard>
      ) : null}

      {step === 4 ? (
        <InfoCard title="สรุปข้อมูลก่อนบันทึก">
          <div className="grid gap-4 text-sm md:grid-cols-2">
            {[
              ["ชื่อ-นามสกุล", `${values.firstName} ${values.lastName}`],
              ["วันเกิด", values.dateOfBirth || "-"],
              ["ระดับการดูแล", getOptionLabel(careLevelOptions, values.careLevel)],
              ["สุขภาพ", `${values.bloodPressureSys || "-"} / ${values.bloodPressureDia || "-"} mmHg, ชีพจร ${values.heartRate || "-"}`],
              ["เอกสาร", `${contractFile?.name ?? initialValue?.contractUrl ?? "ยังไม่มีสัญญา"} / ${consentFile?.name ?? initialValue?.consentUrl ?? "ยังไม่มีเอกสารยินยอม"}`],
              ["LINE", `${getOptionLabel(lineStatusOptions, values.lineStatus)} ${values.lineGroupId ? `(${values.lineGroupId})` : ""}`],
            ].map(([label, value]) => (
              <div key={label} className="border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                <p className="mt-2 font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      ) : null}

      {submitError ? <div className="border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{submitError}</div> : null}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          className="border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40"
        >
          ย้อนกลับ
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={goNext} className="bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            ถัดไป
          </button>
        ) : (
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        )}
      </div>
    </form>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRecord[]>(fallbackMembers);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadMembers() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMembers();
      setMembers(data.members.length > 0 ? data.members : fallbackMembers);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "ไม่สามารถโหลดรายชื่อสมาชิกได้");
      setMembers(fallbackMembers);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMembers(), 0);

    return () => window.clearTimeout(timer);
  }, []);

  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [members],
  );

  function openCreateForm() {
    setEditingMember(null);
    setIsFormOpen(true);
  }

  function openEditForm(member: MemberRecord) {
    setEditingMember(member);
    setIsFormOpen(true);
  }

  async function handleDelete(member: MemberRecord) {
    setMembers((current) => current.filter((item) => item.id !== member.id));
    if (!member.id.startsWith("M-")) {
      await deleteMember(member.id).catch(() => undefined);
    }
  }

  return (
    <ConsoleShell title="รายชื่อสมาชิก" subtitle="" contentClassName="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-6 py-6">
      {isFormOpen ? (
        <MemberFormPage
          mode={editingMember ? "edit" : "create"}
          initialValue={editingMember}
          onClose={() => setIsFormOpen(false)}
          onSaved={(member) => {
            setIsFormOpen(false);
            if (member) {
              setMembers((current) => [member, ...current.filter((item) => item.id !== member.id)]);
            } else {
              void loadMembers();
            }
          }}
        />
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">รายชื่อสมาชิก</h2>
              <p className="mt-1 text-sm text-slate-500">จัดการสมาชิก ข้อมูลสุขภาพ เอกสาร และการเชื่อมต่อ LINE</p>
            </div>
            <button type="button" onClick={openCreateForm} className="bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              + เพิ่มสมาชิก
            </button>
          </div>

          {loadError ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              ใช้ข้อมูลตัวอย่างอยู่: {loadError}
            </div>
          ) : null}

          <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-4">รหัส</th>
                    <th className="px-5 py-4">รูป</th>
                    <th className="px-5 py-4">ชื่อ-นามสกุล</th>
                    <th className="px-5 py-4">อายุ</th>
                    <th className="px-5 py-4">ระดับการดูแล</th>
                    <th className="px-5 py-4">สถานะ LINE</th>
                    <th className="px-5 py-4">อัปเดตล่าสุด</th>
                    <th className="px-5 py-4">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedMembers.map((member) => (
                    <tr key={member.id} className="text-sm text-slate-700">
                      <td className="px-5 py-4 font-semibold text-slate-950">{member.id.slice(0, 8)}</td>
                      <td className="px-5 py-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt={`${member.firstName} ${member.lastName}`} className="h-full w-full object-cover" />
                          ) : (
                            member.firstName.charAt(0)
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {member.firstName} {member.lastName}
                      </td>
                      <td className="px-5 py-4">{calculateAge(member.dateOfBirth)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold ring-1 ${careBadgeClass(member.careLevel)}`}>
                          {getOptionLabel(careLevelOptions, member.careLevel)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold ring-1 ${lineBadgeClass(member.lineStatus)}`}>
                          {getOptionLabel(lineStatusOptions, member.lineStatus)}
                        </span>
                      </td>
                      <td className="px-5 py-4">{new Date(member.updatedAt).toLocaleDateString("th-TH")}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="ดูข้อมูล"
                            onClick={() => openEditForm(member)}
                            className="flex items-center justify-center gap-1.5 border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                            ดู
                          </button>
                          <button
                            type="button"
                            title="แก้ไข"
                            onClick={() => openEditForm(member)}
                            className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_square</span>
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            title="ลบ"
                            onClick={() => void handleDelete(member)}
                            className="flex items-center justify-center gap-1.5 border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                        {isLoading ? "กำลังโหลดรายชื่อสมาชิก..." : "ยังไม่มีข้อมูลสมาชิก"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}
    </ConsoleShell>
  );
}
