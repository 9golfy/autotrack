import type { CareLevel, LineStatus, MemberFormValues } from "./types";

export const careLevelOptions: { value: CareLevel; label: string }[] = [
  { value: "strong", label: "แข็งแรง" },
  { value: "independent", label: "ช่วยเหลือตัวเองได้" },
  { value: "close_care", label: "ดูแลใกล้ชิด" },
  { value: "bedridden", label: "ติดเตียง" },
];

export const lineStatusOptions: { value: LineStatus; label: string }[] = [
  { value: "NOT_CONNECTED", label: "ยังไม่เชื่อมต่อ" },
  { value: "CONNECTED", label: "เชื่อมต่อแล้ว" },
];

export const emptyMemberForm: MemberFormValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  careLevel: "independent",
  contactPhone: "",
  contactEmail: "",
  bloodPressureSys: "",
  bloodPressureDia: "",
  heartRate: "",
  temperature: "",
  weight: "",
  note: "",
  profileImageUrl: "",
  consentVersion: "",
  lineStatus: "NOT_CONNECTED",
  lineGroupId: "",
  caregiverLineId: "",
  familyLineId: "",
};
